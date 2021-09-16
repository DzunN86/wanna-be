import throttle from "lodash.throttle";
import { convertIntoAltNodes } from "./converter/altNodes/altConversion";
import { tailwindMain } from "./converter/tailwind/tailwindMain";
import { applyLayout, findFrameTree, findParent } from "./util";
import get from "lodash.get";

let startTimeout = setTimeout(() => {
  figma.ui.show();
  figma.ui.resize(260, 230);
}, 3000);
const start = () => {
  figma.showUI(__html__, {
    visible: false,
  });
  sendUI("init", {
    docId: figma.fileKey,
    docName: figma.root.name,
    pages: getPages(),
  });
  selChange();
};
let lastNodeID = null;
const selChange = () => {
  const isSelected = figma.currentPage.selection.length > 0;

  if (isSelected) {
    let node = figma.currentPage.selection[0];
    if (lastNodeID === node.id) {
      getNodeHtml(node);
      delayedUpdateFrame();
      return;
    }
    if (!node.removed) {
      let frame: any = node;
      while (!!frame && frame.parent !== figma.currentPage) {
        frame = frame.parent;
      }

      if (node.type === "FRAME" && node.layoutMode === "NONE") {
        node.layoutMode = "VERTICAL";
      }

      if (node.type === "GROUP") {
        const nframe: any = figma.createFrame();
        for (let i of node.children) {
          nframe.appendChild(i.clone());
        }
        nframe.name = node.name;
        nframe.counterAxisSizingMode = "AUTO";
        nframe.primaryAxisSizingMode = "AUTO";
        nframe.layoutMode = "VERTICAL";
        const parent = node.parent;
        parent.appendChild(nframe);
        node.remove();
        node = nframe;
      }

      lastNodeID = node.id;
      const page = figma.currentPage;

      let inherit = JSON.parse(
        node.getPluginData("inherit") ||
          `{"width":false,"height":false,"style":true,"class":true}`
      );

      const nodeInfo = {
        name: node.name,
        id: node.id,
        type: node.type,
        raster: node.getPluginData("raster"),
        tag: node.getPluginData("tagName"),
        wrapCode: node.getPluginData("wrapCode"),
        html: getNodeHtml(node),
        component: null,
        inherit,
      };

      if (node.type === "INSTANCE") {
        const instanceTarget = JSON.parse(
          node.mainComponent.getPluginData("target") || "{}"
        );

        if (instanceTarget && instanceTarget.name) {
          nodeInfo.tag = instanceTarget.name;
        }

        nodeInfo.component = {
          id: node.mainComponent.id,
          name: node.mainComponent.name,
        };
      }
      //  else {
      //   const frameTarget = JSON.parse(frame.getPluginData('target') || '{}')
      //   if (frameTarget && frameTarget.name) {
      //     nodeInfo.tag = frameTarget.name
      //   } else {
      //     nodeInfo.tag = node.getPluginData('tagName')
      //   }
      // }

      let effect = frame.getPluginData("effect");
      if (!effect) {
        if (frame.type !== "COMPONENT") {
          effect = `<effect meta={{}} run={async () => {}} />`;
        }
      }

      sendUI("set-select", {
        page: { name: page.name, id: page.id },
        frame: {
          name: frame.name,
          id: frame.id,
          type: frame.type,
          target: JSON.parse(frame.getPluginData("target") || "{}"),
          effect,
        },
        node: nodeInfo,
      });
      return;
    }
  }
  lastNodeID = null;
  sendUI("set-select", {
    page: null,
    frame: null,
    node: null,
  });
};
figma.on("selectionchange", selChange);

const size = { w: 0, h: 0, old: { w: 0, h: 0 } };

figma.ui.onmessage = async (msg: {
  type: string;
  data: Record<string, any>;
}) => {
  switch (msg.type) {
    case "reinit":
      sendUI("init", {
        docId: figma.fileKey,
        docName: figma.root.name,
        pages: getPages(),
      });
      sendUI("reinit", { status: "ok" });
      break;
    case "add-frame":
      {
        const sel = figma.currentPage.selection;
        if (sel.length > 0) {
          const cur = sel[0];
          if (cur.type === "FRAME" || cur.type === "COMPONENT") {
            const nframe = figma.createFrame();
            nframe.layoutAlign = "STRETCH";
            nframe.layoutGrow = 1;
            nframe.counterAxisSizingMode = "AUTO";
            nframe.primaryAxisSizingMode = "AUTO";
            nframe.layoutMode = "VERTICAL";
            cur.appendChild(nframe);
            figma.currentPage.selection = [nframe];
          }
        }
      }
      break;
    case "toggle-resize":
      if (size.w !== 0 && size.h !== 0) {
        size.old = { w: size.w, h: size.h };
        size.w = 0;
        size.h = 0;
        figma.ui.resize(size.w, size.h);
        sendUI("toggle-resize", { current: "minimized" });
      } else {
        size.w = size.old.w;
        size.h = size.old.h;
        figma.ui.resize(size.w, size.h);
        sendUI("toggle-resize", { current: "maximized" });
      }

      break;
    case "win-resize":
      if (startTimeout) {
        clearTimeout(startTimeout);
        startTimeout = null;
        figma.ui.show();
      }
      const s = msg.data.value.split("x");
      size.w = parseInt(s[0]);
      size.h = parseInt(s[1]);
      figma.ui.resize(parseInt(s[0]), parseInt(s[1]));
      sendUI("win-resize", { status: "ok" });
      break;
    case "trigger-select":
      lastNodeID = "";
      selChange();
      sendUI("trigger-select", { status: "ok" });
      break;
    case "get-alt-node":
      {
        const node = figma.currentPage.selection[0];
        const altNodes = convertIntoAltNodes([node], null, true);
        sendUI("get-alt-node", { node: altNodes[0] });
      }
      break;
    case "get-node-html":
      {
        const node = figma.currentPage.selection[0];

        if (node) {
          node.setPluginData("wrapCode", msg.data.wrapCode);
          node.setPluginData("props", JSON.stringify(msg.data.props));
        }

        sendUI("get-node-html", getNodeHtml(node));
      }
      break;
    case "html-for-code":
      {
        const page = figma.currentPage;
        let node = figma.currentPage.selection[0];
        let frame: any = node;
        while (frame.parent !== figma.currentPage) {
          frame = frame.parent;
        }
        const altFrames = convertIntoAltNodes([frame]);

        const hasLayout =
          frame.getPluginData("layout-enabled") === "y" &&
          frame.getPluginData("layout-id");

        let html = "";

        if (hasLayout) {
          let children: FrameNode;
          frame.findAll((c) => {
            if (
              c.name.toLowerCase().indexOf("children") === 0 &&
              c.type === "FRAME"
            ) {
              children = c;
            }
            return false;
          });

          if (children) {
            const converted = convertIntoAltNodes([children]);
            if (converted && converted.length > 0) {
              const finalChild = converted[0];
              finalChild.wrapCode = "<<component>>";
              finalChild.renderChildren = "y";
              finalChild.tagName = "fragment";
              finalChild.props = {};
              html = tailwindMain(
                [finalChild],
                undefined,
                false,
                false,
                false,
                true,
                node === children ? null : node
              );
              console.log(html);
            }
          }
        } else {
          html = tailwindMain(
            altFrames,
            undefined,
            false,
            false,
            false,
            true,
            node
          );
        }
        const target = JSON.parse(frame.getPluginData("target") || "{}");
        let effect = frame.getPluginData("effect");
        if (!effect) {
          if ((frame as any).type !== "COMPONENT") {
            effect = `<effect meta={{}} run={async () => {}} />`;
          }
        }

        if ((frame as any).type !== "COMPONENT") {
          html = `\
<>
${effect}
${html}
</>`;
        }

        sendUI("html-for-code", {
          html,
          page: page.name,
          frame: {
            type: frame.type,
            name: frame.name,
            id: frame.id,
            tag: altFrames[0].tagName,
            target: target,
            path: target.path,
            effect: effect,
          },
          path: target.path,
        });
      }
      break;
    case "get-frame-html-target":
      const frame = findFrameTree(figma.currentPage.children, findParent()?.id);

      const target = JSON.parse(
        (frame && frame.getPluginData("target").trim()) ||
          `{"type": "page","id": "","name": "","path": "" }`
      );

      const result = { html: getFrameHtml(frame), target };

      sendUI("get-frame-html-target", result);
      break;
    case "get-frame-html":
      sendUI("get-frame-html", { html: getFrameHtml() });
      break;
    case "focus-to":
      {
        const node = figma.root.findOne((e) => e.id === msg.data.node_id);
        if (node) {
          let page: any = node;

          if (msg.data.page_id) {
            page = figma.root.findOne((e) => e.id === msg.data.page_id);
          } else {
            while (page.type !== "PAGE") {
              if (page === node.parent) {
                break;
              }
              page = node.parent;
            }
          }

          page.selection = [node];
          figma.currentPage = page;
          figma.viewport.scrollAndZoomIntoView([node]);
        }

        sendUI("focus-to", { status: "ok" });
      }
      break;
    case "upd-frame":
      updateFrame();
      break;
    case "get-layouts":
      const layouts = [];
      for (let page of figma.root.children) {
        if (page.name.toLowerCase().indexOf("component") >= 0) {
          for (let frame of page.children) {
            if (frame.name.toLowerCase().indexOf("layout:") >= 0) {
              layouts.push({
                id: frame.id,
                name: frame.name.substr("layout:".length).trim(),
              });
            }
          }
        }
      }
      sendUI("get-layouts", { layouts, status: "ok" });
      break;
    case "set-img":
      {
        if (figma.currentPage.selection.length > 0) {
          const node = figma.currentPage.selection[0];
          const format = msg.data.mode.indexOf("png") === 0 ? "PNG" : "SVG";
          const option: any = {
            format,
          };
          let size = "1";
          if (msg.data.mode.indexOf("png") === 0) {
            size = msg.data.mode.split("@").pop();
            option.constraint = {
              type: "SCALE",
              value: size,
            };
          }

          const frame = findFrameTree(
            figma.currentPage.children,
            findParent()?.id
          );
          if (frame) {
            node.setPluginData("raster", msg.data.mode);
            sendUI("set-img", { status: "ok" });
          }
        }
      }
      break;
    case "unset-img":
      {
        if (figma.currentPage.selection.length > 0) {
          const node = figma.currentPage.selection[0];
          node.setPluginData("raster", "");
          sendUI("unset-img", { status: "ok" });
        }
      }
      break;
    case "upd-layout-instances":
      {
        const frame = findFrameTree(
          figma.currentPage.children,
          findParent()?.id
        );
        if (frame) {
          for (let page of figma.root.children) {
            if (page.name.toLowerCase().indexOf("component") < 0) {
              for (let f of page.children) {
                const enabled = f.getPluginData("layout-enabled");
                const id = f.getPluginData("layout-id");
                if (enabled === "y" && id === frame.id) {
                  applyLayout(f as FrameNode, true);
                }
              }
            }
          }
        }

        sendUI("upd-layout-instances", { status: "OK" });
      }
      break;
    case "set-last-edit":
      {
        const frame = findFrameTree(
          figma.currentPage.children,
          findParent()?.id
        );
        if (frame && msg.data.tab) {
          frame.setPluginData(`last-edit-${msg.data.tab}`, msg.data.value);
        }

        sendUI("set-last-edit", { status: "OK" });
      }
      break;
    case "get-last-edit":
      {
        const frame = findFrameTree(
          figma.currentPage.children,
          findParent()?.id
        );
        let value = new Date().getTime();
        if (frame && msg.data.tab) {
          const pd = frame.getPluginData(`last-edit-${msg.data.tab}`);
          if (pd) {
            value = parseInt(pd);
          }
        }
        sendUI("get-last-edit", value);
      }
      break;
    case "upd-component":
      {
        const frame = figma.root.findOne((e) => e.id === msg.data.id);

        if (frame.type === "COMPONENT") {
          frame.setPluginData(
            "acceptChildren",
            findChildren(frame) ? "y" : "n"
          );
        }
        sendUI("upd-component", { status: "OK" });
      }
      break;
    case "set-frame-data":
      {
        const frame = findFrameTree(
          figma.currentPage.children,
          findParent()?.id
        );
        if (frame) {
          if (msg.data.parse) {
            frame.setPluginData(msg.data.name, JSON.stringify(msg.data.value));
          } else {
            frame.setPluginData(msg.data.name, msg.data.value);
          }
        }
        if (
          msg.data.name === "layout-id" ||
          msg.data.name === "layout-enabled"
        ) {
          applyLayout(frame as FrameNode);
        }

        sendUI("set-frame-data", {
          name: msg.data.name,
          status: "ok",
        });
      }
      break;
    case "get-frame-data":
      {
        const frame = findFrameTree(
          figma.currentPage.children,
          findParent()?.id
        );

        const value =
          (frame && frame.getPluginData(msg.data.name).trim()) ||
          msg.data.default;

        sendUI("get-frame-data", { name: msg.data.name, value });
      }
      break;
    case "get-bg-image":
      {
        const d = msg.data;

        const image = figma.getImageByHash(d.hash);
        const bin = await image.getBytesAsync();

        figma.ui.postMessage({
          type: "get-bg-image",
          data: { status: "ok" },
          ws: false,
        });
        sendUI("res-bg-image", {
          hash: d.hash,
          value: Array.from(bin),
        });
      }
      break;
    case "get-image":
      const d = msg.data;

      const node: any = figma.root.findOne((e) => e.id === d.node_id);

      if (node) {
        const settings = {
          format: d.type,
        };
        if (d.type === "PNG") {
          settings["constraint"] = {
            type: "SCALE",
            value: parseInt(d.scale),
          };
        }

        const bin = node.visible ? await node.exportAsync(settings) : [];

        figma.ui.postMessage({
          type: "get-image",
          data: { status: "ok" },
          ws: false,
        });
        sendUI("res-image", {
          type: d.type,
          scale: d.scale,
          value: Array.from(bin),
          frame_id: d.frame_id,
          node_id: d.node_id,
          update: d.update,
        });
      }
      break;
    case "set-root-data":
      if (msg.data.parse) {
        figma.root.setPluginData(msg.data.name, JSON.stringify(msg.data.value));
      } else {
        figma.root.setPluginData(msg.data.name, msg.data.value);
      }
      sendUI("set-root-data", {
        name: msg.data.name,
        status: "ok",
      });
      break;
    case "get-root-data":
      sendUI(
        "get-root-data",
        figma.root.getPluginData(msg.data.name) || msg.data.default
      );
      break;
    case "get-node-data":
      {
        let node = null;
        if (msg.data.node_id) {
          node = figma.root.findOne((e) => e.id === msg.data.node_id);
        } else {
          if (figma.currentPage.selection.length > 0) {
            node = figma.currentPage.selection[0];
          }
        }

        if (node) {
          sendUI("get-node-data", node.getPluginData(msg.data.name));
        }
      }
      break;
    case "set-code-data":
      {
        let node = null;
        node = figma.root.findOne((e) => e.id === msg.data.node_id);

        if (node) {
          node.setPluginData("wrapCode", msg.data.wrapCode);
          node.setPluginData("props", JSON.stringify(msg.data.props));
        }
        sendUI("set-code-data", { status: "ok" });
      }
      break;
    case "set-node-data":
      {
        let node = null;
        if (msg.data.node_id) {
          node = figma.root.findOne((e) => e.id === msg.data.node_id);
        } else {
          if (figma.currentPage.selection.length > 0) {
            node = figma.currentPage.selection[0];
          }
        }

        if (node) {
          if (msg.data.parse) {
            node.setPluginData(msg.data.name, JSON.stringify(msg.data.value));
          } else {
            node.setPluginData(msg.data.name, msg.data.value);
          }
        }
        sendUI("set-node-data", { status: "ok" });
      }
      break;
    case "req-html":
      for (let x of figma.root.children) {
        if (x.name === msg.data.page) {
          for (let y of x.children) {
            if (y.type === "FRAME" && y.name === msg.data.frame) {
              const altFrames = convertIntoAltNodes([y]);
              const html = tailwindMain(altFrames, undefined, false, false);
              sendUI("req-html", { html });
              break;
            }
          }
        }
      }
      break;
  }
};

const updateFrame = () => {
  const node = figma.currentPage.selection[0];

  let frame = node as FrameNode;
  while (frame.parent !== figma.currentPage) {
    frame = frame.parent as FrameNode;
  }

  const altFrames = convertIntoAltNodes([frame]);

  const hasLayout =
    frame.getPluginData("layout-enabled") === "y" &&
    frame.getPluginData("layout-id");

  let html = "";

  if (hasLayout) {
    let children: FrameNode;
    frame.findAll((c) => {
      if (
        c.name.toLowerCase().indexOf("children") === 0 &&
        c.type === "FRAME"
      ) {
        children = c;
      }
      return false;
    });

    if (children) {
      const converted = convertIntoAltNodes([children], null, false);
      if (converted.length > 0) {
        const finalChild = converted[0];
        finalChild.wrapCode = "<<component>>";
        finalChild.renderChildren = "y";
        finalChild.tagName = "fragment";
        finalChild.props = {};
        html = tailwindMain([finalChild], undefined, false, false, false, true);
      }
    }
  } else {
    html = tailwindMain(
      altFrames,
      undefined,
      false,
      frame.name.indexOf("layout:") === 0,
      false,
      true
    );
  }

  let effect = frame.getPluginData("effect");
  if (!effect) {
    if ((frame as any).type !== "COMPONENT") {
      effect = `<effect meta={{}} run={async () => {}} />`;
    }
  }

  if ((frame as any).type !== "COMPONENT") {
    html = `\
<>
${effect}
${html}
</>`;
  }

  const page = figma.currentPage;
  const target = JSON.parse(frame.getPluginData("target") || "{}");

  sendUI("upd-frame", {
    html,
    page: { id: page.id, name: page.name },
    frame: {
      type: frame.type,
      name: frame.name,
      id: frame.id,
      tag: altFrames[0].tagName,
      target: target,
      path: target.path,
      effect: effect,
    },
  });
};
const delayedUpdateFrame = throttle(updateFrame, 1000, { trailing: true });

const getFrameHtml = (frame?: any, replaceNode?: any) => {
  if (!frame) {
    frame = figma.currentPage.selection[0];
    while (frame.parent !== figma.currentPage) {
      frame = frame.parent;
    }
  }

  const altNodes = convertIntoAltNodes([frame], null, false);
  const html = tailwindMain(
    altNodes,
    undefined,
    false,
    false,
    false,
    true,
    replaceNode
  );

  return html;
};

// get html for the frame with current node replaced with <##<NODE-HTML>##>
const getNodeHtml = (node: any) => {
  let frame: any = node;
  while (frame.parent !== figma.currentPage) {
    frame = frame.parent;
  }

  if (frame.type === "FRAME") {
    if (frame.layoutMode === "NONE") {
      frame.layoutMode = "VERTICAL";
    }

    if (frame.primaryAxisSizingMode !== "FIXED") {
      frame.primaryAxisSizingMode = "FIXED";
    }

    if (frame.counterAxisSizingMode !== "FIXED") {
      frame.counterAxisSizingMode = "FIXED";
    }
  }

  const altNodes = convertIntoAltNodes([node], null, true);

  let html = tailwindMain(
    altNodes,
    undefined,
    false,
    false,
    true,
    node.id === frame.id
  );

  let rawHtml = html;
  if (node.id !== frame.id) {
    const rawNodes = convertIntoAltNodes([node]);
    rawHtml = tailwindMain(rawNodes, undefined, false, false, false, false);
  }

  return { html, rawHtml, props: get(altNodes, "0.props") || {} };
};

const sendUI = (type: string, data: any, ws?: boolean) => {
  figma.ui.postMessage({ type, data, ws });
};

const findChildren = (target: ComponentNode) => {
  let result = false;
  const scan = (e: any) => {
    if (e.name === "children") result = true;
    if (e && e.children) {
      for (let i of e.children) {
        scan(i);
      }
    }
  };
  scan(target);

  return result;
};

const getPages = () => {
  const pages = {};
  for (let x of figma.root.children) {
    pages[x.name] = [];
    for (let y of x.children) {
      if ((y.type === "FRAME" || y.type === "COMPONENT") && !!y.name) {
        pages[x.name].push(y.name);
      }
    }
  }
  return pages;
};
start();
