// make sure to export default component not export const
export default {
  "btn-primary": () => [
    import("./components/btn-primary"),
    { c: "", s: "", h: "" },
  ],
  bar: () => [import("./components/bar"), { c: "", s: "", h: "" }],
};
