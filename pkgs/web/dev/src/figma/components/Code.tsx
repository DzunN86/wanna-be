/** @jsx jsx */
import { parse } from "@babel/parser";
import type babelTraverse from "@babel/traverse";
import type { JSXElement } from "@babel/types";
import { jsx } from "@emotion/react";
import { Spinner } from "@fluentui/react";
import Editor, { loader, useMonaco } from "@monaco-editor/react";
import { waitUntil } from "libs";
import { action, runInAction, toJS } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import {
  getPrettier,
  jsxCSS,
  registerAutoCloseTag,
  registerAutoFormat,
} from "web.dev/src/internal/TemplateCode";
import { loadExt } from "web.utils/src/loadExt";
import { BaseWindow } from "../../../../init/src/window";
import { registerMonacoType } from "../../libs/registerMonacoType";
import { loadComp } from "../tabs/PAGETab";
import { sendParent } from "../ws";
import { getRootData } from "./util";

declare const window: BaseWindow;

loader.config({
  paths: { vs: "/__ext/monaco/vs" },
});

export const Code = observer(({ node, updateIsWrong }: any) => {
  const mounted = useRef(true);
  const monaco: any = useMonaco();
  const meta = useLocalObservable(() => ({
    html: node.html,
    "font-size": 10,
    fontLoaded: false,
    ready: false,
    css: {
      class: "",
      style: "",
    },
  }));
  const _ = useRef({
    focused: false,
  });
  const internal = _.current;
  const { id } = node;
  const generate = useRef(null as any);
  const traverse = useRef(null as any);
  const prettier = useRef(null as any);
  const format = useRef(null as any);
  const disposeHover = useRef(null as any);

  useEffect(() => {
    runInAction(() => {
      meta.ready = false;
    });
    (async () => {
      await waitUntil(
        () => generate.current && traverse.current && prettier.current
      );
      if (node && node.html) {
        const { html, props } = node.html;
        try {
          const final = await prepareHtml(
            node,
            html,
            props,
            generate.current,
            traverse.current,
            prettier.current
          );

          runInAction(() => {
            if (!internal.focused) {
              meta.html = final.html;
            }
            meta.css.style = final.style;
            meta.css.class = final.class;
            meta.ready = true;
          });
        } catch (e) {
          meta.ready = true;
          meta.html = html;
        }
      }
    })();
  }, [node]);

  useEffect(() => {
    (async () => {
      const emmet = await loadExt("dev/emmet.js");
      if (monaco && !monaco.isPluginRegistered) {
        registerAutoCloseTag(monaco);
        emmet.emmetHTML(monaco);
        monaco.isPluginRegistered = true;
        format.current = await registerAutoFormat(monaco);
      }
      if (monaco && !monaco.isTypeRegistered) {
        registerMonacoType(monaco);
      }
    })();
  }, [monaco]);

  useEffect(() => {
    getPrettier().then((e) => {
      prettier.current = e;
    });
    (import("@babel/generator") as any).then((e) => {
      generate.current = e.default.default;
    });
    (import("@babel/traverse") as any).then((e) => {
      traverse.current = e.default.default;
    });

    getRootData(meta, "font-size", 10).then(
      action(() => (meta.fontLoaded = true))
    );

    return () => {
      if (disposeHover.current && disposeHover.current.dispose) {
        disposeHover.current.dispose();
      }
      const cleanup = () => {
        mounted.current = false;
        window.devFormatCode = undefined;
      };
      cleanup();
    };
  }, []);

  const editorRef = useRef(null as any);
  const compRef = useRef(null as any);
  if (!meta.ready || !meta.fontLoaded) {
    return (
      <div className="items-center justify-center flex absolute inset-0">
        <Spinner />
      </div>
    );
  }

  const getWrapCode = (src: string) => {
    if (format.current) {
      src = format.current(src);
    }
    let value = src;
    let props: any = false;
    const res = applyNode(
      node,
      src,
      generate.current,
      traverse.current,
      prettier.current
    );
    if (res) {
      value = res.wrapCode;
      props = res.result.props;
      props.style = res.style;
      props.class = res.className;
    }
    return { wrapCode: value, props };
  };

  return (
    <div className="flex flex-col flex-1" css={jsxCSS}>
      <Editor
        className="flex-1"
        loading={<Spinner />}
        height={`100%`}
        options={{
          fontFamily:
            '"Jetbrains Mono","SF Mono",Monaco,Menlo,Consolas,"Ubuntu Mono","Liberation Mono","DejaVu Sans Mono","Courier New",monospace',
          wordWrap: "on",
          glyphMargin: false,
          tabSize: 2,
          minimap: { enabled: false },
          fontSize: meta["font-size"],
          lineNumbers: "off",
          folding: false,
          overviewRulerLanes: 0,
          scrollbar: {
            vertical: "auto",
            verticalScrollbarSize: 3,
            // arrowSize: 10,
            horizontal: "hidden",
          },
          suggest: {
            showFiles: false,
          },
          smoothScrolling: true,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
        }}
        onMount={async (editor, monaco) => {
          editorRef.current = editor;

          editor.onDidFocusEditorText(async () => {
            window.figmaSaveCode = async () => {
              internal.focused = true;
              await waitUntil(() => window.figmaHtmlForCode);
              const wrap = getWrapCode(editor.getValue());
              const res = window.figmaHtmlForCode;
              const raw = res.html;

              const nodeHtml = (await sendParent("get-node-html", wrap)) as any;
              nodeHtml.html = await prettier.current(nodeHtml.html);
              window.figmaSetMeta((meta) => {
                meta.node.html = nodeHtml;
              });

              const html = prettier.current(
                raw.replace("<##<NODE-HTML>##>", nodeHtml.rawHtml)
              );

              const payload: any = {
                page: res.page,
                frame: res.frame.name,
                html,
                path: res.path,
              };

              if (res.frame.type === "COMPONENT") {
                if (!compRef.current) {
                  const raw = await loadComp({ name: res.frame.target.name });
                  compRef.current = raw.comp;
                }
                payload.component = {
                  wrapper: res.frame.effect,
                  name: res.frame.target.name,
                  comp: toJS(compRef.current),
                };
              }
              window.figmaWS.call("upd-frame", payload);
              window.figmaJustSaved();
            };
            window.figmaHtmlForCode = (await sendParent(
              "html-for-code"
            )) as any;
          });
          editor.onDidBlurEditorText(() => {
            internal.focused = false;
            runInAction(() => {
              meta.html = editor.getValue();
            });
            delete window.figmaSaveCode;
            delete window.figmaHtmlForCode;
          });

          await import("web.dev/src/libs/jsx-syntax");
          (window as any).jsxSyntax(editor, monaco);
          if (disposeHover.current && disposeHover.current.dispose) {
            disposeHover.current.dispose();
          }
          disposeHover.current = monaco.languages.registerHoverProvider(
            "typescript",
            {
              provideHover: function (model, position) {
                const rangeValue = model.getValueInRange({
                  startColumn: Math.max(0, position.column - 10),
                  endColumn: position.column + 10,
                  startLineNumber: position.lineNumber,
                  endLineNumber: position.lineNumber,
                });

                const modes = ["class", "style"];
                let idx = -1;
                let mode = "";
                for (let m of modes) {
                  const rv = Math.max(rangeValue.indexOf("[${m}]"), 0);
                  const offset = Math.max(0, position.column - 10);
                  if (rangeValue.indexOf(`[${m}]`) >= 0) {
                    idx = offset + rv;
                    mode = m;
                  }
                }

                if (idx >= 0 && mode && meta.css[mode]) {
                  try {
                    const val = JSON.parse(meta.css[mode]);
                    return {
                      range: new monaco.Range(
                        position.lineNumber,
                        idx,
                        position.lineNumber,
                        `[${mode}]`.length
                      ),
                      contents: [
                        {
                          value: !!val
                            ? `[${mode}] = ${val}`
                            : `No ${mode} generated`,
                          isTrusted: true,
                        },
                      ],
                    };
                  } catch (e) {
                    console.log(meta.css[mode]);
                  }
                }

                return null;
              },
            }
          );
          editor.trigger("*", "editor.action.formatDocument", undefined);
        }}
        defaultLanguage={"typescript"}
        onChange={async (src) => {
          clearTimeout(window.figmaCodeIsTyping);
          window.figmaCodeIsTyping = setTimeout(async () => {
            const wrap = getWrapCode(src);
            updateIsWrong(
              wrap ? wrap.wrapCode : src.indexOf("<<component>>") < 0
            );

            if (wrap)
              await sendParent("set-code-data", {
                node_id: id,
                wrapCode: wrap.wrapCode,
                props: wrap.props,
              });
          }, 300);
        }}
        value={meta.html}
      />
    </div>
  );
});

const prepareHtml = async (
  node: any,
  html: string,
  props: any,
  generate: any,
  traverse: any,
  prettier: any
) => {
  const inherit = node.inherit;
  let style = "";
  let className = "";

  let code = html;

  const parsedHtml = applyNode(node, html, generate, traverse, prettier);
  style = parsedHtml.style;
  className = parsedHtml.className;
  code = parsedHtml.result.code;
  if (parsedHtml.wrapCode) {
    code = parsedHtml.wrapCode.replace("<<component>>", code);
  }
  return {
    html: code,
    class: className,
    style: style,
  };
};

const defaultInheritProp = (
  name: string,
  inherit: { style: boolean; class: boolean }
) =>
  ({
    type: "JSXExpressionContainer",
    expression: {
      type: "TemplateLiteral",
      expressions: [],
      quasis: [
        {
          type: "TemplateElement",
          value: inherit[name]
            ? { raw: `[${name}]`, cooked: `[${name}]` }
            : { raw: ``, cooked: `` },
          tail: true,
        },
      ],
    },
  } as any);

const applyNode = (
  node: any,
  source: string,
  generate: (ast: any) => { code: any },
  traverse: typeof babelTraverse,
  prettier: any
) => {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  let style = "";
  let className = "";
  let result = { code: "", props: {} };
  let lastJSXNode = null;
  let nodeResult = null;
  traverse(ast, {
    enter(path) {
      if (path.node && path.node.type === "JSXElement") {
        lastJSXNode = path.node;
        if (path.node.openingElement.name.type === "JSXIdentifier") {
          if (path.node.openingElement.name.name === node.tag || !node.tag) {
            let jsx = path.node;
            const inherit = node.inherit;
            const { props } = node.html;
            nodeResult = jsx;

            jsx.openingElement.attributes = jsx.openingElement.attributes
              .map((p) => {
                if (
                  p.type === "JSXAttribute" &&
                  p.name.type === "JSXIdentifier"
                ) {
                  const name = p.name.name;

                  if (["style", "class"].indexOf(name) >= 0) {
                    const output = generate(p.value).code;

                    if (name === "style") style = output;
                    if (name === "class") className = output;
                    if (!props[name]) {
                      p.value = defaultInheritProp(name, inherit);
                    } else {
                      let attr = props[name];

                      if (node.html.props) {
                        if (name === "style") {
                          if (attr.indexOf("[style]") < 0) {
                            attr = replaceFirstQuote(
                              node.html.props.style,
                              "[style]"
                            );
                          }

                          if (!inherit.style) {
                            attr = attr.replace("[style]", "").trim();
                          }
                        }

                        if (name === "class") {
                          if (attr.indexOf("[class]") < 0) {
                            attr = replaceFirstQuote(
                              node.html.props.class,
                              "[class]"
                            );
                          }

                          if (!inherit.class) {
                            attr = attr.replace("[class]", "").trim();
                          }
                        }
                      }

                      attr = attr.replace(/\"\s*(.*)\s*\"/gi, '"$1"');

                      if (
                        !attr.trim() ||
                        attr === "{``}" ||
                        attr === "''" ||
                        attr === '""'
                      ) {
                        return false;
                      }

                      const parsed = parse(`<div a=${attr} />`, {
                        sourceType: "module",
                        plugins: ["jsx"],
                      });
                      const stmts = parsed.program.body;
                      if (
                        stmts[0].type === "ExpressionStatement" &&
                        stmts[0].expression.type === "JSXElement" &&
                        stmts[0].expression.openingElement.attributes[0]
                          .type === "JSXAttribute"
                      ) {
                        p.value =
                          stmts[0].expression.openingElement.attributes[0].value;
                      }
                    }
                  }
                }
                return p;
              })
              .filter((p) => {
                if (!p) return false;
                if (
                  p.type === "JSXAttribute" &&
                  p.name.type === "JSXIdentifier"
                ) {
                  if (["style", "class"].indexOf(p.name.name) >= 0) {
                    const output = generate(p.value).code;
                    if (output === '""') return false;
                  }
                }
                return true;
              }) as any;
          }
        }
      }
    },
  });

  let finalNode = nodeResult;
  // if (!finalNode) finalNode = lastJSXNode

  if (finalNode && finalNode.type) {
    result = parseJSXElement(finalNode, generate);
    finalNode.type = "StringLiteral";
    finalNode.value = "<<component>>";
  }

  let wrapCode = generate(ast).code;
  wrapCode = wrapCode.replace('"<<component>>"};', "<<component>>}");
  wrapCode = wrapCode.replace('"<<component>>");', "<<component>>)");
  wrapCode = wrapCode.replace('"<<component>>";', "<<component>>");
  wrapCode = wrapCode.replace('"<<component>>"', "<<component>>");
  if (wrapCode[wrapCode.length - 1] === ";") {
    wrapCode = wrapCode.substr(0, wrapCode.length - 1);
  }

  wrapCode = prettier(wrapCode);
  wrapCode = wrapCode.replace(/\>\s*\;/gi, ">");
  wrapCode = wrapCode.replace(/\;\s*\}/gi, "}");

  return { wrapCode, result, style, className };
};

const parseJSXElement = (fnode: JSXElement, generate) => {
  const props: any = {};
  let code = "";
  let children: any = [];
  if (fnode.type === "JSXElement") {
    let node = fnode;
    for (let p of node.openingElement.attributes) {
      if (p.type === "JSXAttribute" && p.name.type === "JSXIdentifier") {
        const output = generate(p.value, {}).code;
        props[p.name.name] = output;
      }
    }
    const output = generate(node, {});
    for (let c of node.children) {
      children.push(generate(c, {}).code);
    }

    if (children.length > 0) {
      const childrenSource = children.join(" ").trim();
      props.children = childrenSource;
    }
    code = output.code;
  }
  return { props, code };
};

const replaceFirstQuote = (text: string, replace: string) => {
  const quotes = {
    '"': -1,
    "'": -1,
    "`": -1,
  };

  Object.keys(quotes).forEach((e) => {
    quotes[e] = text.indexOf(e);
  });

  const q = Object.entries(quotes)
    .sort((a, b) => {
      return b[1] - (1)[1];
    })
    .shift();

  return text.replace(q[0], `${q[0]}${replace} `);
};
