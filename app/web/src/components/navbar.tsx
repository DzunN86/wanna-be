/** @jsx jsx */
import { jsx } from "@emotion/react";
import { useComponent } from "web.utils/component";

export default ({ children }) => {
const _component = useComponent("navbar","/app/web/src/components/navbar",{});
return eval(_component.render);
}