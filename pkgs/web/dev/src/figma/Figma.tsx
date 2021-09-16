/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import { Label } from "@fluentui/react";
import { action, runInAction, toJS } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { FiMaximize2 } from "react-icons/fi";
import { initFluent } from "web.init/src/web/initFluent";
import { api } from "web.utils/src/api";
import type { WSFigmaClient } from "web.utils/src/figmaClient";
import { loadExt } from "web.utils/src/loadExt";
import { useRender } from "web.utils/src/useRender";
import type { BaseWindow } from "../../../init/src/window";
import { getPrettier } from "../internal/TemplateCode";
import { Nav } from "./components/Nav";
import { Status } from "./components/Status";
import { CODETab } from "./tabs/CODETab";
import { CSSTab } from "./tabs/CSSTab";
import { EFFECTTab } from "./tabs/EFFECTTab";
import { loadComp, PAGETab } from "./tabs/PAGETab";
import { SETTINGSTab } from "./tabs/SETTINGSTab";
import { sendParent, wsUI } from "./ws";

declare const window: BaseWindow;

type IPage = { id: string; name: string };
type IFrame = {
  id: string;
  name: string;
  type: string;
  effect: string;
  comp?: {
    fallback: string;
    type: "import" | "require";
  };
};
type INode = { id: string; name: string };

export default observer(() => {
  const meta = useLocalObservable(() => ({
    menu: localStorage["menu"] || "page",
    init: true,
    mini: false,
    lastUpdated: {} as any,
    page: {} as null | IPage,
    frame: {} as null | IFrame,
    node: {} as null | INode,
    ready: true,
    pageTarget: null as any,
    pageHtml: "",
  }));
  const render = useRender();
  const forceRender = action(() => {
    meta.ready = false;
    setTimeout(() => {
      meta.ready = true;
    });
  });
  const prettier = useRef(null as any);
  const ws = useRef(null as unknown as WSFigmaClient);
  window.figmaWS = ws.current;
  window.figmaSetMeta = (props: (meta: any) => void) => {
    runInAction(() => {
      props(meta);
    });
  };
  window.figmaJustSaved = () => {
    runInAction(() => {
      if (meta.frame) meta.lastUpdated[meta.frame.id] = new Date().getTime();
    });
  };

  const isConnected = () =>
    ws.current && ws.current.readyState === WebSocket.OPEN;
  const wsEvents = useRef({
    "dev-disconnect": () => {
      if (ws.current) ws.current.meta.docId = "";
      render();
    },
    "dev-connect": () => {
      sendParent("reinit");
    },
    "get-image": async (data) => {
      sendParent("get-image", data);
    },
    "get-bg-image": async (data) => {
      sendParent("get-bg-image", data);
    },
    "get-updates": async (data) => {
      ws.current.meta.updates = data;
      render();
    },
    "req-html": async (data: {
      docId: string;
      page: string;
      frame: string;
    }) => {
      const res: any = await sendParent("req-html", data);
      ws.current.call("req-html", res);
    },
  });
  useEffect(() => {
    if (meta.frame && meta.frame.id) {
      sendParent("get-frame-html-target").then(
        action((e: any) => {
          const html = prettier.current ? prettier.current(e.html) : e.html;
          meta.pageHtml = html;
          meta.pageTarget = e.target;
        })
      );
    } else {
      runInAction(() => {
        meta.pageHtml = "";
        meta.pageTarget = {};
      });
    }
  }, [meta.frame]);

  const reloadComponentWrapper = async (frame) => {
    const target = frame.target;
    if (meta.frame) {
      meta.frame.effect = "--loading--";
      const res = await api("/__cms/0/component-load", {
        path: target.path.endsWith(".html")
          ? target.path.substr(0, target.path.length - 5)
          : target.path,
        name: target.name,
      });
      return res.wrapperCode;
    }
    return "";
  };

  const pluginEvents = useRef({
    "res-image": async (e: { type: string; value: Uint8Array }) => {
      ws.current.call("res-image", e);
    },
    "res-bg-image": async (e: { type: string; value: Uint8Array }) => {
      ws.current.call("res-bg-image", e);
    },
    "set-select": action((e: { page: any; frame: any; node: any }) => {
      meta.page = e.page;
      meta.frame = e.frame;
      meta.node = e.node;

      if (
        e.frame &&
        e.frame.type === "COMPONENT" &&
        e.frame.target &&
        e.frame.target.path &&
        !e.frame.effect
      ) {
        reloadComponentWrapper(e.frame).then((res) => {
          if (meta.frame) {
            meta.frame.effect = res;
          }
        });
      }
    }),
    "upd-frame": async (e: {
      html: string;
      page: {
        name: string;
        id: string;
      };
      frame: {
        name: string;
        id: string;
        tag: string;
        type: string;
        path: string;
        effect: any;
        target: any;
      };
      node: {
        html: any;
      };
    }) => {
      if (e.html && e.page && e.frame) {
        window.figmaJustSaved();

        const html = prettier.current ? prettier.current(e.html) : e.html;
        const payload: any = {
          page: e.page.name,
          frame: e.frame.name,
          html,
          path: e.frame.path,
        };

        if (e.frame.type === "COMPONENT") {
          if (!meta.frame?.comp) {
            const raw = await loadComp({ name: e.frame.target.name });
            runInAction(() => {
              if (meta.frame) meta.frame.comp = raw.comp;
            });
          }
          if (meta.frame) {
            payload.component = {
              wrapper: e.frame.effect,
              name: e.frame.target.name,
              comp: toJS(meta.frame.comp),
            };
          }
        }

        ws.current.call("upd-frame", payload);
      }
    },
  });

  const updateFrame = async () => {
    if (window.figmaSaveCode) {
      return window.figmaSaveCode();
    }

    if (meta.frame) {
      runInAction(() => {
        if (meta.frame) meta.lastUpdated[meta.frame.id] = new Date().getTime();
      });

      if (meta.frame.type === "COMPONENT") {
        await sendParent("upd-component", { id: meta.frame.id });
      }

      if (meta.frame.name.toLowerCase().indexOf("layout:") === 0) {
        await sendParent("upd-layout-instances");
      }

      await sendParent("upd-frame");
    }
  };

  useEffect(
    action(() => {
      sendParent("win-resize", {
        value: localStorage["win-size"] || "260x230",
      });

      const keydown = function (e) {
        if (
          (window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) &&
          e.keyCode == 83
        ) {
          e.preventDefault();
          updateFrame();
        }
      };
      document.addEventListener("keydown", keydown, false);

      getPrettier().then((e) => {
        prettier.current = e;
      });

      loadExt(`dev/buffer.js`).then((buffer) => {
        (window as any).Buffer = buffer;
      });
      if (!(window as any).fluentInit) {
        initFluent().then(
          action(() => {
            meta.init = true;
          })
        );
      } else {
        meta.init = true;
      }
      wsUI({ ws, wsEvents, pluginEvents, isConnected, render });

      return () => {
        document.removeEventListener("keydown", keydown);
      };
    }),
    []
  );

  if (!ws.current || !meta.init)
    return (
      <div className="font-medium text-xs flex flex-1 items-center justify-center">
        Connecting...
      </div>
    );

  if (!meta.ready) return null;

  if (meta.mini) {
    return (
      <div
        className="w-full select-none overflow-hidden flex flex-col"
        css={css`
          height: 100vh;
        `}
      >
        <div
          className="flex flex-row self-stretch flex-1 hover:bg-blue-100 items-center justify-center text-md cursor-pointer"
          onClick={() => {
            runInAction(() => {
              meta.mini = false;
            });
            sendParent("toggle-resize");
          }}
        >
          <FiMaximize2 />
        </div>
        <Status
          menu={meta.menu}
          selected={!!meta.node}
          frame={meta.frame}
          update={updateFrame}
          mini={meta.mini}
          forceRender={forceRender}
          lastUpdate={meta.frame ? meta.lastUpdated[meta.frame.id] : 0}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full select-none overflow-hidden flex flex-col"
      css={css`
        height: 100vh;
      `}
    >
      <Nav
        connected={isConnected()}
        menu={meta.menu}
        mini={meta.mini}
        forceRender={forceRender}
        frame={meta.frame}
        onSelect={async (menu: string) => {
          if (menu === "code") {
            runInAction(() => {
              meta.node = null;
            });
            await sendParent("trigger-select");
          }

          runInAction(() => {
            meta.menu = menu;
            localStorage["menu"] = menu;
          });
        }}
      />
      <div className="flex flex-1">
        {!meta.node && meta.menu !== "settings" ? (
          <Label className="font-medium text-gray-600 text-xs flex flex-1 items-center justify-center">
            Please select any object
          </Label>
        ) : (
          <div
            className="flex flex-1"
            css={css`
              .ms-Button {
                height: 20px;
                min-width: 50px;
                padding: 0px 6px;
                .ms-Button-label,
                .ms-Button-flexContainer {
                  font-size: 12px !important;
                }
              }

              .ms-TextField-fieldGroup {
                min-height: 24px;
                .ms-TextField-field {
                  font-size: 13px;

                  &::placeholder {
                    font-size: 13px;
                  }
                }
              }
            `}
          >
            {
              {
                page: (
                  <PAGETab
                    node={
                      meta.page &&
                      meta.frame && {
                        docId: ws.current.meta.docId,
                        page: meta.page.name,
                        frame: meta.frame.name,
                        type: meta.frame.type,
                        id: meta.frame.id,
                      }
                    }
                    frame={meta.frame}
                    target={meta.pageTarget}
                    html={meta.pageHtml}
                  />
                ),
                css: <CSSTab node={meta.node} />,
                code: (
                  <CODETab
                    node={meta.node}
                    page={meta.page}
                    frame={meta.frame}
                  />
                ),
                effect: (
                  <EFFECTTab
                    node={meta.frame}
                    loading={meta.frame?.effect === "loading"}
                  />
                ),
                settings: <SETTINGSTab />,
                info: <Info node={meta.node} />,
              }[meta.menu]
            }
          </div>
        )}
      </div>
      <Status
        menu={meta.menu}
        selected={!!meta.node}
        frame={meta.frame}
        update={updateFrame}
        setMini={action((v) => {
          meta.mini = v;
        })}
        forceRender={forceRender}
        lastUpdate={meta.frame ? meta.lastUpdated[meta.frame.id] : 0}
      />
    </div>
  );
});

const Info = observer(({ node }: any) => {
  const meta = useLocalObservable(() => ({
    search: (window as any).infoSearch || "",
    alt: {},
  }));

  useEffect(() => {
    sendParent("get-alt-node").then(
      action((e: any) => {
        meta.alt = e.node;
      })
    );
  }, [node]);

  return (
    <div className="flex flex-1 flex-col">
      <input
        type="search"
        value={meta.search}
        onChange={action((e) => {
          (window as any).infoSearch = e.target.value;
          meta.search = e.target.value;
        })}
        placeholder={"Search Key"}
        spellCheck={false}
        className="text-xs p-1 border-b border-gray-300"
        css={css`
          margin-right: 2px;
        `}
      />
      <div className="whitespace-pre-wrap relative overflow-y-auto flex-1 flex flex-col items-stretch text-xs">
        <div className="absolute">
          {node &&
            JSON.stringify(
              meta.search
                ? Object.fromEntries(
                    Object.entries(meta.alt).filter(([k, v]) => {
                      return (
                        k.toLowerCase().indexOf(meta.search.toLowerCase()) >= 0
                      );
                    })
                  )
                : meta.alt,
              null,
              2
            )}
        </div>
      </div>
    </div>
  );
});
