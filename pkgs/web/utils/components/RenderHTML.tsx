/** @jsx jsx */
import { css, jsx } from "@emotion/react";
import { useComponent } from "web.utils/component";

export default ({ children }) => {
  const _component = useComponent("render-html","/pkgs/web/utils/components/RenderHTML",{});
  return eval(_component.render);
}