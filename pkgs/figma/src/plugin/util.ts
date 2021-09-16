export const findFrameTree = (nodes: readonly SceneNode[], findId: string) => {
  let found = nodes.find((x) => x.id === findId);
  if (!found) {
    for (let node of nodes) {
      if (Array.isArray((node as any).children)) {
        let temp = findFrameTree((node as any).children, findId);
        if (!!temp) {
          found = node;
          break;
        }
      }
    }
  }
  return found as FrameNode;
};

export const findParent = () => {
  let parent;
  if (!!figma.currentPage.selection[0].parent?.id) {
    parent = figma.currentPage.selection[0].parent;
    if (figma.currentPage.selection[0].parent.id === figma.currentPage.id) {
      parent = figma.currentPage.selection[0];
    }
  }

  return parent;
};

export const applyLayout = (frame: FrameNode, update?: boolean) => {
  const layout = {
    id: frame.getPluginData("layout-id"),
    enabled: frame.getPluginData("layout-enabled"),
  };

  const removeFrameExceptChildren = () => {
    const childrens = [];

    let childs = frame.findAll((c) => {
      return c.name.toLowerCase().indexOf("children") === 0;
    });

    if (childs.length > 0) {
      for (let children of childs as FrameNode[]) {
        for (let c of children.children) {
          childrens.push(c.clone());
          c.remove();
        }
      }
    }
    for (let i of frame.children) {
      i.remove();
    }

    for (let i of childrens) {
      frame.appendChild(i);
    }
  };

  const addLayout = () => {
    let layoutFrame: FrameNode = null;
    for (let page of figma.root.children) {
      if (page.name.toLowerCase().indexOf("component") >= 0) {
        for (let frame of page.children) {
          if (frame.id === layout.id && frame.type === "FRAME") {
            layoutFrame = frame;
            break;
          }
        }
      }
    }
    if (layoutFrame) {
      const childrens = [];
      for (let c of frame.children) {
        childrens.push(c.clone());
        c.remove();
      }

      for (let c of layoutFrame.children) {
        if (!c.visible) continue;
        if (c.type === "COMPONENT") {
          frame.appendChild(c.createInstance());
        } else {
          frame.appendChild(c.clone());
        }
      }

      let childs = frame.findAll((c) => {
        return c.name.toLowerCase().indexOf("children") === 0;
      });

      if (childs.length > 0) {
        for (let children of childs as FrameNode[]) {
          for (let c of children.children) {
            c.remove();
          }

          for (let c of childrens) {
            children.appendChild(c);
          }
        }
      }

      copyStyle(layoutFrame, frame);
    }
  };

  if (layout.id && layout.enabled === "y") {
    if (!frame.getPluginData("old-layout")) {
      frame.setPluginData(
        "old-layout",
        JSON.stringify({
          width: frame.width,
          height: frame.height,
        })
      );
    }

    if (update) {
      removeFrameExceptChildren();
    }

    addLayout();
  } else {
    removeFrameExceptChildren();
    restoreOldLayout(frame);
    if (figma.currentPage.selection.length === 0) {
      figma.currentPage.selection = [frame];
    }
  }
};

const restoreOldLayout = (frame: FrameNode) => {
  let raw = frame.getPluginData("old-layout");
  if (raw) {
    const l: { width: number; height: number } = JSON.parse(raw);
    frame.resize(l.width, l.height);
  }
  frame.setPluginData("old-layout", "");
};

const copyStyle = (from: FrameNode, to: FrameNode) => {
  to.resize(from.width, from.height);
};
