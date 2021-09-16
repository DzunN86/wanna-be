import { useComponent } from "web.utils/component";

export default ({ children }) => {
  const _component = useComponent("html-head","/pkgs/web/utils/components/HtmlHead",{});
  return eval(_component.render);
}