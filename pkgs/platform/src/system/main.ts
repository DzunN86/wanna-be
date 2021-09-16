import { BabelFileResult, transformAsync } from "@babel/core";
import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { log } from "boot";
import { matchesUA } from "browserslist-useragent";
import { transform } from "esbuild";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { RouteGenericInterface } from "fastify/types/route";
import type http from "http";
import { waitUntil } from "libs";
import { get } from "lodash";
import { Packr } from "msgpackr";
import React from "react";
import { ext as extServer } from "server";
import { api } from "web.utils/src/api";
import { CustomGlobal } from "../server";
import { loadSession } from "../session";
import { serialize } from "../utils";
import { ICMSPage, system } from "./prepare";
import { renderCPX, renderLayout } from "./render-page";

const { db } = require("db");
declare const global: CustomGlobal;

const ext = (extServer as any).default ? (extServer as any).default : extServer;

export class CMS {
  public static cms_func_args = `(db, api, action, runAction, h, fragment, row, layout, user, params, css, meta)`;
  public ready = false;
  public started = false;
  private lazyComponents = new Map<any, null | any | Promise<any>>();

  window = {};
  async init() {
    if (this.ready || this.started) return;
    if (!(global as any).cleanupJSDOM) {
      (global as any).cleanupJSDOM = require("global-jsdom/register");
    }

    this.started = true;
    (global as any).jest = true;
    (global as any).React = React;

    this.ready = true;
  }

  async render(
    mode: "dev" | "prod",
    found: { params: any; page: ICMSPage | null },
    req: FastifyRequest<
      RouteGenericInterface,
      http.Server,
      http.IncomingMessage
    >,
    reply: FastifyReply<
      http.Server,
      http.IncomingMessage,
      http.ServerResponse,
      RouteGenericInterface,
      unknown
    >
  ) {
    await waitUntil(() => this.ready);

    const p = found.params || {};

    if (found.page) {
      if (found.page.server_on_load) {
        const defaultSOL =
          `async ({template, params, render, db, req, reply, user, log, ext, isDev, api }: Server) => {
          await render(template, params)
        }`.replace(/\s*/gi, "");

        if (found.page.server_on_load.replace(/\s*/gi, "") === defaultSOL) {
          found.page.server_on_load = "";
        }
      }

      const session = await loadSession(req, reply);
      const serverOnLoad = async (props: {
        render: (
          template: string,
          params: any,
          ssr?: { body: string; head: string }
        ) => Promise<any>;
        code: string;
        params?: any;
      }) => {
        const { render, code, params } = props;
        let server_on_load: any = () => {};
        try {
          let tcode = await transform(` ${code}`, {
            loader: "ts",
          });
          eval(`server_on_load = ${tcode.code}`);
          const finalParams = !!params ? params : p;
          await server_on_load({
            template: null,
            params: finalParams,
            render,
            db,
            req,
            reply,
            user: session,
            ext,
            api,
            isDev: p._devmode,
            log: (...args: any[]) => {
              let output = [];
              for (let i of args) {
                if (typeof i === "object") {
                  output.push(serialize(i));
                } else {
                  output.push(i);
                }
              }
              reply.send(output.join("\n"));
            },
          });
          return finalParams;
        } catch (e) {
          console.error(
            `Error when rendering server_on_load (on page # ${found.page.id}): \n`,
            e
          );
          reply.send({ error: e.toString() });
        }
      };

      if (found.page.server_on_load && found.page.type === "API") {
        return await serverOnLoad({
          render: async (_template, _params) => {},
          code: found.page.server_on_load,
        });
      }

      let pageTemplate = found.page.template;
      if (req.body) {
        pageTemplate = (req.body as any).raw;
      }
      if (p._devmode && p._action === "raw") {
        reply.type("text/raw");
        reply.send(pageTemplate);
        return;
      }

      return await this.renderInternal({
        page: found.page,
        params: p,
        req,
        reply,
        mode,
        serverOnLoad,
        pageTemplate,
        user: session,
      });
    }

    reply.send(`Template #${p._id} not found`);
  }

  async renderInternal(props: {
    page: ICMSPage;
    mode: "dev" | "prod";
    params: any;
    pageTemplate: string;
    serverOnLoad: (props: {
      render: any;
      code: string;
      params?: any;
    }) => Promise<any>;
    req: FastifyRequest<
      RouteGenericInterface,
      http.Server,
      http.IncomingMessage
    >;
    reply: FastifyReply<
      http.Server,
      http.IncomingMessage,
      http.ServerResponse,
      RouteGenericInterface,
      unknown
    >;
    user: any;
  }) {
    const { page, params, pageTemplate, user, mode, serverOnLoad, req, reply } =
      props;

    const layoutPage = system.cache.layout[page.layout_id];
    let [finalCode, childMeta] = await this.renderCode(
      req.headers["user-agent"],
      req.headers["x-render-layout"] === "yes"
        ? null
        : page.layout_id
        ? layoutPage.template
        : false,
      pageTemplate
    );

    if (req.headers["x-cpx-request"] === "yes") {
      const renderPage = async (
        params?: any,
        ssr?: { body: string; head: string }
      ) => {
        if (params === null) {
          // ngga ada params yg dipassing, berarti
          // ga server_on_load g perlu dijalankan
          // todo: mending ambil dari system.cache.pages aja biar kenceng
        }

        reply.type("application/javascript");
        reply.send(
          await renderCPX({
            layout_id: page.layout_id + "",
            page_id: page.id + "",
            params,
            page,
            finalCode,
            childMeta,
          })
        );
      };

      if (req.headers["x-cpx-params"] === "yes") {
        return await renderPage(req.body);
      } else if (!!page.server_on_load) {
        return await serverOnLoad({
          render: (_template: any, params: any, ssr: any) =>
            renderPage(params, ssr),
          code: page.server_on_load,
          params,
        });
      }
      return await renderPage();
    }

    const renderPage = async (
      rawParams: any,
      ssr?: { body: string; head: string }
    ) => {
      let params = rawParams || {};
      let final = "";
      let css: any = [];
      let root = (await system.root.html(req)) || "";

      if (ssr) {
        if (ssr.head) {
          if (ssr.head.indexOf("<title>") >= 0) {
            const regex = new RegExp("<title>(?:.|\n|\r)+?</title>");
            const oriheadRaw = (await system.root.html(req))?.match(regex);
            const orihead = oriheadRaw ? oriheadRaw[0] : "";
            root = root.replace(orihead, ssr.head);
          } else {
            const regex = new RegExp("<head>(?:.|\n|\r)+?</head>");
            const oriheadRaw = (await system.root.html(req))?.match(regex);
            const orihead = oriheadRaw ? oriheadRaw[0] : "";
            root = root.replace(orihead, ssr.head);
          }
        }

        if (ssr.body) {
          final = ssr.body;
        }
      }

      const result = await this.renderRoot({
        root,
        css,
        content: final,
        req,
        reply,
        id: get(page, "id", params._id),
        user,
        ssr: !!page.server_on_load,
        params,
      });

      reply.removeHeader("content-length");
      reply.type("text/html");
      reply.send(result);
    };

    if (page.server_on_load) {
      return await serverOnLoad({
        render: async (_template: any, params: any, ssr: any) => {
          return await renderPage(params, ssr);
        },
        code: page.server_on_load,
        params,
      });
    } else {
      return await renderPage(params);
    }
  }

  async api(
    url: string,
    body?: any,
    opt?: { method?: "GET" | "POST"; raw?: boolean }
  ) {
    const options: any = {
      method: get(opt, "method") || body ? "POST" : "GET",
      headers: {
        Accept: "application/json",
        "Sec-Fetch-Dest": "script",
        "get-server-props": "yes",
        "Content-Type": "application/json;charset=UTF-8",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (get(opt, "raw")) {
      return await res.text();
    }
    return await res.json();
  }

  async renderCode(ua: string, layoutHtml: any, childrenHtml: any) {
    const modernBrowser = matchesUA(ua, { browsers: ["Chrome > 45"] });
    const transformOpt = {
      presets: [
        [
          "@babel/preset-react",
          {
            pragma: "h",
            pragmaFrag: "fragment",
          },
        ],
        [
          "@babel/env",
          {
            targets: {
              browsers: [modernBrowser ? "defaults" : "Chrome <= 45"],
            },
            useBuiltIns: "entry",
            corejs: { version: "3.8", proposals: true },
          },
        ],
        [
          "@babel/preset-typescript",
          {
            isTSX: true,
            allExtensions: true,
            jsxPragma: "h",
            jsxPragmaFrag: "fragment",
            allowNamespaces: true,
          },
        ],
      ],
    };

    if (!childrenHtml) childrenHtml = "<div></div>";
    let childrenMeta = extractMeta(childrenHtml);
    let childrenTemplate: BabelFileResult = { code: "null" };
    try {
      childrenTemplate = await transformAsync(
        `const children = <>` +
          childrenHtml.replace(/<!--([\s\S])*?-->/g, "") +
          `</>`,
        transformOpt
      );
    } catch (e) {
      log("dev", "Error Parsing HTML:\n" + e);
    }

    if (childrenTemplate.code.startsWith(`"use strict";`)) {
      childrenTemplate.code = childrenTemplate.code
        .substr(`"use strict";`.length)
        .trim();
    }

    let final = `${
      layoutHtml !== null
        ? `
  ${childrenTemplate.code}
  return children;
  `
        : `
  const children = h("div", {"className": "m-2 p-2 border border-blue-200 bg-blue-100 text-center text-xs font-normal"}, "Children")
  return children
      `
    }`;

    return [final, childrenMeta];
  }

  async renderRoot(props: {
    root: string;
    css: string[];
    content: string;
    req: FastifyRequest;
    reply: FastifyReply;
    id: number;
    user: any;
    ssr: boolean;
    params: any;
  }): Promise<string> {
    const { root, css, content, ssr, req, id, user, params } = props;

    if (root) {
      let body = root.replace(
        /\<div id=\"root\"(.*)\>(.*)\<\/div>/,
        `<div id="root">${content}</div>`
      );

      const cssLinks = [
        global.mode === "prod" ? "/main.css" : "/index.css",
        ...css.map((e) => {
          if (e === "." || e === "/") {
            return e;
          } else {
            return `/node/${e}`;
          }
        }),
      ];

      body = body.replace(
        "</title>",
        `</title>\
        ${cssLinks
          .map((e) => {
            return `<link rel="stylesheet" href="${e}"/>`;
          })
          .join("\n")}`
      );

      const initialData = {
        build_id: system.build_id,
        user: user.user || { role: "guest" },
        params: ssr ? params : undefined,
        cms_id: id,
        cms_layouts: await generateAvailableLayouts(req.headers["user-agent"]),
        cms_pages: generateAvailablePages(),
        is_dev: global.mode === "dev",
        secret: global.secret,
      };

      const packer = new Packr({
        variableMapSize: true,
        mapsAsObjects: true,
        encodeUndefinedAsNil: true,
        largeBigIntToFloat: true,
        useRecords: true,
        useTimestamp32: true,
      });

      body = body.replace(
        "</title>",
        `</title><script id="main-script"> window.cms_base_pack = ${JSON.stringify(
          packer.pack(initialData).toJSON().data
        )}</script>`
      );

      return body;
    }
    return "";
  }

  static new = async () => {
    if (!global.cmsInstance) {
      global.cmsInstance = new CMS();
    }
    global.cmsInstance.ready = false;
    global.cmsInstance.started = false;
    await global.cmsInstance.init();
  };
  static get = (): CMS => {
    return global.cmsInstance;
  };
  static dispose() {
    if (typeof (global as any).cleanupJSDOM === "function") {
      (global as any).cleanupJSDOM();
    }
  }
}

const generateAvailablePages = () => {
  const result = {};
  for (let [k, v] of Object.entries(system.cache.pages)) {
    if (v.slug) {
      result[v.slug] = {
        id: k,
        layout_id: v.layout_id,
        ssr: !!v.server_on_load,
      };
    }
  }
  return result;
};

const generateAvailableLayouts = async (ua: string) => {
  const result = {};
  for (let [k, v] of Object.entries(system.cache.layout)) {
    if (v) {
      result[v.id] = {
        name: v.name,
        source: await renderLayout({
          finalCode: v.template,
          layout_id: v.id,
          ua,
        }),
      };
    }
  }
  return result;
};

export const extractMeta = (code: string) => {
  try {
    const parsed = parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
    const expr = parsed.program.body[0];
    let meta = "";

    traverse(parsed, {
      enter: (path) => {
        const c = path.node;
        if (
          c.type === "JSXElement" &&
          c.openingElement.name.type === "JSXIdentifier"
        ) {
          if (c.openingElement.name.name === "effect") {
            for (let a of c.openingElement.attributes) {
              if (
                a.type === "JSXAttribute" &&
                a.name.type === "JSXIdentifier" &&
                a.name.name === "meta" &&
                a.value.type === "JSXExpressionContainer"
              ) {
                meta = generate(a.value.expression, {}).code;
              }
            }
          }
        }
      },
    });

    return meta || "{}";
  } catch (e) {
    log("dev", "Error while parsing meta...");
    // console.log(e)
  }
};
