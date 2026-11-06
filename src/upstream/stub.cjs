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
// A bundler's CommonJS interop copies a module's own keys, so a named import (`import { createContext }`)
// of anything not owned by the target is `undefined`. components/Sources/SourceContext.tsx, compiled for
// real, calls `createContext(...)` at load: that name is owned here, and still answers with the stub.
Object.defineProperty(stub, "createContext", { value: stub, enumerable: true });
module.exports = stub;
