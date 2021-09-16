/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import { Label } from "@fluentui/react";
import { action, runInAction } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { FiMinimize2, FiPlus, FiSettings } from "react-icons/fi";
import { ImArrowDownRight2 } from "react-icons/im";
import { TiInfoLargeOutline } from "react-icons/ti";
import { sendParent } from "../ws";

export const Nav = observer(
  ({ menu, onSelect, frame, connected, forceRender, setMini }: any) => {
    const meta = useLocalObservable(() => ({
      "win-size": "260x230",
      resizing: false,
      get winh() {
        return parseInt(meta["win-size"].split("x")[1]);
      },
      get winw() {
        return parseInt(meta["win-size"].split("x")[0]);
      },
    }));

    const dragging = useRef(
      false as false | { x: number; y: number; w: number; h: number }
    );

    useEffect(() => {
      meta["win-size"] = localStorage["win-size"] || "260x320";
      if (meta["win-size"].indexOf("NaN") >= 0) {
        meta["win-size"] = "260x320";
      }
    }, []);

    return (
      <div
        className="select-none items-stretch justify-between flex border-gray-200 border-b"
        css={css`
          height: 30px;
          padding: 5px 0px;
        `}
      >
        {meta.resizing && (
          <div
            className="fixed inset-0 z-20 bg-white opacity-50"
            css={css`
              cursor: se-resize;
            `}
            onMouseMove={(e) => {
              const d = dragging.current;

              if (d) {
                const dx = d.x - e.clientX;
                const dy = d.y - e.clientY;
                const size = `${Math.max(230, d.w - dx)}x${Math.max(
                  d.h - dy,
                  150
                )}`;
                localStorage["win-size"] = size;
                sendParent("win-resize", { value: size });
                runInAction(() => {
                  meta["win-size"] = size;
                });
              } else {
                dragging.current = {
                  x: e.clientX,
                  y: e.clientY,
                  w: meta.winw,
                  h: meta.winh,
                };
              }
            }}
            onMouseLeave={action(() => {
              meta.resizing = false;
              dragging.current = false;
            })}
            onMouseUp={action(() => {
              meta.resizing = false;
              dragging.current = false;
              forceRender();
            })}
          ></div>
        )}
        {connected ? (
          <div
            className="flex flex-row items-stretch"
            css={css`
              width: 200px;
            `}
          >
            <div
              className="flex flex-row items-center justify-center"
              onMouseDown={action((e) => {
                dragging.current = {
                  x: e.clientX,
                  y: e.clientY,
                  w: meta.winw,
                  h: meta.winh,
                };
                meta.resizing = true;
              })}
              css={css`
                border-right: 1px solid #ccc;
                min-width: 20px;
                height: 34px;
                margin-top: -10px;
                cursor: se-resize;
              `}
            >
              <ImArrowDownRight2
                size={9}
                css={css`
                  margin: 3px 2px 0px 0px;
                `}
              />
            </div>
            <Label
              css={css`
                font-size: 10px;
                min-width: 35px;
              `}
              onClick={() => onSelect("page")}
              className={
                `${menu === "page" ? "bg-gray-200 " : ""} ` +
                "cursor-pointer rounded-md flex-1 hover:bg-gray-100 mx-1 flex items-center justify-center"
              }
            >
              PAGE
            </Label>
            <Label
              css={css`
                font-size: 10px;
                min-width: 35px;
              `}
              onClick={() => onSelect("code")}
              className={
                `${menu === "code" ? "bg-gray-200 " : ""} ` +
                "cursor-pointer rounded-md flex-1 hover:bg-gray-100 mx-1 flex items-center justify-center"
              }
            >
              CODE
            </Label>
            <Label
              css={css`
                font-size: 10px;
                min-width: 35px;
              `}
              onClick={() => onSelect("css")}
              className={
                `${menu === "css" ? "bg-gray-200 " : ""} ` +
                "cursor-pointer rounded-md text-bold flex-1 hover:bg-gray-100 mx-1 flex items-center justify-center"
              }
            >
              CSS
            </Label>
            {frame &&
              ((frame.type === "COMPONENT" &&
                frame.target &&
                frame.target.name) ||
                frame.type !== "COMPONENT") && (
                <Label
                  css={css`
                    padding: 0px 4px;
                    min-width: 45px;
                    font-size: 10px;
                  `}
                  onClick={() => onSelect("effect")}
                  className={
                    `${menu === "effect" ? "bg-gray-200 " : ""} ` +
                    "cursor-pointer rounded-md flex-1 hover:bg-gray-100 mx-1 flex items-center justify-center"
                  }
                >
                  {!frame || (frame && frame.type !== "COMPONENT")
                    ? "EFFECT"
                    : "PROPS"}
                </Label>
              )}
            <Label
              css={css`
                width: 16px;
              `}
              onClick={() => onSelect("info")}
              className={
                `${menu === "info" ? "bg-gray-200 " : ""} ` +
                "cursor-pointer rounded-md hover:bg-gray-100 mx-1 flex items-center justify-center"
              }
            >
              <TiInfoLargeOutline size={12} />
            </Label>
          </div>
        ) : (
          <Label className="font-medium text-xs flex flex-1 items-center ml-4">
            Connected
          </Label>
        )}
        <div className="flex flex-row items-center">
          <div
            className="cursor-pointer border border-gray-300 flex flex-1 items-center hover:bg-blue-100 px-1"
            css={css`
              height: 20px;
              font-size: 9px;
            `}
            onClick={() => {
              sendParent("add-frame");
            }}
          >
            <FiPlus /> <span className="font-medium">FRAME</span>
          </div>
          <div
            css={css`
              height: 22px;
              cursor: pointer;
              ${connected
                ? css`
                    width: 25px;
                    padding-left: 3px;
                  `
                : css`
                    justify-content: flex-end;
                    padding: 0px 12px;
                  `}
            `}
            onClick={() => onSelect("settings")}
            className={
              `${menu === "settings" ? "bg-gray-200 " : ""} ` +
              "rounded-md hover:bg-gray-100 mx-1 flex items-center justify-center"
            }
          >
            <FiSettings size={12} />
            <div className="text-xs pl-1">{connected ? "" : "Settings"}</div>
          </div>
        </div>
      </div>
    );
  }
);
