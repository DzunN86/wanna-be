/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import { Label, Callout, DefaultButton, Link } from "@fluentui/react";
import { action, runInAction } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { Fragment, useEffect, useRef } from "react";
import { CgFigma } from "react-icons/cg";
import { ImArrowUpLeft2 } from "react-icons/im";
import type { BaseWindow } from "../../../../init/src/window";
import { useRender } from "../../../../utils/src/useRender";
import { sendParent } from "../ws";

declare const window: BaseWindow;

export const Status = observer(
  ({
    selected,
    frame,
    lastUpdate,
    update,
    setMini,
    forceRender,
    mini,
  }: any) => {
    const meta = useLocalObservable(() => ({
      "win-size": "260x230",
      resizing: false,
      now: new Date().getTime(),
      get winh() {
        return parseInt(meta["win-size"].split("x")[1]);
      },
      get winw() {
        return parseInt(meta["win-size"].split("x")[0]);
      },
    }));

    const conflictRef = useRef(null as any);

    const render = useRender();

    const dragging = useRef(
      false as false | { x: number; y: number; w: number; h: number }
    );

    useEffect(() => {
      setInterval(
        action(() => {
          meta.now = new Date().getTime();
        }),
        1000
      );

      meta["win-size"] = localStorage["win-size"] || "260x320";
    }, []);

    return (
      <Fragment>
        <div
          id="statusbar"
          className={
            "select-none relative flex items-center justify-between border-t border-gray-200"
          }
          css={css`
            font-size: 12px;
            height: 24px;
            margin-right: 1px;
            margin-bottom: 2px;
            border-bottom-left-radius: 3px;
            border-bottom-right-radius: 3px;
            .update {
              display: none;
            }
            background: ${meta.now - lastUpdate <= 1000 ? "#ebfaec" : "#fff"};

            &:hover {
              .update {
                display: flex;
              }
            }
          `}
        >
          <div
            className={`flex flex-row hover:bg-green-50 pr-2 ${
              mini ? "flex-1" : ""
            }`}
            css={css`
              cursor: pointer !important;
              label {
                padding-left: 10px;
                font-size: 10px;
              }
            `}
            onClick={update}
          >
            {mini ? (
              <Label
                className="text-center cursor-pointer flex-1"
                css={css`
                  padding-right: 10px;
                `}
              >
                {selected
                  ? meta.now - lastUpdate > 2000 || !lastUpdate
                    ? "Save"
                    : "Saved "
                  : "Select Layer"}
              </Label>
            ) : (
              <Label className="cursor-pointer">
                {selected
                  ? meta.now - lastUpdate > 10000 || !lastUpdate
                    ? "Save (Ctrl+S)"
                    : "Updated " + timeago(meta.now - lastUpdate).toLowerCase()
                  : "Please select any layer"}
              </Label>
            )}
          </div>

          {!mini && (
            <div
              className="cursor-pointer"
              css={css`
                font-size: 8px;
                color: #999;
                font-weight: bold;
              `}
              onClick={() => {
                setMini(true);
                sendParent("toggle-resize");
              }}
            >
              MINIMIZE
            </div>
          )}
          {!mini && meta.resizing && (
            <div
              className="fixed inset-0 z-20 bg-white opacity-50"
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
          {!mini && (
            <div className="flex flex-row justify-end items-center">
              <div
                css={css`
                  height: 20px;
                  cursor: nw-resize;
                `}
                className="flex items-center"
                onMouseDown={action((e) => {
                  dragging.current = {
                    x: e.clientX,
                    y: e.clientY,
                    w: meta.winw,
                    h: meta.winh,
                  };
                  meta.resizing = true;
                })}
              >
                <ImArrowUpLeft2
                  size={9}
                  css={css`
                    margin: 3px 2px 0px 0px;
                  `}
                />
                {selected && frame && frame.name
                  ? frame.name.length < 5
                    ? `-- ${frame.name} --`
                    : frame.name
                  : "Unselected"}
              </div>
              <CgFigma
                css={css`
                  width: 20px;
                  margin: 0px 2px 0px 0px;
                `}
              />
            </div>
          )}
        </div>
      </Fragment>
    );
  }
);

function timeago(ms) {
  var ago = Math.floor(ms / 1000);
  var part = 0;

  if (ago < 2) {
    return "Just now";
  }
  if (ago < 60) {
    return ago + " secs ago";
  }

  if (ago < 120) {
    return "a min ago";
  }
  if (ago < 3600) {
    while (ago >= 60) {
      ago -= 60;
      part += 1;
    }
    return part + " mins ago";
  }

  if (ago < 7200) {
    return "an hour ago";
  }
  if (ago < 86400) {
    while (ago >= 3600) {
      ago -= 3600;
      part += 1;
    }
    return part + " hours ago";
  }

  if (ago < 172800) {
    return "a day ago";
  }
  if (ago < 604800) {
    while (ago >= 172800) {
      ago -= 172800;
      part += 1;
    }
    return part + " days ago";
  }

  if (ago < 1209600) {
    return "a week ago";
  }
  if (ago < 2592000) {
    while (ago >= 604800) {
      ago -= 604800;
      part += 1;
    }
    return part + " weeks ago";
  }

  if (ago < 5184000) {
    return "a month ago";
  }
  if (ago < 31536000) {
    while (ago >= 2592000) {
      ago -= 2592000;
      part += 1;
    }
    return part + " months ago";
  }

  if (ago < 1419120000) {
    // 45 years, approximately the epoch
    return "more than year ago";
  }

  // TODO pass in Date.now() and ms to check for 0 as never
  return "";
}
