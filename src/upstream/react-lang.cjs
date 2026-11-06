// Stands in for @openuidev/react-lang inside upstream genui-lib sources.
// Library authoring (defineComponent, createLibrary, action, reactive, …) is real,
// straight from lang-core; React hooks and contexts are stubs, because the React
// renderers that call them are replaced by opengpui's.
const core = require("@openuidev/lang-core");
const stub = require("./stub.cjs");

const real = {
  ...core,
  reactive(schema) {
    core.markReactive(schema);
    return schema;
  },
};
module.exports = new Proxy(real, { get: (t, k) => (k in t ? t[k] : stub) });
