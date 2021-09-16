/** @jsx jsx */
import { jsx, css } from "@emotion/react";
import { Spinner } from "@fluentui/react";
import { action } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect } from "react";
import { InputNodeData } from "../components/UIField";
import { getRootData } from "../components/util";

export const SETTINGSTab = observer(() => {
  const meta = useLocalObservable(() => ({
    "base-url": "",
    "font-size": "10",
    ready: false,
  }));

  useEffect(() => {
    const all: any[] = [];
    all.push(getRootData(meta, "base-url", "http://localhost:3200"));
    all.push(getRootData(meta, "font-size", "10"));
    Promise.all(all).then(
      action(() => {
        meta.ready = true;
      })
    );
  }, []);

  if (!meta.ready)
    return (
      <div className="items-center justify-center flex absolute inset-0">
        <Spinner />
      </div>
    );

  return (
    <div
      className="relative flex-1"
      css={css`
        overflow-x: hidden;
        overflow-y: auto;
      `}
    >
      <div
        className="flex flex-col inset-0 absolute"
        css={css`
          margin-right: 1px;
        `}
      >
        <InputNodeData
          label={<div className="flex justify-end items-center">Host</div>}
          meta={meta}
          root={true}
          name={"base-url"}
        />
        <InputNodeData
          label={<div className="flex justify-end items-center">Font Size</div>}
          meta={meta}
          root={true}
          name={"font-size"}
        />
      </div>
    </div>
  );
});
