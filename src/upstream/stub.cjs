// Stands in for React, react-ui components, icons and every other browser-only
// import of upstream sources. Any property, call or construction returns the stub,
// so module top-level code (forwardRef, memo, styled, …) evaluates harmlessly.
// Nothing here is ever rendered: opengpui supplies its own renderers.
const stub = new Proxy(function OpenGpuiStub() {}, {
  get(target, key) {
    if (key === "__esModule") return false;
    if (key === "then") return undefined;
    if (key === Symbol.toPrimitive) return () => "";
    if (key === "prototype") return target.prototype;
    return stub;
  },
  apply: () => stub,
  construct: () => stub,
});
module.exports = stub;
