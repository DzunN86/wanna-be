/** @jsx jsx */
import { jsx } from "@emotion/react";
import { useComponent } from "web.utils/component";

export default ({ children }) => {
  const _component = useComponent("bar","/app/web/src/components/bar",{});
  return eval(_component.render)
}