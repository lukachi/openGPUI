var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// opengpui-shared:openui-rdp/formatters/index.js
var exports_formatters = {};
__export(exports_formatters, {
  formatCaption: () => e053,
  formatDay: () => e1103,
  formatMonthCaption: () => e255,
  formatMonthDropdown: () => e328,
  formatWeekNumber: () => e420,
  formatWeekNumberHeader: () => e518,
  formatWeekdayName: () => e611,
  formatYearCaption: () => e710,
  formatYearDropdown: () => e810
});

// opengpui-shared-loader:opengpui-shared-loader
var ready = Symbol.for("opengpui shared 160c5dd588f20b26");
var loading = Symbol.for("opengpui shared 160c5dd588f20b26" + " loading");
if (!globalThis[ready]) {
  const file = "./shared.js";
  globalThis[loading] ??= import(file).then((shared) => {
    if (shared.key !== "opengpui shared 160c5dd588f20b26")
      throw new Error("shared.js is not the one this main.js was built with: " + shared.key);
    return shared;
  }).catch((error) => {
    delete globalThis[loading];
    throw error;
  });
  globalThis[ready] = (await globalThis[loading]).modules;
}

// herdr/src/main.ts
import { h_flex as h_flex8, v_flex as v_flex10 } from "gpui-base";
import { div as div46, View as View2 } from "gpui-kit";
import { mkdir as mkdir4, writeFile as writeFile4 } from "fs/promises";
import { appHome as appHome4, exec as exec3, hc, home as home2, props, readTextFile, watchFolder, window as herdrWindow } from "herdr";
import { dirname, join as join5 } from "path";

// opengpui-shared:@openuidev/lang-core
var m = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["@openuidev/lang-core"];
var e0 = m["ACTION_STEPS"];
var e1 = m["BuiltinActionType"];
var e2 = m["McpToolError"];
var e3 = m["ToolNotFoundError"];
var e4 = m["action"];
var e5 = m["autoClose"];
var e6 = m["buildMessage"];
var e7 = m["buildSignature"];
var e8 = m["builtInValidators"];
var e9 = m["createLibrary"];
var e10 = m["createParser"];
var e11 = m["createQueryManager"];
var e12 = m["createStore"];
var e13 = m["createStreamingParser"];
var e14 = m["defineAction"];
var e15 = m["defineComponent"];
var e16 = m["defineFunction"];
var e17 = m["enrichErrors"];
var e18 = m["evaluate"];
var e19 = m["evaluateElementProps"];
var e20 = m["evaluateRoot"];
var e21 = m["extractToolResult"];
var e22 = m["generatePrompt"];
var e23 = m["generateSystemPrompt"];
var e24 = m["isElementNode"];
var e25 = m["isReactiveAssign"];
var e26 = m["isReactiveSchema"];
var e27 = m["jsonToOpenUI"];
var e28 = m["markReactive"];
var e29 = m["mergeStatements"];
var e30 = m["parse"];
var e31 = m["parseExpression"];
var e32 = m["parseMessage"];
var e33 = m["parseRules"];
var e34 = m["parseStructuredRules"];
var e35 = m["resolveStateField"];
var e36 = m["split"];
var e37 = m["steps"];
var e38 = m["stripReactiveAssign"];
var e39 = m["tagSchemaId"];
var e40 = m["tokenize"];
var e41 = m["validate"];
var e42 = m["walkAST"];

// src/components/buttons.ts
import { div as div4 } from "gpui-kit";

// src/render/surface.ts
import { h_flex } from "gpui-base";
import {
  div as div3,
  svg,
  View
} from "gpui-kit";

// src/markdown/code.ts
import { div as div2 } from "gpui-kit";

// opengpui-shared:react-syntax-highlighter/dist/esm/styles/prism/one-light.js
var m2 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["react-syntax-highlighter/dist/esm/styles/prism/one-light.js"];
var one_light_default = m2.default;

// opengpui-shared:react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js
var m3 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js"];
var vsc_dark_plus_default = m3.default;

// opengpui-shared:openui-theme
var m4 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-theme"];
var e02 = m4["defaultDarkTheme"];
var e110 = m4["defaultLightTheme"];

// src/render/tokens.ts
function toHex(value) {
  if (value.startsWith("#"))
    return value;
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/.exec(value.trim());
  if (!m)
    throw new Error(`not an oklch color: ${value}`);
  const [L, C, H, A] = [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s
  ];
  const byte = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  const gamma = (x) => x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  return `#${linear.map((x) => byte(gamma(x))).join("")}${byte(A)}`;
}
var hexByte = (x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0");
function cssColor(value) {
  const v = value.trim().toLowerCase();
  if (v === "transparent")
    return "#00000000";
  if (v.startsWith("oklch("))
    return toHex(v);
  const hex = /^#([0-9a-f]{3,8})$/.exec(v)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4)
      return `#${[...hex].map((c) => c + c).join("")}`;
    if (hex.length === 6 || hex.length === 8)
      return `#${hex}`;
    return null;
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!fn)
    return null;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3)
    return null;
  const num = (p, scale) => p.endsWith("%") ? parseFloat(p) / 100 * scale : parseFloat(p);
  const a = parts[3] === undefined ? 1 : num(parts[3], 1);
  if (fn[1].startsWith("rgb")) {
    return `#${hexByte(num(parts[0], 255))}${hexByte(num(parts[1], 255))}${hexByte(num(parts[2], 255))}${hexByte(a * 255)}`;
  }
  const h = (parseFloat(parts[0]) % 360 + 360) % 360 / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const k = (n) => (n + h * 12) % 12;
  const f = (n) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${hexByte(f(0) * 255)}${hexByte(f(8) * 255)}${hexByte(f(4) * 255)}${hexByte(a * 255)}`;
}
function toTextStyle(font) {
  const m = /^(\d+)\s+([\d.]+)px\/([\d.]+)\s+(.+)$/.exec(font.trim());
  if (!m)
    throw new Error(`not a font shorthand: ${font}`);
  const families = m[4].split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
  return { weight: Number(m[1]), size: Number(m[2]), lineHeight: Number(m[3]), families };
}
var SHADOWS = {
  shadow0: "none",
  shadowS: "xs",
  shadowM: "xs",
  shadowL: "md",
  shadowXl: "lg",
  shadow2xl: "xl",
  shadow3xl: "2xl"
};
function resolve(theme, mode) {
  const out = { mode };
  for (const [key, raw] of Object.entries(theme)) {
    if (typeof raw !== "string")
      continue;
    if (key in SHADOWS)
      out[key] = SHADOWS[key];
    else if (raw.startsWith("oklch(") || raw.startsWith("#"))
      out[key] = toHex(raw);
    else if (/^text[A-Z]/.test(key) && !key.endsWith("LetterSpacing"))
      out[key] = toTextStyle(raw);
    else if (/^(space|radius|fontSize|fontWeight|lineHeight)/.test(key))
      out[key] = parseFloat(raw) || 0;
    else
      out[key] = raw;
  }
  return out;
}
var RESOLVED = { light: resolve(e110, "light"), dark: resolve(e02, "dark") };
function resolveTokens(mode = "light", overrides = {}) {
  const given = Object.entries(overrides).filter(([, v]) => v != null);
  return { ...RESOLVED[mode], ...Object.fromEntries(given), mode };
}
function alpha(hex, a) {
  const rgb = hex.slice(0, 7);
  return `${rgb}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0")}`;
}
function over(top, bottom) {
  const channel = (c, i) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  const a = top.length === 9 ? channel(top, 3) / 255 : 1;
  const rgb = [0, 1, 2].map((i) => Math.round(channel(top, i) * a + channel(bottom, i) * (1 - a)));
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}ff`;
}
var TYPOGRAPHY = {
  body: {
    default: ["textBodyDefault", "regular"],
    heavy: ["textBodyDefaultHeavy", "medium"],
    small: ["textBodySm", "regular"],
    "small-heavy": ["textBodySmHeavy", "medium"],
    large: ["textBodyLg", "regular"],
    "large-heavy": ["textBodyLgHeavy", "medium"],
    link: ["textBodyDefault", "regular"],
    medium: ["textBodyDefault", "regular"]
  },
  label: {
    default: ["textLabelDefault", "regular"],
    heavy: ["textLabelDefaultHeavy", "medium"],
    large: ["textLabelLg", "regular"],
    "large-heavy": ["textLabelLgHeavy", "medium"],
    medium: ["textLabelDefault", "regular"],
    "medium-heavy": ["textLabelDefaultHeavy", "medium"],
    small: ["textLabelSm", "regular"],
    "small-heavy": ["textLabelSmHeavy", "medium"],
    "extra-small": ["textLabelXs", "regular"],
    "extra-small-heavy": ["textLabelXsHeavy", "medium"],
    "2-extra-small": ["textLabelXs", "regular"],
    "2-extra-small-heavy": ["textLabelXsHeavy", "medium"]
  },
  heading: {
    xl: ["textHeadingXl", null],
    large: ["textHeadingLg", null],
    medium: ["textHeadingMd", null],
    small: ["textHeadingSm", null],
    "extra-small": ["textHeadingXs", null]
  },
  number: {
    large: ["textNumbersLg", "regular"],
    "large-heavy": ["textNumbersLgHeavy", "medium"],
    heavy: ["textNumbersDefaultHeavy", "medium"],
    default: ["textNumbersDefault", "regular"],
    small: ["textNumbersSm", "regular"],
    "small-heavy": ["textNumbersSmHeavy", "medium"],
    "extra-small": ["textNumbersXs", "regular"],
    "extra-small-heavy": ["textNumbersXsHeavy", "medium"],
    heading: ["textNumbersHeadingLg", null],
    "heading-small": ["textNumbersHeadingSm", null],
    "heading-medium": ["textNumbersHeadingMd", null],
    title: ["textNumbersHeadingLg", null],
    "title-medium": ["textNumbersHeadingMd", null],
    "heading-large": ["textNumbersHeadingLg", null],
    "heading-xl": ["textNumbersHeadingXl", null]
  },
  code: {
    default: ["textCodeDefault", null],
    heavy: ["textCodeDefaultHeavy", null],
    small: ["textCodeSm", null],
    "small-heavy": ["textCodeSmHeavy", null]
  }
};
function axis(variation) {
  const m = /"wght"\s+([\d.]+)/.exec(variation);
  if (!m)
    throw new Error(`not a wght variation: ${variation}`);
  return Number(m[1]);
}
function typography(t, group, variant) {
  const [key, variation] = TYPOGRAPHY[group][variant];
  const base = t[key];
  const weight = variation === "regular" ? axis(t.fontVariationRegular) : variation === "medium" ? axis(t.fontVariationMedium) : base.weight;
  const face = t.fonts?.(base.families, base.size, weight);
  return face ? { ...base, weight: face.weight, face: face.family } : { ...base, weight };
}
function textStyle(el, style) {
  const sized = el.text_size(style.size).line_height(style.lineHeight).font_weight(style.weight);
  return style.face ? sized.font_family(style.face) : sized;
}
function restyle(t, style, patch) {
  const size = patch.size ?? style.size;
  const weight = patch.weight ?? style.weight;
  const face = t.fonts?.(style.families, size, weight);
  return face ? { ...style, size, weight: face.weight, face: face.family } : { ...style, size, weight, face: undefined };
}
function isOpaque(color) {
  return !(color.length === 9 && color.startsWith("#") && color.slice(7).toLowerCase() !== "ff");
}
function shadow(el, preset, fill) {
  if (fill !== "covered" && !isOpaque(fill))
    return el.shadow_none();
  switch (preset) {
    case "xs":
      return el.shadow_xs();
    case "sm":
      return el.shadow_sm();
    case "md":
      return el.shadow_md();
    case "lg":
      return el.shadow_lg();
    case "xl":
      return el.shadow_xl();
    case "2xl":
      return el.shadow_2xl();
    default:
      return el.shadow_none();
  }
}
var TRANSPARENT = "#00000000";

// src/markdown/blocks.ts
var BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "pre", "blockquote", "hr", "table", "section", "div"]);
var HEADING = /^h[1-6]$/;
var isElement = (n) => n.type === "element";
var isBlank = (n) => n.type === "text" && n.value.trim() === "";
function textOf(node) {
  if (node.type === "text")
    return node.value;
  if (node.type === "element")
    return node.children.map(textOf).join("");
  return "";
}
function codeBlockLanguage(node) {
  const className = node.properties.className;
  const classes = Array.isArray(className) ? className.join(" ") : typeof className === "string" ? className : "";
  const match = /language-(\w+)/.exec(classes);
  if (match || !classes && textOf(node).includes(`
`))
    return match?.[1] ?? "text";
  return null;
}
function preCode(pre) {
  const code = pre.children.find(isElement);
  const language = code?.tagName === "code" ? codeBlockLanguage(code) : null;
  return code && language !== null ? { code, language } : null;
}
function blockItems(nodes) {
  const items = [];
  let run = [];
  const flush = () => {
    if (run.some((n) => !isBlank(n)))
      items.push({ kind: "inline", nodes: run });
    run = [];
  };
  for (const node of nodes) {
    if (isElement(node) && BLOCK.has(node.tagName)) {
      flush();
      items.push({ kind: "block", node, next: undefined, last: false });
    } else
      run.push(node);
  }
  flush();
  const blocks = items.filter((it) => it.kind === "block");
  blocks.forEach((it, i) => {
    it.next = blocks[i + 1]?.node.tagName;
    it.last = i === blocks.length - 1;
  });
  return items;
}
var VIRTUAL_CHARS = 6000;
function virtualDecision(chars) {
  return chars > VIRTUAL_CHARS ? "virtual" : "full";
}
var TOP = { inList: false, inLi: false };
var IN_LI = { inList: true, inLi: true };
function columnMargins(nodes, scope, content) {
  const items = blockItems(nodes);
  const margins = (it) => it?.kind === "block" ? blockMargins(it.node, scope, it, content) : { mt: 0, mb: 0 };
  return { mt: margins(items[0]).mt, mb: margins(items.at(-1)).mb };
}
function blockMargins(node, scope, at, content) {
  const own = (mt, mb) => ({ mt, mb: scope.inList && at.last ? 0 : mb });
  const tag = node.tagName;
  if (tag === "p")
    return own(0, at.next === "p" ? 18 : content && (at.next === "ol" || at.next === "ul") ? 8 : 0);
  if (HEADING.test(tag))
    return own(0, at.next === "p" ? 8 : 18);
  if (tag === "ul" || tag === "ol") {
    const first = listItems(node)[0];
    const mt = first ? Math.max(scope.inLi ? 8 : 0, columnMargins(first.children, IN_LI, content).mt) : 0;
    return own(Math.max(scope.inLi ? 8 : 0, mt), tag === "ul" ? 24 : 20);
  }
  if (tag === "pre")
    return preCode(node) ? own(8, 0) : own(0, 0);
  if (tag === "blockquote") {
    const inner = columnMargins(node.children, scope, content);
    return own(Math.max(25, inner.mt), Math.max(25, inner.mb));
  }
  if (tag === "hr")
    return own(48, 48);
  if (tag === "table")
    return own(0, 20);
  const inner = columnMargins(node.children, tag === "li" ? IN_LI : scope, content);
  return own(inner.mt, inner.mb);
}
var listItems = (node) => node.children.filter(isElement).filter((c) => c.tagName === "li");
var SPLIT_LIST_CHARS = 4000;
var CODE_SPLIT_CHARS = 4000;
var CODE_SPLIT_LINES = 120;
var CODE_GROUP_LINES = 16;
var CODE_GROUP_CHARS = 800;
var TABLE_GROUP_ROWS = 25;
function lineGroups(lines, maxLines, maxChars) {
  const starts = [0];
  let size = 0;
  for (let i = 0;i < lines.length; i++) {
    const count = i - starts.at(-1);
    const full = count >= maxLines || size >= maxChars;
    const over = count >= maxLines * 1.5 || size >= maxChars * 1.5;
    if (count > 0 && (full && lines[i - 1] === "" || over)) {
      starts.push(i);
      size = 0;
    }
    size += lines[i].length + 1;
  }
  starts.push(lines.length);
  return starts;
}
var tableRows = (table) => table.children.filter(isElement).flatMap((s) => s.tagName === "tr" ? [s] : s.children.filter(isElement).filter((r) => r.tagName === "tr"));
function virtualRows(tree, profile) {
  const content = profile === "content";
  return blockItems(tree.children).flatMap((item, k) => {
    const first = (item.kind === "block" ? item.node : item.nodes[0])?.position;
    const last = (item.kind === "block" ? item.node : item.nodes.at(-1))?.position;
    const start = first?.start.offset;
    const end = last?.end.offset;
    const key = start === undefined || end === undefined ? `i${k}` : `${start}-${end}`;
    const whole = { kind: "item", item, key, margins: item.kind === "block" ? blockMargins(item.node, TOP, item, content) : { mt: 0, mb: 0 } };
    if (item.kind !== "block")
      return [whole];
    const node = item.node;
    const own = whole.margins;
    const chars = (end ?? 0) - (start ?? 0);
    if ((node.tagName === "ul" || node.tagName === "ol") && chars > SPLIT_LIST_CHARS) {
      const lis = listItems(node);
      return lis.map((li, index) => {
        const inner = columnMargins(li.children, IN_LI, content);
        const mb = index === lis.length - 1 ? own.mb : Math.max(8, inner.mb);
        return { kind: "li", node, index, key: `${key}-li${index}`, margins: { mt: index === 0 ? own.mt : Math.max(0, inner.mt), mb } };
      });
    }
    const pre = node.tagName === "pre" ? preCode(node) : null;
    if (pre) {
      const code = textOf(pre.code).trim();
      const lines = code.split(`
`);
      if (code.length <= CODE_SPLIT_CHARS && lines.length <= CODE_SPLIT_LINES)
        return [whole];
      const starts = lineGroups(lines, CODE_GROUP_LINES, CODE_GROUP_CHARS);
      return starts.slice(0, -1).map((from, g) => ({
        kind: "code",
        node,
        language: pre.language,
        code: lines.slice(from, starts[g + 1]).join(`
`),
        first: g === 0,
        last: g === starts.length - 2,
        key: `${key}-c${from}`,
        margins: { mt: g === 0 ? own.mt : 0, mb: g === starts.length - 2 ? own.mb : 0 }
      }));
    }
    if (node.tagName === "table") {
      const count = tableRows(node).length - 1;
      if (count <= TABLE_GROUP_ROWS)
        return [whole];
      const groups = [];
      for (let from = 0;from < count; from += TABLE_GROUP_ROWS) {
        const to = Math.min(count, from + TABLE_GROUP_ROWS);
        groups.push({ kind: "table", node, from, to, count, part: key, key: `${key}-t${from}`, margins: { mt: from === 0 ? own.mt : 0, mb: to === count ? own.mb : 0 } });
      }
      return groups;
    }
    return [whole];
  });
}
function rowChars(row) {
  if (row.kind === "code")
    return row.code.length;
  if (row.kind === "table")
    return 0;
  if (row.kind === "item" && row.item.kind === "inline")
    return row.item.nodes.reduce((n, c) => n + textOf(c).length, 0);
  const node = row.kind === "li" ? listItems(row.node)[row.index] : row.item.node;
  const p = node.position;
  return p?.start.offset !== undefined && p.end.offset !== undefined ? p.end.offset - p.start.offset : textOf(node).length;
}

// opengpui-shared:./src/markdown/grammars.ts
var m5 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["./src/markdown/grammars.ts"];
var e03 = m5["grammars"];

// src/markdown/lazy.ts
import { div, list } from "gpui-kit";
import { Scrollbar } from "gpui-base";
function lazyRows(ctx, part, o) {
  const local = ctx.local({ seen: { frame: -1, min: 0, max: 0 } }, `${part}-lazy`);
  const n = o.count;
  const listId = ctx.id(`${part}-list`);
  const rows = list(listId, n + 2, (i) => i === 0 ? "top" : i === n + 1 ? "end" : o.key(i - 1), (i) => {
    const seen = local.seen;
    if (seen.frame !== ctx.frame)
      local.seen = { frame: ctx.frame, min: i, max: i };
    else {
      seen.min = Math.min(seen.min, i);
      seen.max = Math.max(seen.max, i);
    }
    return i === 0 || i === n + 1 ? div().w_full().h(1) : o.row(i - 1);
  }).size_full();
  const wheel = div().id(ctx.id(`${part}-rows`)).absolute().top(0).bottom(0).left(-(o.left ?? 0)).right(0).on_scroll_wheel((e, cx) => {
    const atEdge = e.delta.y > 0 ? local.seen.min === 0 : e.delta.y < 0 ? local.seen.max === n + 1 : true;
    if (!atEdge)
      cx.stop_propagation();
  }).child(rows);
  const bar = Scrollbar.vertical(listId).absolute().inset_0();
  return [wheel, o.contentHeight === undefined ? bar : bar.scroll_size(0, o.contentHeight)];
}
function edge(el, k, count) {
  let out = el;
  if (k === 0)
    out = out.mt(-1);
  if (k === count - 1)
    out = out.mb(-1);
  return out;
}

// src/markdown/code.ts
var { refractor, syntaxes } = e03;
var WARM_SLICE_MS = 40;
var warming = new WeakMap;
var warmWaiting = new WeakMap;
function wakeWarmWaiting(session) {
  const waiting = warmWaiting.get(session);
  if (!waiting)
    return;
  for (const wake of waiting.values())
    wake();
  waiting.clear();
}
async function warm(task, session) {
  let slice = Date.now();
  while (e03.registered < syntaxes.length) {
    warming.set(session, Date.now());
    if (e03.attempted === e03.registered) {
      console.log(`[opengpui] registering a grammar was interrupted; skipping it`);
      e03.registered++;
      continue;
    }
    e03.attempted = e03.registered;
    try {
      refractor.register(syntaxes[e03.registered]);
    } catch (e) {
      console.log(`[opengpui] grammar ${e03.registered} can't be registered here, skipping it: ${e}`);
    }
    e03.registered++;
    if (Date.now() - slice >= WARM_SLICE_MS) {
      await task.sleep(16);
      slice = Date.now();
    }
  }
  warming.delete(session);
  wakeWarmWaiting(session);
}
var watched = new WeakSet;
function ensureWarm(ctx) {
  const session = ctx.session;
  let waiting = warmWaiting.get(session);
  if (!waiting)
    warmWaiting.set(session, waiting = new Map);
  waiting.set(ctx.view, ctx.waker());
  const resumed = warming.get(session);
  if (resumed !== undefined && Date.now() - resumed < 1000)
    return;
  warming.set(session, Date.now());
  const watch = !watched.has(session);
  watched.add(session);
  ctx.after((cx) => {
    cx.spawn((task) => warm(task, session));
    if (watch) {
      cx.spawn(async (task) => {
        while (!highlightingReady()) {
          await task.sleep(1000);
          if (Date.now() - (warming.get(session) ?? 0) > 1000)
            wakeWarmWaiting(session);
        }
        watched.delete(session);
      });
    }
  });
}
var highlightingReady = () => e03.registered === syntaxes.length;
function highlightPending(session) {
  return (warmWaiting.get(session)?.size ?? 0) > 0 || (jobs.get(session)?.queue.size ?? 0) > 0;
}
function classCombinations(classes) {
  const items = classes.slice(0, 4);
  const out = [];
  for (let k = 1;k <= items.length; k++) {
    const walk = (prefix) => {
      if (prefix.length === k) {
        out.push(prefix.map((i) => items[i]).join("."));
        return;
      }
      for (let i = 0;i < items.length; i++)
        if (!prefix.includes(i))
          walk([...prefix, i]);
    };
    walk([]);
  }
  return out;
}
function tokenStyle(classes, theme) {
  return Object.assign({}, ...classCombinations(classes.filter((c) => c !== "token")).map((c) => theme[c] ?? {}));
}
function flatten(nodes, classes, out) {
  for (const node of nodes) {
    if (node.type === "text")
      out.push({ text: node.value, classes });
    else if (node.type === "element") {
      const own = node.properties.className;
      flatten(node.children, [...classes, ...Array.isArray(own) ? own.map(String) : []], out);
    }
  }
  return out;
}
var highlighted = new Map;
var plain = (code) => [{ text: code, classes: [] }];
function remember(key, segments) {
  highlighted.set(key, segments);
  if (highlighted.size > 400)
    highlighted.delete(highlighted.keys().next().value);
}
var HIGHLIGHT_MS = 20;
var INLINE_CHARS = 300;
var TASK_GROUP_LINES = 40;
var TASK_GROUP_CHARS = 1000;
var REDRAW_MS = 250;
var TASK_STALE_MS = 1000;
var jobs = new WeakMap;
var highlightedIn = new WeakMap;
var QUEUE_SIZE = 64;
function tokens(code, language) {
  try {
    return flatten(refractor.highlight(code, language).children, [], []);
  } catch (e) {
    console.log(`[opengpui] highlighting ${language} failed: ${e}`);
    return null;
  }
}
function highlightLater(ctx, key, code, language) {
  let view = jobs.get(ctx.session);
  if (!view)
    jobs.set(ctx.session, view = { queue: new Map, resumed: null, watched: false });
  const queue = view.queue;
  let job = queue.get(key);
  queue.delete(key);
  if (!job) {
    const lines = code.split(`
`);
    job = { code, language, lines, starts: lineGroups(lines, TASK_GROUP_LINES, TASK_GROUP_CHARS), group: 0, out: [], waiting: new Map };
  }
  job.waiting.set(ctx.view, ctx.waker());
  queue.set(key, job);
  if (queue.size > QUEUE_SIZE)
    queue.delete(queue.keys().next().value);
  view.resumed = Date.now();
  const state = view;
  const watch = !view.watched;
  view.watched = true;
  ctx.after((cx) => {
    if (watch) {
      cx.spawn(async (task) => {
        while (queue.size) {
          await task.sleep(1000);
          if (queue.size && (state.resumed === null || Date.now() - state.resumed > TASK_STALE_MS)) {
            for (const waiting of queue.values())
              for (const wake of waiting.waiting.values())
                wake();
          }
        }
        state.watched = false;
      });
    }
    cx.spawn(async (task) => {
      let redrawn = Date.now();
      const ready = new Set;
      const redraw = () => {
        for (const wake of ready)
          wake();
        ready.clear();
      };
      try {
        while (queue.size) {
          await task.sleep(16);
          state.resumed = Date.now();
          const last = [...queue].at(-1);
          if (!last)
            break;
          const [key, job] = last;
          const g = job.group;
          const group = job.lines.slice(job.starts[g], job.starts[g + 1]).join(`
`);
          const found = tokens(group, job.language);
          job.group++;
          if (g > 0)
            job.out.push({ text: `
`, classes: [] });
          job.out.push(...found ?? plain(group));
          if (!found)
            job.failed = true;
          if (job.group + 1 >= job.starts.length) {
            queue.delete(key);
            if (!job.failed)
              remember(key, job.out);
            for (const wake of job.waiting.values())
              ready.add(wake);
            if (!queue.size || Date.now() - redrawn >= REDRAW_MS) {
              redrawn = Date.now();
              redraw();
            }
          }
        }
      } finally {
        state.resumed = null;
        redraw();
      }
    });
  });
}
function highlight(ctx, mine, code, language, budgeted) {
  if (!language || language === "text" || !highlightingReady() || !refractor.registered(language))
    return plain(code);
  const key = `${language}\x00${code}`;
  if (mine.key === key && mine.segments)
    return mine.segments;
  let segments = highlighted.get(key);
  if (!segments) {
    if (code.length > INLINE_CHARS) {
      highlightLater(ctx, key, code, language);
      return plain(code);
    }
    if (budgeted && ctx.renderTime > HIGHLIGHT_MS && highlightedIn.get(ctx.view) === ctx.frame) {
      ctx.after(() => {});
      return plain(code);
    }
    highlightedIn.set(ctx.view, ctx.frame);
    const found = tokens(code, language);
    if (!found)
      return plain(code);
    segments = found;
    remember(key, segments);
  }
  mine.key = key;
  mine.segments = segments;
  return segments;
}
var LONG_LINES = 150;
var LONG_CHARS = 6000;
var DEFAULT_VIEWPORT = 600;
var px = (value) => value?.endsWith("px") ? parseFloat(value) : undefined;
var families = (value) => (value ?? "monospace").split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
function codeBlock(ctx, part, code, language, inheritedSize, options = {}) {
  const t = ctx.t;
  const theme = options.theme === "dark" || t.mode === "dark" ? vsc_dark_plus_default : one_light_default;
  const pre = theme['pre[class*="language-"]'] ?? {};
  const codeTag = { ...theme['code[class*="language-"]'], ...theme[`code[class*="language-${language}"]`] };
  const local = ctx.local({ hovered: false, copied: false, highlight: { key: "", segments: null } }, part);
  if (language && language !== "text" && !highlightingReady())
    ensureWarm(ctx);
  const preSize = px(pre.fontSize) ?? inheritedSize;
  const size = px(codeTag.fontSize) ?? preSize;
  const lineHeight = parseFloat(codeTag.lineHeight ?? "1.5");
  const tab = " ".repeat(Number(codeTag.tabSize ?? 2));
  const face = (weight) => t.fonts?.(families(codeTag.fontFamily), size, weight);
  const baseColor = cssColor(codeTag.color ?? "") ?? t.textNeutralPrimary;
  const span = (text, style) => {
    const bold = style.fontWeight === "bold" || Number(style.fontWeight) >= 600;
    let el = div2().child(text.replace(/\t/g, tab));
    const color = style.color ? cssColor(style.color) : null;
    if (color)
      el = el.text_color(color);
    const bg = style.background ? cssColor(style.background) : null;
    if (bg)
      el = el.bg(bg);
    if (style.fontStyle === "italic")
      el = el.italic();
    if (bold) {
      const resolved = face(700);
      el = el.font_weight(resolved?.weight ?? 700);
      if (resolved)
        el = el.font_family(resolved.family);
    }
    return el;
  };
  const regular = face(400);
  const column = (segments, text) => {
    const lines = [[]];
    for (const seg of segments) {
      const style = tokenStyle(seg.classes, theme);
      seg.text.split(`
`).forEach((piece, i) => {
        if (i > 0)
          lines.push([]);
        if (piece)
          lines.at(-1).push(span(piece, style));
      });
    }
    if (text.endsWith(`
`) && lines.length > 1)
      lines.pop();
    let body = div2().flex_none().flex().flex_col().text_size(size).line_height(lineHeight).text_color(baseColor).children(lines.map((spans) => div2().flex().flex_row().whitespace_nowrap().min_h(size * lineHeight).children(spans)));
    if (regular)
      body = body.font_family(regular.family).font_weight(regular.weight);
    return body;
  };
  const length = (value) => value?.endsWith("em") ? parseFloat(value) * preSize : px(value);
  const radius = length(pre.borderRadius) ?? 8;
  const background = cssColor(pre.background ?? pre.backgroundColor ?? "") ?? t.sunk;
  const pad = options.padding === "theme" ? length(pre.padding) ?? 0 : 25;
  let highlighter;
  const codeLines = code.replace(/\n$/, "").split(`
`);
  if (!options.static && (codeLines.length > LONG_LINES || code.length > LONG_CHARS)) {
    const starts = lineGroups(codeLines, CODE_GROUP_LINES, CODE_GROUP_CHARS);
    const groups = starts.length - 1;
    const height = Math.min(codeLines.length * size * lineHeight + 2 * pad, ctx.viewportHeight ?? DEFAULT_VIEWPORT);
    highlighter = div2().relative().w_full().h(height).rounded(radius).bg(background).children(lazyRows(ctx, part, {
      count: groups,
      key: (g) => `g${starts[g]}`,
      row: (g) => {
        const text = codeLines.slice(starts[g], starts[g + 1]).join(`
`);
        const row = div2().id(ctx.id(`${part}-g${starts[g]}`)).w_full().flex().flex_row().overflow_x_scroll().px(pad).when(g === 0, (el) => el.pt(pad)).when(g === groups - 1, (el) => el.pb(pad)).child(column(highlight(ctx, { key: "", segments: null }, text, language, false), text));
        return edge(row, g, groups);
      }
    }));
  } else {
    const edges = options.edges ?? { top: true, bottom: true };
    let box = div2().id(ctx.id(`${part}-pre`)).flex().flex_row().overflow_x_scroll().px(pad).bg(background).child(column(highlight(ctx, local.highlight, code, language, !options.static), code));
    if (edges.top)
      box = box.pt(pad).rounded_t(radius);
    if (edges.bottom)
      box = box.pb(pad).rounded_b(radius);
    highlighter = box;
  }
  if (options.static)
    return div2().relative().w_full().child(highlighter);
  const copy = iconButton(ctx, {
    id: ctx.id(`${part}-copy`),
    icon: local.copied ? "CheckCheck" : "Copy",
    variant: "secondary",
    size: "small",
    onClick: (cx) => {
      cx.write_to_clipboard(code);
      local.copied = true;
      cx.notify();
      cx.timer.after(1000, (later) => {
        local.copied = false;
        later.notify();
      });
    }
  });
  return div2().id(ctx.id(`${part}-wrap`)).relative().w_full().on_hover((hovered, cx) => {
    if (local.hovered !== hovered) {
      local.hovered = hovered;
      cx.notify();
    }
  }).child(highlighter).child(div2().absolute().top(8).right(8).opacity(local.hovered ? 1 : 0).transition("opacity", { duration: 200, easing: "ease-in-out" }).child(local.copied ? copy.text_color(t.textSuccessPrimary).bg(t.successBackground) : copy));
}

// opengpui-shared:html-url-attributes
var m6 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["html-url-attributes"];
var e04 = m6["urlAttributes"];

// opengpui-shared:openui-remark-citations
var m7 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-remark-citations"];
var e05 = m7["remarkCitations"];

// opengpui-shared:remark-breaks
var m8 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["remark-breaks"];
var remark_breaks_default = m8.default;

// opengpui-shared:remark-gfm
var m9 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["remark-gfm"];
var remark_gfm_default = m9.default;

// opengpui-shared:remark-math
var m10 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["remark-math"];
var remark_math_default = m10.default;

// opengpui-shared:remark-parse
var m11 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["remark-parse"];
var remark_parse_default = m11.default;

// opengpui-shared:remark-rehype
var m12 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["remark-rehype"];
var e06 = m12["defaultFootnoteBackContent"];
var e111 = m12["defaultFootnoteBackLabel"];
var e210 = m12["defaultHandlers"];
var remark_rehype_default = m12.default;

// opengpui-shared:unified
var m13 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["unified"];
var e07 = m13["unified"];

// opengpui-shared:unist-util-visit
var m14 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["unist-util-visit"];
var e08 = m14["CONTINUE"];
var e112 = m14["EXIT"];
var e211 = m14["SKIP"];
var e310 = m14["visit"];

// src/markdown/parse.ts
var PLUGINS = {
  plain: [],
  content: [[remark_gfm_default, { singleTilde: false }], [remark_math_default, { singleDollarTextMath: false }], [remark_breaks_default], e05],
  inline: [e05, [remark_breaks_default], [remark_gfm_default, { singleTilde: false }]]
};
var processors = {};
function makeProcessor(profile) {
  return e07().use(remark_parse_default).use(PLUGINS[profile]).use(remark_rehype_default, { allowDangerousHtml: true }).freeze();
}
var safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;
function defaultUrlTransform(value) {
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");
  if (colon === -1 || slash !== -1 && colon > slash || questionMark !== -1 && colon > questionMark || numberSign !== -1 && colon > numberSign || safeProtocol.test(value.slice(0, colon))) {
    return value;
  }
  return "";
}
var cache = new Map;
var CACHE_SIZE = 200;
function remember2(key, tree) {
  cache.set(key, tree);
  if (cache.size > CACHE_SIZE)
    cache.delete(cache.keys().next().value);
  return tree;
}
function runPipeline(text, profile) {
  const processor = processors[profile] ??= makeProcessor(profile);
  const tree = processor.runSync(processor.parse(text));
  e310(tree, (node, index, parent) => {
    if (node.type === "raw" && parent && typeof index === "number") {
      parent.children[index] = { type: "text", value: node.value };
      return index;
    }
    if (node.type === "element") {
      for (const [attr, tags] of Object.entries(e04)) {
        if (Object.hasOwn(node.properties, attr) && (tags === null || tags.includes(node.tagName))) {
          node.properties[attr] = defaultUrlTransform(String(node.properties[attr] || ""));
        }
      }
    }
    return;
  });
  return tree;
}
function plainParagraph(text, profile) {
  if (/[\x00-\x1f\x7f\\`*_~[\]<>&|\uFEFF\uD800-\uDFFF]|^\s|\s$|^([#>=]|[-+](\s|$)|--|\d{1,9}[.)](\s|$))|:\/\/|@|www\./i.test(text) || profile === "content" && text.includes("$$")) {
    return null;
  }
  const position = () => ({ start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: text.length + 1, offset: text.length } });
  if (!text)
    return { type: "root", children: [], position: position() };
  const value = profile === "plain" ? { type: "text", value: text, position: position() } : { type: "text", value: text };
  return { type: "root", children: [{ type: "element", tagName: "p", properties: {}, children: [value], position: position() }], position: position() };
}
function readyMarkdown(text, profile) {
  return cache.get(`${profile}\x00${text}`) ?? plainParagraph(text, profile) ?? undefined;
}
function parseMarkdown(text, profile) {
  const ready = readyMarkdown(text, profile);
  if (ready)
    return ready;
  return remember2(`${profile}\x00${text}`, runPipeline(text, profile));
}
var HTML_SPANS = [
  [/^ {0,3}<(script|pre|style|textarea)([ \t>]|\r?$)/i, /<\/(script|pre|style|textarea)>/i],
  [/^ {0,3}<!--/, /-->/],
  [/^ {0,3}<\?/, /\?>/],
  [/^ {0,3}<![A-Za-z]/, />/],
  [/^ {0,3}<!\[CDATA\[/, /\]\]>/]
];
var MARKER = /^([-+*]|\d{1,9}[.)])([ \t]|\r?$)/;
var markerKind = (line) => {
  const m = MARKER.exec(line)?.[1];
  return m === undefined ? null : /\d/.test(m) ? m.at(-1) : m;
};
var DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*\r?$/;
var cellCount = (line) => line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).length;
var DEFINITION = /^ {0,3}\[(?!\^)((?:[^\]\\\n]|\\.)+)\]:[ \t]*(?:<[^>\n]*>|\S+)(?:[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?[ \t]*\r?$/;
var SPLIT_LINES = 250;
function* splitSteps(text, profile) {
  const whole = { cuts: [], definitions: "" };
  if (/\r(?!\n)/.test(text))
    return whole;
  const cuts = [];
  const definitions = [];
  const labels = new Set;
  let fence = null;
  let html = null;
  let htmlUntilBlank = false;
  let blank = -1;
  let run = null;
  const stop = (from) => text.includes("]:", from) ? whole : { cuts, definitions: definitions.join(`
`) };
  const lines = text.split(`
`);
  let at = 0;
  for (let i = 0;i < lines.length; i++) {
    if (i > 0 && i % SPLIT_LINES === 0)
      yield;
    const line = lines[i];
    const start = at;
    at += line.length + 1;
    if (fence) {
      const lead = /^[ \t>]*/.exec(line)[0];
      const quotes = lead.split(">").length - 1;
      const blankLine = /^[ \t>]*\r?$/.test(line) && quotes >= fence.quotes;
      if (fence.nested && !blankLine && (lead.length < fence.col || quotes < fence.quotes))
        return stop(start);
      const close = /^[ \t>]*(`{3,}|~{3,}|\${2,})[ \t]*\r?$/.exec(line)?.[1];
      if (!close || close[0] !== fence.char || close.length < fence.size)
        continue;
      if (fence.nested ? lead.length === fence.col && quotes === fence.quotes : lead.length <= 3 && quotes === 0)
        fence = null;
      else if (fence.nested)
        return stop(start);
      continue;
    }
    if (html) {
      if (html.test(line))
        html = null;
      continue;
    }
    if (/^[ \t]*\r?$/.test(line)) {
      if (blank < 0)
        blank = start;
      htmlUntilBlank = false;
      continue;
    }
    const kind = markerKind(line);
    const runStart = i === 0 || blank >= 0;
    if (runStart) {
      if (run?.list && !/^\s/.test(line) && kind !== run.list)
        cuts.push(...run.pending);
      const previousListy = run?.listy ?? false;
      run = { line: i, list: null, table: null, pending: [], listy: false };
      if (kind && !previousListy)
        run.list = kind;
      else if (profile !== "plain" && !kind && line.includes("|") && !/^[\s>]/.test(line)) {
        const delimiter = lines[i + 1];
        if (delimiter !== undefined && DELIMITER_ROW.test(delimiter) && cellCount(delimiter) === cellCount(line))
          run.table = `${line}
${delimiter}
`;
      }
    } else if (run?.list) {
      if (kind === run.list)
        run.pending.push({ at: start, join: "list" });
      else if (!/^\s/.test(line)) {
        run.list = null;
        run.pending = [];
      }
    } else if (run?.table) {
      const row = i - run.line - 2;
      if (!line.startsWith("|"))
        run.table = null;
      else if (row >= 1)
        cuts.push({ at: start, join: "table", prefix: run.table });
    }
    if (run && (/^\s/.test(line) || kind))
      run.listy = true;
    if (line.includes("]:")) {
      const def = DEFINITION.exec(line);
      const label = def?.[1].toLowerCase().replace(/\s+/g, " ").trim();
      const alone = runStart || DEFINITION.test(lines[i - 1] ?? "");
      if (!def || !alone || /^\s*["'(]/.test(lines[i + 1] ?? "") || labels.has(label))
        return whole;
      labels.add(label);
      definitions.push(line.replace(/\r$/, ""));
    }
    if (blank > 0 && !/^(\s|[-+*](\s|$)|\d{1,9}[.)](\s|$))/.test(line))
      cuts.push({ at: blank, join: "block" });
    blank = -1;
    const open = /^((?:[ \t>]|(?:[-+*]|\d{1,9}[.)])(?=[ \t]))*)(`{3,}[^`]*|~{3,}.*|\${2,}[^$]*)$/.exec(line);
    if (open && (open[2][0] !== "$" || profile === "content")) {
      if (htmlUntilBlank)
        return stop(start);
      const marks = /^(`+|~+|\$+)/.exec(open[2])[1];
      const prefix = open[1];
      fence = { char: marks[0], size: marks.length, col: prefix.length, quotes: prefix.split(">").length - 1, nested: prefix !== "" };
      if (run) {
        run.list = run.table = null;
        run.pending = [];
      }
      continue;
    }
    const span = HTML_SPANS.find(([opens]) => opens.test(line));
    if (span) {
      if (!span[1].test(line.replace(span[0], "")))
        html = span[1];
    } else if (/^ {0,3}<[/A-Za-z]/.test(line))
      htmlUntilBlank = true;
  }
  if (run?.list)
    cuts.push(...run.pending);
  cuts.sort((a, b) => a.at - b.at);
  return { cuts, definitions: definitions.join(`
`) };
}
var PIECE_CHARS = 2000;
var pieces = new Map;
var PIECE_CACHE_SIZE = 400;

class MarkdownParse {
  text;
  profile;
  pieceChars;
  key;
  splitting;
  starts = [];
  definitions = "";
  trees = [];
  result = null;
  constructor(text, profile, pieceChars = PIECE_CHARS) {
    this.text = text;
    this.profile = profile;
    this.pieceChars = pieceChars;
    this.key = `${profile}\x00${text}`;
    this.splitting = splitSteps(text, profile);
  }
  scan() {
    const next = this.splitting.next();
    if (!next.done)
      return;
    this.splitting = null;
    const split = next.value;
    const starts = [{ at: 0, join: "block" }];
    let previous = null;
    for (const cut of [...split.cuts, { at: this.text.length, join: "block" }]) {
      if (cut.at - starts.at(-1).at > this.pieceChars && previous && previous.at > starts.at(-1).at)
        starts.push(previous);
      previous = cut;
    }
    this.starts = starts;
    this.definitions = starts.length > 1 ? split.definitions : "";
  }
  get tree() {
    return this.result ?? cache.get(this.key) ?? null;
  }
  get scanning() {
    return this.splitting !== null && !this.tree;
  }
  piece(i) {
    const cut = this.starts[i];
    const body = this.text.slice(cut.at, this.starts[i + 1]?.at ?? this.text.length);
    return `${cut.prefix ?? ""}${body}${this.definitions ? `

${this.definitions}
` : ""}`;
  }
  get nextSize() {
    if (this.tree || this.scanning)
      return 0;
    const i = this.trees.length;
    return (this.starts[i + 1]?.at ?? this.text.length) - this.starts[i].at;
  }
  get nextCost() {
    if (this.tree || this.scanning)
      return 0;
    const i = this.trees.length;
    let cost = 0;
    let fence = null;
    for (const line of this.text.slice(this.starts[i].at, this.starts[i + 1]?.at ?? this.text.length).split(`
`)) {
      const mark = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence && mark && mark[0] === fence[0] && mark.length >= fence.length)
        fence = null;
      else if (!fence && mark)
        fence = mark;
      else if (fence) {
        cost += (line.length + 1) / 50;
        continue;
      }
      cost += line.length + 1;
    }
    return cost;
  }
  step() {
    const done = this.tree;
    if (done)
      return done;
    if (this.splitting) {
      this.scan();
      return null;
    }
    const i = this.trees.length;
    const single = this.starts.length === 1;
    const piece = single ? this.text : this.piece(i);
    const pieceKey = `${this.profile}\x00${piece}`;
    let tree = single ? undefined : pieces.get(pieceKey);
    if (!tree) {
      tree = single ? runPipeline(piece, this.profile) : readyMarkdown(piece, this.profile) ?? runPipeline(piece, this.profile);
      if (!single) {
        pieces.set(pieceKey, tree);
        if (pieces.size > PIECE_CACHE_SIZE)
          pieces.delete(pieces.keys().next().value);
      }
    }
    return this.add(tree);
  }
  skipPiece() {
    const done = this.tree;
    if (done || this.scanning)
      return done;
    const cut = this.starts[this.trees.length];
    const prefix = cut.prefix ?? "";
    const body = this.text.slice(cut.at, this.starts[this.trees.length + 1]?.at ?? this.text.length);
    const value = body.trim();
    const lead = body.slice(0, body.length - body.trimStart().length);
    const lines = (s) => s.split(`
`).length - 1;
    const offset = prefix.length + lead.length;
    const start = { line: 1 + lines(prefix + lead), column: lead.length - lead.lastIndexOf(`
`), offset };
    const end = { line: start.line + lines(value), column: value.includes(`
`) ? value.length - value.lastIndexOf(`
`) : start.column + value.length, offset: offset + value.length };
    const position = { start, end };
    const children = value ? [{ type: "element", tagName: "p", properties: {}, children: [{ type: "text", value, position }], position }] : [];
    return this.add({ type: "root", children, position });
  }
  add(tree) {
    this.trees.push(tree);
    if (this.trees.length < this.starts.length)
      return null;
    this.result = remember2(this.key, this.join());
    return this.result;
  }
  join() {
    if (this.trees.length === 1)
      return this.trees[0];
    const children = [];
    let line = 0;
    let prev = 0;
    this.trees.forEach((tree, i) => {
      const cut = this.starts[i];
      for (let k = prev;k < cut.at; k++)
        if (this.text.charCodeAt(k) === 10)
          line++;
      prev = cut.at;
      const prefix = cut.prefix ?? "";
      const moved = shifted(tree, line - (prefix.split(`
`).length - 1), cut.at - prefix.length);
      let rest = moved.children;
      const last = children.at(-1);
      const first = rest[0];
      if (cut.join === "list" && last?.type === "element" && first?.type === "element" && last.tagName === first.tagName && /^[uo]l$/.test(last.tagName)) {
        children[children.length - 1] = mergeChildren(last, first);
        rest = rest.slice(1);
      } else if (cut.join === "table" && last?.type === "element" && first?.type === "element" && last.tagName === "table" && first.tagName === "table") {
        const body = (t) => t.children.find((c) => c.type === "element" && c.tagName === "tbody");
        const into = body(last);
        const from = body(first);
        if (into?.type === "element" && from?.type === "element") {
          const tbody = mergeChildren(into, from);
          children[children.length - 1] = { ...last, children: last.children.map((c) => c === into ? tbody : c), position: last.position && first.position && { start: last.position.start, end: first.position.end } };
          rest = rest.slice(1);
        }
      } else if (children.length && rest.length)
        children.push({ type: "text", value: `
` });
      children.push(...rest);
    });
    const lines = this.text.split(`
`);
    const end = { line: lines.length, column: lines.at(-1).length + 1, offset: this.text.length };
    return { type: "root", children, position: { start: { line: 1, column: 1, offset: 0 }, end } };
  }
}
function mergeChildren(a, b) {
  return { ...a, children: [...a.children, ...b.children.slice(1)], position: a.position && b.position && { start: a.position.start, end: b.position.end } };
}
function shifted(node, lines, offset) {
  const copy = { ...node };
  const p = node.position;
  if (p) {
    const move = (at) => ({ line: at.line + lines, column: at.column, offset: (at.offset ?? 0) + offset });
    copy.position = { start: move(p.start), end: move(p.end) };
  }
  if ("children" in node)
    copy.children = node.children.map((child) => shifted(child, lines, offset));
  return copy;
}

// src/markdown/budget.ts
var SYNC_MS = 8;
var SYNC_CHARS = 300;
var STEP_CHARS = 4000;
var MAX_STEP_COST = 12000;
var DRAIN_STALE_MS = 1000;
var RUN_COST = 100;
var REDRAW_MS2 = 250;
var queues = new WeakMap;
var running = new WeakMap;
var failed = new Set;
var note = (set, key) => {
  set.add(key);
  if (set.size > 50)
    set.delete(set.values().next().value);
};
var shown = new WeakMap;
function markdownTree(ctx, part, text, profile) {
  const site = ctx.id(part);
  let sites = shown.get(ctx.session);
  if (!sites)
    shown.set(ctx.session, sites = new Map);
  let queue = queues.get(ctx.session);
  const key = `${profile}\x00${text}`;
  const mine = sites.get(site);
  if (mine?.key === key)
    return mine.tree;
  const tree = readyMarkdown(text, profile) ?? (failed.has(key) || text.length <= SYNC_CHARS && ctx.renderTime < SYNC_MS ? parseMarkdown(text, profile) : null);
  if (tree) {
    queue?.delete(site);
    sites.set(site, { key, tree });
    return tree;
  }
  if (!queue)
    queues.set(ctx.session, queue = new Map);
  const waiting = queue.get(site);
  if (waiting?.parse.key === key)
    waiting.wake = ctx.waker();
  else
    queue.set(site, { parse: new MarkdownParse(text, profile), wake: ctx.waker() });
  const resumed = running.get(ctx.session);
  if (resumed === undefined || Date.now() - resumed > DRAIN_STALE_MS) {
    running.set(ctx.session, Date.now());
    const session = ctx.session;
    const done = sites;
    ctx.after((cx) => cx.spawn((task) => drain(task, session, queue, done)));
  }
  return mine?.tree ?? null;
}
function markdownPending(session) {
  return (queues.get(session)?.size ?? 0) > 0;
}
async function drain(task, session, queue, sites) {
  let redrawn = Date.now();
  const ready = new Set;
  const redraw = () => {
    for (const wake of ready)
      wake();
    ready.clear();
  };
  try {
    while (queue.size) {
      let spent = 0;
      running.set(session, Date.now());
      for (const [site, { parse, wake }] of queue) {
        let threw = false;
        while (!parse.tree) {
          const oversize = !parse.scanning && parse.nextCost > MAX_STEP_COST;
          const cost = parse.scanning ? STEP_CHARS : oversize ? RUN_COST : RUN_COST + parse.nextSize;
          if (spent > 0 && spent + cost > STEP_CHARS)
            break;
          spent += cost;
          try {
            if (oversize) {
              console.log(`[opengpui] markdown block too long to parse in one step (${parse.nextSize} characters): drawn as text`);
              parse.skipPiece();
            } else
              parse.step();
          } catch (e) {
            console.log(`[opengpui] markdown parse failed: ${e}`);
            note(failed, parse.key);
            threw = true;
            break;
          }
        }
        const tree = parse.tree;
        if (tree)
          sites.set(site, { key: parse.key, tree });
        if (tree || threw) {
          queue.delete(site);
          ready.add(wake);
        }
        if (spent + RUN_COST > STEP_CHARS)
          break;
      }
      await task.sleep(16);
      if (queue.size && Date.now() - redrawn >= REDRAW_MS2) {
        redrawn = Date.now();
        redraw();
      }
    }
  } finally {
    running.delete(session);
  }
  redraw();
}

// opengpui-shared:./src/upstream/timers.ts
var m15 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["./src/upstream/timers.ts"];
var e09 = m15["ogpuiClearInterval"];
var e113 = m15["ogpuiSetInterval"];
var e212 = m15["withScheduler"];

// opengpui-shared:openui-icon-fallbacks
var m16 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-icon-fallbacks"];
var e010 = m16["categoryFallbacks"];
var e114 = m16["defaultFallbackIconName"];
var e213 = m16["getFallbackIconName"];

// opengpui-shared:openui-icons
var m17 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-icons"];
var e011 = m17["dynamicIconImports"];
var e115 = m17["getIconImport"];
var e214 = m17["unwrapModuleDefault"];

// src/render/icons.ts
function file(name) {
  const thunk = e115(name);
  return thunk ? String(thunk()) : null;
}
function iconFile(name, category) {
  return file(name) ?? file(e213(category)) ?? "circle-dot";
}

// src/render/invalidate.ts
function indexTree(root) {
  const byPath = new Map;
  const pathOf = new Map;
  const walk = (value, path, depth) => {
    if (value === null || typeof value !== "object" || depth > 256)
      return;
    if (Array.isArray(value)) {
      for (let i = 0;i < value.length; i++)
        walk(value[i], `${path}/${i}`, depth + 1);
      return;
    }
    if ("type" in value && value.type === "element" && "typeName" in value) {
      byPath.set(path, value);
      if (!pathOf.has(value))
        pathOf.set(value, path);
      const props = "props" in value ? value.props : undefined;
      if (props && typeof props === "object")
        for (const [k, v] of Object.entries(props))
          walk(v, `${path}/${k}`, depth + 1);
      return;
    }
    for (const [k, v] of Object.entries(value))
      walk(v, `${path}/${k}`, depth + 1);
  };
  walk(root, "root", 0);
  return { byPath, pathOf };
}
function sameValue(a, b, memo = new Map) {
  if (Object.is(a, b))
    return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object")
    return false;
  let known = memo.get(a);
  const hit = known?.get(b);
  if (hit !== undefined)
    return hit;
  const result = compareObjects(a, b, memo);
  if (!known)
    memo.set(a, known = new Map);
  known.set(b, result);
  return result;
}
function compareObjects(a, b, memo) {
  if (Array.isArray(a) !== Array.isArray(b))
    return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length)
      return false;
    for (let i = 0;i < a.length; i++)
      if (!sameValue(a[i], b[i], memo))
        return false;
    return true;
  }
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  if (isElementNode(a) && isElementNode(b))
    return a.typeName === b.typeName && sameValue(a.props, b.props, memo);
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length)
    return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k))
      return false;
    if (!sameValue(Reflect.get(a, k), Reflect.get(b, k), memo))
      return false;
  }
  return true;
}
function isElementNode(v) {
  return "type" in v && v.type === "element" && "typeName" in v;
}

// opengpui-shared:openui-lucide-svgs
var m18 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-lucide-svgs"];
var openui_lucide_svgs_default = m18.default;

// src/render/lucide.ts
var ICON_SIZE = 14;
function lucideSvg(file, stroke = 2) {
  const inner = openui_lucide_svgs_default[file];
  if (inner == null)
    return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` + `stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return { name: `${file}-${stroke}-${fnv1a(svg)}`, svg };
}
function fnv1a(text) {
  let hash = 2166136261;
  for (let i = 0;i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// src/render/surface.ts
function optional(el) {
  return el == null ? [] : [el];
}
var STABLE_MS = 150;
var WAITING = { status: "loading" };
var LAYOUT_WAITING = { status: "loading" };
var LAYOUT_VERSION = 1;
var DEFERRED_MS = 150;
var TICK_MS = 16;

class ViewRecord {
  kind;
  key;
  ctxKey;
  scope;
  static next = 1;
  id = ViewRecord.next++;
  entity = null;
  released = false;
  parent = null;
  node = null;
  drawnNode = null;
  path = null;
  overlayDraw = null;
  pieceDraw = null;
  input = undefined;
  drawnInput = undefined;
  order = 0;
  shown = true;
  focus = null;
  frame = 0;
  started = 0;
  rendering = false;
  wanted = new Map;
  images = new Set;
  mounted = new Set;
  dropped = new Set;
  reads = [];
  fields = new Map;
  nextReads = [];
  nextFields = new Map;
  notified = false;
  dirty = false;
  waitFrom = null;
  constructor(kind, key, ctxKey, scope) {
    this.kind = kind;
    this.key = key;
    this.ctxKey = ctxKey;
    this.scope = scope;
  }
}
function canonicalJson(value) {
  if (Array.isArray(value))
    return `[${value.map((v) => v === undefined ? "null" : canonicalJson(v)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function layoutKey(graph) {
  const text = `${LAYOUT_VERSION}:${canonicalJson(graph)}`;
  let hi = 3421674724;
  let lo = 2216829733;
  for (let i = 0;i < text.length; i++) {
    lo ^= text.charCodeAt(i);
    const low = (lo >>> 0) * 435;
    const carry = Math.floor(low / 4294967296);
    hi = (hi >>> 0) * 435 + carry + (lo << 8 >>> 0) >>> 0;
    lo = low >>> 0;
  }
  return (hi >>> 0).toString(16).padStart(8, "0") + (lo >>> 0).toString(16).padStart(8, "0");
}
var records = new Map;

class RecordView extends View {
  id = 0;
  init(props) {
    this.id = Number(props?.id);
  }
  render() {
    const found = records.get(this.id);
    if (!found || found.record.released)
      return div3().hidden();
    return found.surface.renderRecord(found.record);
  }
}

class Surface {
  session;
  tokens;
  components;
  iconWriter;
  icons = new Map;
  imageLoader;
  images = new Map;
  imagesWaiting = new Map;
  layouter;
  layouts = new Map;
  layoutsWaiting = new Map;
  retainedEntries = new Map;
  deferred = [];
  local = new Map;
  viewportHeight = null;
  host = new ViewRecord("host", "", "n", {});
  views = new Map;
  index = indexTree(null);
  indexed = null;
  overlayCount = 0;
  overlayTop = null;
  hostSeen = null;
  onIdle = null;
  idle = null;
  closed = false;
  pending = false;
  actions = [];
  timers = new Set;
  unreleased = new Set;
  constructor(options) {
    this.session = options.session;
    this.components = options.components;
    this.tokens = options.tokens ?? resolveTokens("light");
    this.iconWriter = options.icons ?? null;
    this.imageLoader = options.images ?? null;
    this.layouter = options.layout ?? null;
  }
  setTokens(tokens) {
    if (tokens === this.tokens || sameValue(tokens, this.tokens))
      return;
    this.tokens = tokens;
    for (const rec of this.views.values())
      rec.dirty = true;
    this.wake();
  }
  setViewportHeight(height) {
    if (this.viewportHeight === height)
      return;
    this.viewportHeight = height;
    this.wake();
  }
  pane = null;
  notePane(e) {
    if (!e.bounds || !e.local_position)
      return;
    const left = e.position.x - e.local_position.x;
    const top = e.position.y - e.local_position.y;
    const right = left + e.bounds.width;
    const bottom = top + e.bounds.height;
    const p = this.pane;
    if (!p || p.left !== left || p.top !== top || p.right !== right || p.bottom !== bottom)
      this.pane = { left, top, right, bottom };
  }
  attach(cx) {
    const previous = this.session.onChange;
    this.session.onChange = () => {
      previous();
      this.wake();
    };
    this.wake();
    cx.spawn(async (cx) => {
      while (!this.closed) {
        await cx.sleep(this.pending ? 0 : TICK_MS);
        if (this.closed)
          continue;
        for (const rec of [...this.unreleased])
          this.release(rec);
        if (!this.pending)
          continue;
        this.pending = false;
        try {
          if (this.pump(cx))
            cx.notify();
        } catch (e) {
          console.log(`[opengpui] pump failed: ${e}`);
        }
      }
    });
  }
  wake() {
    this.pending = true;
  }
  queueAction(label, formName, action) {
    this.actions.push({ label, formName, action });
    this.wake();
  }
  pump(cx) {
    const scheduler = {
      every: (ms, fn) => {
        const task = cx.timer.every(ms, () => fn());
        this.timers.add(task);
        return {
          cancel: () => {
            task.cancel();
            this.timers.delete(task);
          }
        };
      }
    };
    for (const { label, formName, action } of this.actions.splice(0)) {
      this.session.triggerAction(label, formName, action).catch((e) => console.log(`[opengpui] action failed: ${e}`));
    }
    e212(scheduler, () => this.session.update());
    const notify = new Set;
    let host = false;
    const root = this.session.root;
    if (root !== this.indexed) {
      this.indexed = root;
      this.index = indexTree(root);
      const memo = new Map;
      for (const rec of this.views.values()) {
        if (rec.kind !== "node" || !rec.entity || rec.path === null)
          continue;
        const now = this.index.byPath.get(rec.path);
        if (!now || now === rec.drawnNode || sameValue(now, rec.drawnNode, memo))
          continue;
        rec.node = now;
        notify.add(rec);
      }
    }
    for (const rec of this.liveRecords()) {
      if (rec.dirty) {
        rec.dirty = false;
        notify.add(rec);
        continue;
      }
      if (this.readsChanged(rec))
        notify.add(rec);
    }
    for (const rec of [...this.liveRecords()]) {
      for (const child of rec.dropped)
        if (child.parent === rec && !rec.mounted.has(child))
          this.release(child);
      rec.dropped.clear();
    }
    for (const rec of this.views.values())
      if (rec.kind === "overlay" && rec.entity && !rec.shown && rec.parent)
        notify.add(rec.parent);
    for (const rec of this.views.values()) {
      if (rec.entity || rec.released || !rec.parent?.mounted.has(rec))
        continue;
      this.makeView(cx, rec);
      notify.add(rec.kind === "overlay" ? this.host : rec.parent);
    }
    const wanted = new Map;
    for (const rec of this.liveRecords()) {
      for (const [key, spec] of rec.wanted) {
        const w = wanted.get(key);
        if (w)
          w.askers.push(rec);
        else
          wanted.set(key, { spec, askers: [rec] });
      }
    }
    for (const [key, { spec, askers }] of wanted) {
      if (this.retainedEntries.has(key))
        continue;
      const entry = { kind: spec.kind, meta: spec.meta, state: null };
      entry.state = spec.create(entry, cx);
      this.retainedEntries.set(key, entry);
      for (const rec of askers)
        notify.add(rec);
    }
    for (const [key, entry] of this.retainedEntries) {
      if (wanted.has(key))
        continue;
      entry.state?.release?.();
      this.retainedEntries.delete(key);
    }
    const seen = new Set;
    for (const rec of this.liveRecords())
      for (const src of rec.images)
        seen.add(src);
    for (const src of this.images.keys())
      if (!seen.has(src))
        this.images.delete(src);
    for (const src of this.imagesWaiting.keys())
      if (!seen.has(src))
        this.imagesWaiting.delete(src);
    for (const key of this.layouts.keys())
      if (!seen.has(`layout:${key}`))
        this.layouts.delete(key);
    for (const key of this.layoutsWaiting.keys())
      if (!seen.has(`layout:${key}`))
        this.layoutsWaiting.delete(key);
    let top = null;
    for (const rec of this.overlays())
      if (rec.shown && rec.focus)
        top = rec.focus;
    if (top !== this.overlayTop) {
      this.overlayTop = top;
      top?.focus();
    }
    const started = Date.now();
    const deferred = this.deferred;
    this.deferred = [];
    for (let i = 0;i < deferred.length; i++) {
      if (i > 0 && Date.now() - started > DEFERRED_MS) {
        this.deferred = deferred.slice(i).concat(this.deferred);
        this.wake();
        break;
      }
      const { fn, owner } = deferred[i];
      if (owner.released)
        continue;
      try {
        fn(ownedContext(cx, owner, this));
      } catch (e) {
        console.log(`[opengpui] deferred work failed: ${e}`);
      }
      notify.add(owner);
    }
    for (const rec of [...notify])
      for (const child of rec.mounted)
        if (child.kind !== "node" && child.entity)
          notify.add(child);
    for (const rec of notify) {
      if (rec.kind === "host")
        host = true;
      else
        this.notifyView(cx, rec);
    }
    const waiting = this.awaitingDraw();
    const redrawHost = host || waiting || !sameValue(this.hostState(), this.hostSeen);
    this.setIdle(!redrawHost && this.deferred.length === 0 && !this.pending && !this.working());
    return redrawHost;
  }
  makeView(cx, rec) {
    records.set(rec.id, { surface: this, record: rec });
    if (rec.kind === "overlay")
      rec.order = ++this.overlayCount;
    rec.entity = createView(cx, RecordView, { id: rec.id });
    rec.waitFrom = this.host.frame;
  }
  awaitingDraw() {
    for (const rec of this.liveRecords())
      if (rec.dirty || rec.waitFrom !== null && this.host.frame <= rec.waitFrom)
        return true;
    return false;
  }
  working() {
    for (const state of this.icons.values())
      if (state.status === "loading")
        return true;
    for (const state of this.images.values())
      if (state.status === "loading")
        return true;
    for (const waiting of this.imagesWaiting.values())
      if (!waiting.settled)
        return true;
    for (const state of this.layouts.values())
      if (state.status === "loading")
        return true;
    for (const waiting of this.layoutsWaiting.values())
      if (!waiting.settled)
        return true;
    return markdownPending(this.session) || highlightPending(this.session) || this.session.isQueryLoading;
  }
  setIdle(idle) {
    if (idle === this.idle)
      return;
    this.idle = idle;
    this.onIdle?.(idle);
  }
  notifyView(cx, rec) {
    if (rec.released)
      return;
    if (rec.kind === "host")
      return cx.notify();
    if (!rec.entity || rec.frame === 0)
      return;
    rec.notified = true;
    rec.waitFrom ??= this.host.frame;
    cx.notify(rec.entity);
  }
  readsChanged(rec) {
    let changed = false;
    rec.reads = rec.reads.filter((r) => {
      try {
        if (!sameValue(r.read(), r.last))
          changed = true;
        return true;
      } catch {
        return false;
      }
    });
    return changed;
  }
  *liveRecords() {
    yield this.host;
    for (const rec of this.views.values())
      if (!rec.released)
        yield rec;
  }
  overlays() {
    return [...this.views.values()].filter((r) => r.kind === "overlay" && r.entity && !r.released).sort((a, b) => a.order - b.order);
  }
  hostState() {
    const s = this.session;
    const root = this.views.get(ROOT_KEY);
    return [s.errors, s.blocked, s.isQueryLoading, s.root === null, root?.entity ?? null, this.overlays().map((r) => r.id)];
  }
  release(rec) {
    if (rec.released)
      return;
    try {
      rec.entity?.release();
    } catch (e) {
      if (!this.unreleased.has(rec))
        console.log(`[opengpui] view release refused, retrying: ${e}`);
      this.unreleased.add(rec);
      return;
    }
    this.unreleased.delete(rec);
    rec.entity = null;
    rec.released = true;
    for (const child of [...rec.mounted, ...rec.dropped])
      if (child.parent === rec)
        this.release(child);
    rec.mounted.clear();
    rec.dropped.clear();
    for (const regs of [rec.fields, rec.nextFields]) {
      for (const [reg, { form, name }] of regs)
        if (form.fields[name] === reg)
          delete form.fields[name];
      regs.clear();
    }
    rec.reads = [];
    if (this.views.get(rec.key) === rec)
      this.views.delete(rec.key);
    records.delete(rec.id);
  }
  invalidate(rec) {
    if (rec.released)
      return;
    rec.dirty = true;
    this.wake();
  }
  imageChanged(src) {
    for (const rec of this.liveRecords())
      if (rec.images.has(src))
        rec.dirty = true;
    this.wake();
  }
  mount(parent, kind, key, scope) {
    let rec = this.views.get(key);
    let fresh = false;
    if (!rec || rec.kind !== kind) {
      rec = new ViewRecord(kind, key, kind === "node" ? key : parent.key, scope);
      this.views.set(key, rec);
      fresh = true;
    }
    const owner = parent.view;
    rec.parent = owner;
    owner.mounted.add(rec);
    this.unreleased.delete(rec);
    if (!sameScope(rec.scope, scope)) {
      rec.scope = scope;
      fresh = true;
    }
    if (!rec.entity)
      this.wake();
    return { rec, fresh };
  }
  mountNode(parent, key, node) {
    const { rec, fresh } = this.mount(parent, "node", key, parent.scope);
    rec.node = node;
    rec.path = this.index.pathOf.get(node) ?? null;
    const entity = rec.entity;
    if (!entity)
      return div3().hidden();
    if (!rec.notified && (fresh || node !== rec.drawnNode && !sameValue(node, rec.drawnNode)))
      this.invalidate(rec);
    return entity;
  }
  renderRecord(rec) {
    const ctx = this.begin(rec);
    let out;
    try {
      if (rec.kind === "node") {
        rec.drawnNode = rec.node;
        out = rec.node ? single(ctx.renderComponent(rec.node)) : div3().hidden();
      } else if (rec.kind === "piece") {
        rec.drawnInput = rec.input;
        out = rec.pieceDraw?.(ctx) ?? div3().hidden();
      } else {
        const drawn = rec.overlayDraw?.(ctx) ?? null;
        rec.shown = drawn != null;
        rec.focus = drawn?.focus ?? null;
        out = drawn?.el ?? div3().hidden();
        if (!drawn)
          this.wake();
      }
    } finally {
      this.end(rec);
    }
    return out;
  }
  begin(rec) {
    if (rec.rendering)
      for (const [reg, entry] of rec.nextFields)
        rec.fields.set(reg, entry);
    rec.rendering = true;
    rec.notified = false;
    rec.waitFrom = null;
    rec.dirty = false;
    rec.frame++;
    rec.started = Date.now();
    for (const child of rec.mounted)
      rec.dropped.add(child);
    rec.mounted = new Set;
    rec.wanted = new Map;
    rec.images = new Set;
    rec.nextReads = [];
    rec.nextFields = new Map;
    return new RenderContext(this, rec, rec.ctxKey, rec.scope);
  }
  end(rec) {
    rec.rendering = false;
    for (const [reg, { form, name }] of rec.fields)
      if (!rec.nextFields.has(reg) && form.fields[name] === reg)
        delete form.fields[name];
    rec.fields = rec.nextFields;
    rec.reads = rec.nextReads;
    const missing = [...rec.wanted.keys()].some((k) => !this.retainedEntries.has(k));
    if (missing || rec.dropped.size || this.deferred.length || !this.idle)
      this.wake();
  }
  renderContent() {
    const ctx = this.begin(this.host);
    try {
      const root = this.session.root;
      return root ? [this.mountNode(ctx, ROOT_KEY, root)] : [];
    } finally {
      this.end(this.host);
      this.hostSeen = this.hostState();
    }
  }
  renderOverlays() {
    return this.overlays().flatMap((r) => optional(r.entity));
  }
  close() {
    this.closed = true;
    for (const task of this.timers)
      task.cancel();
    this.timers.clear();
    for (const rec of [...this.views.values()])
      this.release(rec);
    for (const entry of this.retainedEntries.values())
      entry.state?.release?.();
    this.retainedEntries.clear();
    this.session.dispose();
  }
}
var ROOT_KEY = "n.root";
function sameScope(a, b) {
  return a === b || a.formName === b.formName && a.inline === b.inline && sameValue(a.cardText, b.cardText);
}
function single(out) {
  if (out == null)
    return div3().hidden();
  if (!Array.isArray(out))
    return out;
  const items = flatten2(out);
  return items.length === 1 ? items[0] : div3().flex().flex_col().children(items);
}
function createView(cx, Class, props) {
  const creator = cx;
  return creator.new(Class, props);
}
function ownedContext(cx, owner, surface) {
  const owned = new OwnedContext(cx, owner, surface);
  return owned;
}

class OwnedContext {
  cx;
  owner;
  surface;
  constructor(cx, owner, surface) {
    this.cx = cx;
    this.owner = owner;
    this.surface = surface;
  }
  wrap = (cx) => ownedContext(cx, this.owner, this.surface);
  notify(target) {
    if (target)
      return this.cx.notify(target);
    const owner = this.owner;
    if (owner.entity || owner.kind === "host")
      this.surface.notifyView(this.cx, owner);
    else
      this.surface.invalidate(owner);
  }
  get timer() {
    return {
      after: (ms, handler, opts) => this.cx.timer.after(ms, (cx) => handler(this.wrap(cx)), opts),
      every: (ms, handler, opts) => this.cx.timer.every(ms, (cx) => handler(this.wrap(cx)), opts)
    };
  }
  spawn(body, opts) {
    return this.cx.spawn((cx) => body(this.wrap(cx)), opts);
  }
  bind_keys(...args) {
    return this.cx.bind_keys(...args);
  }
  stop_propagation() {
    this.cx.stop_propagation();
  }
  propagate() {
    this.cx.propagate();
  }
  phase() {
    return this.cx.phase();
  }
  theme() {
    return this.cx.theme();
  }
  open_url(url) {
    this.cx.open_url(url);
  }
  read_from_clipboard() {
    return this.cx.read_from_clipboard();
  }
  write_to_clipboard(text) {
    this.cx.write_to_clipboard(text);
  }
  focus_handle() {
    return this.cx.focus_handle();
  }
  new(Class, props) {
    return createView(this.cx, Class, props ?? {});
  }
  sleep(ms) {
    return this.cx.sleep(ms);
  }
}

class RenderContext {
  surface;
  view;
  key;
  scope;
  session;
  t;
  constructor(surface, view, key, scope) {
    this.surface = surface;
    this.view = view;
    this.key = key;
    this.scope = scope;
    this.session = surface.session;
    this.t = surface.tokens;
  }
  track(read, value) {
    if (this.view.rendering)
      this.view.nextReads.push({ read, last: value });
    return value;
  }
  watch(read) {
    return this.track(read, read());
  }
  get formName() {
    return this.scope.formName;
  }
  get form() {
    const formName = this.scope.formName;
    if (formName === undefined)
      return null;
    const form = this.session.form(formName);
    const view = this.view;
    return {
      getFieldError: (name) => this.track(() => form.getFieldError(name), form.getFieldError(name)),
      validateField: (name, value, rules) => form.validateField(name, value, rules),
      registerField: (name, rules, getValue) => {
        form.registerField(name, rules, getValue);
        const reg = form.fields[name];
        if (reg && view.rendering)
          view.nextFields.set(reg, { form, name });
      },
      clearFieldError: (name) => form.clearFieldError(name),
      validateForm: () => form.validateForm()
    };
  }
  get streaming() {
    const session = this.session;
    return this.track(() => session.blocked, session.blocked);
  }
  get queryLoading() {
    const session = this.session;
    return this.track(() => session.isQueryLoading, session.isQueryLoading);
  }
  id(part = "") {
    return part ? `${this.key}:${part}` : this.key;
  }
  get renderTime() {
    return Date.now() - this.view.started;
  }
  get frame() {
    return this.view.frame;
  }
  get viewportHeight() {
    const surface = this.surface;
    return this.track(() => surface.viewportHeight, surface.viewportHeight);
  }
  get pane() {
    return this.surface.pane;
  }
  wake() {
    this.surface.invalidate(this.view);
  }
  waker() {
    const surface = this.surface;
    const view = this.view;
    return () => surface.invalidate(view);
  }
  icon(name, options = {}) {
    const surface = this.surface;
    const writer = surface.iconWriter;
    const icon = writer ? lucideSvg(iconFile(name, options.category), options.stroke) : null;
    if (!writer || !icon)
      return null;
    const key = `icon:${icon.name}`;
    this.view.images.add(key);
    let state = surface.icons.get(icon.name);
    if (!state) {
      const loading = { status: "loading" };
      state = loading;
      surface.icons.set(icon.name, loading);
      this.after((cx) => {
        cx.spawn(async () => {
          try {
            surface.icons.set(icon.name, { status: "ready", path: await writer(icon.name, icon.svg) });
          } catch (e) {
            console.log(`[opengpui] icon ${icon.name}: ${e instanceof Error ? e.message : e}`);
            surface.icons.set(icon.name, { status: "failed" });
          }
          surface.imageChanged(key);
        });
      });
    }
    return (state.status === "ready" ? svg(state.path) : div3()).size(options.size ?? ICON_SIZE).flex_none();
  }
  image(src) {
    const surface = this.surface;
    this.view.images.add(src);
    const known = surface.images.get(src);
    if (known)
      return known;
    const loader = surface.imageLoader;
    if (!loader || !src.trim()) {
      const failed = { status: "failed", error: loader ? "empty src" : "the host loads no images" };
      surface.images.set(src, failed);
      return failed;
    }
    const session = this.session;
    if (session.isStreaming) {
      const revision = this.track(() => session.revision, session.revision);
      const waiting = surface.imagesWaiting.get(src);
      if (!waiting) {
        const entry = { revision, settled: false };
        surface.imagesWaiting.set(src, entry);
        this.after((cx) => cx.timer.after(STABLE_MS, () => {
          entry.settled = true;
          surface.imageChanged(src);
        }));
        return WAITING;
      }
      if (waiting.revision === revision && !waiting.settled)
        return WAITING;
    }
    surface.imagesWaiting.delete(src);
    const loading = { status: "loading" };
    surface.images.set(src, loading);
    this.after((cx) => {
      cx.spawn(async () => {
        let next;
        try {
          const loaded = await loader(src);
          next = { status: "ready", path: loaded.path, width: loaded.width, height: loaded.height };
        } catch (e) {
          next = { status: "failed", error: e instanceof Error ? e.message : String(e) };
        }
        if (surface.images.get(src) !== loading)
          return;
        surface.images.set(src, next);
        surface.imageChanged(src);
      });
    });
    return loading;
  }
  layout(graph) {
    const surface = this.surface;
    const key = layoutKey(graph);
    const asked = `layout:${key}`;
    this.view.images.add(asked);
    const known = surface.layouts.get(key);
    if (known)
      return known;
    const layouter = surface.layouter;
    if (!layouter) {
      const failed = { status: "failed", error: "the host lays out no diagrams" };
      surface.layouts.set(key, failed);
      return failed;
    }
    const session = this.session;
    if (session.isStreaming) {
      const revision = this.track(() => session.revision, session.revision);
      const waiting = surface.layoutsWaiting.get(key);
      if (!waiting) {
        const entry = { revision, settled: false };
        surface.layoutsWaiting.set(key, entry);
        this.after((cx) => cx.timer.after(STABLE_MS, () => {
          entry.settled = true;
          surface.imageChanged(asked);
        }));
        return LAYOUT_WAITING;
      }
      if (waiting.revision === revision && !waiting.settled)
        return LAYOUT_WAITING;
    }
    surface.layoutsWaiting.delete(key);
    const loading = { status: "loading" };
    surface.layouts.set(key, loading);
    this.after((cx) => {
      cx.spawn(async () => {
        let next;
        try {
          next = { status: "ready", layout: await layouter(graph) };
        } catch (e) {
          next = { status: "failed", error: e instanceof Error ? e.message : String(e) };
        }
        if (surface.layouts.get(key) !== loading)
          return;
        surface.layouts.set(key, next);
        surface.imageChanged(asked);
      });
    });
    return loading;
  }
  overlay(part, draw) {
    const { rec } = this.surface.mount(this, "overlay", `${this.key}#overlay:${part}`, this.scope);
    rec.overlayDraw = draw;
    if (rec.entity && !rec.notified)
      this.surface.invalidate(rec);
  }
  piece(part, input, draw) {
    const { rec, fresh } = this.surface.mount(this, "piece", `${this.key}#piece:${part}`, this.scope);
    rec.pieceDraw = (o) => draw(o, rec.input);
    rec.input = input;
    const entity = rec.entity;
    if (!entity)
      return div3().hidden();
    if (!rec.notified && (fresh || !sameValue(input, rec.drawnInput)))
      this.surface.invalidate(rec);
    return entity;
  }
  child(suffix, scope = this.scope) {
    return new RenderContext(this.surface, this.view, `${this.key}.${suffix}`, scope);
  }
  render(value, suffix = "0") {
    if (value == null || value === false)
      return null;
    if (typeof value === "string")
      return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    if (Array.isArray(value))
      return value.flatMap((v, i) => this.children(v, `${suffix}_${i}`));
    if (typeof value === "object" && "type" in value && value.type === "element") {
      return this.renderNode(value, suffix);
    }
    return null;
  }
  children(value, suffix = "c") {
    const out = this.render(value, suffix);
    return out == null ? [] : Array.isArray(out) ? flatten2(out) : [out];
  }
  renderNode(node, suffix) {
    const component = this.surface.components[node.typeName];
    if (!this.scope.inline) {
      if (component?.view)
        return this.surface.mountNode(this, `${this.key}.${suffix}`, node);
      return this.child(suffix).renderComponent(node);
    }
    const { inline: _, ...below } = this.scope;
    return this.child(suffix, below).renderComponent(node);
  }
  renderComponent(node) {
    const component = this.surface.components[node.typeName];
    if (!component)
      return unsupported(this, node.typeName);
    try {
      const ctx = component.inlineChildren ? new RenderContext(this.surface, this.view, this.key, { ...this.scope, inline: true }) : this;
      return component.render(node.props ?? {}, ctx, node);
    } catch (e) {
      this.session.reportRenderError({
        source: "runtime",
        code: "render-error",
        component: node.typeName,
        message: `Component ${node.typeName} render failed: ${e instanceof Error ? e.message : String(e)}`
      });
      return div3().px(8).py(4).rounded(6).border_1().border_color(this.t.borderDangerEmphasis).text_color(this.t.textDangerPrimary).text_size(12).child(`${node.typeName} failed to render`);
    }
  }
  field(name, binding) {
    const session = this.session;
    const formName = this.scope.formName;
    const field = session.stateField(formName, name, binding);
    this.track(() => session.stateField(formName, name, binding).value, field.value);
    return field;
  }
  trigger(label, action) {
    this.action(label, this.scope.formName, action);
  }
  action(label, formName, action) {
    this.surface.queueAction(label, formName, action);
  }
  retained(key, spec) {
    this.view.wanted.set(key, spec);
    const entry = this.surface.retainedEntries.get(key);
    if (!entry || entry.kind !== spec.kind)
      return null;
    entry.meta = spec.meta;
    return entry.state;
  }
  after(fn) {
    this.surface.deferred.push({ fn, owner: this.view });
    this.surface.wake();
  }
  pruneLocals(prefix, keep) {
    const head = `${this.key}:${prefix}`;
    for (const key of this.surface.local.keys())
      if (key.startsWith(head) && !keep(key.slice(head.length)))
        this.surface.local.delete(key);
  }
  local(initial, part = "") {
    const key = part ? `${this.key}:${part}` : this.key;
    let state = this.surface.local.get(key);
    if (!state) {
      state = { ...initial };
      this.surface.local.set(key, state);
    }
    return state;
  }
}
function flatten2(items) {
  return items.flatMap((o) => o == null ? [] : Array.isArray(o) ? flatten2(o) : [o]);
}
function unsupported(ctx, typeName) {
  return h_flex().px(10).py(6).rounded(6).border_1().border_dashed().border_color(ctx.t.borderInteractive).text_size(12).text_color(ctx.t.textNeutralSecondary).child(`${typeName} is not supported by opengpui yet`);
}

// src/components/buttons.ts
function look(t, variant, destructive) {
  if (!destructive) {
    switch (variant) {
      case "primary":
        return {
          bg: t.interactiveAccentDefault,
          fg: t.textAccentPrimary,
          border: t.borderAccent,
          shadow: t.shadowM,
          hoverBg: t.interactiveAccentHover,
          hoverShadow: "none",
          activeBg: t.interactiveAccentPressed,
          disabledBg: t.interactiveAccentDisabled
        };
      case "secondary":
        return {
          bg: TRANSPARENT,
          fg: t.textNeutralPrimary,
          border: t.borderInteractive,
          shadow: t.shadowM,
          hoverBg: t.highlight,
          hoverShadow: "none",
          activeBg: t.highlight,
          disabledBg: TRANSPARENT,
          disabledFg: t.textNeutralTertiary
        };
      default:
        return {
          bg: TRANSPARENT,
          fg: t.textNeutralPrimary,
          border: TRANSPARENT,
          shadow: "none",
          hoverBg: t.highlight,
          activeBg: t.highlight,
          activeBorder: t.borderInteractive,
          disabledBg: TRANSPARENT,
          disabledFg: t.textNeutralTertiary,
          disabledBorder: t.borderDefault
        };
    }
  }
  switch (variant) {
    case "primary":
      return {
        bg: t.interactiveDestructiveAccentDefault,
        fg: t.textDangerInvertedPrimary,
        border: t.borderAccent,
        shadow: "none",
        hoverBg: t.interactiveDestructiveAccentHover,
        activeBg: t.interactiveDestructiveAccentPressed,
        disabledBg: t.interactiveDestructiveAccentDisabled
      };
    case "secondary":
      return {
        bg: t.interactiveDestructiveDefault,
        fg: t.textDangerPrimary,
        border: t.borderDanger,
        shadow: "none",
        hoverBg: t.interactiveDestructiveHover,
        activeBg: t.interactiveDestructiveHover,
        disabledBg: t.interactiveDestructiveDisabled,
        disabledFg: t.textDangerTertiary
      };
    default:
      return {
        bg: TRANSPARENT,
        fg: t.textDangerPrimary,
        border: TRANSPARENT,
        shadow: "none",
        hoverBg: t.interactiveDestructiveHover,
        activeBg: t.interactiveDestructiveHover,
        activeBorder: t.borderDanger,
        disabledFg: t.textDangerTertiary
      };
  }
}
function focusHandle(ctx, id) {
  return ctx.retained(`${id}:focus`, { kind: "button-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
}
var keyClick = { suppressed: false };
function paint(el, l, disabled, onClick, bubble = false, focus = null) {
  if (disabled) {
    const out = el.bg(l.disabledBg ?? l.bg).text_color(l.disabledFg ?? l.fg).border_color(l.disabledBorder ?? l.border);
    return focus?.is_focused() ? out.track_focus(focus) : out;
  }
  let out = shadow(el.bg(l.bg).text_color(l.fg).border_color(l.border), l.shadow, l.bg).cursor_pointer();
  out = out.hover((s) => {
    let h = l.hoverBg ? s.bg(l.hoverBg) : s;
    if (l.hoverShadow)
      h = shadow(h, l.hoverShadow, l.hoverBg ?? l.bg);
    return h;
  });
  out = out.active((s) => {
    const a = l.activeBg ? s.bg(l.activeBg) : s;
    return l.activeBorder ? a.border_color(l.activeBorder) : a;
  });
  if (!onClick)
    return out;
  if (focus)
    out = out.tab_index(0).track_focus(focus);
  return out.on_click((_e, cx) => {
    if (keyClick.suppressed) {
      keyClick.suppressed = false;
      return;
    }
    if (!bubble)
      cx.stop_propagation();
    onClick(cx);
  });
}
function button(ctx, o) {
  const t = ctx.t;
  let el = div4().id(o.id).flex().flex_row().flex_none().items_center().gap(t.spaceXs).border_1().rounded(t.radiusL);
  el = textStyle(el, typography(t, "label", "default"));
  switch (o.size ?? "medium") {
    case "extra-small":
      el = textStyle(el.rounded(t.radiusS).py(t.spaceXs - 1.75).px(t.spaceS), typography(t, "label", "small"));
      break;
    case "small":
      el = textStyle(el.rounded(t.radiusS + 1).py(t.spaceS - 1.75).px(t.spaceSM), typography(t, "label", "small"));
      break;
    case "large":
      el = el.py(t.spaceSM - 1).px(t.spaceM);
      break;
    default:
      el = el.py(t.spaceS - 1).px(t.spaceSM).rounded(t.radiusM);
  }
  const textSize = typography(t, "label", o.size === "small" || o.size === "extra-small" ? "small" : "default").size;
  const icon = o.iconLeft ? ctx.icon(o.iconLeft, { size: textSize }) : null;
  const focus = focusHandle(ctx, o.id);
  return paint(el, look(t, o.variant ?? "primary", !!o.destructive), !!o.disabled, o.onClick, o.bubble, focus).children(optional(icon)).child(o.label);
}
var ICON_BUTTON = {
  "3-extra-small": { box: 20, icon: 10, radius: (t) => t.radiusS },
  "2-extra-small": { box: 24, icon: 12, radius: (t) => t.radiusS - 1 },
  "extra-small": { box: 28, icon: 14, radius: (t) => t.radiusS },
  small: { box: 32, icon: 16, radius: (t) => t.radiusS + 1 },
  medium: { box: 36, icon: 16, radius: (t) => t.radiusM },
  large: { box: 40, icon: 16, radius: (t) => t.radiusL }
};
function iconButton(ctx, o) {
  const t = ctx.t;
  const size = ICON_BUTTON[o.size ?? "medium"];
  let el = div4().id(o.id).flex().flex_none().items_center().justify_center().border_1().w(size.box).h(size.box);
  el = o.shape === "circle" ? el.rounded_full() : el.rounded(size.radius(t));
  const l = look(t, o.variant ?? "primary", false);
  const s = o.surface;
  const onSurface = s ? {
    ...l,
    bg: over(l.bg, s),
    hoverBg: l.hoverBg && over(l.hoverBg, s),
    activeBg: l.activeBg && over(l.activeBg, s),
    disabledBg: l.disabledBg && over(l.disabledBg, s)
  } : l;
  const focus = focusHandle(ctx, o.id);
  return paint(el, onSurface, !!o.disabled, o.onClick, o.bubble, focus).children(optional(ctx.icon(o.icon, { category: o.category, size: o.iconSize ?? size.icon })));
}
function needsValidation(action) {
  if (!action?.steps)
    return true;
  return action.steps.some((s) => s.type === e0.ToAssistant || s.type === "custom_action" || s.type === e0.Run && s.refType === "mutation");
}
var VARIANT = { primary: "primary", secondary: "secondary", ghost: "tertiary", tertiary: "tertiary" };
var SIZES = ["extra-small", "small", "medium", "large"];
var Button = {
  render(props, ctx) {
    const label = String(props.label ?? "");
    const variant = VARIANT[String(props.variant)] ?? "primary";
    const size = SIZES.find((s) => s === props.size) ?? "medium";
    return button(ctx, {
      id: ctx.id("btn"),
      label,
      variant,
      destructive: props.type === "destructive",
      size,
      disabled: ctx.streaming,
      bubble: true,
      onClick: () => {
        const form = ctx.form;
        if (form && variant === "primary" && needsValidation(props.action) && !form.validateForm())
          return;
        ctx.trigger(label, props.action);
      }
    });
  }
};
var Buttons = {
  render(props, ctx) {
    const el = div4().flex().w_full().gap(ctx.t.spaceM);
    const dir = props.direction === "column" ? el.flex_col() : el.flex_row().flex_wrap();
    return dir.children(ctx.children(props.buttons, "b"));
  }
};

// src/components/carousel.ts
import { div as div5 } from "gpui-kit";
var ITEM_WIDTH = 280;
var SNAP_DELAY = 120;
var Carousel = {
  render(props, ctx) {
    const t = ctx.t;
    const items = Array.isArray(props.children) ? props.children : [];
    const variant = props.variant === "sunk" ? "sunk" : "card";
    const local = ctx.local({ viewport: 0, offset: 0, smooth: false, wheel: 0 });
    const gap = t.spaceM;
    const lefts = items.map((_, i) => i * (ITEM_WIDTH + gap));
    const total = items.length ? items.length * ITEM_WIDTH + (items.length - 1) * gap : 0;
    const maxOffset = local.viewport > 0 ? Math.max(0, total - local.viewport) : 0;
    const offset = Math.min(Math.max(0, local.offset), maxOffset);
    const canPrev = offset > 0;
    const canNext = local.viewport > 0 && Math.ceil(offset) + local.viewport < total;
    const scrollTo = (next, smooth, cx) => {
      local.offset = Math.min(Math.max(0, next), maxOffset);
      local.smooth = smooth;
      cx.notify();
    };
    const step = (direction, cx) => {
      if (!items.length)
        return;
      const visible = lefts.findIndex((left) => left - offset >= -0.5);
      const current = visible === -1 ? items.length - 1 : visible;
      const target = direction === "left" ? Math.max(0, current - 1) : Math.min(items.length - 1, current + 1);
      scrollTo(lefts[target], true, cx);
    };
    const card = (item, i) => textStyle(div5().id(ctx.id(`item-${i}`)).flex().flex_col().flex_none().gap(t.spaceM).w(ITEM_WIDTH).rounded(t.radius2xl).bg(variant === "sunk" ? t.highlightSubtle : t.foreground).p(t.spaceM).border_1().border_color(t.borderDefault).text_color(t.textNeutralPrimary), typography(t, "body", "default")).children(ctx.children(item, `item-${i}`));
    const row = div5().id(ctx.id("row")).relative().flex().flex_row().flex_none().gap(gap).when(maxOffset > 0, (el) => el.left(-offset)).when(local.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" })).children(items.map(card));
    const content = div5().id(ctx.id("content")).flex().flex_row().flex_1().min_w(0).overflow_hidden().on_size_change((size, cx) => {
      if (local.viewport !== size.width) {
        local.viewport = size.width;
        cx.notify();
      }
    }).when(maxOffset > 0, (el) => el.on_scroll_wheel((e, cx) => {
      const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
      if (dx === 0)
        return;
      cx.stop_propagation();
      const token = ++local.wheel;
      scrollTo(Math.min(Math.max(0, local.offset), maxOffset) - dx, false, cx);
      cx.timer.after(SNAP_DELAY, (cx) => {
        if (token !== local.wheel)
          return;
        const at = Math.min(Math.max(0, local.offset), maxOffset);
        const edges = lefts.map((l) => Math.min(l, maxOffset));
        const nearest = edges.reduce((best, e2) => Math.abs(e2 - at) < Math.abs(best - at) ? e2 : best, edges[0] ?? 0);
        if (nearest !== at)
          scrollTo(nearest, true, cx);
      });
    })).child(row);
    const arrow = (side) => {
      if (!(side === "left" ? canPrev : canNext))
        return null;
      return div5().absolute().top(0).h_full().flex().items_center().when(side === "left", (el) => el.left(-12)).when(side === "right", (el) => el.right(-12)).child(div5().flex().items_center().justify_center().rounded(t.radiusS).bg(t.foreground).child(iconButton(ctx, {
        id: ctx.id(side),
        icon: side === "left" ? "ChevronLeft" : "ChevronRight",
        size: "small",
        variant: "secondary",
        surface: t.foreground,
        onClick: (cx) => step(side, cx)
      })));
    };
    return div5().id(ctx.id()).relative().flex().flex_row().child(content).children([arrow("left"), arrow("right")].flatMap(optional));
  }
};

// src/components/cards/composite.ts
import { div as div10 } from "gpui-kit";

// opengpui-shared:openui-card-action-utils
var m19 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-card-action-utils"];
var e012 = m19["withItemContext"];

// src/components/cards/layout.ts
import { div as div9 } from "gpui-kit";

// opengpui-shared:openui-card-layout-utils
var m20 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-card-layout-utils"];
var e013 = m20["getRowConfiguration"];
var e116 = m20["useCarouselMask"];

// src/components/content.ts
import { div as div8 } from "gpui-kit";

// src/markdown/render.ts
import { div as div7 } from "gpui-kit";
import { Link } from "gpui-base";

// src/components/tables.ts
import { div as div6 } from "gpui-kit";
var DEFAULT_PAGE_SIZE = 10;
var asArray = (v) => Array.isArray(v) ? v : v == null ? [] : [v];
var Col = {
  render() {
    return null;
  }
};
var BUTTONS = { Button: true, IconButton: true };
function tableText(t, head) {
  return { style: typography(t, "body", "small"), color: head ? t.textNeutralSecondary : t.textNeutralPrimary };
}
function columnWidths(content, viewport) {
  const total = content.reduce((a, b) => a + b, 0);
  if (total >= viewport || total === 0)
    return { widths: content, scrollable: total > viewport };
  return { widths: content.map((w) => w + (viewport - total) * w / total), scrollable: false };
}
function tableView(ctx, part, o) {
  const t = ctx.t;
  const local = ctx.local({ sizes: {}, viewport: 0, offset: 0, smooth: false, rowsKey: "" }, part);
  const rowsKey = o.rowsKey ?? "";
  if (local.rowsKey !== rowsKey) {
    local.rowsKey = rowsKey;
    local.sizes = {};
    local.offset = 0;
    local.smooth = false;
  }
  const columns = o.header.length;
  const fixed = o.static;
  const from = fixed?.from ?? 0;
  const count = fixed?.count ?? o.rows.length;
  const pad = 2 * t.spaceM;
  const measuredRows = fixed ? Math.min(fixed.measured ?? count, count) : o.rows.length;
  const keys = Array.from({ length: columns }, (_, ci) => [`h${ci}`, ...Array.from({ length: measuredRows }, (_, ri) => `r${ri}c${ci}`)]);
  const sized = keys.every((col) => col.every((k) => local.sizes[k] !== undefined));
  const content = sized ? keys.map((col, ci) => Math.ceil(Math.max(fixed?.estimate?.[ci] ?? 0, ...col.map((k) => local.sizes[k]))) + pad) : null;
  if (fixed && !sized)
    fixed.unmeasured();
  const measured = !fixed && local.viewport > 0 && sized;
  const layout = measured && content ? columnWidths(content, local.viewport) : null;
  const tableWidth = layout ? layout.widths.reduce((a, b) => a + b, 0) : 0;
  const maxOffset = layout?.scrollable ? tableWidth - local.viewport : 0;
  const offset = Math.min(Math.max(0, local.offset), maxOffset);
  const lefts = layout ? layout.widths.map((_, i) => layout.widths.slice(0, i).reduce((a, b) => a + b, 0)) : [];
  const measure = (key, content, fill) => {
    const box = fill ? div6().flex().flex_col().items_stretch().flex_none().min_w(fill).whitespace_nowrap() : div6().flex().flex_row().flex_none().items_center().whitespace_nowrap();
    if (fixed)
      return box.children(content);
    return box.id(ctx.id(`${part}-m-${key}`)).on_size_change((size, cx) => {
      const natural = fill && size.width <= fill + 0.5 ? Math.min(local.sizes[key] ?? size.width, size.width) : size.width;
      if (local.sizes[key] !== natural) {
        local.sizes[key] = natural;
        cx.notify();
      }
    }).children(content);
  };
  const cell = (ci, c, key, head) => {
    const text = tableText(t, head);
    let el = textStyle(div6().flex().flex_row().items_center().overflow_hidden().p(t.spaceM).text_color(text.color), text.style);
    if (fixed && content)
      el = el.flex_basis(content[ci]).flex_grow(content[ci]).flex_shrink(0);
    else
      el = layout ? el.flex_none().w(layout.widths[ci]) : el.flex_1().min_w_0();
    if (c?.align === "right")
      el = el.justify_end();
    else if (c?.align === "center")
      el = el.justify_center();
    const fill = c?.fill && layout && !fixed && local.sizes[key] !== undefined ? layout.widths[ci] - pad : 0;
    return el.child(measure(key, c?.content ?? [], fill));
  };
  const header = div6().flex().flex_row().border_b_1().border_color(t.borderDefault).children(o.header.map((c, ci) => cell(ci, c, `h${ci}`, true)));
  const rows = o.rows.map((row, i) => {
    const ri = from + i;
    return div6().flex().flex_row().when(ri % 2 === 1, (el) => el.bg(t.highlightSubtle)).when(ri < count - 1, (el) => el.border_b_1().border_color(t.borderDefault)).children(Array.from({ length: columns }, (_, ci) => cell(ci, row[ci], `r${ri}c${ci}`, false)));
  });
  if (fixed) {
    const total = content ? content.reduce((a, b) => a + b, 0) : 0;
    const top = from === 0;
    const bottom = from + o.rows.length >= count;
    let box = div6().id(ctx.id(`${part}-scroll-${from}`)).w_full().overflow_x_scroll().border_l_1().border_r_1().border_color(t.borderDefault);
    if (top)
      box = box.border_t_1().rounded_t(t.radius2xl);
    if (bottom)
      box = box.border_b_1().rounded_b(t.radius2xl);
    return box.child(div6().flex().flex_col().w_full().when(total > 0, (el) => el.min_w(total)).when(top, (el) => el.child(header)).children(rows));
  }
  const scrollTo = (next, smooth, cx) => {
    local.offset = Math.min(Math.max(0, next), maxOffset);
    local.smooth = smooth;
    cx.notify();
  };
  const container = div6().id(ctx.id(`${part}-scroll`)).w_full().overflow_hidden().border_1().border_color(t.borderDefault).rounded(t.radius2xl).on_size_change((size, cx) => {
    const inner = size.width - 2;
    if (local.viewport !== inner) {
      local.viewport = inner;
      cx.notify();
    }
  }).when(maxOffset > 0, (el) => el.on_scroll_wheel((e, cx) => {
    const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
    if (dx === 0)
      return;
    cx.stop_propagation();
    scrollTo(local.offset - dx, false, cx);
  })).child(div6().id(ctx.id(`${part}-content`)).relative().flex().flex_col().when(!!layout?.scrollable, (el) => el.w(tableWidth).left(-offset)).when(!layout?.scrollable, (el) => el.w_full()).when(local.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" })).child(header).children(rows));
  const control = (side) => {
    const canGo = side === "left" ? offset > 0 : offset < maxOffset - 1;
    if (!o.controls || !layout?.scrollable || !canGo)
      return null;
    return div6().absolute().top(t.spaceS).when(side === "left", (el) => el.left(t.spaceS)).when(side === "right", (el) => el.right(t.spaceS)).rounded(t.radiusS).bg(t.foreground).child(iconButton(ctx, {
      id: ctx.id(`${part}-scroll-${side}`),
      icon: side === "left" ? "ChevronLeft" : "ChevronRight",
      size: "small",
      variant: "secondary",
      onClick: (cx) => {
        const target = side === "left" ? lefts.filter((l) => l < offset - 1).at(-1) ?? 0 : lefts.find((l) => l > offset + 1) ?? maxOffset;
        scrollTo(target, true, cx);
      }
    }));
  };
  return div6().relative().w_full().child(container).children([control("left"), control("right")].filter((c) => c !== null));
}
var Table = {
  render(props, ctx) {
    const columns = asArray(props.columns);
    const cols = columns.filter(e24).map((c) => ({ label: String(c.props.label ?? ""), data: asArray(c.props.data) }));
    const rowCount = cols.length ? Math.max(0, ...cols.map((c) => c.data.length)) : 0;
    if (ctx.queryLoading && rowCount === 0)
      return tableSkeleton(ctx, 5, Math.max(cols.length || columns.length, 3));
    if (!cols.length)
      return null;
    const local = ctx.local({ page: 0 });
    const totalPages = Math.ceil(rowCount / DEFAULT_PAGE_SIZE);
    const page = Math.min(local.page, Math.max(0, totalPages - 1));
    const start = page * DEFAULT_PAGE_SIZE;
    const end = Math.min(start + DEFAULT_PAGE_SIZE, rowCount);
    const rows = [];
    for (let r = start;r < end; r++) {
      rows.push(cols.map((c, ci) => {
        const v = c.data[r];
        if (typeof v !== "object" || v === null)
          return { content: [String(v ?? "")] };
        const nodes = asArray(v);
        const fill = nodes.length > 0 && nodes.every((n) => e24(n) && !BUTTONS[n.typeName]);
        return { content: ctx.children(v, `c${r}_${ci}`), fill };
      }));
    }
    const table = tableView(ctx, "table", {
      header: cols.map((c) => ({ content: [c.label] })),
      rows,
      controls: true,
      rowsKey: String(page)
    });
    if (totalPages <= 1)
      return div6().id(ctx.id()).w_full().child(table);
    const turn = (to) => (cx) => {
      local.page = to;
      cx.notify();
    };
    const pager = div6().flex().flex_row().items_center().justify_end().gap(8).pt(8).child(iconButton(ctx, {
      id: ctx.id("prev"),
      icon: "ChevronLeft",
      size: "small",
      variant: "secondary",
      disabled: page === 0,
      onClick: turn(Math.max(0, page - 1))
    })).child(div6().text_size(13).text_color("#6b7280").child(`${page + 1} / ${totalPages}`)).child(iconButton(ctx, {
      id: ctx.id("next"),
      icon: "ChevronRight",
      size: "small",
      variant: "secondary",
      disabled: page >= totalPages - 1,
      onClick: turn(Math.min(totalPages - 1, page + 1))
    }));
    return div6().id(ctx.id()).w_full().child(table).child(pager);
  }
};
function tableSkeleton(ctx, rows, columns) {
  const t = ctx.t;
  const bar = (width) => div6().h(14).w(width).bg(t.elevated).rounded(t.radiusS).loop("opacity", { from: 0.3, to: 0.85, period: 1200 });
  const row = (cells, last) => div6().flex().flex_row().gap(t.spaceM).py(t.spaceSM).px(t.spaceM).when(!last, (el) => el.border_b_1().border_color(t.borderDefault)).children(cells.map((c) => div6().flex_1().h(14).child(c)));
  const out = [row(Array.from({ length: columns }, () => div6().w("60%").child(bar("100%"))), false)];
  for (let ri = 0;ri < rows; ri++) {
    out.push(row(Array.from({ length: columns }, (_, ci) => bar(`${50 + (ri * 7 + ci * 13) % 40}%`)), ri === rows - 1));
  }
  return div6().id(ctx.id("skeleton")).py(t.spaceS).children(out);
}

// src/render/fonts.ts
var INTER_CONTENT_EM = (1984 + 494) / 2048;
var INTER_OPSZ_MIN = 14;
var INTER_OPSZ_MAX = 32;
var INTER_CUTS = {
  14: [420, 440, 560],
  16: [420, 440, 560, 600],
  18: [420, 440, 560, 600],
  24: [600],
  28: [600],
  32: [600, 700]
};
function interFamily(opsz) {
  return `OpenGPUI Inter ${opsz}`;
}
var CUTS = Object.entries(INTER_CUTS).map(([opsz, weights]) => ({ opsz: Number(opsz), weights }));
function nearest(items, distance) {
  return items.reduce((best, item) => distance(item) < distance(best) ? item : best);
}
function interFace(size, weight) {
  const opsz = Math.min(INTER_OPSZ_MAX, Math.max(INTER_OPSZ_MIN, size));
  const withWeight = CUTS.filter((cut) => cut.weights.includes(weight));
  const cut = nearest(withWeight.length ? withWeight : CUTS, (c) => Math.abs(c.opsz - opsz));
  return { family: interFamily(cut.opsz), weight: nearest(cut.weights, (w) => Math.abs(w - weight)) };
}
function openuiFonts(has) {
  const inter = has(interFamily(INTER_OPSZ_MIN));
  return (families, size, weight) => {
    for (const family of families) {
      if (family === "Inter") {
        if (inter)
          return interFace(size, weight);
      } else if (family === "monospace") {
        return { family: "Menlo", weight };
      } else if (has(family)) {
        return { family, weight };
      }
    }
    return null;
  };
}

// src/markdown/render.ts
var HEADING2 = /^h[1-6]$/;
var QUOTES = [
  ["“", "”"],
  ["‘", "’"]
];
var WEB = /^https?:\/\//i;
var TOP2 = { inList: false, inLi: false };
var listMarker = (node, index) => node.tagName === "ol" ? `${Number(node.properties.start ?? 1) + index}. ` : "• ";

class Markdown {
  ctx;
  part;
  profile;
  body;
  row;
  n = 0;
  quoteDepth = 0;
  hover;
  constructor(ctx, part, profile, body, row = null) {
    this.ctx = ctx;
    this.part = part;
    this.profile = profile;
    this.body = body;
    this.row = row;
    this.hover = ctx.local({ link: null }, `${part}-hover`);
  }
  get t() {
    return this.ctx.t;
  }
  key(prefix) {
    return `${this.part}-${prefix}${this.n++}`;
  }
  blocks(nodes, css, scope, marks) {
    const items = blockItems(nodes);
    const laid = items.map((it, i) => this.item(it, css, scope, { open: i === 0 ? marks?.open : undefined, close: i === items.length - 1 ? marks?.close : undefined }));
    const els = laid.map((b, i) => {
      const gap = i === 0 ? 0 : Math.max(laid[i - 1].mb, b.mt);
      return gap > 0 ? b.el.mt(gap) : b.el;
    });
    return { els, mt: laid[0]?.mt ?? 0, mb: laid.at(-1)?.mb ?? 0 };
  }
  item(it, css, scope, marks = {}) {
    if (it.kind === "inline")
      return { el: this.flow(it.nodes, css, marks), mt: 0, mb: 0 };
    return this.block(it.node, css, scope, { next: it.next, last: it.last, ...marks });
  }
  column(els) {
    return div7().w_full().flex().flex_col().children(els);
  }
  block(node, css, scope, at) {
    const t = this.t;
    const tag = node.tagName;
    const content = this.profile === "content";
    const own = (mt, mb) => ({ mt, mb: scope.inList && at.last ? 0 : mb });
    const reset = (font, color = t.textNeutralPrimary) => ({
      ...css,
      font,
      color: css.quote ? css.color : color,
      italic: css.quote ? css.italic : false
    });
    if (tag === "p") {
      const mb = at.next === "p" ? 18 : content && (at.next === "ol" || at.next === "ul") ? 8 : 0;
      return { el: this.flow(node.children, reset(this.body), at), ...own(0, mb) };
    }
    if (HEADING2.test(tag)) {
      const mb = at.next === "p" ? 8 : 18;
      return { el: this.flow(node.children, reset(typography(t, "heading", "extra-small")), at), ...own(0, mb) };
    }
    if (tag === "ul" || tag === "ol") {
      const list = this.list(node, reset(this.body), scope);
      return { el: list.el, ...own(Math.max(scope.inLi ? 8 : 0, list.mt), Math.max(tag === "ul" ? 24 : 20, list.mb)) };
    }
    if (tag === "pre") {
      const code = node.children.find(isElement);
      const language = code?.tagName === "code" ? codeBlockLanguage(code) : null;
      if (code && language !== null) {
        const el = codeBlock(this.ctx, this.key("code"), textOf(code).trim(), language, css.font.size, { static: !!this.row });
        return { el, ...own(8, 0) };
      }
      return { el: this.flow(node.children, css, at), ...own(0, 0) };
    }
    if (tag === "blockquote") {
      const depth = this.quoteDepth++;
      const [open, close] = QUOTES[Math.min(depth, 1)];
      const inner = this.blocks(node.children, { ...css, italic: true, quote: true, lineHeight: 1.625 }, scope, { open, close });
      this.quoteDepth--;
      const rule = alpha(t.textNeutralPrimary, parseInt(t.textNeutralPrimary.slice(7, 9) || "ff", 16) / 255 * 0.7);
      const el = div7().w_full().flex().flex_col().border_l(4).border_color(rule).pl(16).text_color(css.color).children(inner.els);
      return { el, ...own(Math.max(25, inner.mt), Math.max(25, inner.mb)) };
    }
    if (tag === "hr") {
      return { el: div7().w_full().border_t_1().border_color(css.color), ...own(48, 48) };
    }
    if (tag === "table") {
      return { el: this.table(node), ...own(0, 20) };
    }
    if (tag === "li") {
      const item = this.listItem(node, css, scope, "");
      return { el: item.el, ...own(item.mt, item.mb) };
    }
    const inner = this.blocks(node.children, css, scope);
    return { el: this.column(inner.els), ...own(inner.mt, inner.mb) };
  }
  list(node, css, scope) {
    const items = listItems(node);
    const laid = items.map((li, i) => {
      const marker = listMarker(node, i);
      const item = this.listItem(li, css, { inList: true, inLi: scope.inLi }, marker);
      return { el: item.el, mt: Math.max(scope.inLi ? 8 : 0, item.mt), mb: i === items.length - 1 ? 0 : Math.max(8, item.mb) };
    });
    const els = laid.map((b, i) => {
      const gap = i === 0 ? 0 : Math.max(laid[i - 1].mb, b.mt);
      return gap > 0 ? b.el.mt(gap) : b.el;
    });
    return { el: div7().w_full().flex().flex_col().pl(20).children(els), mt: laid[0]?.mt ?? 0, mb: laid.at(-1)?.mb ?? 0 };
  }
  listRow(node, index, css) {
    const reset = { ...css, font: this.body, color: this.t.textNeutralPrimary, italic: false };
    const item = this.listItem(listItems(node)[index], reset, { inList: true, inLi: false }, listMarker(node, index));
    return div7().w_full().flex().flex_col().pl(20).child(item.el);
  }
  listItem(li, css, scope, marker) {
    const t = this.t;
    const itemCss = { ...css, font: this.body, italic: css.quote ? css.italic : false };
    const inner = this.blocks(li.children, itemCss, { inList: true, inLi: true });
    const markerEl = textStyle(div7().absolute().top(0).right("100%").whitespace_nowrap().text_color(t.textNeutralSecondary), this.body).child(marker);
    const el = div7().relative().w_full().flex().flex_col().children(inner.els).when(marker !== "", (e) => e.child(markerEl));
    return { el, mt: inner.mt, mb: inner.mb };
  }
  cells(tr, head) {
    const text = tableText(this.t, head);
    return tr.children.filter(isElement).filter((c) => c.tagName === "th" || c.tagName === "td").map((c) => {
      const align = c.properties.align;
      return {
        content: this.words(this.pieces(c.children, this.css(text.style, text.color), []), true),
        align: align === "left" || align === "center" || align === "right" ? align : undefined
      };
    });
  }
  table(node) {
    const [head, ...body] = tableRows(node);
    return tableView(this.ctx, this.key("table"), {
      header: head ? this.cells(head, true) : [],
      rows: body.map((tr) => this.cells(tr, false)),
      controls: false,
      static: this.row ? { unmeasured: this.row.unmeasured } : undefined
    });
  }
  tableGroup(node, from, to, fixed, measured) {
    const [head, ...body] = tableRows(node);
    const rows = fixed ? body.slice(from, to) : body.slice(0, measured);
    return tableView(this.ctx, this.key("table"), {
      header: head ? this.cells(head, true) : [],
      rows: rows.map((tr) => this.cells(tr, false)),
      controls: false,
      static: fixed ?? undefined
    });
  }
  css(font, color) {
    return { font, color, italic: false, strike: false, link: null, quote: false };
  }
  flow(nodes, css, marks = {}) {
    const pieces = [];
    if (marks.open)
      pieces.push({ kind: "atom", el: this.mark(marks.open, css, "open") });
    this.pieces(nodes, css, pieces);
    if (marks.close)
      pieces.push({ kind: "atom", el: this.mark(marks.close, css, "close") });
    return div7().w_full().flex().flex_row().flex_wrap().items_baseline().children(this.words(pieces, false));
  }
  mark(quote, css, side) {
    const el = this.span(quote, { ...css, link: null });
    const space = 0.2 * css.font.size;
    return side === "open" ? el.mr(space) : el.ml(space);
  }
  pieces(nodes, css, out) {
    const t = this.t;
    for (const node of nodes) {
      if (node.type === "text") {
        out.push({ kind: "text", text: node.value, css });
        continue;
      }
      if (node.type !== "element")
        continue;
      const tag = node.tagName;
      const props = node.properties;
      if (this.profile === "inline" && (tag === "p" || HEADING2.test(tag) || tag === "ul" || tag === "ol" || tag === "li")) {
        this.pieces(node.children, css, out);
        continue;
      }
      switch (tag) {
        case "strong":
        case "b":
          this.pieces(node.children, this.ctx.scope.cardText?.composite ? { ...css, font: restyle(t, css.font, { weight: typography(t, "body", "heavy").weight }), color: css.quote ? css.color : t.textNeutralPrimary } : { ...css, font: typography(t, "body", "heavy"), color: css.quote ? css.color : t.textNeutralPrimary, italic: false }, out);
          break;
        case "em":
        case "i":
          this.pieces(node.children, { ...css, italic: true }, out);
          break;
        case "del":
        case "s":
          this.pieces(node.children, { ...css, strike: true }, out);
          break;
        case "a": {
          const href = typeof props.href === "string" ? props.href : "";
          const link = { key: this.key("link"), href };
          this.pieces(node.children, { ...css, font: this.body, color: css.quote ? css.color : t.textInfoPrimary, italic: css.quote ? css.italic : false, link }, out);
          break;
        }
        case "code": {
          const language = codeBlockLanguage(node);
          if (language !== null) {
            out.push({ kind: "block", el: codeBlock(this.ctx, this.key("code"), textOf(node).trim(), language, css.font.size, { static: !!this.row }) });
            break;
          }
          out.push({ kind: "atom", el: this.inlineCode(textOf(node), css) });
          break;
        }
        case "br":
          out.push({ kind: "break", css });
          break;
        case "sup":
        case "sub":
          this.pieces(node.children, { ...css, font: restyle(t, css.font, { size: css.font.size / 1.2 }) }, out);
          break;
        case "span":
          if (props["data-component-type"] === "citation")
            break;
          this.pieces(node.children, css, out);
          break;
        case "img":
          if (typeof props.alt === "string" && props.alt)
            out.push({ kind: "text", text: props.alt, css });
          break;
        case "input":
          if (props.type === "checkbox")
            out.push({ kind: "atom", el: this.checkbox(!!props.checked, css) });
          break;
        default:
          if (BLOCK.has(tag)) {
            const block = this.block(node, css, { inList: false, inLi: false }, { last: true });
            out.push({ kind: "block", el: block.el });
          } else
            this.pieces(node.children, css, out);
      }
    }
    return out;
  }
  inlineCode(text, css) {
    const t = this.t;
    const composite = !!this.ctx.scope.cardText?.composite;
    const style = composite ? typography(t, "code", "small") : this.body;
    let el = textStyle(div7().flex_none().max_w_full().px(4).py(2).rounded(4).bg(t.sunk).border_1().border_color(t.borderDefault).text_color(css.quote ? css.color : t.textNeutralPrimary), style).child(text.replace(/\s+/g, " "));
    if (composite)
      el = el.line_height(css.lineHeight ?? 1).my(-3);
    else {
      const line = (css.lineHeight ?? style.lineHeight) * style.size;
      el = el.line_height(INTER_CONTENT_EM).my((line - INTER_CONTENT_EM * style.size) / 2 - 3);
    }
    if (css.quote && css.italic)
      el = el.italic();
    return el;
  }
  checkbox(checked, css) {
    const t = this.t;
    const box = div7().size(13).flex_none().ml(4).mr(3).rounded(3).border_1().border_color(t.borderInteractive).flex().items_center().justify_center().self_center().when(checked, (el) => el.bg(t.textNeutralTertiary).border_color(t.textNeutralTertiary));
    const icon = checked ? this.ctx.icon("check", { size: 11 }) : null;
    return icon ? box.text_color(t.background).child(icon) : box.text_color(css.color);
  }
  span(text, css) {
    const link = css.link;
    const id = link ? this.ctx.id(this.key(`${link.key}-w`)) : "";
    const native = !!this.row && !!link && WEB.test(link.href);
    let el = textStyle((native ? Link.new(id) : div7()).whitespace_nowrap().text_color(css.color), css.font).child(text);
    if (css.lineHeight)
      el = el.line_height(css.lineHeight);
    if (css.italic)
      el = el.italic();
    if (css.strike)
      el = el.line_through();
    if (native)
      return el.href(link.href).cursor_pointer().hover((s) => s.underline());
    if (!link || this.row)
      return el;
    if (this.hover.link === link.key)
      el = el.underline();
    return el.id(id).cursor_pointer().on_hover((hovered, cx) => {
      const next = hovered ? link.key : this.hover.link === link.key ? null : this.hover.link;
      if (next !== this.hover.link) {
        this.hover.link = next;
        cx.notify();
      }
    }).on_click((_e, cx) => {
      if (WEB.test(link.href)) {
        try {
          cx.open_url(link.href);
        } catch {}
      }
    });
  }
  words(pieces, nowrap) {
    const out = [];
    let group = [];
    let space = null;
    let lineStart = true;
    let lastWasBreak = false;
    const flush = (withSpace) => {
      if (withSpace && space && group.length)
        group.push(this.span(" ", space));
      if (group.length === 1)
        out.push(group[0]);
      else if (group.length)
        out.push(div7().flex().flex_row().flex_none().items_baseline().children(group));
      group = [];
      space = null;
    };
    for (const piece of pieces) {
      if (piece.kind === "text") {
        for (const token of piece.text.replace(/[ \t\n\r\f]+/g, " ").split(/( )/)) {
          if (token === "")
            continue;
          if (token === " ") {
            if (!lineStart)
              space = piece.css;
            continue;
          }
          if (space)
            flush(true);
          group.push(this.span(token, piece.css));
          lineStart = false;
          lastWasBreak = false;
        }
      } else if (piece.kind === "atom") {
        if (space)
          flush(true);
        group.push(piece.el);
        lineStart = false;
        lastWasBreak = false;
      } else if (piece.kind === "break") {
        flush(false);
        if (lineStart && lastWasBreak)
          out.push(div7().w_full().h(piece.css.font.size * (piece.css.lineHeight ?? piece.css.font.lineHeight)));
        if (!nowrap)
          out.push(div7().w_full().h(0));
        lineStart = true;
        lastWasBreak = true;
      } else {
        flush(false);
        out.push(piece.el);
        lineStart = true;
        lastWasBreak = false;
      }
    }
    flush(false);
    return out;
  }
}
function markdownBlock(ctx, part, text, o) {
  const body = o.body ?? typography(ctx.t, "body", "default");
  const color = ctx.t.textNeutralPrimary;
  const tree = markdownTree(ctx, part, text, o.profile);
  if (!tree)
    return textStyle(div7().w_full().flex().flex_col().text_color(color), body).child(div7().child(text));
  if (virtualDecision(text.length) === "virtual")
    return virtualBlock(ctx, part, tree, o.profile, body, color);
  const md = new Markdown(ctx, part, o.profile, body);
  const css = md.css(body, color);
  const inner = md.blocks(tree.children, css, { inList: false, inLi: false });
  return textStyle(div7().w_full().flex().flex_col().text_color(css.color), body).children(inner.els);
}
var DEFAULT_VIEWPORT2 = 600;
var MEASURE_TRIES = 4;
var BLEED = 16;
var ROW_CHARS = 12000;
var MEASURE_ROWS = 25;
var PROBE_CHARS = 6000;
var TABLE_ROW_CHARS = 80;
var WIDE_TEXT = "wide ".repeat(800);
var treeRows = new WeakMap;
var tableEstimates = new WeakMap;
function tableEstimate(ctx, table) {
  let estimate = tableEstimates.get(table);
  if (estimate)
    return estimate;
  const em = tableText(ctx.t, false).style.size;
  estimate = [];
  for (const tr of tableRows(table).slice(1 + MEASURE_ROWS)) {
    tr.children.filter(isElement).forEach((cell, ci) => estimate[ci] = Math.max(estimate[ci] ?? 0, textOf(cell).length * em * 0.6));
  }
  tableEstimates.set(table, estimate);
  return estimate;
}
function virtualBlock(ctx, part, tree, profile, body, color) {
  let rows = treeRows.get(tree);
  if (!rows)
    treeRows.set(tree, rows = virtualRows(tree, profile));
  const pieces = rows;
  const local = ctx.local({ measure: new Map, tree: null, width: 0, heights: new Map }, `${part}-virtual`);
  if (local.tree !== tree) {
    if (local.tree) {
      const keys = new Set(pieces.flatMap((r) => r.kind === "table" ? [r.key, r.part] : [r.key]));
      ctx.pruneLocals(`${part}-`, (rest) => {
        const row = /^(?:\d+-\d+|i\d+)(?:-(?:li|c|t)\d+)?/.exec(rest)?.[0];
        return row === undefined || keys.has(row) || keys.has(row.replace(/-(?:li|c|t)\d+$/, ""));
      });
      for (const key of local.measure.keys())
        if (!keys.has(key))
          local.measure.delete(key);
      for (const key of local.heights.keys())
        if (!keys.has(key))
          local.heights.delete(key);
    }
    local.tree = tree;
  }
  const askMeasure = (key) => {
    const asked = local.measure.get(key);
    const tries = asked && asked.frame >= ctx.frame - 2 ? asked.tries : 0;
    local.measure.set(key, { frame: ctx.frame, tries });
    if (tries < MEASURE_TRIES)
      ctx.wake();
  };
  const draw = (k, fixed, provisional) => {
    const r = pieces[k];
    const ask = fixed ? {
      unmeasured: () => {
        provisional?.();
        askMeasure(r.key);
      }
    } : null;
    if (rowChars(r) > ROW_CHARS) {
      const node = r.kind === "li" ? listItems(r.node)[r.index] : r.kind === "item" && r.item.kind === "block" ? r.item.node : null;
      const text = node ? textOf(node) : r.kind === "item" && r.item.kind === "inline" ? r.item.nodes.map(textOf).join("") : "";
      return div7().w_full().child(text);
    }
    if (r.kind === "code")
      return codeBlock(ctx, `${part}-${r.key}`, r.code, r.language, body.size, { static: true, edges: { top: r.first, bottom: r.last } });
    if (r.kind === "table") {
      const md = new Markdown(ctx, `${part}-${r.part}`, profile, body, ask);
      const groupOf = ask ? { unmeasured: ask.unmeasured, from: r.from, count: r.count, measured: MEASURE_ROWS, estimate: tableEstimate(ctx, r.node) } : null;
      return md.tableGroup(r.node, r.from, r.to, groupOf, MEASURE_ROWS);
    }
    const md = new Markdown(ctx, `${part}-${r.key}`, profile, body, ask);
    const css = md.css(body, color);
    return r.kind === "li" ? md.listRow(r.node, r.index, css) : md.item(r.item, css, TOP2).el;
  };
  const n = pieces.length;
  const row = (k, provisional) => {
    const gap = k > 0 ? Math.max(pieces[k - 1].margins.mb, pieces[k].margins.mt) : 0;
    return textStyle(div7().w_full().flex().flex_col().pl(BLEED).text_color(color), body).when(gap > 0, (el) => el.pt(gap)).child(edge(draw(k, true, provisional), k, n));
  };
  const sizeOf = (k) => {
    const r = pieces[k];
    return r.kind === "table" ? (r.to - r.from) * TABLE_ROW_CHARS : rowChars(r);
  };
  const known = (key) => {
    const m = local.heights.get(key);
    return m !== undefined && Math.abs(m.w - local.width) < 0.5 ? m.h : null;
  };
  const wake = ctx.waker();
  const probes = [];
  let probed = 0;
  if (local.width > 0) {
    for (let k = 0;k < n && (probes.length === 0 || probed < PROBE_CHARS); k++) {
      const key = pieces[k].key;
      if (known(key) !== null)
        continue;
      probed += Math.max(sizeOf(k), 1);
      let provisional = false;
      const el = row(k, () => provisional = true);
      if (provisional)
        continue;
      probes.push(div7().id(ctx.id(`${part}-probe-${key}`)).w_full().on_size_change((size) => {
        local.heights.set(key, { w: size.width, h: size.height });
        wake();
      }).child(el));
    }
  }
  let total = 2;
  let measuredHeight = 0;
  let measuredSize = 0;
  const unknown = [];
  for (let k = 0;k < n; k++) {
    const h = known(pieces[k].key);
    if (h === null)
      unknown.push(k);
    else {
      total += h;
      measuredHeight += h;
      measuredSize += sizeOf(k);
    }
  }
  const line = body.size * body.lineHeight;
  const perChar = measuredSize > 0 ? measuredHeight / measuredSize : line / Math.max(local.width / (body.size * 0.5), 1);
  for (const k of unknown)
    total += Math.max(sizeOf(k) * perChar, line);
  const lazy = lazyRows(ctx, part, {
    count: n,
    key: (k) => pieces[k].key,
    left: BLEED,
    row: (k) => row(k),
    contentHeight: local.width > 0 ? total : undefined
  });
  const measuring = [];
  if (local.measure.size) {
    const index = new Map(pieces.map((r, k) => [r.key, k]));
    for (const [key, asked] of local.measure) {
      const k = index.get(key);
      if (k === undefined || asked.frame < ctx.frame - 1 || asked.tries >= MEASURE_TRIES)
        continue;
      asked.tries++;
      measuring.push(draw(k, false));
    }
  }
  const region = div7().relative().flex_1().min_h(0).w_full().child(lazy[0]).when(measuring.length > 0, (el) => el.child(div7().absolute().top(0).left(0).w_full().h(0).overflow_hidden().child(div7().w_full().flex().flex_col().children(measuring)))).child(div7().absolute().top(0).left(-BLEED).right(0).h(0).overflow_hidden().child(div7().id(ctx.id(`${part}-probe-width`)).w_full().h(0).on_size_change((size) => {
    if (Math.abs(size.width - local.width) < 0.5)
      return;
    local.width = size.width;
    wake();
  })).children(probes)).children(lazy.slice(1));
  return textStyle(div7().id(ctx.id(`${part}-virtual`)).w_full().self_stretch().h(ctx.viewportHeight ?? DEFAULT_VIEWPORT2).flex().flex_col().text_color(color), body).child(div7().w_full().h(0).overflow_hidden().child(WIDE_TEXT)).child(region);
}
function plainText(nodes) {
  let out = "";
  for (const n of nodes) {
    if (n.type === "text")
      out += n.value;
    else if (n.type === "element" && n.tagName === "p") {
      const inner = plainText(n.children);
      if (inner === null)
        return null;
      out += inner;
    } else
      return null;
  }
  return out;
}
function markdownInline(ctx, part, text, root) {
  const tree = markdownTree(ctx, part, text, "inline");
  if (!tree) {
    const el = textStyle(div7().text_color(root.color).when(root.align === "right", (e) => e.text_right()), root.font);
    return ctx.scope.cardText?.ellipsis ? el.min_w_0().max_w_full().overflow_hidden().whitespace_nowrap().text_ellipsis().child(text.replace(/\s+/g, " ")) : el.child(text);
  }
  const md = new Markdown(ctx, part, "inline", typography(ctx.t, "body", "default"));
  const css = md.css(root.font, root.color);
  const plain = ctx.scope.cardText?.ellipsis ? plainText(tree.children) : null;
  if (plain !== null) {
    return textStyle(div7().min_w_0().max_w_full().overflow_hidden().whitespace_nowrap().text_ellipsis().text_color(root.color), root.font).child(plain.replace(/\s+/g, " "));
  }
  return div7().flex().flex_row().flex_wrap().items_baseline().when(root.align === "right", (el) => el.justify_end()).children(md.words(md.pieces(tree.children, css, []), false));
}

// src/components/content.ts
var BODY_SIZES = {
  small: "small",
  default: "default",
  large: "large",
  "small-heavy": "small-heavy",
  "large-heavy": "large-heavy"
};
var TextContent = {
  render(props, ctx) {
    const t = ctx.t;
    const size = BODY_SIZES[props.size] ?? "default";
    const body = restyle(t, typography(t, "body", size), { weight: typography(t, "body", "default").weight });
    const text = props.text == null ? "" : String(props.text);
    return div8().flex().flex_col().gap(t.spaceXl).child(markdownBlock(ctx, "md", text, { profile: "content", body }));
  }
};
var MarkDownRenderer = {
  render(props, ctx) {
    const t = ctx.t;
    const md = markdownBlock(ctx, "md", String(props.textMarkdown ?? ""), { profile: "plain" });
    switch (props.variant) {
      case "card":
        return md.bg(t.foreground).rounded(8).p(16);
      case "sunk":
        return md.bg(t.sunk).rounded(8).p(16);
      default:
        return md;
    }
  }
};
var T = (variants) => variants == null ? null : Array.isArray(variants) ? variants : [variants];
var SUB = ["text-subtext", "highlight-text-number-subtext"];
var RULES = [
  [null, null, false, "gap", "space3xs"],
  [T("text-subtext"), null, false, "primary", ["body", "default"]],
  [T("text-subtext"), null, false, "secondary", ["body", "small"]],
  [T("highlight-text-number-subtext"), null, false, "gap", 0],
  [T("highlight-text-number-subtext"), null, false, "primary", ["body", "heavy"]],
  [T("highlight-text-number-subtext"), null, false, "secondary", ["body", "small"]],
  [T("text"), null, false, "primary", ["body", "default"]],
  [T("highlight-text"), null, false, "primary", ["body", "heavy"]],
  [T("number"), null, false, "primary", ["number", "heavy"]],
  [T("highlight-number"), null, false, "primary", ["number", "large-heavy"]],
  [T("text"), "xs", false, "primary", ["body", "small"]],
  [T("text"), "xs", true, "primary", ["number", "small"]],
  [SUB, "xs", false, "gap", 0],
  [T("text-subtext"), "xs", false, "primary", ["body", "small"]],
  [T("text-subtext"), "xs", true, "primary", ["number", "small"]],
  [T("highlight-text-number-subtext"), "xs", false, "primary", ["body", "small-heavy"]],
  [T("highlight-text-number-subtext"), "xs", true, "primary", ["number", "small-heavy"]],
  [SUB, "xs", false, "secondary", ["body", "small"]],
  [T("highlight-text-number-subtext"), "xs", true, "secondary", ["number", "small"]],
  [T("number"), "xs", false, "primary", ["number", "small"]],
  [T("highlight-number"), "xs", false, "primary", ["number", "small-heavy"]],
  [T("highlight-text"), "xs", false, "primary", ["body", "small-heavy"]],
  [T("text"), "sm", false, "primary", ["body", "default"]],
  [T("text"), "sm", true, "primary", ["number", "default"]],
  [SUB, "sm", false, "gap", 0],
  [T("text-subtext"), "sm", false, "primary", ["body", "default"]],
  [T("text-subtext"), "sm", true, "primary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "sm", false, "primary", ["body", "heavy"]],
  [T("highlight-text-number-subtext"), "sm", true, "primary", ["number", "heavy"]],
  [SUB, "sm", false, "secondary", ["body", "small"]],
  [T("highlight-text-number-subtext"), "sm", true, "secondary", ["number", "small"]],
  [T("number"), "sm", false, "primary", ["number", "small"]],
  [T("highlight-number"), "sm", false, "primary", ["number", "heavy"]],
  [T("highlight-text"), "sm", false, "gap", 0],
  [T("highlight-text"), "sm", false, "secondary", ["body", "small"]],
  [T("highlight-text"), "sm", false, "primary", ["body", "heavy"]],
  [T(["text-subtext", "highlight-text", "highlight-text-number-subtext"]), "md", false, "gap", 0],
  [T("highlight-text"), "md", false, "secondary", ["body", "default"]],
  [T("highlight-text"), "md", false, "primary", ["body", "heavy"]],
  [T("text-subtext"), "md", false, "primary", ["body", "default"]],
  [T("text-subtext"), "md", true, "primary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "md", false, "primary", ["body", "heavy"]],
  [T("highlight-text-number-subtext"), "md", true, "primary", ["number", "heavy"]],
  [SUB, "md", false, "secondary", ["body", "default"]],
  [T("text-subtext"), "md", true, "secondary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "md", true, "secondary", ["number", "default"]],
  [T("text"), "md", true, "primary", ["number", "default"]],
  [T("number"), "md", false, "primary", ["number", "default"]],
  [T("highlight-number"), "md", false, "primary", ["number", "heavy"]],
  [T("text"), "lg", false, "primary", ["body", "large"]],
  [T("text"), "lg", true, "primary", ["number", "large"]],
  [T(["text-subtext", "highlight-text", "highlight-text-number-subtext"]), "lg", false, "gap", 0],
  [T("highlight-text"), "lg", false, "secondary", ["body", "default"]],
  [T("highlight-text"), "lg", false, "primary", ["body", "large-heavy"]],
  [T("text-subtext"), "lg", false, "primary", ["body", "large"]],
  [T("text-subtext"), "lg", true, "primary", ["number", "large"]],
  [T("highlight-text-number-subtext"), "lg", false, "primary", ["body", "large-heavy"]],
  [T("highlight-text-number-subtext"), "lg", true, "primary", ["number", "large-heavy"]],
  [SUB, "lg", false, "secondary", ["body", "default"]],
  [T("text-subtext"), "lg", true, "secondary", ["number", "default"]],
  [T("highlight-text-number-subtext"), "lg", true, "secondary", ["number", "default"]],
  [T("number"), "lg", false, "primary", ["number", "large"]],
  [T("highlight-number"), "lg", false, "primary", ["number", "large-heavy"]]
];
function blockRule(variant, size, number, prop) {
  let best;
  for (const [variants, ruleSize, ruleNumber, ruleProp, value] of RULES) {
    if (ruleProp !== prop)
      continue;
    if (variants && !variants.includes(variant))
      continue;
    if (ruleSize && ruleSize !== size)
      continue;
    if (ruleNumber && !number)
      continue;
    const spec = (variants ? 1 : 0) + (ruleSize ? 1 : 0) + (ruleNumber ? 1 : 0);
    if (!best || spec >= best.spec)
      best = { spec, value };
  }
  return best?.value;
}
function style(t, typo) {
  const [group, variant] = Array.isArray(typo) ? typo : ["body", "default"];
  return typography(t, group, variant);
}
function secondaryColor(t, subtextVariant, subtext) {
  if (subtextVariant !== "metric" || !subtext)
    return t.textNeutralSecondary;
  if (subtext.startsWith("+"))
    return t.textSuccessPrimary;
  if (subtext.startsWith("-"))
    return t.textDangerPrimary;
  return t.textNeutralSecondary;
}
function textBlock(ctx, variant, props) {
  const t = ctx.t;
  const size = String(props.size ?? "sm");
  const number = props.variant === "number";
  const gapToken = blockRule(variant, size, number, "gap");
  const subtext = props.subtext == null || props.subtext === "" ? "" : String(props.subtext);
  const card = ctx.scope.cardText;
  return div8().flex().flex_col().gap(typeof gapToken === "string" ? t[gapToken] : 0).when(!card?.end, (el) => el.items_start()).when(!!card?.end, (el) => el.items_end().max_w_full().text_right()).when(!!card?.ellipsis && !card?.end, (el) => el.w_full()).when(!!card?.ellipsis, (el) => el.min_w_0().overflow_hidden()).child(textLine(ctx, "primary", String(props.value ?? ""), t.textNeutralPrimary, style(t, blockRule(variant, size, number, "primary")))).when(subtext !== "", (el) => el.child(textLine(ctx, "secondary", subtext, secondaryColor(t, props.subtextVariant, subtext), style(t, blockRule(variant, size, number, "secondary")))));
}
function textLine(ctx, part, text, color, font) {
  return textStyle(div8().text_color(color), font).children(text ? [markdownInline(ctx, part, text, { font, color })] : []);
}
var Text = {
  render(props, ctx) {
    return textBlock(ctx, props.subtext ? "text-subtext" : "text", props);
  }
};
var BoldText = {
  render(props, ctx) {
    const variant = props.subtext ? "highlight-text-number-subtext" : props.variant === "number" ? "highlight-number" : "highlight-text";
    return textBlock(ctx, variant, props);
  }
};
var Label = {
  render(props, ctx) {
    return textStyle(div8().text_color(ctx.t.textNeutralPrimary), typography(ctx.t, "body", "default")).child(String(props.text ?? ""));
  }
};
var CALLOUT_VARIANT = {
  info: "info",
  warning: "warning",
  success: "success",
  error: "warning",
  neutral: "neutral"
};
var Callout = {
  render(props, ctx) {
    const t = ctx.t;
    const field = ctx.field("visible", props.visible);
    const bound = field.isReactive;
    const visible = bound ? field.value === true || field.value === "true" : true;
    if (bound) {
      const local = ctx.local({ armed: false });
      if (visible && !local.armed) {
        local.armed = true;
        ctx.after((cx) => {
          cx.timer.after(3000, () => {
            local.armed = false;
            field.setValue(false);
          });
        });
      }
    }
    if (!visible)
      return null;
    const variant = CALLOUT_VARIANT[String(props.variant)] ?? "info";
    const { border, title } = {
      info: { border: t.borderInfoEmphasis, title: t.textInfoPrimary },
      warning: { border: t.borderAlertEmphasis, title: t.textAlertPrimary },
      success: { border: t.borderSuccessEmphasis, title: t.textSuccessPrimary },
      neutral: { border: t.borderInteractiveSelected, title: t.textNeutralPrimary }
    }[variant];
    return div8().flex().flex_col().items_start().py(t.space000).px(t.spaceM + 2).border_l(2).border_color(border).when(!!props.title, (el) => el.child(textStyle(div8().text_color(title), typography(t, "body", "heavy")).child(String(props.title)))).when(!!props.description, (el) => el.child(markdownBlock(ctx, "desc", String(props.description), { profile: "plain" })));
  }
};
var Tag = {
  render(props, ctx) {
    const t = ctx.t;
    const size = props.size === "sm" || props.size === "lg" ? props.size : "md";
    const looks = {
      neutral: { bg: t.sunk, fg: t.textNeutralPrimary },
      info: { bg: t.infoBackground, fg: t.textInfoPrimary },
      success: { bg: t.successBackground, fg: t.textSuccessPrimary },
      warning: { bg: t.alertBackground, fg: t.textAlertPrimary },
      danger: { bg: t.dangerBackground, fg: t.textDangerPrimary }
    };
    const { bg, fg } = looks[String(props.variant ?? "neutral")] ?? looks.neutral;
    let el = div8().flex().flex_row().flex_none().items_center().overflow_hidden().max_w_full().bg(bg).text_color(fg);
    el = textStyle(el, typography(t, "label", "small"));
    if (size === "sm")
      el = el.py(t.space2xs).px(t.spaceXs).rounded(t.radiusS).h(24).gap(t.space2xs);
    else if (size === "md")
      el = el.py(t.spaceXs).px(t.spaceS).rounded(t.radiusS).h(32).gap(t.spaceXs);
    else
      el = el.py(t.spaceS).px(t.spaceM).rounded(t.radiusM).h(36).gap(t.spaceXs);
    const icon = props.icon;
    const name = typeof icon?.props?.name === "string" ? icon.props.name : "";
    const category = typeof icon?.props?.category === "string" ? icon.props.category : undefined;
    return el.children(name !== "" ? optional(ctx.icon(name, { category, size: 14, stroke: 2.5 })) : []).child(div8().overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(props.text ?? "")));
  }
};
var Icon = {
  render(props, ctx) {
    if (typeof props.name !== "string" || props.name === "")
      return null;
    return ctx.icon(props.name, { category: typeof props.category === "string" ? props.category : undefined });
  }
};

// src/components/cards/layout.ts
var CONTAINER_MEDIUM = 768;
var CONTAINER_SMALL = 480;
function elementNodes(value) {
  return (Array.isArray(value) ? value : []).filter(e24);
}
function stringProp(node, key) {
  const value = e24(node) ? node.props?.[key] : undefined;
  return typeof value === "string" ? value : undefined;
}
function withProps(node, overrides) {
  return { ...node, props: { ...node.props, ...overrides } };
}
function cardTextScope(ctx, suffix, cardText) {
  return ctx.child(suffix, { ...ctx.scope, cardText });
}
function cardTag(ctx, tag, suffix) {
  if (!e24(tag))
    return null;
  const { text, variant, icon } = tag.props;
  const named = e24(icon) && typeof icon.props?.name === "string" && icon.props.name !== "";
  return Tag.render({ text, variant: variant ?? "neutral", size: "sm", icon: named ? icon : undefined }, ctx.child(suffix), tag);
}
function resolveGap(t, gap, width) {
  if (!gap)
    return { column: t.spaceM, row: t.spaceM };
  if (typeof gap === "number")
    return { column: Math.max(0, gap), row: Math.max(0, gap) };
  const m = typeof gap === "string" ? /^\s*(\d*\.?\d+)(px|rem|em|%)\s*$/i.exec(gap) : null;
  if (!m)
    return { column: 0, row: 0 };
  const unit = m[2].toLowerCase();
  const n = Number(m[1]);
  if (unit === "%")
    return { column: n / 100 * width, row: 0 };
  const px = n * (unit === "px" ? 1 : 16);
  return { column: px, row: px };
}
function rowsOf(n, per) {
  return Array.from({ length: Math.ceil(n / per) }, (_, i) => Math.min(per, n - i * per));
}
function cardBlock(ctx, o) {
  const t = ctx.t;
  const size = ctx.local({ width: 0 }, "block");
  const gap = resolveGap(t, o.gap, size.width);
  const scroll = ctx.local({ offset: 0 }, "scroll");
  const root = div9().id(ctx.id()).w_full().on_size_change((s, cx) => {
    if (size.width !== s.width) {
      size.width = s.width;
      cx.notify();
    }
  });
  if (o.layout === "carousel") {
    const width = o.carouselWidth(size.width > 0 && size.width <= CONTAINER_SMALL);
    const total = o.count > 0 ? o.count * width + (o.count - 1) * gap.column : 0;
    const maxOffset = size.width > 0 ? Math.max(0, total - size.width) : 0;
    const offset = Math.min(Math.max(0, scroll.offset), maxOffset);
    const track = div9().id(ctx.id("track")).relative().flex().flex_row().flex_none().gap(gap.column).py(t.space2xs).when(maxOffset > 0, (el) => el.left(-offset)).children(Array.from({ length: o.count }, (_, i) => div9().id(ctx.id(`cell-${i}`)).flex().flex_col().flex_none().w(width).child(o.card(i).flex_grow(1))));
    return root.child(div9().id(ctx.id("carousel")).flex().flex_row().w_full().overflow_hidden().when(maxOffset > 0, (el) => el.on_scroll_wheel((e, cx) => {
      const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
      if (dx === 0)
        return;
      cx.stop_propagation();
      scroll.offset = Math.min(Math.max(0, scroll.offset - dx), maxOffset);
      cx.notify();
    })).child(track));
  }
  const flat = o.responsive && size.width > 0 ? size.width <= CONTAINER_SMALL ? 1 : size.width <= CONTAINER_MEDIUM ? 2 : 0 : 0;
  const rows = flat > 0 ? rowsOf(o.count, flat) : e013(o.count, o.maxPerRow);
  let next = 0;
  return root.child(div9().flex().flex_col().gap(gap.row).w_full().children(rows.map((perRow, r) => {
    const start = next;
    next += perRow;
    return div9().id(ctx.id(`row-${r}`)).flex().flex_row().gap(gap.column).w_full().children(Array.from({ length: perRow }, (_, c) => div9().id(ctx.id(`cell-${start + c}`)).flex().flex_col().flex_1().min_w_0().child(o.card(start + c).flex_grow(1))));
  })));
}
function pressable(ctx, el, index, onActivate) {
  const id = ctx.id(`card-${index}`);
  const focus = ctx.retained(id, { kind: "card-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
  const box = el.id(id).cursor_pointer().tab_index(0).on_key_down((e, cx) => {
    if (e.key !== "enter" && e.key !== "space" && e.key !== " ")
      return;
    if (!focus || focus.is_focused())
      return;
    cx.stop_propagation();
    keyClick.suppressed = true;
    onActivate();
  }).on_key_up(() => {
    keyClick.suppressed = false;
  });
  return (focus ? box.track_focus(focus) : box).on_click((_e, cx) => {
    cx.stop_propagation();
    onActivate();
  });
}
function clickableShadow(el, preset, fill) {
  return shadow(el, preset, fill).hover((s) => s.shadow_none());
}
function chevron(ctx, size) {
  return ctx.icon("ChevronRight", { size });
}

// src/components/cards/composite.ts
var CHART_HEIGHT = 180;
function compositeProps(node, location) {
  if (!e24(node))
    return node;
  switch (node.typeName) {
    case "Text":
    case "BoldText":
      return location === "body" ? withProps(node, { size: "xs" }) : node;
    case "AreaChart":
    case "BarChart":
    case "LineChart":
      return withProps(node, { height: CHART_HEIGHT });
    case "ListBlock":
      return withProps(node, { size: "small" });
    case "EntityList":
      return withProps(node, { size: "small", header: undefined, footer: undefined });
    case "TagBlock":
      return withProps(node, { size: "sm" });
    case "Button":
      return withProps(node, { size: "small" });
    default:
      return node;
  }
}
function footerParts(footer) {
  if (typeof footer !== "object" || footer === null)
    return { price: undefined, button: undefined };
  return { price: "price" in footer ? footer.price : undefined, button: "button" in footer ? footer.button : undefined };
}
function compositeCard(ctx, item, index, clickable, onClick) {
  const t = ctx.t;
  const { header, body, footer } = item.props;
  const inside = cardTextScope(ctx, `item${index}`, { composite: true });
  const bodyItems = Array.isArray(body) ? body : [];
  const { price, button } = footerParts(footer);
  const headerEls = header ? inside.children(header, "header") : [];
  const bodyEls = bodyItems.flatMap((node, i) => inside.children(compositeProps(node, "body"), `body${i}`));
  const priceEls = price ? inside.children(compositeProps(price, "footer"), "price") : [];
  const buttonEls = button ? inside.children(compositeProps(button, "footer"), "button") : [];
  const box = div10().flex().flex_col().gap(t.spaceM).min_w(240).h_full().p(t.spaceM).border_1().rounded(t.radius3xl).text_color(t.textNeutralPrimary).children(headerEls.length ? [div10().flex().flex_col().flex_none().gap(t.spaceM).children(headerEls)] : []).children(bodyItems.length > 0 ? [div10().flex().flex_col().flex_grow(1).min_h_0().gap(t.spaceM).children(bodyEls)] : []).children(price || button ? [div10().flex().flex_none().mt_auto().w_full().child(div10().flex().flex_col().gap(t.spaceS).w_full().children(priceEls).children(buttonEls))] : []);
  if (!clickable)
    return box.bg(t.sunkLight).border_color(t.borderDefault);
  return pressable(ctx, clickableShadow(box.bg(t.foreground).border_color(t.borderInteractive), t.shadowM, t.foreground), index, onClick);
}
function headerText(item) {
  const header = item.props.header;
  if (!e24(header))
    return {};
  const pick = (...keys) => {
    for (const key of keys) {
      const value = header.props[key];
      if (typeof value === "string")
        return value;
    }
    return;
  };
  return { title: pick("title", "value"), subtitle: pick("subtitle", "subtext"), imageAlt: pick("alt") };
}
var CompositeCardBlock = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;
    const click = (item, index) => {
      if (!props.action || ctx.streaming)
        return;
      const { title, subtitle, imageAlt } = headerText(item);
      const { id, body, footer } = item.props;
      const { price, button } = footerParts(footer);
      ctx.trigger(title || imageAlt || (typeof id === "string" ? id : "") || `Composite card ${index + 1}`, e012(props.action, {
        itemIndex: index,
        itemId: id,
        itemHeaderTitle: title,
        itemHeaderSubtitle: subtitle,
        itemHeaderAlt: imageAlt,
        itemBodyCount: Array.isArray(body) ? body.length : 0,
        itemFooterPrice: e24(price) && "value" in price.props ? price.props.value : undefined,
        itemFooterButtonLabel: e24(button) ? button.props.label : undefined
      }));
    };
    const responsive = props.responsive !== false;
    return cardBlock(ctx, {
      count: items.length,
      layout: props.layout === "carousel" ? "carousel" : "grid",
      responsive,
      maxPerRow: 2,
      gap: props.gap,
      carouselWidth: (narrow) => responsive && narrow ? 280 : 320,
      card: (i) => compositeCard(ctx, items[i], i, clickable, () => click(items[i], i))
    });
  }
};
var CompositeCardItem = { render: () => null };
// src/components/cards/context.ts
import { div as div12 } from "gpui-kit";

// opengpui-shared:openui-safe-url
var m21 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-safe-url"];
var e014 = m21["safeOpenUrl"];
var e117 = m21["safeUrl"];
var e215 = m21["toCssUrl"];

// src/render/images.ts
import { div as div11, image } from "gpui-kit";
function fitRect(intrinsic, box, fit) {
  const scale = fit === "cover" ? Math.max(box.width / intrinsic.width, box.height / intrinsic.height) : Math.min(box.width / intrinsic.width, box.height / intrinsic.height);
  const width = intrinsic.width * scale;
  const height = intrinsic.height * scale;
  return { left: (box.width - width) / 2, top: (box.height - height) / 2, width, height };
}
function fitImage(state, box, fit, options = {}) {
  const r = fitRect(state, box, fit);
  const zoom = options.zoom ?? 1;
  const width = r.width * zoom;
  const height = r.height * zoom;
  let picture = image(state.path).absolute().left(r.left - (width - r.width) / 2).top(r.top - (height - r.height) / 2).w(width).h(height);
  if (options.radius)
    picture = picture.rounded(options.radius);
  if (options.transition) {
    const policy = { duration: options.transition, easing: "ease-in-out" };
    picture = picture.transition("left", policy).transition("top", policy).transition("width", policy).transition("height", policy);
  }
  return div11().relative().flex_none().overflow_hidden().w(box.width).h(box.height).child(picture);
}

// src/components/cards/context.ts
function variantLook(t, variant) {
  switch (variant) {
    case "gray":
      return { bg: t.highlight, color: t.textNeutralPrimary };
    case "image":
      return { color: t.textWhite, titleColor: t.textWhite, titleOpacity: 0.6, tagBg: "#00000066", tagColor: t.textWhite };
    default:
      return {};
  }
}
function contextCard(ctx, item, index, clickable, onClick) {
  const t = ctx.t;
  const { title, body, bgColor, bgImageSrc } = item.props;
  const src = typeof bgImageSrc === "string" ? e117(bgImageSrc) : undefined;
  const look = variantLook(t, src ? "image" : bgColor === "gray" ? "gray" : undefined);
  const size = ctx.local({ width: 0, height: 0 }, `card${index}`);
  const tag = cardTag(ctx, title, `tag${index}`);
  const titleEl = tag ? div12().flex().flex_row().items_center().w_full().child(tag.when(!!look.tagBg, (el) => el.bg(look.tagBg)).when(!!look.tagColor, (el) => el.text_color(look.tagColor))) : typeof title === "string" && title !== "" ? textStyle(div12().text_color(look.titleColor ?? t.textNeutralSecondary), typography(t, "body", "small")).when(look.titleOpacity !== undefined, (el) => el.opacity(look.titleOpacity)).child(title) : null;
  const arrow = clickable ? chevron(ctx, 16) : null;
  const top = div12().flex().flex_row().items_start().justify_between().gap(t.spaceS).w_full().min_h(t.spaceXl).children(titleEl ? [titleEl] : []).children(arrow ? [div12().flex().flex_none().items_center().justify_center().opacity(0.7).child(arrow)] : []);
  const font = typography(t, "body", "heavy");
  const color = look.color ?? t.textNeutralPrimary;
  const bottom = typeof body === "string" && body !== "" ? div12().flex().flex_col().w_full().gap(t.space2xs).child(textStyle(div12().text_color(color), font).child(markdownInline(ctx, `body${index}`, body, { font, color }))) : null;
  const content = div12().flex().flex_col().flex_grow(1).justify_between().min_w_0().h_full().gap(t.spaceL).child(top).children(bottom ? [bottom] : []);
  const state = src ? ctx.image(src) : null;
  const layers = [];
  if (src) {
    if (state?.status === "ready" && size.width > 0 && size.height > 0) {
      layers.push(div12().absolute().top(0).left(0).size_full().child(fitImage(state, { width: size.width, height: size.height }, "cover")));
    }
    layers.push(div12().absolute().top(0).left(0).size_full().bg(t.overlay));
  }
  const box = div12().id(ctx.id(`box-${index}`)).relative().flex().flex_row().items_start().justify_between().w_full().min_w(196).p(t.spaceM).rounded(t.radiusXl).overflow_hidden().bg(look.bg ?? (clickable ? t.highlight : t.highlightSubtle)).when(!!look.color, (el) => el.text_color(look.color)).on_size_change((s, cx) => {
    if (size.width !== s.width || size.height !== s.height) {
      size.width = s.width;
      size.height = s.height;
      cx.notify();
    }
  }).children(layers).child(content);
  return clickable ? pressable(ctx, box, index, onClick) : box;
}
var ContextCardBlock = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;
    const click = (item, index) => {
      if (!props.action || ctx.streaming)
        return;
      const { id, title, body, bgColor, bgImageSrc, bgImageAlt } = item.props;
      const titleText = typeof title === "string" ? title : e24(title) ? stringProp(title, "text") ?? "" : "";
      ctx.trigger(titleText || (typeof id === "string" ? id : "") || `Context card ${index + 1}`, e012(props.action, {
        itemIndex: index,
        itemId: id,
        itemTitle: titleText,
        itemBody: body,
        itemBgColor: bgColor,
        itemBgImageSrc: bgImageSrc,
        itemBgImageAlt: bgImageAlt
      }));
    };
    const responsive = props.responsive !== false;
    return cardBlock(ctx, {
      count: items.length,
      layout: props.layout === "carousel" ? "carousel" : "grid",
      responsive,
      maxPerRow: 3,
      gap: props.gap,
      carouselWidth: (narrow) => responsive && narrow ? 240 : 280,
      card: (i) => contextCard(ctx, items[i], i, clickable, () => click(items[i], i))
    });
  }
};
var ContextCardItem = { render: () => null };
// src/components/cards/overview.ts
import { div as div14 } from "gpui-kit";

// src/components/misc.ts
import { div as div13 } from "gpui-kit";
function iconProps(icon) {
  const p = icon?.props;
  return {
    name: typeof p?.name === "string" ? p.name : "",
    category: typeof p?.category === "string" ? p.category : undefined
  };
}
function asArray2(v) {
  if (Array.isArray(v))
    return v;
  if (v == null)
    return [];
  return [v];
}
var text = (v) => v == null ? "" : String(v);
var CodeBlock = {
  render(props, ctx) {
    return codeBlock(ctx, "code", text(props.codeString), text(props.language), typography(ctx.t, "body", "default").size, {
      theme: "dark",
      padding: "theme"
    });
  }
};
function calloutLook(t, variant) {
  switch (variant) {
    case "info":
      return { border: t.borderInfoEmphasis, color: t.textInfoPrimary };
    case "warning":
      return { border: t.borderAlertEmphasis, color: t.textAlertPrimary };
    case "success":
      return { border: t.borderSuccessEmphasis, color: t.textSuccessPrimary };
    case "danger":
      return { border: t.borderDangerEmphasis, color: t.textDangerPrimary };
    default:
      return { border: t.borderInteractiveSelected, color: t.textNeutralPrimary };
  }
}
var TextCallout = {
  render(props, ctx) {
    const t = ctx.t;
    const named = ["neutral", "info", "warning", "success", "danger"].find((v) => v === props.variant);
    const look = props.variant === undefined ? calloutLook(t, "neutral") : named && calloutLook(t, named);
    const color = look?.color;
    const title = text(props.title);
    const description = text(props.description);
    const content = div13().flex().flex_col().min_w_0().when(title !== "", (el) => {
      const titleEl = textStyle(div13(), typography(t, "body", "heavy")).child(title);
      return el.child(color ? titleEl.text_color(color) : titleEl);
    }).when(description !== "", (el) => el.child(textStyle(div13().text_color(t.textNeutralPrimary), typography(t, "body", "default")).child(description)));
    return div13().flex().flex_row().w_full().gap(t.spaceXs).py(0).px(16).when(!!look, (el) => el.text_color(look.color).border_l(2).border_color(look.border)).child(content);
  }
};
var InlineHeader = {
  render(props, ctx) {
    const t = ctx.t;
    const heading = text(props.heading);
    const description = text(props.description);
    if (!heading && !description)
      return null;
    const headingFont = typography(t, "body", "heavy");
    const descriptionFont = typography(t, "body", "default");
    return div13().flex().flex_col().items_start().gap(t.space3xs).when(heading !== "", (el) => el.child(textStyle(div13().flex().flex_row().items_center().gap(t.spaceXs).max_w_full().text_color(t.textNeutralPrimary), headingFont).child(markdownInline(ctx, "heading", heading, { font: headingFont, color: t.textNeutralPrimary })))).when(description !== "", (el) => el.child(textStyle(div13().text_color(t.textNeutralSecondary), descriptionFont).child(markdownInline(ctx, "description", description, { font: descriptionFont, color: t.textNeutralSecondary }))));
  }
};
var TagBlock = {
  render(props, ctx, node) {
    const size = props.size === "sm" || props.size === "md" || props.size === "lg" ? props.size : undefined;
    return div13().flex().flex_row().flex_wrap().gap(ctx.t.spaceS).max_w_full().children(asArray2(props.tags).map((tag, i) => Tag.render({ text: text(tag), size }, ctx.child(`t${i}`), node)));
  }
};
function normalizeIconVariant(variant) {
  return variant === "filled" || variant === "soft" || variant == null ? "neutral" : String(variant);
}
function iconTag(ctx, name, category, variant) {
  if (!name)
    return null;
  const t = ctx.t;
  const looks = {
    neutral: { bg: t.highlight, fg: t.textNeutralPrimary },
    info: { bg: t.infoBackground, fg: t.textInfoPrimary },
    success: { bg: t.successBackground, fg: t.textSuccessPrimary },
    warning: { bg: t.alertBackground, fg: t.textAlertPrimary },
    danger: { bg: t.dangerBackground, fg: t.textDangerPrimary },
    inverted: { bg: t.invertedBackground, fg: t.background }
  };
  const look = looks[variant];
  let el = div13().flex().flex_none().items_center().justify_center().w(36).h(36).rounded(t.radiusM);
  if (look)
    el = el.bg(look.bg).text_color(look.fg);
  return el.children(optional(ctx.icon(name, { category, size: 16 })));
}
var IconText = {
  render(props, ctx) {
    const t = ctx.t;
    const horizontal = props.layout !== "vertical";
    const { name, category } = iconProps(props.icon);
    const tag = iconTag(ctx, name, category, normalizeIconVariant(props.iconVariant));
    const subtitle = text(props.subtitle);
    const content = div13().flex().flex_col().min_w_0().child(textBlock(ctx, props.bold === true ? "highlight-text-number-subtext" : "text-subtext", {
      size: horizontal ? "xs" : "sm",
      value: text(props.title),
      subtext: subtitle
    }));
    const root = div13().flex().gap(t.spaceM).items_start();
    return horizontal ? root.flex_row().children(optional(tag && div13().mt(t.space3xs).child(tag))).child(content) : root.flex_col().children(optional(tag)).child(content);
  }
};
var ICON_BUTTON_SIZES = ["extra-small", "small", "medium", "large"];
var ICON_BUTTON_VARIANTS = ["primary", "secondary", "tertiary"];
var IconButton = {
  render(props, ctx) {
    const { name, category } = iconProps(props.icon);
    const label = text(props.name);
    return iconButton(ctx, {
      id: ctx.id("icon-btn"),
      icon: name,
      category,
      iconSize: 14,
      variant: ICON_BUTTON_VARIANTS.find((v) => v === props.variant) ?? "secondary",
      size: ICON_BUTTON_SIZES.find((s) => s === props.size) ?? "medium",
      shape: props.shape === "circle" ? "circle" : "square",
      disabled: ctx.streaming,
      bubble: true,
      onClick: () => {
        ctx.trigger(label, props.action);
      }
    });
  }
};
function metricIndicator(ctx, props, inline) {
  const t = ctx.t;
  const value = text(props.value);
  const subtext = text(props.subtext);
  const previousValue = text(props.previousValue);
  const trend = props.trend;
  const positive = trend?.direction === "up";
  const line = (color, font, str) => textStyle(div13().text_color(color), font).child(str);
  const subtextEl = () => line(t.textNeutralSecondary, typography(t, "body", "small"), subtext).min_w_0();
  let row = div13().flex().flex_row().flex_wrap().min_w_0();
  row = inline ? row.items_baseline().gap(t.space2xs) : row.items_end().gap(t.spaceXs);
  row = row.child(line(t.textNeutralPrimary, typography(t, "number", "heavy"), value));
  if (!inline && previousValue) {
    row = row.child(line(t.textNeutralSecondary, typography(t, "number", "small"), previousValue).line_through().mb(1));
  }
  if (trend) {
    row = row.child(line(positive ? t.textSuccessPrimary : t.textDangerPrimary, typography(t, "number", "small"), `${positive ? "+" : "-"}${text(trend.value)}%`).mb(1));
  }
  if (inline && subtext)
    row = row.child(subtextEl());
  return div13().flex().flex_col().gap(t.space3xs).child(row).when(!inline && subtext !== "", (el) => el.child(subtextEl()));
}
var MetricIndicatorWithStrikethrough = {
  render: (props, ctx) => metricIndicator(ctx, props, false)
};
var MetricIndicatorInline = {
  render: (props, ctx) => metricIndicator(ctx, props, true)
};

// src/components/cards/overview.ts
function overviewCard(ctx, item, index, clickable, onClick) {
  const t = ctx.t;
  const { top, bottom } = item.props;
  const arrow = clickable ? chevron(ctx, 14) : null;
  const topRow = div14().flex().flex_row().items_start().justify_between().gap(t.spaceS).w_full().min_w_0().children(e24(top) ? [
    div14().flex().flex_row().flex_1().items_start().justify_between().gap(t.spaceS).min_w_0().min_h(t.spaceXl).children(ctx.child(`top${index}`).children(top, "c"))
  ] : []).children(arrow ? [div14().flex().flex_none().items_center().justify_center().text_color(t.textNeutralSecondary).child(arrow)] : []);
  const metric = e24(bottom) ? div14().flex().flex_col().w_full().min_w_0().gap(t.space2xs).child(MetricIndicatorInline.render({ value: bottom.props.value, subtext: bottom.props.subtext, trend: bottom.props.trend }, ctx.child(`bottom${index}`), bottom)) : null;
  const box = div14().flex().flex_col().w_full().min_w(158).p(t.spaceSM).border_1().rounded(t.radius2xl).child(div14().flex().flex_col().flex_grow(1).justify_between().gap(t.spaceL).min_w_0().min_h_0().child(topRow).children(metric ? [metric] : []));
  if (!clickable)
    return box.bg(t.sunkLight).border_color(t.borderDefault);
  return pressable(ctx, clickableShadow(box.bg(t.foreground).border_color(t.borderInteractive), t.shadowM, t.foreground), index, onClick);
}
var OverviewCardBlock = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;
    const click = (item, index) => {
      if (!props.action || ctx.streaming)
        return;
      const { id, top, bottom } = item.props;
      const title = stringProp(top, "title") ?? stringProp(top, "value");
      ctx.trigger(title ?? (typeof id === "string" ? id : undefined) ?? `Overview card ${index + 1}`, e012(props.action, {
        itemIndex: index,
        itemId: id,
        itemTitle: title,
        itemSubtitle: stringProp(top, "subtitle") ?? stringProp(top, "subtext"),
        itemMetricValue: e24(bottom) ? bottom.props.value : undefined
      }));
    };
    const responsive = props.responsive !== false;
    return cardBlock(ctx, {
      count: items.length,
      layout: props.layout === "carousel" ? "carousel" : "grid",
      responsive,
      maxPerRow: 3,
      gap: props.gap,
      carouselWidth: (narrow) => narrow ? 200 : 240,
      card: (i) => overviewCard(ctx, items[i], i, clickable, () => click(items[i], i))
    });
  }
};
var OverviewCardItem = { render: () => null };
// src/components/cards/snippet.ts
import { div as div15 } from "gpui-kit";
function snippetCard(ctx, item, index, clickable, onClick) {
  const t = ctx.t;
  const { lhs, rhs } = item.props;
  const lhsCtx = cardTextScope(ctx, `lhs${index}`, { ellipsis: true });
  const rhsCtx = cardTextScope(ctx, `rhs${index}`, { ellipsis: true, end: true });
  const left = div15().flex().flex_row().items_center().flex_1().min_w_0().child(div15().w_full().min_w_0().overflow_hidden().children(lhsCtx.children(lhs, "c")));
  const value = e24(rhs) ? rhsCtx.children(withProps(rhs, { size: "xs" }), "c") : [];
  const arrow = clickable ? chevron(ctx, 14) : null;
  const right = div15().flex().flex_row().flex_shrink(1).items_center().justify_end().min_w_0().ml(t.spaceM).text_color(t.textNeutralPrimary).children(value.length ? [div15().flex().flex_row().justify_end().min_w_0().max_w_full().overflow_hidden().children(value)] : arrow ? [div15().flex().items_center().justify_center().text_color(t.textNeutralSecondary).child(arrow)] : []);
  const box = div15().flex().flex_row().items_center().justify_between().gap(t.spaceM).w_full().min_w_0().p(t.spaceSM).border_1().rounded(t.radius2xl).relative().overflow_hidden().child(left).child(right);
  if (!clickable)
    return box.bg(t.sunkLight).border_color(t.borderDefault);
  return pressable(ctx, clickableShadow(box.bg(t.foreground).border_color(t.borderInteractive), t.shadowS, t.foreground), index, onClick);
}
var SnippetCardBlock = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;
    const click = (item, index) => {
      if (!props.action || ctx.streaming)
        return;
      const { id, lhs, rhs } = item.props;
      const label = stringProp(lhs, "title") ?? (typeof id === "string" ? id : undefined) ?? `Snippet card ${index + 1}`;
      ctx.trigger(label, e012(props.action, {
        itemIndex: index,
        itemId: id,
        itemTitle: stringProp(lhs, "title"),
        itemSubtitle: stringProp(lhs, "subtitle"),
        itemValue: stringProp(rhs, "value")
      }));
    };
    return cardBlock(ctx, {
      count: items.length,
      layout: "grid",
      responsive: props.responsive !== false,
      maxPerRow: 2,
      gap: props.gap,
      carouselWidth: () => 280,
      card: (i) => snippetCard(ctx, items[i], i, clickable, () => click(items[i], i))
    });
  }
};
var SnippetCardItem = { render: () => null };
// src/components/cards/visual.ts
import { Background as Background2, PathBuilder, div as div16 } from "gpui-kit";

// src/components/charts/paint.ts
import { Background } from "gpui-kit";
function circle(b, cx, cy, r) {
  return b.move_to(cx + r, cy).arc_to(r, r, 0, false, true, cx - r, cy).arc_to(r, r, 0, false, true, cx + r, cy).close();
}
function segment(b, x1, y1, x2, y2) {
  return b.move_to(x1, y1).line_to(x2, y2);
}
function layer(p) {
  const el = window.paint_path(p.path, p.paint).absolute();
  if (!p.box)
    return el.top(0).left(0).size_full();
  return el.left(p.box.x).top(p.box.y).w(Math.max(1, p.box.w)).h(Math.max(1, p.box.h));
}
function verticalGradient(from, to, fromPct, toPct, flip = false) {
  return Background.linear_gradient(flip ? 0 : 180, Background.stop(from, fromPct / 100), Background.stop(to, toPct / 100));
}

// src/components/cards/visual.ts
function roundedRect(w, h, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return PathBuilder.fill().move_to(r, 0).line_to(w - r, 0).arc_to(r, r, 0, false, true, w, r).line_to(w, h - r).arc_to(r, r, 0, false, true, w - r, h).line_to(r, h).arc_to(r, r, 0, false, true, 0, h - r).line_to(0, r).arc_to(r, r, 0, false, true, r, 0).close().build();
}
var SCRIM = "#00000066";
function visualCard(ctx, item, index, clickable, onClick) {
  const t = ctx.t;
  const { tag, body, bgImageSrc } = item.props;
  const src = typeof bgImageSrc === "string" ? e117(bgImageSrc) : undefined;
  const state = src ? ctx.image(src) : null;
  const local = ctx.local({ width: 0, height: 0, hover: false }, `card${index}`);
  const inner = { width: Math.max(0, local.width - 2), height: Math.max(0, local.height - 2) };
  const layers = [];
  const photo = state?.status === "ready" && inner.width > 0 && inner.height > 0;
  if (photo) {
    layers.push(div16().absolute().top(0).left(0).size_full().child(fitImage(state, inner, "cover", { zoom: clickable && local.hover ? 1.04 : 1, transition: 250 })));
  }
  if (inner.width > 0 && inner.height > 0) {
    layers.push(layer({
      path: roundedRect(inner.width, inner.height, t.radius3xl - 1),
      paint: Background2.linear_gradient(180, Background2.stop(alpha("#000000ff", 0.12), 0), Background2.stop(alpha("#000000ff", 0.56), 1))
    }));
  }
  const tagEl = cardTag(ctx, tag, `tag${index}`)?.bg(SCRIM).text_color(t.textWhite);
  const arrow = clickable ? chevron(ctx, 16) : null;
  const top = div16().relative().flex().flex_row().items_start().justify_between().min_h(24).p(t.spaceM).child(div16().min_w_0().children(tagEl ? [tagEl] : [])).children(arrow ? [div16().flex().flex_none().items_center().justify_center().bg(SCRIM).text_color(t.textWhite).rounded(t.radiusS).p(t.space2xs).child(arrow)] : []);
  const bodyEl = e24(body) ? ctx.child(`body${index}`).children(body, "c") : [];
  const bottom = bodyEl.length ? div16().relative().mx(t.spaceM).mb(t.spaceM).px(t.spaceSM).py(t.spaceS).bg(t.foreground).border_1().border_color(t.borderDefault).rounded(t.radiusL).children(bodyEl) : null;
  let box = div16().id(ctx.id(`box-${index}`)).relative().flex().flex_col().min_h(280).h_full().rounded(t.radius3xl).overflow_hidden().bg(t.highlightSubtle).border_1().border_color(clickable ? t.borderInteractive : t.borderDefault).on_size_change((s, cx) => {
    if (local.width !== s.width || local.height !== s.height) {
      local.width = s.width;
      local.height = s.height;
      cx.notify();
    }
  });
  if (clickable) {
    box = clickableShadow(box, t.shadowS, photo ? "covered" : t.highlightSubtle).on_hover((hovered, cx) => {
      if (local.hover !== hovered) {
        local.hover = hovered;
        cx.notify();
      }
    });
  }
  box = box.children(layers).child(top).child(div16().flex_1()).children(bottom ? [bottom] : []);
  return clickable ? pressable(ctx, box, index, onClick) : box;
}
var VisualCardBlock = {
  render(props, ctx) {
    const items = elementNodes(props.items);
    const clickable = Boolean(props.action) && !ctx.streaming;
    const click = (item, index) => {
      if (!props.action || ctx.streaming)
        return;
      const { id, body, tag, bgImageSrc, bgImageAlt } = item.props;
      const bodyValue = stringProp(body, "value");
      const tagText = stringProp(tag, "text");
      ctx.trigger(bodyValue || tagText || (typeof id === "string" ? id : "") || `Visual card ${index + 1}`, e012(props.action, {
        itemIndex: index,
        itemId: id,
        itemTag: tagText,
        itemBody: bodyValue,
        itemBodySubtext: e24(body) ? body.props.subtext : undefined,
        itemBgImageSrc: bgImageSrc,
        itemBgImageAlt: bgImageAlt
      }));
    };
    const responsive = props.responsive !== false;
    return cardBlock(ctx, {
      count: items.length,
      layout: props.layout === "carousel" ? "carousel" : "grid",
      responsive,
      maxPerRow: 3,
      gap: props.gap,
      carouselWidth: (narrow) => responsive && narrow ? 280 : 320,
      card: (i) => visualCard(ctx, items[i], i, clickable, () => click(items[i], i))
    });
  }
};
var VisualCardItem = { render: () => null };
// opengpui-shared:d3-scale
var m22 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["d3-scale"];
var e015 = m22["scaleBand"];
var e118 = m22["scaleDiverging"];
var e216 = m22["scaleDivergingLog"];
var e311 = m22["scaleDivergingPow"];
var e43 = m22["scaleDivergingSqrt"];
var e52 = m22["scaleDivergingSymlog"];
var e62 = m22["scaleIdentity"];
var e72 = m22["scaleImplicit"];
var e82 = m22["scaleLinear"];
var e92 = m22["scaleLog"];
var e102 = m22["scaleOrdinal"];
var e119 = m22["scalePoint"];
var e122 = m22["scalePow"];
var e132 = m22["scaleQuantile"];
var e142 = m22["scaleQuantize"];
var e152 = m22["scaleRadial"];
var e162 = m22["scaleSequential"];
var e172 = m22["scaleSequentialLog"];
var e182 = m22["scaleSequentialPow"];
var e192 = m22["scaleSequentialQuantile"];
var e202 = m22["scaleSequentialSqrt"];
var e217 = m22["scaleSequentialSymlog"];
var e222 = m22["scaleSqrt"];
var e232 = m22["scaleSymlog"];
var e242 = m22["scaleThreshold"];
var e252 = m22["scaleTime"];
var e262 = m22["scaleUtc"];
var e272 = m22["tickFormat"];

// opengpui-shared:d3-shape
var m23 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["d3-shape"];
var e016 = m23["arc"];
var e120 = m23["area"];
var e218 = m23["areaRadial"];
var e312 = m23["curveBasis"];
var e44 = m23["curveBasisClosed"];
var e53 = m23["curveBasisOpen"];
var e63 = m23["curveBumpX"];
var e73 = m23["curveBumpY"];
var e83 = m23["curveBundle"];
var e93 = m23["curveCardinal"];
var e103 = m23["curveCardinalClosed"];
var e1110 = m23["curveCardinalOpen"];
var e123 = m23["curveCatmullRom"];
var e133 = m23["curveCatmullRomClosed"];
var e143 = m23["curveCatmullRomOpen"];
var e153 = m23["curveLinear"];
var e163 = m23["curveLinearClosed"];
var e173 = m23["curveMonotoneX"];
var e183 = m23["curveMonotoneY"];
var e193 = m23["curveNatural"];
var e203 = m23["curveStep"];
var e219 = m23["curveStepAfter"];
var e223 = m23["curveStepBefore"];
var e233 = m23["line"];
var e243 = m23["lineRadial"];
var e253 = m23["link"];
var e263 = m23["linkHorizontal"];
var e273 = m23["linkRadial"];
var e282 = m23["linkVertical"];
var e292 = m23["pie"];
var e302 = m23["pointRadial"];
var e313 = m23["radialArea"];
var e322 = m23["radialLine"];
var e332 = m23["stack"];
var e342 = m23["stackOffsetDiverging"];
var e352 = m23["stackOffsetExpand"];
var e362 = m23["stackOffsetNone"];
var e372 = m23["stackOffsetSilhouette"];
var e382 = m23["stackOffsetWiggle"];
var e392 = m23["stackOrderAppearance"];
var e402 = m23["stackOrderAscending"];
var e412 = m23["stackOrderDescending"];
var e422 = m23["stackOrderInsideOut"];
var e432 = m23["stackOrderNone"];
var e442 = m23["stackOrderReverse"];
var e45 = m23["symbol"];
var e46 = m23["symbolAsterisk"];
var e47 = m23["symbolCircle"];
var e48 = m23["symbolCross"];
var e49 = m23["symbolDiamond"];
var e50 = m23["symbolDiamond2"];
var e51 = m23["symbolPlus"];
var e522 = m23["symbolSquare"];
var e532 = m23["symbolSquare2"];
var e54 = m23["symbolStar"];
var e55 = m23["symbolTimes"];
var e56 = m23["symbolTriangle"];
var e57 = m23["symbolTriangle2"];
var e58 = m23["symbolWye"];
var e59 = m23["symbolX"];
var e60 = m23["symbols"];
var e61 = m23["symbolsFill"];
var e622 = m23["symbolsStroke"];

// src/components/charts/cartesian.ts
import { v_flex as v_flex2 } from "gpui-base";
import { div as div21, PathBuilder as PathBuilder3 } from "gpui-kit";

// opengpui-shared:openui-charts/shared/cartesian/roundedBarPath
var m24 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/shared/cartesian/roundedBarPath"];
var e017 = m24["MIN_BAR_WIDTH"];
var e121 = m24["roundedBarPath"];

// opengpui-shared:openui-charts/shared/cartesian/seriesGeometry
var m25 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/shared/cartesian/seriesGeometry"];
var e018 = m25["AREA_STRIDE"];
var e124 = m25["LINE_STRIDE"];
var e220 = m25["buildAreaD"];
var e314 = m25["buildAreaEdgeD"];
var e410 = m25["buildLineD"];
var e510 = m25["seriesCurve"];

// opengpui-shared:openui-charts/BarChart/parts/verticalBarRadii
var m26 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/BarChart/parts/verticalBarRadii"];
var e019 = m26["verticalBarRadii"];

// opengpui-shared:openui-charts/hooks/cartesian/useStackedData
var m27 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/hooks/cartesian/useStackedData"];
var e020 = m27["stackOffsetDivergingZeroPreserving"];
var e125 = m27["useStackedData"];

// opengpui-shared:openui-charts/hooks/cartesian/useXBandScale
var m28 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/hooks/cartesian/useXBandScale"];
var e021 = m28["BAND_PADDING_INNER"];
var e126 = m28["BAND_PADDING_OUTER"];
var e221 = m28["useXBandScale"];

// opengpui-shared:openui-charts/utils/constants
var m29 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/constants"];
var e022 = m29["CHART_CLASS_PREFIX"];
var e127 = m29["CHART_MARGIN_TOP"];
var e224 = m29["DEFAULT_CHART_HEIGHT"];
var e315 = m29["MIN_TICK_SPACING"];
var e411 = m29["SINGLE_LINE_BREAKPOINT"];
var e511 = m29["resolveTickCount"];

// opengpui-shared:openui-charts/utils/labelWrap
var m30 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/labelWrap"];
var e023 = m30["MAX_LABEL_LINES"];
var e128 = m30["parseLineHeight"];
var e225 = m30["truncateToWidth"];
var e316 = m30["wrapLabelLines"];

// opengpui-shared:openui-charts/utils/mouseUtils
var m31 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/mouseUtils"];
var e024 = m31["findBandIndex"];
var e129 = m31["findNearestDataIndex"];

// opengpui-shared:openui-charts/utils/resolveShouldFitLegend
var m32 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/resolveShouldFitLegend"];
var e025 = m32["resolveShouldFitLegend"];

// opengpui-shared:openui-charts/utils/styleUtils
var m33 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/styleUtils"];
var e026 = m33["measureYAxisWidth"];
var e130 = m33["numberTickFormatter"];

// opengpui-shared:openui-charts/utils/xAxisLabelLayout
var m34 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/xAxisLabelLayout"];
var e027 = m34["ANGLED_LABEL_ROTATION"];
var e131 = m34["MAX_X_AXIS_HEIGHT_SHARE"];
var e226 = m34["X_AXIS_TOP_GAP"];
var e317 = m34["fullLabelWidth"];
var e413 = m34["layoutXAxisLabels"];

// opengpui-shared:openui-charts/utils/yDomain
var m35 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/yDomain"];
var e028 = m35["computeYDomain"];

// src/components/charts/axes.ts
import { div as div17, PathBuilder as PathBuilder2 } from "gpui-kit";
var INTER_ASCENT = 0.96875;
var INTER_DESCENT = 0.2421875;
var INTER_X_HEIGHT = 0.546;
function textAt(m, color, o) {
  const size = m.style.size;
  const baselineOffset = (m.lineHeight - (INTER_ASCENT + INTER_DESCENT) * size) / 2 + INTER_ASCENT * size;
  const raise = o.baseline === "hanging" ? 0.8 * INTER_ASCENT * size : o.baseline === "middle" ? INTER_X_HEIGHT / 2 * size : 0;
  let box = div17().absolute().left(o.x).top(o.y + raise - baselineOffset).w(0).flex().flex_col();
  box = o.anchor === "start" ? box.items_start() : o.anchor === "end" ? box.items_end() : box.items_center();
  return box.children(o.lines.map((line) => textStyle(div17().flex_none().whitespace_nowrap().text_color(color), m.style).child(line)));
}
function textItems(ctx, m, color, part, items) {
  const out = [];
  items.forEach((item, i) => {
    const tip = item.tooltip;
    if (tip)
      out.push(div17().id(ctx.id(`${part}-${i}`)).absolute().left(tip.x).top(tip.y).w(tip.w).h(tip.h).tooltip(tip.text));
    out.push(textAt(m, color, item));
  });
  return out;
}
function yAxisTicks(o) {
  return o.scale.ticks(e511(o.chartHeight, o.tickCount)).map((tick) => ({
    x: o.width - 8,
    y: o.top + o.scale(tick),
    anchor: "end",
    baseline: "middle",
    lines: [e130(tick)]
  }));
}
function horizontalGrid(t, o) {
  const ticks = o.scale.ticks(e511(o.chartHeight, o.tickCount));
  const spansNegative = (o.scale.domain()[0] ?? 0) < 0;
  const dashed = PathBuilder2.stroke(1).dash_array([3, 3]);
  const solid = PathBuilder2.stroke(1);
  let dashes = 0;
  let solids = 0;
  const dy = o.dy ?? 0;
  for (const tick of ticks) {
    const y = o.scale(tick) + dy;
    if (spansNegative && tick === 0) {
      segment(solid, 0, y, o.width, y);
      solids++;
    } else {
      segment(dashed, 0, y, o.width, y);
      dashes++;
    }
  }
  return [
    ...dashes ? [{ path: dashed.build(), paint: t.borderDefault }] : [],
    ...solids ? [{ path: solid.build(), paint: t.borderDefault }] : []
  ];
}
function verticalGrid(t, o) {
  const ticks = o.scale.ticks(Math.max(2, Math.floor(o.chartWidth / 60)));
  if (!ticks.length)
    return null;
  const b = PathBuilder2.stroke(1).dash_array([3, 3]);
  for (const tick of ticks)
    segment(b, o.scale(tick), 0, o.scale(tick), o.height);
  return { path: b.build(), paint: t.borderDefault };
}
function numericXAxis(o) {
  const ticks = o.scale.ticks(Math.max(2, Math.floor(o.chartWidth / 60)));
  return ticks.map((tick, i) => ({
    x: o.scale(tick),
    y: o.height / 2,
    anchor: o.edgeAlign ? i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle" : "middle",
    baseline: "middle",
    lines: [e130(tick)]
  }));
}
function condensedXAxis(m, o) {
  const band = "paddingInner" in o.scale ? o.scale : null;
  const out = [];
  o.scale.domain().forEach((category, i) => {
    if (i % o.interval !== 0)
      return;
    const label = String(category);
    const cx = (o.scale(category) ?? 0) + (band ? band.bandwidth() / 2 : 0);
    const left = Math.max(0, cx - o.labelWidth / 2);
    const right = Math.min(o.chartWidth, cx + o.labelWidth / 2);
    const lines = o.maxLines > 1 ? e316(m.ctx, label, right - left, o.maxLines) : [e225(m.ctx, label, right - left)];
    const truncated = lines.some((line) => line.endsWith("…"));
    const half = Math.max(...lines.map((line) => m.width(line))) / 2;
    out.push({
      x: Math.min(Math.max(cx, left + half), right - half),
      y: e226,
      anchor: "middle",
      baseline: "hanging",
      lines,
      ...truncated ? { tooltip: { text: label, x: left, y: 0, w: right - left, h: o.labelHeight } } : {}
    });
  });
  return out;
}

// src/components/charts/chrome.ts
import { h_flex as h_flex2, Popup, v_flex } from "gpui-base";
import { div as div19 } from "gpui-kit";

// opengpui-shared:openui-charts/shared/core/PortalTooltip/utils
var m36 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/shared/core/PortalTooltip/utils"];
var e029 = m36["tooltipNumberFormatter"];

// src/components/charts/hover.ts
import { div as div18 } from "gpui-kit";
var CROSSHAIR_SPRING = { response: 351, damping: 0.73 };
var TOOLTIP_SPRING = { response: 287, damping: 0.87 };
var FADE_MS = 120;
function hoverState(ctx, part = "hover") {
  return ctx.local({ index: null, last: 0, x: 0, y: 0, wx: 0, wy: 0, session: 0, ox: 0, oy: 0, relay: null }, part);
}
function withHover(el, state, find, origin = { x: 0, y: 0 }, followPointer = true) {
  const move = (lx, ly, wx, wy, cx) => {
    const index = find(lx, ly);
    const x = origin.x + lx;
    const y = origin.y + ly;
    if (index === state.index && (index === null || !followPointer || x === state.x && y === state.y))
      return;
    if (state.index === null && index !== null)
      state.session++;
    state.index = index;
    if (index !== null)
      state.last = index;
    state.x = x;
    state.y = y;
    state.wx = wx;
    state.wy = wy;
    cx.notify();
  };
  state.relay = (r, rcx) => move(r.position.x - state.ox, r.position.y - state.oy, r.position.x, r.position.y, rcx);
  return el.on_mouse_move((e, cx) => {
    state.ox = e.position.x - e.local_position.x;
    state.oy = e.position.y - e.local_position.y;
    move(e.local_position.x, e.local_position.y, e.position.x, e.position.y, cx);
  }).on_hover((hovered, cx) => {
    if (hovered || state.index === null)
      return;
    state.index = null;
    cx.notify();
  });
}
function shownIndex(state, count) {
  const visible = state.index !== null && state.index < count;
  return { index: visible ? state.index : Math.min(state.last, Math.max(0, count - 1)), visible };
}
function follower(ctx, state, part, o) {
  let el = div18().id(ctx.id(`${part}-${state.session}`)).absolute().left(o.left).top(o.top).opacity(o.visible ? 1 : 0).transition("opacity", { duration: FADE_MS, easing: "ease-in-out" });
  for (const axis of o.springs ?? ["left", "top"])
    el = el.spring(axis, CROSSHAIR_SPRING);
  return el;
}
function activeDot(ctx, state, part, x, y, color, visible) {
  const t = ctx.t;
  return follower(ctx, state, part, { left: x - 4.5, top: y - 4.5, visible }).w(9).h(9).rounded_full().bg(t.foreground).border_1().border_color(t.borderDefault).flex().items_center().justify_center().child(div18().w(4).h(4).rounded_full().bg(color));
}
function trackWidth(el, state) {
  return el.on_size_change((size, cx) => {
    if (size.width === state.width)
      return;
    state.width = size.width;
    cx.notify();
  });
}

// src/components/charts/chrome.ts
var INDICATOR_WIDTH = 10;
var GAP_WIDTH = 12;
var legendText = (item) => item.percentage !== undefined ? `${item.label} (${item.percentage.toFixed(1)}%)` : item.label;
function legendStrings(items) {
  return items.map(legendText);
}
function legendView(ctx, o) {
  const t = ctx.t;
  const state = ctx.local({ expanded: false, buttonWidth: 0 }, "legend");
  const xs = typography(t, "label", "extra-small");
  let visibleItems = o.items;
  let hasMoreItems = false;
  if (o.containerWidth && o.items.length > 0) {
    const available = o.containerWidth - state.buttonWidth;
    let current = 0;
    let count = 0;
    for (const item of o.items) {
      const width = o.measurer.width(legendText(item)) + INDICATOR_WIDTH + GAP_WIDTH;
      const required = count > 0 ? width + GAP_WIDTH : width;
      if (current + required > available)
        break;
      current += required;
      count++;
    }
    if (count < o.items.length) {
      visibleItems = o.items.slice(0, Math.max(1, count));
      hasMoreItems = o.items.length > visibleItems.length;
    }
  }
  const displayItems = state.expanded ? o.items : visibleItems;
  const toggleText = state.expanded ? "Show Less" : `${o.items.length - visibleItems.length} more`;
  const item = (it) => {
    const isHidden = o.model?.hidden.has(it.key) ?? false;
    let el = h_flex2().id(ctx.id(`legend-${it.key}`)).flex_none().gap(t.spaceXs).opacity(isHidden ? 0.3 : 1).child(div19().w(INDICATOR_WIDTH).h(INDICATOR_WIDTH).flex_none().rounded(t.radius2xs).bg(it.color)).child(h_flex2().gap(t.space2xs).child(textStyle(div19().text_color(t.textNeutralPrimary), xs).child(it.label)).children(it.percentage !== undefined ? [textStyle(div19().text_color(t.textNeutralSecondary), xs).child(`${it.percentage.toFixed(1)}%`)] : []));
    if (o.model) {
      const model = o.model;
      el = el.cursor_pointer().on_click((_e, cx) => model.toggle(it.key, cx));
    }
    return el;
  };
  const toggle = () => {
    const el = button(ctx, {
      id: ctx.id("legend-toggle"),
      label: toggleText,
      variant: "tertiary",
      size: "small",
      onClick: (cx) => {
        state.expanded = !state.expanded;
        cx.notify();
      }
    });
    return textStyle(el, xs).text_color(t.textNeutralPrimary).pl(t.space2xs).pr(t.space3xs).children(optional(ctx.icon(state.expanded ? "ChevronUp" : "ChevronDown", { size: xs.size }))).on_size_change((size, cx) => {
      if (size.width !== state.buttonWidth) {
        state.buttonWidth = size.width;
        cx.notify();
      }
    });
  };
  const axisLabel = (name, text) => textStyle(h_flex2().text_color(t.textNeutralSecondary), xs).child(`${name}: `).child(div19().text_color(t.textNeutralPrimary).child(text));
  const captions = [
    ...o.xAxisLabel ? [axisLabel("X-Axis", o.xAxisLabel)] : [],
    ...o.yAxisLabel ? [axisLabel("Y-Axis", o.yAxisLabel)] : []
  ];
  let legend = h_flex2().w_full().justify_center().gap(t.spaceM);
  legend = state.expanded || !hasMoreItems ? legend.flex_wrap() : legend.overflow_hidden();
  const paddingTop = o.flush ? 0 : t.spaceM;
  let container = v_flex().id(ctx.id("legend")).w_full().items_center().justify_center().gap(t.spaceS).pt(paddingTop);
  if (o.onHeight) {
    const report = o.onHeight;
    container = container.on_size_change((size, cx) => report(size.height - paddingTop, cx));
  }
  return container.children(captions.length ? [h_flex2().justify_center().flex_wrap().gap(t.spaceM).children(captions)] : []).child(legend.children(displayItems.map(item)).children(hasMoreItems ? [toggle()] : []));
}
function tooltipPanel(ctx, payload) {
  const t = ctx.t;
  const xs = typography(t, "label", "extra-small");
  const text = (color) => textStyle(div19().text_color(color), xs);
  const separator = () => div19().w_full().h(1).flex_none().bg(t.borderDefault);
  const { items } = payload;
  const isGreaterThanTen = items.length > 10;
  const displayItems = isGreaterThanTen ? items.slice(0, 5) : items;
  const isTwoItemsLayout = items.length <= 2;
  const row = (item, last) => {
    const indicator = div19().w(10).h(10).flex_none().rounded(t.radius2xs).bg(item.color).when(isTwoItemsLayout, (el) => el.mt(2));
    const value = text(t.textNeutralPrimary).whitespace_nowrap().overflow_hidden().text_ellipsis().child(typeof item.value === "number" ? e029(item.value) : item.value);
    const label = text(t.textNeutralSecondary).child(item.name);
    const wrapper = isTwoItemsLayout ? v_flex().flex_1().min_w_0().items_start().gap(t.space2xs) : h_flex2().flex_1().min_w_0().justify_between().gap(t.spaceS);
    return div19().flex().flex_row().flex_wrap().w_full().gap(t.spaceXs).when(isTwoItemsLayout, (el) => el.items_start()).when(!isTwoItemsLayout, (el) => el.items_center()).child(indicator).child(wrapper.child(label).child(value)).children(last ? [] : [separator()]);
  };
  const panel = v_flex().id(ctx.id("tooltip-panel")).min_w(128).max_w(240).gap(t.spaceXs).p(t.spaceXs).rounded(t.radiusL).border_1().border_color(t.borderDefault).bg(t.foreground).child(text(t.textNeutralPrimary).child(payload.label)).child(separator()).child(v_flex().min_w(128).gap(t.spaceXs).children(displayItems.map((it, i) => row(it, i === displayItems.length - 1)))).children(isGreaterThanTen ? [separator(), text(t.textNeutralPrimary).child(`Click to view all ${items.length - 5}`)] : []);
  return shadow(panel, t.shadowS, t.foreground);
}
var OFFSET = 20;
var PADDING = 8;
function chartTooltip(ctx, payload, hover, placement = "right-start") {
  const size = ctx.local({ w: 0, h: 0 }, "tooltip-size");
  const view = window.viewport_size();
  const box = ctx.pane ?? { left: 0, top: 0, right: view.width, bottom: view.height };
  let dx;
  let dy;
  if (placement === "top") {
    dx = -size.w / 2;
    dy = -OFFSET - size.h;
    if (hover.wy + dy < box.top + PADDING)
      dy = OFFSET;
    dx = clamp(hover.wx + dx, box.left + PADDING, box.right - PADDING - size.w) - hover.wx;
  } else {
    dx = OFFSET;
    dy = 0;
    if (hover.wx + dx + size.w > box.right - PADDING)
      dx = -OFFSET - size.w;
    dy = clamp(hover.wy, box.top + PADDING, box.bottom - PADDING - size.h) - hover.wy;
  }
  const panel = tooltipPanel(ctx, payload).on_size_change((s, cx) => {
    if (s.width === size.w && s.height === size.h)
      return;
    size.w = s.width;
    size.h = s.height;
    cx.notify();
  }).on_mouse_move((e, cx) => hover.relay?.(e, cx));
  return div19().id(ctx.id(`tooltip-pos-${hover.session}`)).absolute().left(hover.x + dx).top(hover.y + dy).size(0).spring("left", TOOLTIP_SPRING).spring("top", TOOLTIP_SPRING).child(Popup.new(ctx.id(`tooltip-${hover.session}`), div19().size(0)).anchor("top_left").content(panel));
}
var clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));

// opengpui-shared:openui-genui-helpers
var m37 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-genui-helpers"];
var e030 = m37["asArray"];
var e134 = m37["buildChartData"];
var e227 = m37["buildSliceData"];
var e318 = m37["hasAllProps"];

// opengpui-shared:openui-charts/utils/dataUtils
var m38 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/dataUtils"];
var e031 = m38["get2dChartConfig"];
var e135 = m38["getDataKeys"];
var e228 = m38["getLegendItems"];

// opengpui-shared:openui-charts/utils/paletteUtils
var m39 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/paletteUtils"];
var e032 = m39["DIVERGING_DEFAULT_DARK"];
var e136 = m39["DIVERGING_DEFAULT_LIGHT"];
var e229 = m39["OCEAN_DEFAULT"];
var e319 = m39["getDistributedColors"];
var e414 = m39["orientRampToSurface"];
var e512 = m39["resolvePalette"];
var e64 = m39["useChartPalette"];

// src/components/charts/visibility.ts
function toggleHidden(hidden, keys, key) {
  const next = new Set(hidden);
  if (next.has(key)) {
    next.delete(key);
    return next;
  }
  next.add(key);
  const hiddenCurrent = keys.filter((k) => next.has(k)).length;
  return hiddenCurrent >= keys.length ? null : next;
}

// src/components/charts/data.ts
var CATEGORY_KEY = "category";
function chart2DRows(props) {
  if (!e318(props, "labels", "series"))
    return null;
  const rows = e134(props.labels, props.series);
  return rows.length ? rows : null;
}
function chartColors(paletteName, count, customPalette) {
  const ramp = e512({}, paletteName, customPalette);
  return e319(ramp, count).map((c) => cssColor(c) ?? "#000000ff");
}
function seriesModel(ctx, rows, paletteName) {
  const catKey = CATEGORY_KEY;
  const allDataKeys = e135(rows, catKey);
  const state = ctx.local({ hidden: new Set }, "series");
  const dataKeys = allDataKeys.filter((k) => !state.hidden.has(k));
  const colors = chartColors(paletteName, allDataKeys.length);
  const colorMap = {};
  allDataKeys.forEach((key, i) => colorMap[key] = colors[i] ?? "#000000ff");
  return {
    catKey,
    allDataKeys,
    dataKeys,
    hidden: state.hidden,
    colorMap,
    legendItems: allDataKeys.map((key) => ({ key, label: key, color: colorMap[key] })),
    toggle(key, cx) {
      const next = toggleHidden(state.hidden, allDataKeys, key);
      if (!next)
        return;
      state.hidden = next;
      cx.notify();
    }
  };
}
function keyedSeriesModel(ctx, names, paletteName) {
  const state = ctx.local({ hidden: new Set }, "series");
  const colors = chartColors(paletteName, names.length);
  const colorMap = {};
  names.forEach((name, i) => colorMap[name] = colors[i] ?? "#000000ff");
  return {
    catKey: CATEGORY_KEY,
    allDataKeys: names,
    dataKeys: names.filter((k) => !state.hidden.has(k)),
    hidden: state.hidden,
    colorMap,
    legendItems: names.map((key) => ({ key, label: key, color: colorMap[key] })),
    toggle(key, cx) {
      const next = toggleHidden(state.hidden, names, key);
      if (!next)
        return;
      state.hidden = next;
      cx.notify();
    }
  };
}
function tooltipPayload(rows, index, m) {
  if (index === null || index >= rows.length)
    return null;
  const row = rows[index];
  return {
    label: String(row[m.catKey]),
    items: m.dataKeys.map((key) => ({ name: key, value: Number(row[key]) || 0, color: m.colorMap[key] }))
  };
}
function memo(ctx, part, key, compute, ready = true) {
  const slot = ctx.local({ key: null, value: null }, part);
  if (slot.key !== key && ready) {
    slot.value = compute();
    slot.key = key;
  }
  return slot.value;
}
function memoInPump(ctx, part, key, reuse, compute, ready = true) {
  const slot = ctx.local({ key: null, reuse: null, value: null, pending: null, failed: null }, part);
  if (slot.failed?.key === key)
    throw slot.failed.error;
  if (slot.key !== key && ready && slot.pending !== key) {
    slot.pending = key;
    ctx.after(() => {
      if (slot.pending !== key)
        return;
      slot.pending = null;
      try {
        slot.value = compute();
        slot.key = key;
        slot.reuse = reuse;
        slot.failed = null;
      } catch (error) {
        slot.failed = { key, error };
      }
    });
  }
  return slot.key === key || slot.reuse === reuse ? slot.value : null;
}

// src/components/charts/measure.ts
import { div as div20 } from "gpui-kit";

// src/components/charts/widths.ts
var MAX_STRINGS = 2000;
var caches = new Map;
var version = 0;
function widthsVersion() {
  return version;
}
function fontWidths(key) {
  let widths = caches.get(key);
  if (!widths)
    caches.set(key, widths = { chars: new Map, strings: new Map });
  return widths;
}
function recordString(widths, text, width) {
  if (widths.strings.get(text) === width)
    return;
  if (widths.strings.size >= MAX_STRINGS) {
    const oldest = widths.strings.keys().next().value;
    if (oldest !== undefined)
      widths.strings.delete(oldest);
  }
  widths.strings.set(text, width);
  version++;
}
function recordChar(widths, ch, width) {
  if (widths.chars.get(ch) === width)
    return;
  widths.chars.set(ch, width);
  version++;
}
function textWidth(widths, text, fallback) {
  const exact = widths.strings.get(text);
  if (exact !== undefined)
    return exact;
  let sum = 0;
  for (const ch of text)
    sum += widths.chars.get(ch) ?? fallback;
  return sum;
}
function probeId(text) {
  let out = "";
  for (const ch of text)
    out += /[A-Za-z0-9]/.test(ch) ? ch : `_${ch.codePointAt(0).toString(36)}_`;
  return out;
}

// src/components/charts/measure.ts
var CHAR_REPEAT = 8;

class Measurer {
  rc;
  style;
  part;
  ctx;
  widths;
  missingStrings = new Set;
  missingChars = new Set;
  constructor(rc, style, part = "measure") {
    this.rc = rc;
    this.style = style;
    this.part = part;
    this.widths = fontWidths(`${style.face ?? style.families.join(",")}|${style.size}|${style.weight}`);
    this.ctx = {
      font: `${style.weight} ${style.size}px/${style.lineHeight} ${style.families.join(", ")}`,
      measureText: (text) => ({ width: this.width(text) })
    };
    this.want(["…", " "]);
  }
  want(texts) {
    for (const text of texts) {
      if (!text)
        continue;
      if (!this.widths.strings.has(text))
        this.missingStrings.add(text);
      for (const ch of text)
        if (!this.widths.chars.has(ch))
          this.missingChars.add(ch);
    }
    return this;
  }
  get charsReady() {
    return this.missingChars.size === 0;
  }
  get ready() {
    return this.missingChars.size === 0 && this.missingStrings.size === 0;
  }
  width(text) {
    return textWidth(this.widths, text, this.style.size * 0.55);
  }
  get lineHeight() {
    return Math.ceil(this.style.size * this.style.lineHeight);
  }
  probes() {
    if (this.missingStrings.size === 0 && this.missingChars.size === 0)
      return null;
    const widths = this.widths;
    const probe = (key, text, store) => textStyle(div20(), this.style).id(this.rc.id(`${this.part}-${key}`)).flex_none().whitespace_nowrap().on_size_change((size, cx) => {
      store(size.width);
      cx.notify();
    }).child(text);
    return div20().absolute().top(0).left(0).opacity(0).flex().flex_col().items_start().children([
      ...[...this.missingStrings].map((s) => probe(`s${probeId(s)}`, s, (w) => recordString(widths, s, w))),
      ...[...this.missingChars].map((c) => probe(`c${probeId(c)}`, (c === " " ? " " : c).repeat(CHAR_REPEAT), (w) => recordChar(widths, c, w / CHAR_REPEAT)))
    ]);
  }
}

// src/components/charts/pathData.ts
var TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
var ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
function svgPath(sink, d, dx = 0, dy = 0) {
  const tokens = d.match(TOKEN) ?? [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let ctrlX = 0;
  let ctrlY = 0;
  let ctrlKind = "";
  const isCommand = (t) => /^[A-Za-z]$/.test(t);
  while (i < tokens.length) {
    if (isCommand(tokens[i]))
      cmd = tokens[i++];
    else if (cmd === "" || cmd.toUpperCase() === "Z")
      break;
    const upper = cmd.toUpperCase();
    const count = ARGS[upper];
    const args = [];
    while (args.length < count && i < tokens.length && !isCommand(tokens[i]))
      args.push(Number(tokens[i++]));
    if (args.length < count)
      break;
    const rel = cmd !== upper;
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let kind = "";
    switch (upper) {
      case "M":
        x = ox + args[0];
        y = oy + args[1];
        startX = x;
        startY = y;
        sink.move_to(x + dx, y + dy);
        cmd = rel ? "l" : "L";
        break;
      case "L":
        x = ox + args[0];
        y = oy + args[1];
        sink.line_to(x + dx, y + dy);
        break;
      case "H":
        x = ox + args[0];
        sink.line_to(x + dx, y + dy);
        break;
      case "V":
        y = oy + args[0];
        sink.line_to(x + dx, y + dy);
        break;
      case "C":
      case "S": {
        let ax;
        let ay;
        let k = 0;
        if (upper === "C") {
          ax = ox + args[k++];
          ay = oy + args[k++];
        } else {
          ax = ctrlKind === "C" ? 2 * x - ctrlX : x;
          ay = ctrlKind === "C" ? 2 * y - ctrlY : y;
        }
        const bx = ox + args[k++];
        const by = oy + args[k++];
        x = ox + args[k++];
        y = oy + args[k++];
        sink.cubic_bezier_to(x + dx, y + dy, ax + dx, ay + dy, bx + dx, by + dy);
        ctrlX = bx;
        ctrlY = by;
        kind = "C";
        break;
      }
      case "Q":
      case "T": {
        let cx;
        let cy;
        if (upper === "Q") {
          cx = ox + args[0];
          cy = oy + args[1];
          x = ox + args[2];
          y = oy + args[3];
        } else {
          cx = ctrlKind === "Q" ? 2 * x - ctrlX : x;
          cy = ctrlKind === "Q" ? 2 * y - ctrlY : y;
          x = ox + args[0];
          y = oy + args[1];
        }
        sink.curve_to(x + dx, y + dy, cx + dx, cy + dy);
        ctrlX = cx;
        ctrlY = cy;
        kind = "Q";
        break;
      }
      case "A":
        x = ox + args[5];
        y = oy + args[6];
        sink.arc_to(args[0], args[1], args[2], args[3] !== 0, args[4] !== 0, x + dx, y + dy);
        break;
      case "Z":
        sink.close();
        x = startX;
        y = startY;
        break;
    }
    ctrlKind = kind;
  }
  return sink;
}

// src/components/charts/cartesian.ts
var DEFAULT_Y_AXIS_WIDTH = 40;
var CLIP_OVERFLOW = 6;
var DEFAULT_MAX_BAR_WIDTH = 16;
var BAR_RADIUS = 4;
var MIN_BAR_HEIGHT_FOR_LINE = 8;
var LINE_PADDING = 6;
var INTERNAL_LINE_COLOR = cssColor("rgba(255, 255, 255, 0.3)");
var GRADIENT_TOP_OPACITY = 0.6;
var GRADIENT_BOTTOM_OPACITY = 0;
var PALETTE = { bar: "barChartPalette", line: "lineChartPalette", area: "areaChartPalette" };
function stackRows(rows, keys, offset) {
  if (keys.length === 0)
    return null;
  return e332().keys(keys).order(e432).offset(offset === "none" ? e362 : e020)(rows);
}
function barSeries(o) {
  const { rows, m, xScale, y: yScale, dy } = o;
  const bandwidth = xScale.bandwidth();
  const fills = new Map;
  const bar = (key, x, y, w, h, radii) => {
    let s = fills.get(key);
    if (!s)
      fills.set(key, s = { fill: PathBuilder3.fill(), lines: PathBuilder3.stroke(1), lineCount: 0 });
    svgPath(s.fill, e121(x, y, w, h, radii), 0, dy);
    if (h >= MIN_BAR_HEIGHT_FOR_LINE && w >= 3) {
      s.lines.move_to(x + w / 2, y + LINE_PADDING + dy).line_to(x + w / 2, y + h - LINE_PADDING + dy);
      s.lineCount++;
    }
  };
  if (o.stacked) {
    const cappedWidth = Math.min(bandwidth, DEFAULT_MAX_BAR_WIDTH);
    const offset = (bandwidth - cappedWidth) / 2;
    const lastPositive = new Array(rows.length).fill(-1);
    const lastNegative = new Array(rows.length).fill(-1);
    o.stacked.forEach((series, si) => series.forEach((point, i) => {
      if (point[0] === point[1])
        return;
      if (point[0] < 0)
        lastNegative[i] = si;
      else
        lastPositive[i] = si;
    }));
    o.stacked.forEach((series, si) => series.forEach((point, i) => {
      const barX = (xScale(String(rows[i][m.catKey])) ?? 0) + offset;
      const y0 = yScale(point[0]);
      const y1 = yScale(point[1]);
      const isNegative = point[0] < 0;
      const rounded = isNegative ? si === lastNegative[i] : si === lastPositive[i];
      bar(series.key, barX, Math.min(y0, y1), cappedWidth, Math.abs(y0 - y1), e019(BAR_RADIUS, isNegative, rounded));
    }));
  } else {
    const inner = o.grouped ? e015().domain(m.dataKeys).range([0, bandwidth]).padding(0.05) : null;
    const barWidth = inner ? Math.min(inner.bandwidth(), DEFAULT_MAX_BAR_WIDTH) : bandwidth;
    const offset = inner ? (inner.bandwidth() - barWidth) / 2 : 0;
    for (const row of rows) {
      const groupX = xScale(String(row[m.catKey])) ?? 0;
      for (const key of m.dataKeys) {
        const value = Number(row[key]) || 0;
        const zeroY = yScale(0);
        const valueY = yScale(value);
        bar(key, groupX + (inner?.(key) ?? 0) + offset, Math.min(valueY, zeroY), barWidth, Math.abs(valueY - zeroY), e019(BAR_RADIUS, value < 0, true));
      }
    }
  }
  return [...fills].flatMap(([key, s]) => [
    { path: s.fill.build(), paint: m.colorMap[key] },
    ...s.lineCount ? [{ path: s.lines.build(), paint: INTERNAL_LINE_COLOR }] : []
  ]);
}
function computeLayout(t, kind, rows, m, measurer, o) {
  const labels = rows.map((r) => String(r[m.catKey]));
  const yAxisWidth = m.dataKeys.length > 0 ? e026(e82().domain(o.yDomain).nice().ticks(), measurer.ctx) : DEFAULT_Y_AXIS_WIDTH;
  const chartWidth = Math.max(0, o.width - yAxisWidth);
  const labelLayout = e413(measurer.ctx, labels, {
    variant: "singleLine",
    slotWidth: rows.length > 0 ? chartWidth / rows.length : 0,
    maxHeight: (o.svgHeight - e127) * e131,
    lineHeight: e128(measurer.ctx.font),
    condensed: true,
    labelShare: kind === "bar" ? 1 - e021 : 1
  });
  const chartHeight = Math.max(0, o.svgHeight - e127 - labelLayout.height);
  const yScale = e82().domain(o.yDomain).range([chartHeight, 0]).nice();
  const xBand = kind === "bar" ? e015().domain(labels).range([0, chartWidth]).paddingInner(e021).paddingOuter(e126) : null;
  const xPoint = xBand ? null : e119().domain(labels).range([labelLayout.slotWidth / 2, chartWidth - labelLayout.slotWidth / 2]).padding(0);
  const xs = labels.map((l) => (xBand ? xBand(l) : xPoint(l)) ?? 0);
  const stackedData = o.stacked ? stackRows(rows, m.dataKeys, o.stackOffset) : null;
  const dy = CLIP_OVERFLOW;
  const plot = horizontalGrid(t, { scale: yScale, width: chartWidth, chartHeight, dy });
  const edges = [];
  if (xBand) {
    plot.push(...barSeries({
      rows,
      m,
      xScale: xBand,
      y: yScale,
      stacked: stackedData,
      grouped: o.variant === undefined || o.variant === "grouped",
      dy
    }));
  } else {
    const curve = e510(o.variant ?? undefined);
    const series = stackedData ? stackedData.map((s) => ({ key: s.key, base: s.map((p) => yScale(p[0])), edge: s.map((p) => yScale(p[1])) })) : m.dataKeys.map((key) => ({
      key,
      base: rows.map(() => yScale(0)),
      edge: rows.map((row) => yScale(Number(row[key]) || 0))
    }));
    for (const s of series) {
      const color = m.colorMap[s.key];
      if (kind === "area") {
        const values = new Float64Array(rows.length * 4);
        rows.forEach((_, i) => values.set([xs[i], s.base[i], s.edge[i], s.edge[i]], i * 4));
        const flip = !stackedData && rows.every((row) => (Number(row[s.key]) || 0) <= 0);
        const ys = [...s.base, ...s.edge];
        const left = xs[0] ?? 0;
        const top = Math.min(...ys);
        plot.push({
          path: svgPath(PathBuilder3.fill(), e220(values, curve), -left, -top).build(),
          paint: verticalGradient(alpha(color, GRADIENT_TOP_OPACITY), alpha(color, GRADIENT_BOTTOM_OPACITY), 5, 95, flip),
          box: { x: left, y: top + dy, w: (xs[rows.length - 1] ?? left) - left, h: Math.max(...ys) - top }
        });
        plot.push({ path: svgPath(PathBuilder3.stroke(2), e314(values, curve), 0, dy).build(), paint: color });
      } else {
        const values = new Float64Array(rows.length * 2);
        rows.forEach((_, i) => values.set([xs[i], s.edge[i]], i * 2));
        plot.push({ path: svgPath(PathBuilder3.stroke(2), e410(values, curve), 0, dy).build(), paint: color });
      }
      edges.push({ key: s.key, ys: s.edge });
    }
  }
  return {
    yAxisWidth,
    chartWidth,
    chartHeight,
    labelHeight: labelLayout.height,
    yTicks: yAxisTicks({ scale: yScale, width: yAxisWidth, chartHeight, top: e127 }),
    xLabels: condensedXAxis(measurer, {
      scale: xBand ?? xPoint,
      interval: labelLayout.interval,
      labelWidth: labelLayout.labelWidth,
      maxLines: labelLayout.maxLines,
      labelHeight: labelLayout.height,
      chartWidth
    }),
    plot,
    xs,
    bandwidth: xBand?.bandwidth() ?? 0,
    edges,
    findIndex: (x) => xBand ? e024(xBand, x) : e129(xPoint, x)
  };
}
function chartRender(kind, props, ctx) {
  const rows = chart2DRows(props);
  if (!rows)
    return null;
  const t = ctx.t;
  const m = seriesModel(ctx, rows, PALETTE[kind]);
  const size = ctx.local({ width: 0, legendHeight: 0 }, "size");
  const hover = hoverState(ctx);
  const tick = typography(t, "label", "extra-small");
  const measurer = new Measurer(ctx, tick);
  const variant = props.variant;
  const height = props.height;
  const stacked = kind === "bar" ? variant === "stacked" : kind === "area";
  const stackOffset = kind === "area" ? "none" : "sign";
  const xAxisLabel = props.xLabel || undefined;
  const yAxisLabel = props.yLabel || undefined;
  const dataKey = JSON.stringify([rows, [...m.hidden], stacked]);
  const wanted = memo(ctx, "wanted", dataKey, () => {
    const yDomain = e028(rows, m.dataKeys, stacked, stackOffset);
    return {
      yDomain,
      strings: [
        ...rows.map((r) => String(r[m.catKey])),
        ...e82().domain(yDomain).nice().ticks().map(e130),
        ...legendStrings(m.legendItems)
      ]
    };
  });
  measurer.want(wanted.strings);
  const resolvedHeight = typeof height === "number" ? height : e224;
  const fitLegend = e025(undefined, height);
  const svgHeight = Math.max(0, fitLegend ? resolvedHeight - size.legendHeight : resolvedHeight);
  const layout = memo(ctx, "layout", JSON.stringify([dataKey, kind, variant, size.width, svgHeight, widthsVersion(), t.mode, t.borderDefault]), () => computeLayout(t, kind, rows, m, measurer, { variant, width: size.width, svgHeight, yDomain: wanted.yDomain, stacked, stackOffset }), measurer.charsReady && size.width > 0);
  const svg = div21().relative().w_full().h(svgHeight).flex_none();
  let content = svg;
  if (layout) {
    const { index, visible } = shownIndex(hover, rows.length);
    const x = layout.xs[index] ?? 0;
    const followers = [];
    if (kind === "bar") {
      followers.push(follower(ctx, hover, "band", { left: x, top: CLIP_OVERFLOW, visible, springs: ["left"] }).w(layout.bandwidth).h(layout.chartHeight).rounded(4).bg(alpha(t.textNeutralPrimary, 0.04)));
    }
    const plot = div21().absolute().left(0).top(-CLIP_OVERFLOW).w(layout.chartWidth).h(layout.chartHeight + CLIP_OVERFLOW).overflow_hidden().children(followers).children(layout.plot.map(layer)).children(layout.edges.map((e) => activeDot(ctx, hover, `dot-${e.key}`, x, (e.ys[index] ?? 0) + CLIP_OVERFLOW, m.colorMap[e.key], visible)));
    const plotBox = withHover(div21().id(ctx.id("plot")).absolute().left(layout.yAxisWidth).top(e127).w(layout.chartWidth).h(layout.chartHeight), hover, (px) => layout.findIndex(px), { x: layout.yAxisWidth, y: e127 }).child(plot);
    const payload = tooltipPayload(rows, hover.index, m);
    content = svg.children(textItems(ctx, measurer, t.textNeutralSecondary, "y", layout.yTicks)).child(plotBox).child(div21().absolute().left(layout.yAxisWidth).top(e127 + layout.chartHeight).w(layout.chartWidth).h(layout.labelHeight).children(textItems(ctx, measurer, t.textNeutralSecondary, "x", layout.xLabels))).children(payload ? [chartTooltip(ctx, payload, hover)] : []);
  }
  const caption = (text) => textStyle(div21().text_color(t.textNeutralSecondary), tick).child(text);
  const probes = measurer.probes();
  return trackWidth(v_flex2().id(ctx.id()).relative().w_full().overflow_hidden(), size).children(yAxisLabel ? [caption(yAxisLabel).pb(t.spaceS)] : []).child(content).children(xAxisLabel ? [caption(xAxisLabel).w_full().text_center()] : []).child(legendView(ctx, {
    items: m.legendItems,
    model: m,
    containerWidth: size.width,
    measurer,
    onHeight: (h, cx) => {
      if (h === size.legendHeight)
        return;
      size.legendHeight = h;
      cx.notify();
    }
  })).children(probes ? [probes] : []);
}
var BarChart = { render: (props, ctx) => chartRender("bar", props, ctx) };
var LineChart = { render: (props, ctx) => chartRender("line", props, ctx) };
var AreaChart = { render: (props, ctx) => chartRender("area", props, ctx) };
var Series = { render: () => null };
// src/components/charts/horizontalBar.ts
import { h_flex as h_flex3, v_flex as v_flex3 } from "gpui-base";
import { div as div22, PathBuilder as PathBuilder4 } from "gpui-kit";

// opengpui-shared:openui-charts/BarChart/parts/horizontalBarGeometry
var m40 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/BarChart/parts/horizontalBarGeometry"];
var e033 = m40["BAR_GAP"];
var e137 = m40["BAR_HEIGHT"];
var e230 = m40["BAR_RADIUS"];
var e320 = m40["GROUP_PADDING"];
var e415 = m40["LINE_PADDING"];
var e513 = m40["MIN_LINE_DIMENSION"];
var e65 = m40["SINGLE_ROW_MIN"];
var e74 = m40["X_AXIS_HEIGHT"];
var e84 = m40["barValue"];
var e94 = m40["contentHeight"];
var e104 = m40["groupHeight"];
var e1111 = m40["nearestSnap"];
var e1210 = m40["radiusArray"];
var e138 = m40["rowOffsets"];
var e144 = m40["showInternalLine"];
var e154 = m40["snapPositions"];
var e164 = m40["stackSegments"];
var e174 = m40["valueDomain"];
var e184 = m40["verticalPadding"];

// src/components/charts/horizontalBar.ts
var AXIS_PAD = 2;
var SCROLL_COLUMN_WIDTH = 36;
var SCROLL_COLUMN_INSET = 44;
function computeLayout2(t, rows, m, o) {
  const { variant, chartWidth, labelHeight } = o;
  const groupHeight = e104(m.dataKeys.length, variant, labelHeight);
  const contentHeight = e94(rows.length, groupHeight);
  const pad = e184(contentHeight, o.bodyHeight);
  const offsets = e138(rows.length, groupHeight, pad.top);
  const svgHeight = pad.top + contentHeight + pad.bottom;
  const [domainMin, domainMax] = e174(rows, m.dataKeys, variant);
  const valueScale = e82().domain([domainMin, domainMax]).nice().range([AXIS_PAD, Math.max(AXIS_PAD, chartWidth - AXIS_PAD)]);
  const zeroX = valueScale(0);
  const internalLineColor = cssColor(t.mode === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)");
  const rowPaths = rows.map((row, i) => {
    const barsTop = (offsets[i] ?? 0) + labelHeight;
    const fills = new Map;
    const lines = PathBuilder4.stroke(1);
    let lineCount = 0;
    const bar = (key, x, y, width, radii) => {
      let b = fills.get(key);
      if (!b)
        fills.set(key, b = PathBuilder4.fill());
      svgPath(b, e121(x, y, width, e137, radii));
      if (e144(width)) {
        lines.move_to(x + e415, y + e137 / 2).line_to(x + width - e415, y + e137 / 2);
        lineCount++;
      }
    };
    if (variant === "stacked") {
      const { positives, negatives } = e164(row, m.dataKeys);
      for (const group of [positives, negatives]) {
        let cumulative = 0;
        for (const seg of group) {
          const start = valueScale(cumulative);
          cumulative += seg.value;
          const end = valueScale(cumulative);
          bar(seg.key, Math.min(start, end), barsTop, Math.abs(end - start), e1210("stacked", e230, seg.isFirst, seg.isLast, seg.isNegative));
        }
      }
    } else {
      m.dataKeys.forEach((key, j) => {
        const value = e84(row[key]);
        const valueX = valueScale(value);
        bar(key, Math.min(zeroX, valueX), barsTop + j * (e137 + e033), Math.abs(valueX - zeroX), e1210("grouped", e230, false, false, value < 0));
      });
    }
    return [
      ...[...fills].map(([key, b]) => ({ path: b.build(), paint: m.colorMap[key] })),
      ...lineCount ? [{ path: lines.build(), paint: internalLineColor }] : []
    ];
  });
  return {
    chartWidth,
    groupHeight,
    svgHeight,
    offsets,
    snaps: e154(rows.length, groupHeight),
    grid: verticalGrid(t, { scale: valueScale, chartWidth, height: svgHeight }),
    rows: rowPaths,
    axis: numericXAxis({ scale: valueScale, chartWidth, height: e74, edgeAlign: true })
  };
}
var HorizontalBarChart = {
  render(props, ctx) {
    const rows = chart2DRows(props);
    if (!rows)
      return null;
    const t = ctx.t;
    const m = seriesModel(ctx, rows, "barChartPalette");
    const variant = props.variant === "stacked" ? "stacked" : "grouped";
    const size = ctx.local({ width: 0 }, "size");
    const scroll = ctx.local({ offset: 0, smooth: false }, "scroll");
    const hover = hoverState(ctx);
    const xs = typography(t, "label", "extra-small");
    const measurer = new Measurer(ctx, xs).want(legendStrings(m.legendItems));
    const xAxisLabel = props.xLabel || undefined;
    const yAxisLabel = props.yLabel || undefined;
    const labelHeight = Math.max(Math.ceil(e128(measurer.ctx.font)) + 8, 24);
    const chartHeight = e224;
    const bodyHeight = Math.max(0, chartHeight - e74);
    const needsScroll = e94(rows.length, e104(m.dataKeys.length, variant, labelHeight)) > bodyHeight;
    const chartWidth = Math.max(0, size.width - (needsScroll ? SCROLL_COLUMN_WIDTH : 0));
    const layout = memo(ctx, "layout", JSON.stringify([rows, [...m.hidden], variant, chartWidth, t.mode, t.borderDefault]), () => computeLayout2(t, rows, m, { variant, chartWidth, labelHeight, bodyHeight }), size.width > 0);
    const visibleBody = Math.max(0, chartHeight - e74 - 1 - t.space2xs);
    const maxOffset = layout ? Math.max(0, layout.svgHeight - visibleBody) : 0;
    const offset = Math.min(Math.max(0, scroll.offset), maxOffset);
    const scrollTo = (next, smooth, cx) => {
      scroll.offset = Math.min(Math.max(0, next), maxOffset);
      scroll.smooth = smooth;
      cx.notify();
    };
    const inner = [];
    if (layout) {
      const { index, visible } = shownIndex(hover, rows.length);
      const hovered = hover.index !== null && hover.index < rows.length ? hover.index : null;
      if (layout.grid)
        inner.push(layer(layout.grid));
      inner.push(follower(ctx, hover, "band", { left: 0, top: layout.offsets[index] ?? 0, visible, springs: ["top"] }).w(layout.chartWidth).h(layout.groupHeight).rounded(4).bg(alpha(t.textNeutralPrimary, 0.04)));
      rows.forEach((row, i) => {
        inner.push(textStyle(div22(), xs).absolute().left(0).top(layout.offsets[i] ?? 0).w(layout.chartWidth).h(labelHeight).flex().items_center().pl(t.spaceM).text_color(t.textNeutralSecondary).overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(row[m.catKey])));
        const opacity = hovered === null || hovered === i ? 1 : 0.4;
        inner.push(div22().absolute().top(0).left(0).size_full().opacity(opacity).children((layout.rows[i] ?? []).map(layer)));
      });
    }
    const content = div22().id(ctx.id("hbar-content")).relative().w(layout?.chartWidth ?? 0).h(layout?.svgHeight ?? 0).top(-offset).when(scroll.smooth, (el) => el.transition("top", { duration: 300, easing: "ease-in-out" })).children(inner);
    const body = withHover(div22().id(ctx.id("hbar-body")).relative().w_full().flex_1().min_h_0().overflow_hidden().on_scroll_wheel((e, cx) => {
      const next = Math.min(Math.max(0, offset - e.delta.y), maxOffset);
      if (next === offset)
        return;
      cx.stop_propagation();
      if (layout && hover.index !== null) {
        const my = hover.y + next;
        const found = layout.offsets.findIndex((top) => my >= top && my < top + layout.groupHeight);
        hover.index = found < 0 ? null : found;
        if (found >= 0)
          hover.last = found;
      }
      scrollTo(next, false, cx);
    }), hover, (_x, y) => {
      if (!layout)
        return null;
      const my = y + offset;
      const found = layout.offsets.findIndex((top) => my >= top && my < top + layout.groupHeight);
      return found < 0 ? null : found;
    }).child(content);
    const axis = div22().relative().w_full().flex_none().border_t_1().border_color(t.borderDefault).pt(t.space2xs).child(div22().relative().w_full().h(e74).children(layout ? textItems(ctx, measurer, t.textNeutralSecondary, "axis", layout.axis) : []));
    const canUp = offset > 0;
    const canDown = offset < maxOffset - 1;
    const scrollButton = (dir, enabled) => {
      const el = iconButton(ctx, {
        id: ctx.id(`hbar-scroll-${dir}`),
        icon: dir === "up" ? "ChevronUp" : "ChevronDown",
        variant: "secondary",
        size: "extra-small",
        disabled: !enabled,
        onClick: (cx) => scrollTo(layout ? layout.snaps[e1111(layout.snaps, offset, dir)] ?? 0 : 0, true, cx)
      }).bg(t.foreground);
      return enabled ? el : el.invisible();
    };
    const scrollColumn = needsScroll && (canUp || canDown) ? [
      v_flex3().w(SCROLL_COLUMN_WIDTH).h(chartHeight - SCROLL_COLUMN_INSET).flex_none().justify_between().items_center().pl(t.space2xs).child(scrollButton("up", canUp)).child(scrollButton("down", canDown))
    ] : [];
    const hoveredRow = hover.index !== null ? rows[hover.index] : undefined;
    const items = hoveredRow ? m.dataKeys.map((key) => ({ name: key, value: e84(hoveredRow[key]), color: m.colorMap[key] })) : [];
    const probes = measurer.probes();
    return trackWidth(v_flex3().id(ctx.id()).relative().w_full(), size).child(h_flex3().relative().w_full().h(chartHeight).items_start().overflow_hidden().child(v_flex3().relative().flex_1().min_w_0().h_full().child(body).child(axis)).children(scrollColumn).children(hoveredRow ? [chartTooltip(ctx, { label: String(hoveredRow[m.catKey]), items }, hover)] : [])).child(legendView(ctx, { items: m.legendItems, model: m, containerWidth: chartWidth, measurer, xAxisLabel, yAxisLabel })).children(probes ? [probes] : []);
  }
};
// src/components/charts/pie.ts
import { h_flex as h_flex6, v_flex as v_flex6 } from "gpui-base";
import { div as div25, PathBuilder as PathBuilder5 } from "gpui-kit";

// src/components/charts/polar.ts
import { h_flex as h_flex5, v_flex as v_flex5 } from "gpui-base";
import { div as div24 } from "gpui-kit";

// opengpui-shared:openui-charts/utils/polarUtils
var m41 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/polarUtils"];
var e034 = m41["POLAR_HOVER_TRANSITION"];
var e139 = m41["formatPercentage"];
var e231 = m41["getSliceStyle"];
var e321 = m41["radarAxisAngle"];
var e416 = m41["radarLabelAnchor"];
var e514 = m41["sortByValueDescending"];

// src/components/charts/stackedLegend.ts
import { h_flex as h_flex4, v_flex as v_flex4 } from "gpui-base";
import { div as div23 } from "gpui-kit";

// opengpui-shared:openui-charts/shared/core/StackedLegend/stackedLegendLayout
var m42 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/shared/core/StackedLegend/stackedLegendLayout"];
var e035 = m42["LEGEND_ITEM_LIMIT"];
var e140 = m42["SHOW_MORE_BREAKPOINT"];
var e234 = m42["formatStackedValue"];
var e323 = m42["resolveStackedLegendLayout"];

// src/components/charts/stackedLegend.ts
var STACKED_ROW_HEIGHT = 32;
var STACKED_ROW_LAYOUT_HEIGHT = 296;
var SCROLL_BUTTON_SIZE = 28;
function stackedLegend(ctx, o) {
  const t = ctx.t;
  const state = ctx.local({ offset: 0, smooth: false, showAll: false }, "stacked-legend");
  const small = typography(t, "label", "small");
  const { items } = o;
  const { isShowMore, isScrollable } = e323("auto", o.containerWidth, items.length);
  const total = items.filter((it) => !o.hidden.has(it.key)).reduce((sum, it) => sum + it.value, 0);
  const shown = isShowMore && !state.showAll ? items.slice(0, e035) : items;
  const contentHeight = shown.length * STACKED_ROW_HEIGHT;
  const overflowing = o.height !== undefined && contentHeight > o.height;
  const showControls = isScrollable && overflowing;
  const headerHeight = SCROLL_BUTTON_SIZE + t.spaceXs;
  const viewport = o.height === undefined ? contentHeight : Math.min(contentHeight, o.height - (showControls ? headerHeight : 0));
  const maxOffset = Math.max(0, contentHeight - viewport);
  const offset = Math.min(Math.max(0, state.offset), maxOffset);
  const scrollTo = (next, smooth, cx) => {
    state.offset = Math.min(Math.max(0, next), maxOffset);
    state.smooth = smooth;
    cx.notify();
  };
  const row = (item) => {
    const active = o.activeKey === item.key;
    const square = active ? 13 : 10;
    return h_flex4().id(ctx.id(`row-${items.indexOf(item)}-${item.key}`)).w_full().h(STACKED_ROW_HEIGHT).flex_none().items_center().justify_between().gap(10).px(8).py(4).rounded(t.radiusM).bg(active ? t.sunk : TRANSPARENT).opacity(o.hidden.has(item.key) ? 0.3 : 1).cursor_pointer().on_hover((hovered, cx) => hovered ? o.onEnter(item.key, cx) : o.onLeave(item.key, cx)).on_click((_e, cx) => o.onToggle(item.key, cx)).child(h_flex4().flex_1().min_w_0().h_full().items_center().gap(8).child(div23().w(32).h_full().flex_none().flex().items_center().justify_center().child(div23().w(square).h(square).flex_none().rounded(2).bg(item.color))).child(textStyle(div23().text_color(t.textNeutralPrimary), small).min_w_0().overflow_hidden().whitespace_nowrap().text_ellipsis().child(item.label))).child(textStyle(div23().text_color(t.textNeutralPrimary), small).flex_none().child(e234(item.value, total, "percentage")));
  };
  const list = o.height === undefined ? v_flex4().min_w(200).w_full().children(shown.map(row)) : div23().id(ctx.id("stacked-list")).relative().min_w(200).w_full().h(viewport).flex_none().overflow_hidden().on_scroll_wheel((e, cx) => {
    const next = Math.min(Math.max(0, offset - e.delta.y), maxOffset);
    if (next === offset)
      return;
    cx.stop_propagation();
    scrollTo(next, false, cx);
  }).child(v_flex4().id(ctx.id("stacked-rows")).absolute().left(0).top(-offset).w_full().when(state.smooth, (el) => el.transition("top", { duration: 300, easing: "ease-in-out" })).children(shown.map(row)));
  const scrollButton = (dir, enabled) => iconButton(ctx, {
    id: ctx.id(`stacked-scroll-${dir}`),
    icon: dir === "up" ? "ChevronUp" : "ChevronDown",
    variant: "secondary",
    size: "extra-small",
    disabled: !enabled,
    onClick: (cx) => scrollTo(offset + (dir === "up" ? -1 : 1) * STACKED_ROW_HEIGHT, true, cx)
  });
  const header = h_flex4().w_full().flex_none().items_center().justify_between().gap(10).pl(t.spaceL).pr(t.spaceXs).pb(t.spaceXs).child(textStyle(div23().text_color(t.textNeutralSecondary), small).child(`${items.length} labels`)).child(h_flex4().items_center().gap(t.spaceXs).child(scrollButton("up", offset > 0)).child(scrollButton("down", offset < maxOffset - 1)));
  const showMore = isShowMore && items.length > e035 ? [
    button(ctx, {
      id: ctx.id("stacked-show-more"),
      label: state.showAll ? "Show less" : "Show more",
      variant: "secondary",
      size: "small",
      onClick: (cx) => {
        state.showAll = !state.showAll;
        cx.notify();
      }
    }).w_full().justify_center().mt(t.space2xs)
  ] : [];
  let container = v_flex4().id(ctx.id("stacked-legend")).items_center();
  container = o.containerWidth ? container.w(o.containerWidth) : container.flex_1().min_w_0();
  if (o.height !== undefined)
    container = container.h(o.height).justify_center();
  return container.children(showControls ? [header] : []).child(list).children(showMore);
}

// src/components/charts/polar.ts
var ROW_BREAKPOINT = 400;
var LAYOUT_GAP = 20;
var POP_SPRING = { response: 314, damping: 0.625 };
var DIM_MS = 200;
function sliceRows(props) {
  const labels = e030(props.labels);
  const values = e030(props.values);
  if (labels.length > 0 && values.length > 0) {
    return labels.map((category, i) => ({
      category,
      value: typeof values[i] === "number" ? values[i] : 0
    }));
  }
  const slices = e227(props.labels);
  return slices.length ? slices : null;
}
function brighten(color, factor) {
  const channel = (at) => Math.min(255, Math.round(parseInt(color.slice(at, at + 2), 16) * factor)).toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}${color.slice(7, 9)}`;
}
function angleOf(dx, dy) {
  return Math.atan2(dx, -dy);
}
function categorical(ctx, rows, palette) {
  const sorted = e514(rows, "value");
  const colors = chartColors(palette, sorted.length);
  const slices = sorted.map((row, i) => ({
    label: String(row["category"]),
    value: Number(row["value"]) || 0,
    color: colors[i] ?? "#000000ff"
  }));
  const state = ctx.local({ hidden: new Set, active: null, fromChart: false }, "polar");
  const keys = new Set(slices.map((s) => s.label));
  let hidden = [...state.hidden].filter((k) => keys.has(k));
  if (hidden.length >= slices.length)
    hidden = [];
  if (hidden.length !== state.hidden.size)
    state.hidden = new Set(hidden);
  if (state.active !== null && !keys.has(state.active))
    state.active = null;
  return {
    slices,
    state,
    visible: slices.filter((s) => !state.hidden.has(s.label)),
    toggle(key, cx) {
      const next = new Set(state.hidden);
      if (next.has(key))
        next.delete(key);
      else {
        if (slices.length - state.hidden.size <= 1)
          return;
        next.add(key);
      }
      state.hidden = next;
      cx.notify();
    }
  };
}
function polarChartSize(containerWidth, semi) {
  const availableHeight = 300;
  return Math.max(150, Math.min(500, containerWidth || 300, semi ? availableHeight * 2 : availableHeight));
}
function polarChart(ctx, o) {
  const t = ctx.t;
  const model = categorical(ctx, o.rows, o.palette);
  const { state, visible } = model;
  const size = ctx.local({ width: 0, chartWidth: 0 }, "size");
  const hover = hoverState(ctx);
  const isRow = size.width >= ROW_BREAKPOINT;
  const hovered = hover.index !== null && hover.index < visible.length ? hover.index : null;
  if (hovered !== null) {
    state.active = visible[hovered].label;
    state.fromChart = true;
  } else if (state.fromChart) {
    state.active = null;
    state.fromChart = false;
  }
  const legendIndex = state.active === null ? -1 : visible.findIndex((s) => s.label === state.active);
  const highlighted = hovered ?? (legendIndex < 0 ? null : legendIndex);
  const chartSize = polarChartSize(size.chartWidth, o.semi);
  const shape = memo(ctx, "shape", JSON.stringify([visible, chartSize, o.shapeKey, t.mode, t.sunk]), () => o.shape(visible, chartSize, t), size.chartWidth > 0);
  let svg = div24().relative().flex_none().w(300).h(300);
  if (shape) {
    const marks = shape.marks.map((mark, i) => {
      const style = e231(i, highlighted);
      const factor = Number(/brightness\(([\d.]+)\)/.exec(style.filter ?? "")?.[1] ?? 1);
      const lifted = mark.pop && highlighted === i ? mark.pop : { x: 0, y: 0 };
      let el = div24().id(ctx.id(`mark-${i}-${visible[i].label}`)).absolute().left(lifted.x).top(lifted.y).w(shape.width).h(shape.height).opacity(style.fillOpacity ?? 1).transition("opacity", { duration: DIM_MS, easing: "ease-in-out" });
      if (mark.pop)
        el = el.spring("left", POP_SPRING).spring("top", POP_SPRING);
      return el.children(mark.fills.map((f) => layer({ path: f.path, paint: factor === 1 ? f.color : brighten(f.color, factor) })));
    });
    svg = withHover(div24().id(ctx.id("svg")).relative().w(shape.width).h(shape.height).flex_none(), hover, shape.find).child(div24().absolute().left(0).top(0).size_full().overflow_hidden().children(marks)).children(hovered === null ? [] : [
      chartTooltip(ctx, { label: visible[hovered].label, items: [{ name: visible[hovered].label, value: visible[hovered].value, color: visible[hovered].color }] }, hover)
    ]);
  }
  const chart = v_flex5().id(ctx.id("chart")).relative().items_center().on_size_change((s, cx) => {
    if (s.width === size.chartWidth)
      return;
    size.chartWidth = s.width;
    cx.notify();
  }).child(h_flex5().justify_center().child(svg));
  const items = model.slices.map((s) => ({ key: s.label, label: s.label, color: s.color, value: s.value }));
  const legend = (extra) => stackedLegend(ctx, {
    items,
    activeKey: state.active,
    hidden: state.hidden,
    onEnter(key, cx) {
      state.active = key;
      state.fromChart = false;
      cx.notify();
    },
    onLeave(key, cx) {
      if (state.active !== key)
        return;
      state.active = null;
      cx.notify();
    },
    onToggle: model.toggle,
    ...extra
  });
  const root = isRow ? h_flex5().relative().gap(LAYOUT_GAP).items_center().min_h(STACKED_ROW_LAYOUT_HEIGHT).child(div24().flex_1().min_w_0().child(chart)).child(div24().flex_1().min_w_0().h(STACKED_ROW_LAYOUT_HEIGHT).flex().items_center().justify_center().child(legend({ height: STACKED_ROW_LAYOUT_HEIGHT }))) : v_flex5().relative().gap(LAYOUT_GAP).items_stretch().child(div24().min_w_0().child(chart)).child(div24().flex().justify_center().items_start().child(legend({ containerWidth: size.width || undefined })));
  return root.id(ctx.id()).on_size_change((s, cx) => {
    if (s.width === size.width)
      return;
    size.width = s.width;
    cx.notify();
  });
}

// src/components/charts/pie.ts
var DONUT_BAND_INNER = 0.9;
var DONUT_HOLE = 0.28;
var DONUT_PADDING_ANGLE = 0.5;
var PIE_HOVER_OFFSET = 8;
function sliceOffset(startAngle, endAngle, distance) {
  if (endAngle - startAngle >= 2 * Math.PI - 0.000000001)
    return { x: 0, y: 0 };
  const mid = (startAngle + endAngle) / 2;
  return { x: Math.sin(mid) * distance, y: -Math.cos(mid) * distance };
}
function pieShape(t, slices, chartSize, o) {
  const svgWidth = chartSize;
  const svgHeight = o.semi ? chartSize / 2 + 10 : chartSize;
  const cx = svgWidth / 2;
  const cy = o.semi ? svgHeight - 10 : svgHeight / 2;
  const outerRadius = chartSize * 0.45;
  const innerRadius = o.donut ? outerRadius * DONUT_BAND_INNER : 0;
  const holeRadius = innerRadius * DONUT_HOLE;
  const padAngle = o.donut ? DONUT_PADDING_ANGLE : 0;
  const startAngle = o.semi ? -Math.PI / 2 : 0;
  const endAngle = o.semi ? Math.PI / 2 : 2 * Math.PI;
  const arcs = e292().value((d) => d.value).sort(null).startAngle(startAngle).endAngle(endAngle).padAngle(padAngle * Math.PI / 180)(slices);
  const band = e016().innerRadius(innerRadius).outerRadius(outerRadius).cornerRadius(0);
  const bandArc = o.donut ? band.padRadius(outerRadius) : band;
  const track = e016().innerRadius(holeRadius).outerRadius(innerRadius).padRadius(outerRadius).cornerRadius(0);
  const fill = (d) => svgPath(PathBuilder5.fill(), d, cx, cy).build();
  const marks = arcs.map((a, i) => {
    const bandD = bandArc(a);
    const trackD = o.donut ? track(a) : null;
    const fills = [];
    if (trackD)
      fills.push({ path: fill(trackD), color: t.sunk });
    if (bandD)
      fills.push({ path: fill(bandD), color: slices[i].color });
    return { fills, pop: sliceOffset(a.startAngle, a.endAngle, PIE_HOVER_OFFSET) };
  });
  const hitInner = o.donut ? holeRadius : 0;
  const padRadius = outerRadius;
  return {
    width: svgWidth,
    height: svgHeight,
    marks,
    find(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r > outerRadius || r < hitInner)
        return null;
      let theta = angleOf(dx, dy);
      if (!o.semi && theta < 0)
        theta += 2 * Math.PI;
      for (let i = 0;i < arcs.length; i++) {
        const a = arcs[i];
        if (theta < a.startAngle || theta > a.endAngle)
          continue;
        const gap = padRadius * Math.sin(a.padAngle / 2);
        const near = (delta) => delta < Math.PI / 2 && r * Math.sin(delta) < gap;
        if (gap > 0 && (near(theta - a.startAngle) || near(a.endAngle - theta)))
          continue;
        return i;
      }
      return null;
    }
  };
}
function pieSkeleton(ctx, donut, semi) {
  const t = ctx.t;
  const size = 200;
  const radius = size / 2;
  const pulse = (el) => el.loop("opacity", { from: 0.3, to: 0.85, period: 1200 });
  let shape;
  if (semi) {
    const ring = t.spaceXl;
    const half = PathBuilder5.fill().move_to(0, radius).arc_to(radius, radius, 0, false, true, size, radius);
    if (donut)
      half.line_to(size - ring, radius).arc_to(radius - ring, radius - ring, 0, false, false, ring, radius);
    shape = div25().relative().w(size).h(radius).flex_none().child(layer({ path: half.close().build(), paint: t.elevatedStrong }));
  } else {
    shape = div25().w(size).h(size).flex_none().rounded_full();
    shape = donut ? shape.border(t.spaceXl).border_color(t.elevatedStrong) : shape.bg(t.elevatedStrong);
  }
  const legend = v_flex6().min_w(120).gap(t.spaceS).children(Array.from({ length: 4 }, (_, i) => h_flex6().items_center().gap(t.spaceS).child(pulse(div25().w(10).h(10).flex_none().rounded_full().bg(t.elevatedStrong))).child(pulse(div25().h(12).w(120 * (50 + i * 15 % 40) / 100).bg(t.elevated).rounded(t.radiusS)))));
  return h_flex6().id(ctx.id("skeleton")).w_full().items_center().justify_center().gap(t.spaceM).p(t.spaceM).child(pulse(shape)).child(legend);
}
var PieChart = {
  render(props, ctx) {
    const donut = props.variant === "donut";
    const semi = props.appearance === "semiCircular";
    const rows = sliceRows(props);
    if (!rows)
      return ctx.queryLoading ? pieSkeleton(ctx, donut, semi) : null;
    return polarChart(ctx, {
      rows,
      palette: "pieChartPalette",
      semi,
      shapeKey: `${donut}|${semi}`,
      shape: (slices, chartSize) => pieShape(ctx.t, slices, chartSize, { donut, semi })
    });
  }
};
var Slice = { render: () => null };
// src/components/charts/radar.ts
import { h_flex as h_flex7, v_flex as v_flex7 } from "gpui-base";
import { div as div26, PathBuilder as PathBuilder6 } from "gpui-kit";

// opengpui-shared:openui-charts/utils/radarLabelLayout
var m43 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/utils/radarLabelLayout"];
var e036 = m43["MIN_RADAR_LABEL_BUDGET"];
var e141 = m43["radarLabelLayout"];
var e235 = m43["radarLabelPadding"];

// src/components/charts/radar.ts
var GRID_LEVELS = 5;
var MAX_CHART_SIZE = 500;
var MIN_CHART_SIZE = 150;
var BASELINE = { top: "hanging", middle: "middle", bottom: "auto" };
function inside(x, y, poly) {
  let winding = 0;
  for (let i = 0, j = poly.length - 1;i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const cross = (b.x - a.x) * (y - a.y) - (x - a.x) * (b.y - a.y);
    if (a.y <= y) {
      if (b.y > y && cross > 0)
        winding++;
    } else if (b.y <= y && cross < 0)
      winding--;
  }
  return winding !== 0;
}
function computeLayout3(t, rows, m, measurer, containerWidth) {
  const chartSize = Math.max(MIN_CHART_SIZE, Math.min(MAX_CHART_SIZE, containerWidth || 300, 300));
  const center = chartSize / 2;
  const maxRadius = chartSize * 0.35;
  let maxValue = 0;
  for (const row of rows)
    for (const key of m.dataKeys)
      maxValue = Math.max(maxValue, Number(row[key]) || 0);
  const radialScale = e82().domain([0, maxValue || 1]).range([0, maxRadius]);
  const numAxes = rows.length;
  const angle = (i) => e321(i, numAxes);
  const grid = PathBuilder6.stroke(1);
  for (let level = 1;level <= GRID_LEVELS; level++) {
    const r = level / GRID_LEVELS * maxRadius;
    grid.add_polygon(Array.from({ length: numAxes }, (_, i) => [center + r * Math.cos(angle(i)), center + r * Math.sin(angle(i))]), true);
  }
  for (let i = 0;i < numAxes; i++) {
    grid.move_to(center, center).line_to(center + maxRadius * Math.cos(angle(i)), center + maxRadius * Math.sin(angle(i)));
  }
  const series = m.dataKeys.map((key) => ({
    key,
    vertices: rows.map((row, i) => {
      const r = radialScale(Number(row[key]) || 0);
      return { x: r * Math.cos(angle(i)), y: r * Math.sin(angle(i)) };
    })
  }));
  const painted = [
    { path: grid.build(), paint: t.borderInteractive },
    ...series.map((s) => ({
      path: PathBuilder6.stroke(2).add_polygon(s.vertices.map((v) => [center + v.x, center + v.y]), true).build(),
      paint: m.colorMap[s.key]
    }))
  ];
  const lineHeight = measurer.lineHeight;
  const labels = [];
  rows.forEach((row, i) => {
    const label = String(row[m.catKey]);
    const layout = e141(i, numAxes, { chartSize, maxRadius, containerWidth, lineHeight });
    if (layout.maxWidth < e036)
      return;
    const lines = layout.maxLines === 1 ? [e225(measurer.ctx, label, layout.maxWidth)] : e316(measurer.ctx, label, layout.maxWidth, layout.maxLines);
    const firstDy = layout.vAlign === "top" ? 0 : layout.vAlign === "bottom" ? -(lines.length - 1) * lineHeight : -(lines.length - 1) / 2 * lineHeight;
    const x = center + layout.x;
    const y = center + layout.y;
    let tooltip;
    if (lines.some((line) => line.endsWith("…"))) {
      const w = Math.max(...lines.map((line) => measurer.width(line)));
      const h = lines.length * lineHeight;
      tooltip = {
        text: label,
        x: layout.hAlign === "start" ? x : layout.hAlign === "end" ? x - w : x - w / 2,
        y: layout.vAlign === "top" ? y : layout.vAlign === "bottom" ? y - h : y - h / 2,
        w,
        h
      };
    }
    labels.push({ x, y: y + firstDy, anchor: layout.hAlign, baseline: BASELINE[layout.vAlign], lines, ...tooltip ? { tooltip } : {} });
  });
  return { chartSize, center, painted, series, labels };
}
var RadarChart = {
  render(props, ctx) {
    const rows = chart2DRows(props);
    if (!rows)
      return null;
    const t = ctx.t;
    const m = seriesModel(ctx, rows, "radarChartPalette");
    const size = ctx.local({ width: 0 }, "size");
    const hover = hoverState(ctx);
    const measurer = new Measurer(ctx, typography(t, "label", "extra-small"));
    measurer.want(rows.map((r) => String(r[m.catKey]))).want(legendStrings(m.legendItems));
    const layout = memo(ctx, "layout", JSON.stringify([rows, [...m.hidden], size.width, widthsVersion(), t.mode, t.borderInteractive]), () => computeLayout3(t, rows, m, measurer, size.width), measurer.charsReady && size.width > 0);
    let svg = div26().relative().flex_none().w(300).h(300);
    if (layout) {
      const { center } = layout;
      const { index, visible } = shownIndex(hover, rows.length);
      const numAxes = rows.length;
      svg = withHover(div26().id(ctx.id("radar-svg")).relative().w(layout.chartSize).h(layout.chartSize).flex_none(), hover, (px, py) => {
        const mx = px - center;
        const my = py - center;
        if (numAxes === 0 || !layout.series.some((s) => inside(mx, my, s.vertices)))
          return null;
        let a = Math.atan2(my, mx) + Math.PI / 2;
        if (a < 0)
          a += 2 * Math.PI;
        return Math.round(a / (2 * Math.PI / numAxes)) % numAxes;
      }).children(layout.painted.map(layer)).children(layout.series.map((s) => {
        const v = s.vertices[index] ?? { x: 0, y: 0 };
        return activeDot(ctx, hover, `dot-${s.key}`, center + v.x, center + v.y, m.colorMap[s.key], visible);
      })).children(textItems(ctx, measurer, t.textNeutralSecondary, "label", layout.labels));
      const payload = tooltipPayload(rows, hover.index, m);
      if (payload)
        svg = svg.child(chartTooltip(ctx, payload, hover));
    }
    const probes = measurer.probes();
    return trackWidth(v_flex7().id(ctx.id()).relative().w_full().items_center(), size).child(h_flex7().w_full().justify_center().child(svg)).child(legendView(ctx, { items: m.legendItems, model: m, containerWidth: size.width, measurer })).children(probes ? [probes] : []);
  }
};
// src/components/charts/radial.ts
import { PathBuilder as PathBuilder7 } from "gpui-kit";
var BAR_GAP = 2;
var CORNER_RADIUS = 10;
function radialShape(slices, chartSize) {
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const maxRadius = chartSize * 0.45;
  const minRadius = maxRadius * 0.25;
  const sweepOf = 2 * Math.PI;
  const maxValue = Math.max(...slices.map((s) => s.value), 0);
  const thickness = (maxRadius - minRadius) / slices.length;
  const bars = slices.map((slice, i) => {
    const inner = minRadius + i * thickness + BAR_GAP;
    const outer = minRadius + (i + 1) * thickness;
    const sweep = maxValue > 0 ? slice.value / maxValue * sweepOf : 0;
    const d = e016().innerRadius(inner).outerRadius(outer).startAngle(0).endAngle(sweep).cornerRadius(CORNER_RADIUS)(null);
    return { inner, outer, sweep, d };
  });
  const marks = bars.map((bar, i) => ({
    fills: bar.d ? [{ path: svgPath(PathBuilder7.fill(), bar.d, cx, cy).build(), color: slices[i].color }] : []
  }));
  return {
    width: chartSize,
    height: chartSize,
    marks,
    find(x, y) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      const theta = angleOf(dx, dy);
      const turn = theta < 0 ? theta + sweepOf : theta;
      const index = bars.findIndex((bar) => {
        if (r < bar.inner || r > bar.outer)
          return false;
        const lo = Math.min(0, bar.sweep);
        const hi = Math.max(0, bar.sweep);
        return turn >= lo && turn <= hi || turn - sweepOf >= lo && turn - sweepOf <= hi;
      });
      return index < 0 ? null : index;
    }
  };
}
var RadialChart = {
  render(props, ctx) {
    const rows = sliceRows(props);
    if (!rows)
      return null;
    return polarChart(ctx, {
      rows,
      palette: "radialChartPalette",
      semi: false,
      shapeKey: "",
      shape: radialShape
    });
  }
};
// src/components/charts/scatter.ts
import { v_flex as v_flex8 } from "gpui-base";
import { div as div27, PathBuilder as PathBuilder8 } from "gpui-kit";
var SNAP_RADIUS = 30;
var X_AXIS_HEIGHT = 28;
var DOT_RADIUS = 4;
var DOT_RING = 1.5;
var HOVER_GROWTH = 1.5;
var DIM = 0.3;
var DOT_BOXES_MAX = 1000;
var PATH_PAD = 12;
function unwrap(node) {
  if (typeof node !== "object" || node === null)
    return;
  const fields = node;
  return fields.type === "element" ? fields.props : node;
}
function datasets(props) {
  if (!e318(props, "datasets"))
    return null;
  const data = e030(props.datasets).map((ds) => {
    const dsProps = unwrap(ds);
    return {
      name: String(dsProps?.["name"] ?? ""),
      data: e030(dsProps?.["points"]).map((pt) => {
        const ptProps = unwrap(pt);
        return {
          x: Number(ptProps?.["x"]),
          y: Number(ptProps?.["y"]),
          ...ptProps?.["z"] != null ? { z: Number(ptProps["z"]) } : {}
        };
      })
    };
  });
  return data.length ? data : null;
}
var parsed = new WeakMap;
function parsedDatasets(props) {
  const source = props.datasets;
  const cached = typeof source === "object" && source !== null ? parsed.get(source) : undefined;
  if (cached)
    return cached;
  const data = datasets(props);
  const entry = { data, dataJson: data ? JSON.stringify(data) : "" };
  if (typeof source === "object" && source !== null)
    parsed.set(source, entry);
  return entry;
}
function computeLayout4(t, data, m, measurer, width) {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const ds of data) {
    for (const pt of ds.data) {
      if (pt.x < xMin)
        xMin = pt.x;
      if (pt.x > xMax)
        xMax = pt.x;
      if (pt.y < yMin)
        yMin = pt.y;
      if (pt.y > yMax)
        yMax = pt.y;
    }
  }
  if (!isFinite(xMin)) {
    xMin = 0;
    xMax = 100;
    yMin = 0;
    yMax = 100;
  }
  const yAxisWidth = e026(e82().domain([yMin, yMax]).nice().ticks(), measurer.ctx);
  const chartHeight = Math.max(0, e224 - e127 - X_AXIS_HEIGHT);
  const chartWidth = Math.max(0, width - yAxisWidth);
  const xScale = e82().domain([xMin, xMax]).range([0, chartWidth]).nice();
  const yScale = e82().domain([yMin, yMax]).range([chartHeight, 0]).nice();
  const grid = [];
  if (chartWidth > 0) {
    grid.push(...horizontalGrid(t, { scale: yScale, width: chartWidth, chartHeight }));
    const vertical = verticalGrid(t, { scale: xScale, chartWidth, height: chartHeight });
    if (vertical)
      grid.push(vertical);
  }
  const dots = [];
  const groups = [];
  data.forEach((ds, dataset) => {
    if (m.hidden.has(ds.name))
      return;
    const own = [];
    ds.data.forEach((pt, index) => {
      const x = xScale(pt.x);
      const y = yScale(pt.y);
      if (Number.isFinite(x) && Number.isFinite(y))
        own.push({ dataset, name: ds.name, index, x, y, vx: pt.x, vy: pt.y });
    });
    for (const dot of own)
      dots.push(dot);
    groups.push({ dataset, dots: own });
  });
  if (dots.length > DOT_BOXES_MAX) {
    const box = { x: -PATH_PAD, y: -PATH_PAD, w: chartWidth + 2 * PATH_PAD, h: chartHeight + 2 * PATH_PAD };
    for (const group of groups) {
      const fill = PathBuilder8.fill();
      const ring = PathBuilder8.stroke(DOT_RING);
      for (const dot of group.dots) {
        circle(fill, dot.x + PATH_PAD, dot.y + PATH_PAD, DOT_RADIUS);
        circle(ring, dot.x + PATH_PAD, dot.y + PATH_PAD, DOT_RADIUS);
      }
      group.painted = [
        { path: fill.build(), paint: m.colorMap[data[group.dataset].name], box },
        { path: ring.build(), paint: t.foreground, box }
      ];
    }
  }
  return {
    yAxisWidth,
    chartWidth,
    chartHeight,
    svgHeight: e127 + chartHeight + X_AXIS_HEIGHT,
    grid,
    yTicks: yAxisTicks({ scale: yScale, width: yAxisWidth, chartHeight, top: e127 }),
    xTicks: numericXAxis({ scale: xScale, chartWidth, height: X_AXIS_HEIGHT }),
    dots,
    groups
  };
}
var ScatterChart = {
  render(props, ctx) {
    const { data, dataJson } = parsedDatasets(props);
    if (!data)
      return null;
    const t = ctx.t;
    const m = keyedSeriesModel(ctx, data.map((ds) => ds.name), "defaultChartPalette");
    const size = ctx.local({ width: 0 }, "size");
    const hover = hoverState(ctx);
    const measurer = new Measurer(ctx, typography(t, "label", "extra-small"));
    const wanted = memo(ctx, "wanted", dataJson, () => {
      let yMin = Infinity;
      let yMax = -Infinity;
      for (const ds of data) {
        for (const pt of ds.data) {
          if (pt.y < yMin)
            yMin = pt.y;
          if (pt.y > yMax)
            yMax = pt.y;
        }
      }
      if (!isFinite(yMin)) {
        yMin = 0;
        yMax = 100;
      }
      return e82().domain([yMin, yMax]).nice().ticks().map(e130);
    });
    measurer.want(wanted).want(legendStrings(m.legendItems));
    const layoutKey = `${dataJson}|${[...m.hidden].join("\x00")}|${size.width}|${widthsVersion()}|${t.mode}|${t.borderDefault}|${t.foreground}`;
    const layoutReady = measurer.charsReady && size.width > 0;
    const compute = () => computeLayout4(t, data, m, measurer, size.width);
    const large = data.reduce((n, ds) => n + ds.data.length, 0) > DOT_BOXES_MAX;
    const layout = large ? memoInPump(ctx, "layout-pump", layoutKey, dataJson, compute, layoutReady) : memo(ctx, "layout", layoutKey, compute, layoutReady);
    let svg = div27().relative().w_full().h(e224).flex_none();
    if (layout) {
      const hovered = hover.index !== null ? layout.dots[hover.index] : undefined;
      const dotBox = (dot) => {
        const r = hovered && hovered.name === dot.name && hovered.index === dot.index ? DOT_RADIUS * HOVER_GROWTH : DOT_RADIUS;
        const outer = r + DOT_RING / 2;
        const inner = r - DOT_RING / 2;
        return div27().absolute().left(dot.x - outer).top(dot.y - outer).w(2 * outer).h(2 * outer).rounded_full().bg(t.foreground).flex().items_center().justify_center().child(div27().w(2 * inner).h(2 * inner).flex_none().rounded_full().bg(m.colorMap[dot.name]));
      };
      const groups = layout.groups.map(({ dataset, dots, painted }) => {
        const dim = hovered && hovered.name !== data[dataset].name ? DIM : 1;
        const grown = hovered && hovered.name === data[dataset].name ? dots.find((dot) => dot.index === hovered.index) : undefined;
        return div27().id(ctx.id(`dots-${dataset}`)).absolute().left(0).top(0).size_full().opacity(dim).transition("opacity", { duration: 150, easing: "ease-in-out" }).children(painted ? painted.map(layer) : dots.map(dotBox)).children(painted && grown ? [dotBox(grown)] : []);
      });
      const plot = withHover(div27().id(ctx.id("plot")).absolute().left(layout.yAxisWidth).top(e127).w(layout.chartWidth).h(layout.chartHeight), hover, (x, y) => {
        let best = -1;
        let nearest = Infinity;
        layout.dots.forEach((dot, i) => {
          const dist = Math.hypot(x - dot.x, y - dot.y);
          if (dist < nearest) {
            nearest = dist;
            best = i;
          }
        });
        return best >= 0 && nearest <= SNAP_RADIUS ? best : null;
      }, { x: layout.yAxisWidth, y: e127 }).children(layout.grid.map(layer)).children(groups);
      svg = svg.children(textItems(ctx, measurer, t.textNeutralSecondary, "y", layout.yTicks)).child(plot).child(div27().absolute().left(layout.yAxisWidth).top(e127 + layout.chartHeight).w(layout.chartWidth).h(X_AXIS_HEIGHT).children(textItems(ctx, measurer, t.textNeutralSecondary, "x", layout.xTicks))).children(hovered ? [
        chartTooltip(ctx, {
          label: hovered.name,
          items: [
            { name: "X", value: hovered.vx, color: m.colorMap[hovered.name] },
            { name: "Y", value: hovered.vy, color: m.colorMap[hovered.name] }
          ]
        }, hover)
      ] : []);
    }
    const probes = measurer.probes();
    return trackWidth(v_flex8().id(ctx.id()).relative().w_full().items_center(), size).child(svg).child(legendView(ctx, { items: m.legendItems, model: m, containerWidth: size.width, measurer })).children(probes ? [probes] : []);
  }
};
var ScatterSeries = { render: () => null };
var Point = { render: () => null };
// src/components/charts/stacked.ts
import { v_flex as v_flex9 } from "gpui-base";
import { div as div28 } from "gpui-kit";

// opengpui-shared:openui-charts/SegmentedBar/parts/segmentedBarGeometry
var m44 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-charts/SegmentedBar/parts/segmentedBarGeometry"];
var e037 = m44["segmentShare"];
var e145 = m44["segmentValue"];

// src/components/charts/segments.ts
var MIN_SEGMENT = 2;
function segmentWidths(shares, content, gap) {
  const base = shares.map((share) => share * content);
  const widths = [...base];
  const frozen = base.map(() => false);
  const gaps = gap * Math.max(0, shares.length - 1);
  for (let pass = 0;pass <= shares.length; pass++) {
    let used = gaps;
    let flexible = 0;
    base.forEach((b, i) => {
      if (frozen[i])
        used += widths[i];
      else {
        used += b;
        flexible += b;
      }
    });
    const free = content - used;
    if (free >= 0 || flexible <= 0) {
      base.forEach((b, i) => {
        if (!frozen[i])
          widths[i] = Math.max(b, MIN_SEGMENT);
      });
      return widths;
    }
    const target = base.map((b, i) => frozen[i] ? widths[i] : b + free * b / flexible);
    let violation = 0;
    target.forEach((w, i) => {
      if (!frozen[i])
        violation += Math.max(w, MIN_SEGMENT) - w;
    });
    target.forEach((w, i) => {
      if (frozen[i])
        return;
      const clamped = Math.max(w, MIN_SEGMENT);
      widths[i] = clamped;
      if (violation === 0 || clamped > w)
        frozen[i] = true;
    });
    if (frozen.every(Boolean))
      return widths;
  }
  return widths;
}

// src/components/charts/stacked.ts
var TRACK_HEIGHT = 20;
var SingleStackedBarChart = {
  render(props, ctx) {
    const rows = sliceRows(props);
    if (!rows)
      return null;
    const t = ctx.t;
    const size = ctx.local({ width: 0 }, "size");
    const hover = hoverState(ctx);
    const ramp = e512({}, "barChartPalette");
    const values = rows.map((row) => e145(row["value"]));
    const total = values.reduce((sum, v) => sum + v, 0);
    const segments = rows.map((row, i) => {
      const share = e037(values[i] ?? 0, total);
      return {
        key: `${String(row["category"])}-${i}`,
        label: String(row["category"]),
        value: values[i] ?? 0,
        share,
        percentage: share * 100,
        color: cssColor(ramp[i % ramp.length] ?? "#000000") ?? "#000000ff"
      };
    });
    const pad = t.space2xs;
    const innerHeight = TRACK_HEIGHT - 2 * pad;
    const content = Math.max(0, size.width - 2 * pad);
    const widths = segmentWidths(segments.map((s) => s.share), content, t.space3xs);
    const lefts = [];
    let cursor = pad;
    for (const w of widths) {
      lefts.push(cursor);
      cursor += w + t.space3xs;
    }
    const active = hover.index !== null && hover.index < segments.length ? hover.index : null;
    const track = withHover(div28().id(ctx.id("track")).relative().w_full().h(TRACK_HEIGHT).flex_none().overflow_hidden().rounded(t.radiusS).bg(t.background), hover, (x, y) => {
      if (size.width <= 0 || y < pad || y > pad + innerHeight)
        return null;
      const found = widths.findIndex((w, i) => x >= lefts[i] && x <= lefts[i] + w);
      return found < 0 ? null : found;
    }, { x: 0, y: 0 }, false).children(size.width > 0 ? segments.map((segment, i) => {
      let el = div28().id(ctx.id(`segment-${i}`)).absolute().left(lefts[i]).top(pad).w(widths[i]).h(innerHeight).overflow_hidden().bg(segment.color).opacity(active === null || active === i ? 1 : 0.5).transition("opacity", { duration: 200, easing: "ease-in-out" });
      if (i === segments.length - 1)
        el = el.rounded_r(t.radiusXs);
      else if (i === 0)
        el = el.rounded_l(t.radiusXs);
      const dimmed = active !== null && active !== i;
      return shadow(el, dimmed ? "none" : t.shadowS, segment.color).child(div28().absolute().left(5).top(innerHeight / 2 - 0.5).w(Math.max(widths[i] - 10, MIN_SEGMENT)).h(1).bg(t.borderAccentEmphasis));
    }) : []);
    let tooltip = [];
    if (active !== null) {
      const segment = segments[active];
      const ax = lefts[active] + widths[active] / 2;
      tooltip = [
        chartTooltip(ctx, {
          label: segment.label,
          items: [
            { name: "Value", value: e130(segment.value), color: segment.color },
            { name: "Percentage", value: `${segment.percentage.toFixed(1)}%`, color: segment.color }
          ]
        }, { ...hover, x: ax, y: pad, wx: hover.wx - hover.x + ax, wy: hover.wy - hover.y + pad }, "top")
      ];
    }
    const legendItems = segments.map((s) => ({ key: s.key, label: s.label, color: s.color, percentage: s.percentage }));
    const measurer = new Measurer(ctx, typography(t, "label", "extra-small")).want(legendStrings(legendItems));
    const probes = measurer.probes();
    return trackWidth(v_flex9().id(ctx.id()).relative().w_full().items_center().justify_center().gap(t.spaceM), size).child(div28().relative().w_full().flex_none().child(shadow(track, t.shadowS, t.background)).children(tooltip)).child(div28().w_full().h(1).flex_none().bg(t.borderDefault)).child(legendView(ctx, { items: legendItems, containerWidth: size.width, measurer, flush: true })).children(probes ? [probes] : []);
  }
};
// src/components/choice.ts
import { Button as GButton, Checkbox, Radio, RadioGroup as GRadioGroup, Switch } from "gpui-base";
import { div as div29, PathBuilder as PathBuilder9 } from "gpui-kit";

// opengpui-shared:openui-selection-utils
var m45 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-selection-utils"];
var e038 = m45["getStoredDefaultValue"];
var e146 = m45["normalizeSelection"];
var e236 = m45["toggleSelection"];

// src/components/selection.ts
function hydrateDefaultFieldValue(ctx, o) {
  if (ctx.streaming || o.existingValue !== undefined || o.defaultValue === undefined)
    return;
  const { session, formName } = ctx;
  ctx.after(() => {
    if (session.blocked || session.getFieldValue(formName, o.name) !== undefined)
      return;
    session.setFieldValue(formName, o.componentType, o.name, o.defaultValue, false);
  });
}
function selectionField(ctx, componentType, props, fallbackType) {
  const { session, formName } = ctx;
  const name = props.name;
  const type = props.type ?? fallbackType;
  const rules = e34(props.rules);
  const existingValue = ctx.watch(() => session.getFieldValue(formName, name));
  const selected = e146(type, existingValue, props.defaultValue);
  const storedDefaultValue = e038(type, props.defaultValue);
  hydrateDefaultFieldValue(ctx, { componentType, name, existingValue, defaultValue: storedDefaultValue });
  const form = ctx.form;
  if (form && rules.length > 0 && !ctx.streaming) {
    form.registerField(name, rules, () => {
      const value = session.getFieldValue(formName, name) ?? storedDefaultValue;
      if (type === "single")
        return typeof value === "string" && value ? value : undefined;
      return Array.isArray(value) && value.length > 0 ? value : undefined;
    });
  }
  return {
    type,
    selected,
    disabled: ctx.streaming,
    toggle(itemValue) {
      if (ctx.streaming)
        return;
      const current = e146(type, session.getFieldValue(formName, name), props.defaultValue);
      const next = e236(type, current, itemValue);
      const stored = type === "single" ? next[0] ?? undefined : next;
      const validated = type === "single" ? next[0] ?? undefined : next.length > 0 ? next : undefined;
      session.setFieldValue(formName, componentType, name, stored, true);
      if (rules.length > 0)
        form?.validateField(name, validated, rules);
    }
  };
}
function booleanAggregate(items, stored) {
  const record = stored;
  const result = {};
  for (const item of items)
    result[item.name] = record?.[item.name] ?? item.defaultChecked ?? false;
  return result;
}
function toggleBoolean(items, stored, name, checked) {
  return { ...booleanAggregate(items, stored), [name]: checked };
}

// src/components/choice.ts
function itemProps(items) {
  return (Array.isArray(items) ? items : []).flatMap((item) => e24(item) ? [item.props ?? {}] : []);
}
var Item = {
  render() {
    return null;
  }
};
var CheckBoxItem = Item;
var RadioItem = Item;
var SwitchItem = Item;
var ChipItem = Item;
function groupFrame(t, variant) {
  const frame = div29().flex().flex_col().gap(t.spaceXs).border_1().rounded(t.radiusXl);
  switch (variant) {
    case "card":
      return frame.border_color(t.borderDefault).p(t.spaceM);
    case "sunk":
      return frame.border_color(t.borderDefault).bg(t.sunk).p(t.spaceM);
    default:
      return frame.border_color(TRANSPARENT).bg(TRANSPARENT).p(t.space000);
  }
}
function itemContent(t, label, description) {
  const body = typography(t, "body", "default");
  return div29().flex().flex_col().min_w(0).children(optional(label ? textStyle(div29().text_color(t.textNeutralPrimary), body).child(String(label)) : null)).children(optional(description ? textStyle(div29().text_color(t.textNeutralSecondary), body).child(String(description)) : null));
}
function checkmark(color) {
  const path = PathBuilder9.stroke(1.5).move_to(9, 1).line_to(3.5, 6.5).line_to(1, 4).build();
  return window.paint_path(path, color).w(10).h(8).flex_none();
}
function checkBoxItem(ctx, o) {
  const t = ctx.t;
  const root = div29().id(`${o.id}:box`).flex().flex_none().items_center().justify_center().w(16).h(16).mt(t.space2xs).rounded(t.radiusXs).border_1().border_color(t.borderInteractive).when(o.checked, (el) => el.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).child(checkmark(t.textAccentPrimary))).when(!o.checked && !o.disabled, (el) => el.hover((s) => s.bg(t.sunk))).when(o.disabled, (el) => el.cursor_not_allowed());
  return Checkbox.new(o.id).checked(o.checked).disabled(o.disabled).on_change((checked) => o.onChange(checked)).flex().flex_row().items_start().gap(t.spaceS).py(t.space3xs).w_full().max_w_full().overflow_hidden().cursor_pointer().child(root).child(itemContent(t, o.label, o.description));
}
var CheckBoxGroup = {
  render(props, ctx) {
    const items = itemProps(props.items);
    const session = ctx.session;
    const formName = ctx.formName;
    const name = String(props.name);
    const field = ctx.field(name, props.value);
    const rules = e34(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming)
      form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
    if (!items.length)
      return null;
    const stored = field.value;
    const aggregate = booleanAggregate(items, stored);
    return groupFrame(ctx.t, "clear").children(items.map((item, i) => checkBoxItem(ctx, {
      id: ctx.id(`item${i}`),
      label: item.label,
      description: item.description || "",
      checked: aggregate[item.name] ?? item.defaultChecked ?? false,
      disabled: ctx.streaming,
      onChange: (checked) => {
        const current = session.stateField(formName, name, props.value);
        const next = toggleBoolean(items, current.value, item.name, checked);
        current.setValue(next);
        if (rules.length)
          form?.validateField(name, next, rules);
      }
    })));
  }
};
function radioItem(ctx, o) {
  const t = ctx.t;
  const dot = div29().w(8).h(8).rounded_full().bg(!o.checked && o.hovered && !o.disabled ? t.borderInteractive : t.foreground);
  const circle = div29().flex().items_center().justify_center().w(14).h(14).rounded_full().border_1().bg(o.checked ? t.interactiveAccentDefault : t.foreground).border_color(o.checked ? t.borderAccent : t.borderInteractive).child(dot);
  const root = div29().id(`${o.id}:dot`).flex().flex_none().items_center().justify_center().w(16).h(16).mt(t.space2xs).when(o.disabled, (el) => el.opacity(0.5).cursor_not_allowed()).on_hover((hovered, cx) => o.onHover(hovered, () => cx.notify())).child(circle);
  return Radio.new(o.id).checked(o.checked).disabled(o.disabled).on_change((checked) => {
    if (checked)
      o.onSelect();
  }).flex().flex_row().items_start().gap(t.spaceS).py(t.space3xs).w_full().max_w_full().overflow_hidden().cursor_pointer().child(root).child(itemContent(t, o.label, o.description));
}
var RadioGroup = {
  render(props, ctx) {
    const items = itemProps(props.items);
    const session = ctx.session;
    const formName = ctx.formName;
    const name = String(props.name);
    const field = ctx.field(name, props.value);
    const rules = e34(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming)
      form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
    if (!items.length)
      return null;
    const value = field.value ?? props.defaultValue ?? "";
    const hover = ctx.local({ item: -1 });
    return groupFrame(ctx.t, "clear").child(GRadioGroup.new(ctx.id("group")).flex().flex_col().gap(ctx.t.spaceXs).children(items.map((item, i) => radioItem(ctx, {
      id: ctx.id(`item${i}`),
      label: item.label,
      description: item.description || "",
      checked: item.value === value,
      disabled: ctx.streaming,
      hovered: hover.item === i,
      onHover: (hovered, notify) => {
        const next = hovered ? i : hover.item === i ? -1 : hover.item;
        if (next === hover.item)
          return;
        hover.item = next;
        notify();
      },
      onSelect: () => {
        if (item.value === value)
          return;
        const val = String(item.value);
        session.stateField(formName, name, props.value).setValue(val);
        if (rules.length)
          form?.validateField(name, val, rules);
      }
    }))));
  }
};
function switchItem(ctx, o) {
  const t = ctx.t;
  const thumb = shadow(div29().id(`${o.id}:thumb`).absolute().top(t.space3xs).left(o.checked ? t.space3xs + 8 : t.space3xs).w(10).h(10).rounded_full().bg(t.foreground).transition("left", { duration: 150, easing: "ease-in-out" }), t.shadowS, t.foreground);
  const track = Switch.new(o.id).checked(o.checked).disabled(o.disabled).on_change((checked) => o.onChange(checked)).relative().flex_none().w(24).h(16).mt(t.space2xs).rounded_full().border_1().border_color(o.checked ? t.borderAccent : t.borderDefault).bg(o.checked ? t.interactiveAccentDefault : t.sunk).when(o.disabled, (el) => el.opacity(0.5).cursor_not_allowed()).when(!o.disabled, (el) => el.cursor_pointer()).when(!o.checked && !o.disabled, (el) => el.hover((s) => s.border_color(t.borderInteractive))).child(thumb);
  const body = typography(t, "body", "default");
  const label = o.label ? textStyle(div29().id(`${o.id}:label`).text_color(t.textNeutralPrimary), body).when(!o.disabled, (el) => el.on_click((_e, cx) => {
    cx.stop_propagation();
    o.onChange(!o.checked);
  })).child(String(o.label)) : null;
  const content = div29().flex().flex_col().min_w(0).children(optional(label)).children(optional(o.description ? textStyle(div29().text_color(t.textNeutralSecondary), body).child(String(o.description)) : null));
  return div29().flex().flex_row().items_start().gap(t.spaceS).py(t.space3xs).w_full().max_w_full().overflow_hidden().child(track).child(content);
}
var SwitchGroup = {
  render(props, ctx) {
    const items = itemProps(props.items);
    if (!items.length)
      return null;
    const session = ctx.session;
    const formName = ctx.formName;
    const name = String(props.name);
    const field = ctx.field(name, props.value);
    const variant = ["clear", "card", "sunk"].find((v) => v === props.variant) ?? "clear";
    const aggregate = booleanAggregate(items, field.value);
    return groupFrame(ctx.t, variant).children(items.map((item, i) => switchItem(ctx, {
      id: ctx.id(`item${i}`),
      label: item.label,
      description: item.description || "",
      checked: aggregate[item.name] ?? item.defaultChecked ?? false,
      disabled: ctx.streaming,
      onChange: (checked) => {
        const current = session.stateField(formName, name, props.value);
        current.setValue(toggleBoolean(items, current.value, item.name, checked));
      }
    })));
  }
};
var Chips = {
  render(props, ctx) {
    const t = ctx.t;
    const selection = selectionField(ctx, "Chips", { name: String(props.name), type: props.type, rules: props.rules, defaultValue: props.defaultValue }, "multiple");
    const items = itemProps(props.items).filter((item) => item.value);
    const label = typography(t, "label", "default");
    return div29().flex().flex_row().flex_wrap().gap(t.spaceS).w_full().children(items.map((item, i) => {
      const selected = selection.selected.includes(item.value);
      const disabled = selection.disabled || item.disabled === true;
      let chip = textStyle(GButton.new(ctx.id(`chip${i}`)).selected(selected).disabled(disabled).on_click(() => selection.toggle(item.value)).flex().flex_row().items_center().gap(t.spaceXs).py(t.spaceXs).px(t.spaceS).border_1().rounded(t.radiusM).text_color(t.textNeutralPrimary), label);
      chip = selected ? chip.border_color(t.borderInteractiveSelected).bg(t.highlightStrong) : chip.border_color(t.borderInteractive).bg(TRANSPARENT);
      chip = disabled ? chip.opacity(0.6).cursor_not_allowed() : chip.cursor_pointer().when(!selected, (el) => el.hover((s) => s.border_color(t.borderDefault).bg(t.sunkLight)));
      return chip.children(item.icon ? [div29().flex().items_center().w(14).h(14).children(ctx.children(item.icon, `chip${i}:icon`))] : []).child(div29().min_w(0).overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(item.label ?? "")));
    }));
  }
};

// src/components/datepicker.ts
import { Popover } from "gpui-base";
import { div as div31 } from "gpui-kit";

// src/components/calendar.ts
import { div as div30 } from "gpui-kit";

// opengpui-shared:date-fns
var m46 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["date-fns"];
var e039 = m46["add"];
var e147 = m46["addBusinessDays"];
var e237 = m46["addDays"];
var e324 = m46["addHours"];
var e417 = m46["addISOWeekYears"];
var e515 = m46["addMilliseconds"];
var e66 = m46["addMinutes"];
var e75 = m46["addMonths"];
var e85 = m46["addQuarters"];
var e95 = m46["addSeconds"];
var e105 = m46["addWeeks"];
var e1112 = m46["addYears"];
var e1211 = m46["areIntervalsOverlapping"];
var e1310 = m46["clamp"];
var e148 = m46["closestIndexTo"];
var e155 = m46["closestTo"];
var e165 = m46["compareAsc"];
var e175 = m46["compareDesc"];
var e185 = m46["constructFrom"];
var e194 = m46["constructNow"];
var e204 = m46["daysToWeeks"];
var e2110 = m46["differenceInBusinessDays"];
var e2210 = m46["differenceInCalendarDays"];
var e238 = m46["differenceInCalendarISOWeekYears"];
var e244 = m46["differenceInCalendarISOWeeks"];
var e254 = m46["differenceInCalendarMonths"];
var e264 = m46["differenceInCalendarQuarters"];
var e274 = m46["differenceInCalendarWeeks"];
var e283 = m46["differenceInCalendarYears"];
var e293 = m46["differenceInDays"];
var e303 = m46["differenceInHours"];
var e3110 = m46["differenceInISOWeekYears"];
var e325 = m46["differenceInMilliseconds"];
var e333 = m46["differenceInMinutes"];
var e343 = m46["differenceInMonths"];
var e353 = m46["differenceInQuarters"];
var e363 = m46["differenceInSeconds"];
var e373 = m46["differenceInWeeks"];
var e383 = m46["differenceInYears"];
var e393 = m46["eachDayOfInterval"];
var e403 = m46["eachHourOfInterval"];
var e418 = m46["eachMinuteOfInterval"];
var e423 = m46["eachMonthOfInterval"];
var e433 = m46["eachQuarterOfInterval"];
var e443 = m46["eachWeekOfInterval"];
var e452 = m46["eachWeekendOfInterval"];
var e462 = m46["eachWeekendOfMonth"];
var e472 = m46["eachWeekendOfYear"];
var e482 = m46["eachYearOfInterval"];
var e492 = m46["endOfDay"];
var e502 = m46["endOfDecade"];
var e516 = m46["endOfHour"];
var e523 = m46["endOfISOWeek"];
var e533 = m46["endOfISOWeekYear"];
var e542 = m46["endOfMinute"];
var e552 = m46["endOfMonth"];
var e562 = m46["endOfQuarter"];
var e572 = m46["endOfSecond"];
var e582 = m46["endOfToday"];
var e592 = m46["endOfTomorrow"];
var e602 = m46["endOfWeek"];
var e612 = m46["endOfYear"];
var e623 = m46["endOfYesterday"];
var e632 = m46["format"];
var e642 = m46["formatDate"];
var e652 = m46["formatDistance"];
var e662 = m46["formatDistanceStrict"];
var e67 = m46["formatDistanceToNow"];
var e68 = m46["formatDistanceToNowStrict"];
var e69 = m46["formatDuration"];
var e70 = m46["formatISO"];
var e71 = m46["formatISO9075"];
var e722 = m46["formatISODuration"];
var e732 = m46["formatRFC3339"];
var e742 = m46["formatRFC7231"];
var e752 = m46["formatRelative"];
var e76 = m46["formatters"];
var e77 = m46["fromUnixTime"];
var e78 = m46["getDate"];
var e79 = m46["getDay"];
var e80 = m46["getDayOfYear"];
var e81 = m46["getDaysInMonth"];
var e822 = m46["getDaysInYear"];
var e832 = m46["getDecade"];
var e842 = m46["getDefaultOptions"];
var e852 = m46["getHours"];
var e86 = m46["getISODay"];
var e87 = m46["getISOWeek"];
var e88 = m46["getISOWeekYear"];
var e89 = m46["getISOWeeksInYear"];
var e90 = m46["getMilliseconds"];
var e91 = m46["getMinutes"];
var e922 = m46["getMonth"];
var e932 = m46["getOverlappingDaysInIntervals"];
var e942 = m46["getQuarter"];
var e952 = m46["getSeconds"];
var e96 = m46["getTime"];
var e97 = m46["getUnixTime"];
var e98 = m46["getWeek"];
var e99 = m46["getWeekOfMonth"];
var e100 = m46["getWeekYear"];
var e101 = m46["getWeeksInMonth"];
var e1022 = m46["getYear"];
var e1032 = m46["hoursToMilliseconds"];
var e1042 = m46["hoursToMinutes"];
var e1052 = m46["hoursToSeconds"];
var e106 = m46["interval"];
var e107 = m46["intervalToDuration"];
var e108 = m46["intlFormat"];
var e109 = m46["intlFormatDistance"];
var e1102 = m46["isAfter"];
var e1113 = m46["isBefore"];
var e1122 = m46["isDate"];
var e1132 = m46["isEqual"];
var e1142 = m46["isExists"];
var e1152 = m46["isFirstDayOfMonth"];
var e1162 = m46["isFriday"];
var e1172 = m46["isFuture"];
var e1182 = m46["isLastDayOfMonth"];
var e1192 = m46["isLeapYear"];
var e1202 = m46["isMatch"];
var e1212 = m46["isMonday"];
var e1222 = m46["isPast"];
var e1232 = m46["isSameDay"];
var e1242 = m46["isSameHour"];
var e1252 = m46["isSameISOWeek"];
var e1262 = m46["isSameISOWeekYear"];
var e1272 = m46["isSameMinute"];
var e1282 = m46["isSameMonth"];
var e1292 = m46["isSameQuarter"];
var e1302 = m46["isSameSecond"];
var e1312 = m46["isSameWeek"];
var e1322 = m46["isSameYear"];
var e1332 = m46["isSaturday"];
var e1342 = m46["isSunday"];
var e1352 = m46["isThisHour"];
var e1362 = m46["isThisISOWeek"];
var e1372 = m46["isThisMinute"];
var e1382 = m46["isThisMonth"];
var e1392 = m46["isThisQuarter"];
var e1402 = m46["isThisSecond"];
var e1412 = m46["isThisWeek"];
var e1422 = m46["isThisYear"];
var e1432 = m46["isThursday"];
var e1442 = m46["isToday"];
var e1452 = m46["isTomorrow"];
var e1462 = m46["isTuesday"];
var e1472 = m46["isValid"];
var e1482 = m46["isWednesday"];
var e149 = m46["isWeekend"];
var e150 = m46["isWithinInterval"];
var e151 = m46["isYesterday"];
var e1522 = m46["lastDayOfDecade"];
var e1532 = m46["lastDayOfISOWeek"];
var e1542 = m46["lastDayOfISOWeekYear"];
var e1552 = m46["lastDayOfMonth"];
var e156 = m46["lastDayOfQuarter"];
var e157 = m46["lastDayOfWeek"];
var e158 = m46["lastDayOfYear"];
var e159 = m46["lightFormat"];
var e160 = m46["lightFormatters"];
var e161 = m46["longFormatters"];
var e1622 = m46["max"];
var e1632 = m46["milliseconds"];
var e1642 = m46["millisecondsToHours"];
var e1652 = m46["millisecondsToMinutes"];
var e166 = m46["millisecondsToSeconds"];
var e167 = m46["min"];
var e168 = m46["minutesToHours"];
var e169 = m46["minutesToMilliseconds"];
var e170 = m46["minutesToSeconds"];
var e171 = m46["monthsToQuarters"];
var e1722 = m46["monthsToYears"];
var e1732 = m46["nextDay"];
var e1742 = m46["nextFriday"];
var e1752 = m46["nextMonday"];
var e176 = m46["nextSaturday"];
var e177 = m46["nextSunday"];
var e178 = m46["nextThursday"];
var e179 = m46["nextTuesday"];
var e180 = m46["nextWednesday"];
var e181 = m46["parse"];
var e1822 = m46["parseISO"];
var e1832 = m46["parseJSON"];
var e1842 = m46["parsers"];
var e1852 = m46["previousDay"];
var e186 = m46["previousFriday"];
var e187 = m46["previousMonday"];
var e188 = m46["previousSaturday"];
var e189 = m46["previousSunday"];
var e190 = m46["previousThursday"];
var e191 = m46["previousTuesday"];
var e1922 = m46["previousWednesday"];
var e1932 = m46["quartersToMonths"];
var e1942 = m46["quartersToYears"];
var e195 = m46["roundToNearestHours"];
var e196 = m46["roundToNearestMinutes"];
var e197 = m46["secondsToHours"];
var e198 = m46["secondsToMilliseconds"];
var e199 = m46["secondsToMinutes"];
var e200 = m46["set"];
var e201 = m46["setDate"];
var e2022 = m46["setDay"];
var e2032 = m46["setDayOfYear"];
var e2042 = m46["setDefaultOptions"];
var e205 = m46["setHours"];
var e206 = m46["setISODay"];
var e207 = m46["setISOWeek"];
var e208 = m46["setISOWeekYear"];
var e209 = m46["setMilliseconds"];
var e2102 = m46["setMinutes"];
var e2112 = m46["setMonth"];
var e2122 = m46["setQuarter"];
var e2132 = m46["setSeconds"];
var e2142 = m46["setWeek"];
var e2152 = m46["setWeekYear"];
var e2162 = m46["setYear"];
var e2172 = m46["startOfDay"];
var e2182 = m46["startOfDecade"];
var e2192 = m46["startOfHour"];
var e2202 = m46["startOfISOWeek"];
var e2212 = m46["startOfISOWeekYear"];
var e2222 = m46["startOfMinute"];
var e2232 = m46["startOfMonth"];
var e2242 = m46["startOfQuarter"];
var e2252 = m46["startOfSecond"];
var e2262 = m46["startOfToday"];
var e2272 = m46["startOfTomorrow"];
var e2282 = m46["startOfWeek"];
var e2292 = m46["startOfWeekYear"];
var e2302 = m46["startOfYear"];
var e2312 = m46["startOfYesterday"];
var e2322 = m46["sub"];
var e2332 = m46["subBusinessDays"];
var e2342 = m46["subDays"];
var e2352 = m46["subHours"];
var e2362 = m46["subISOWeekYears"];
var e2372 = m46["subMilliseconds"];
var e2382 = m46["subMinutes"];
var e239 = m46["subMonths"];
var e240 = m46["subQuarters"];
var e241 = m46["subSeconds"];
var e2422 = m46["subWeeks"];
var e2432 = m46["subYears"];
var e2442 = m46["toDate"];
var e245 = m46["transpose"];
var e246 = m46["weeksToDays"];
var e247 = m46["yearsToDays"];
var e248 = m46["yearsToMonths"];
var e249 = m46["yearsToQuarters"];

// opengpui-shared:openui-datepicker-helpers
var m47 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-datepicker-helpers"];
var e040 = m47["formatDateRange"];
var e1100 = m47["formatSingleDate"];
var e250 = m47["getMonthName"];
var e326 = m47["getMonthNumber"];

// opengpui-shared:openui-rdp/classes/index.js
var m48 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/classes/index.js"];
var e041 = m48["CalendarDay"];
var e1101 = m48["CalendarMonth"];
var e251 = m48["CalendarWeek"];
var e327 = m48["DateLib"];
var e419 = m48["dateLib"];
var e517 = m48["defaultDateLib"];
var e610 = m48["defaultLocale"];

// opengpui-shared:openui-rdp/helpers/createGetModifiers.js
var m49 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/createGetModifiers.js"];
var e042 = m49["createGetModifiers"];

// opengpui-shared:openui-rdp/helpers/calculateFocusTarget.js
var m50 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/calculateFocusTarget.js"];
var e043 = m50["calculateFocusTarget"];

// opengpui-shared:openui-rdp/helpers/getDates.js
var m51 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getDates.js"];
var e044 = m51["getDates"];

// opengpui-shared:openui-rdp/helpers/getDisplayMonths.js
var m52 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getDisplayMonths.js"];
var e045 = m52["getDisplayMonths"];

// opengpui-shared:openui-rdp/helpers/getInitialMonth.js
var m53 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getInitialMonth.js"];
var e046 = m53["getInitialMonth"];

// opengpui-shared:openui-rdp/helpers/getMonthOptions.js
var m54 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getMonthOptions.js"];
var e047 = m54["getMonthOptions"];

// opengpui-shared:openui-rdp/helpers/getMonths.js
var m55 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getMonths.js"];
var e048 = m55["getMonths"];

// opengpui-shared:openui-rdp/helpers/getNavMonth.js
var m56 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getNavMonth.js"];
var e049 = m56["getNavMonths"];

// opengpui-shared:openui-rdp/helpers/getNextFocus.js
var m57 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getNextFocus.js"];
var e050 = m57["getNextFocus"];

// opengpui-shared:openui-rdp/helpers/getWeekdays.js
var m58 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getWeekdays.js"];
var e051 = m58["getWeekdays"];

// opengpui-shared:openui-rdp/helpers/getYearOptions.js
var m59 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/helpers/getYearOptions.js"];
var e052 = m59["getYearOptions"];

// opengpui-shared:openui-rdp/formatters/index.js
var m60 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/formatters/index.js"];
var e053 = m60["formatCaption"];
var e1103 = m60["formatDay"];
var e255 = m60["formatMonthCaption"];
var e328 = m60["formatMonthDropdown"];
var e420 = m60["formatWeekNumber"];
var e518 = m60["formatWeekNumberHeader"];
var e611 = m60["formatWeekdayName"];
var e710 = m60["formatYearCaption"];
var e810 = m60["formatYearDropdown"];

// opengpui-shared:openui-rdp/utils/addToRange.js
var m61 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/utils/addToRange.js"];
var e054 = m61["addToRange"];

// opengpui-shared:openui-rdp/utils/rangeIncludesDate.js
var m62 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-rdp/utils/rangeIncludesDate.js"];
var e055 = m62["isDateInRange"];
var e1104 = m62["rangeIncludesDate"];

// src/components/date-logic.ts
var dateLib = new e327;
function asDate(value) {
  if (value == null || value === "")
    return;
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date))
    return;
  const date = e2442(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function asRange(value) {
  if (value == null || typeof value !== "object" || value instanceof Date)
    return;
  const { from, to } = value;
  return { from: asDate(from), to: asDate(to) };
}
function hasSelectedDate(mode, date, range) {
  return mode === "single" ? !!date : !!(range && range.from && range.to);
}
function forValidation(value) {
  return value instanceof Date ? Number.isNaN(value.getTime()) ? undefined : value.toISOString() : value;
}
function selectSingle(selected, picked) {
  return selected && dateLib.isSameDay(picked, selected) ? undefined : picked;
}
function selectRange(selected, picked) {
  return e054(picked, selected, undefined, undefined, undefined, dateLib);
}
var DATE_PICKER_START_MONTH = new Date(1900, 0);
var DATE_PICKER_END_MONTH = new Date(2100, 11);
function dayPickerProps(today, startMonth, endMonth) {
  return { today, numberOfMonths: 1, captionLayout: "dropdown", startMonth, endMonth, showOutsideDays: false };
}
function initialMonth(today, startMonth, endMonth) {
  const props = dayPickerProps(today, startMonth, endMonth);
  const [navStart, navEnd] = e049(props, dateLib);
  return e046(props, navStart, navEnd, dateLib);
}
function weeksInMonth(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Math.ceil((first + days) / 7);
}
function goToMonth(date, startMonth, endMonth, today) {
  const [navStart, navEnd] = e049(dayPickerProps(today, startMonth, endMonth), dateLib);
  let month = dateLib.startOfMonth(date);
  if (navStart && month < dateLib.startOfMonth(navStart))
    month = dateLib.startOfMonth(navStart);
  if (navEnd && month > dateLib.startOfMonth(navEnd))
    month = dateLib.startOfMonth(navEnd);
  return month;
}
function withMonth(shown, month) {
  return dateLib.setMonth(dateLib.startOfMonth(shown), month);
}
function withYear(shown, year) {
  return dateLib.setYear(dateLib.startOfMonth(shown), year);
}
function buildCalendar(today, firstMonth, startMonth, endMonth) {
  const props = dayPickerProps(today, startMonth, endMonth);
  const [navStart, navEnd] = e049(props, dateLib);
  const displayMonths = e045(firstMonth, navEnd, props, dateLib);
  const dates = e044(displayMonths, dateLib.endOfMonth(endMonth), {}, dateLib);
  const months = e048(displayMonths, dates, {}, dateLib);
  const month = months[0];
  const days = months.flatMap((m) => m.weeks.flatMap((w) => w.days));
  const getModifiers = e042(days, props, navStart, navEnd, dateLib);
  return {
    today,
    month,
    navStart,
    navEnd,
    weekdays: e051(dateLib, undefined, undefined, today).map((d) => e611(d, dateLib.options, dateLib)),
    monthOptions: e047(month.date, navStart, navEnd, exports_formatters, dateLib) ?? [],
    yearOptions: e052(navStart, navEnd, exports_formatters, dateLib) ?? [],
    focusTarget(selected, mode, lastFocused) {
      return e043(days, getModifiers, (date) => isSelected(date, selected, mode), lastFocused);
    },
    flags(day, selected, mode) {
      const m = getModifiers(day);
      const flags = { today: !!m.today, hidden: !!m.hidden, selected: false, rangeStart: false, rangeMiddle: false, rangeEnd: false };
      flags.selected = isSelected(day.date, selected, mode);
      const range = mode === "range" ? selected : undefined;
      if (range) {
        const { from, to } = range;
        flags.rangeStart = Boolean(from && to && dateLib.isSameDay(day.date, from));
        flags.rangeEnd = Boolean(from && to && dateLib.isSameDay(day.date, to));
        flags.rangeMiddle = e1104(range, day.date, true, dateLib);
      }
      return flags;
    }
  };
}
function isSelected(date, selected, mode) {
  if (mode === "single")
    return !!selected && dateLib.isSameDay(selected, date);
  const range = selected;
  return !!range && e1104(range, date, false, dateLib);
}
function keyMove(key, shift) {
  switch (key) {
    case "left":
      return { by: shift ? "month" : "day", dir: "before" };
    case "right":
      return { by: shift ? "month" : "day", dir: "after" };
    case "down":
      return { by: shift ? "year" : "week", dir: "after" };
    case "up":
      return { by: shift ? "year" : "week", dir: "before" };
    case "pageup":
      return { by: shift ? "year" : "month", dir: "before" };
    case "pagedown":
      return { by: shift ? "year" : "month", dir: "after" };
    case "home":
      return { by: "startOfWeek", dir: "before" };
    case "end":
      return { by: "endOfWeek", dir: "after" };
    default:
      return null;
  }
}
function moveFocus(from, by, dir, navStart, navEnd) {
  return e050(by, dir, from, navStart, navEnd, {}, dateLib);
}
var dayKey = (date) => dateLib.format(date, "yyyy-MM-dd");

// src/components/calendar.ts
var KEY_CONTEXT = "OpenGPUICalendar";
var ENTER_ACTION = "opengpui-calendar-enter";
var SPACE_ACTION = "opengpui-calendar-space";
var pickKeysBound = false;
function bindPickKeys(ctx) {
  if (pickKeysBound)
    return;
  pickKeysBound = true;
  ctx.after((cx) => cx.bind_keys([
    { keystroke: "enter", action: ENTER_ACTION, context: KEY_CONTEXT },
    { keystroke: "space", action: SPACE_ACTION, context: KEY_CONTEXT }
  ]));
}
var DAY_SIZE = 40;
var CAPTION_HEIGHT = 34;
var CAPTION_GAP = 8;
var PADDING2 = 18;
var SIDE_OFFSET = 4;
var ITEM_HEIGHT = 32;
var GUTTER = 4;
var LIST_CHROME = 10;
var YEAR_COLUMNS = 3;
var YEAR_GAP = 4;
var YEAR_COLUMN_WIDTH = 56;
var YEAR_ALIGN_OFFSET = -75;
var fresh = (epoch) => ({
  epoch,
  month: null,
  focused: null,
  ring: false,
  open: null,
  monthScroll: 0,
  yearScroll: 0,
  monthTriggerWidth: 100
});
function revealOffset(index, count, rowStride, viewportHeight, contentHeight) {
  if (index <= 0)
    return 0;
  if (index >= count - 1)
    return Math.max(0, contentHeight - viewportHeight);
  const bottom = GUTTER + index * rowStride + ITEM_HEIGHT;
  return Math.max(0, bottom - viewportHeight);
}
function calendarView(ctx, part, o) {
  const t = ctx.t;
  const state = ctx.local(fresh(o.epoch), part);
  if (state.epoch !== o.epoch)
    Object.assign(state, fresh(o.epoch));
  const today = dateLib.today();
  if (!state.month)
    state.month = initialMonth(today, o.startMonth, o.endMonth);
  const model = buildCalendar(today, state.month, o.startMonth, o.endMonth);
  const displayed = model.month.date;
  const selected = o.selected;
  const id = (suffix) => ctx.id(`${part}-${suffix}`);
  const target = model.focusTarget(selected, o.mode);
  const focusedDay = state.focused ? model.month.weeks.flatMap((w) => w.days).find((d) => dayKey(d.date) === state.focused && !d.outside) : undefined;
  const goTo = (date) => {
    state.month = goToMonth(date, o.startMonth, o.endMonth, dateLib.today());
  };
  const pick = (date, cx) => {
    o.onSelect(o.mode === "single" ? selectSingle(selected, date) : selectRange(selected, date), cx);
  };
  const monthsHeight = CAPTION_HEIGHT + CAPTION_GAP + DAY_SIZE * (1 + model.month.weeks.length);
  const listHeight = monthsHeight - 45;
  const monthContentHeight = 2 * GUTTER + model.monthOptions.length * ITEM_HEIGHT;
  const monthListHeight = Math.min(listHeight, monthContentHeight + LIST_CHROME);
  const monthViewport = monthListHeight - LIST_CHROME;
  const yearRows = Math.ceil(model.yearOptions.length / YEAR_COLUMNS);
  const yearContentHeight = 2 * GUTTER + yearRows * ITEM_HEIGHT + (yearRows - 1) * YEAR_GAP;
  const yearViewport = listHeight - LIST_CHROME;
  const shownYearRow = Math.floor(Math.max(0, model.yearOptions.findIndex((y) => y.value === displayed.getFullYear())) / YEAR_COLUMNS);
  const trigger = (key, label) => {
    const open = state.open === key;
    return textStyle(div30().id(id(`${key}-trigger`)).flex().flex_row().flex_none().items_center().gap(t.space2xs).py(t.spaceXs).px(t.spaceS).border_1().border_color("#00000000").rounded(t.radiusS).text_color(t.textNeutralPrimary).cursor_pointer().when(open, (el) => el.bg(t.highlightSubtle).border_color(t.borderInteractive)).hover((s) => s.bg(t.highlightSubtle).border_color(t.borderInteractive)).when(key === "month", (el) => el.on_size_change((size, cx) => {
      if (Math.abs(size.width - state.monthTriggerWidth) > 0.5) {
        state.monthTriggerWidth = size.width;
        cx.notify();
      }
    })).on_click((_e, cx) => {
      cx.stop_propagation();
      if (open) {
        state.open = null;
      } else {
        state.open = key;
        if (key === "month")
          state.monthScroll = revealOffset(displayed.getMonth(), 12, ITEM_HEIGHT, monthViewport, monthContentHeight);
        else
          state.yearScroll = revealOffset(shownYearRow, yearRows, ITEM_HEIGHT + YEAR_GAP, yearViewport, yearContentHeight);
      }
      cx.notify();
    }), typography(t, "label", "default")).child(label).children(optional(ctx.icon(open ? "ChevronUp" : "ChevronDown", { size: 16 })));
  };
  const weekdayStyle = typography(t, "label", "small");
  const dayStyle = typography(t, "label", "default");
  const weekdays = div30().flex().flex_row().children(model.weekdays.map((w) => textStyle(div30().w(DAY_SIZE).h(DAY_SIZE).flex_none().flex().items_center().justify_center().text_color(t.textNeutralSecondary), weekdayStyle).child(w)));
  const dayCell = (day) => {
    const flags = model.flags(day, selected, o.mode);
    let cell = div30().w(DAY_SIZE).h(DAY_SIZE).flex_none().text_color(t.textNeutralPrimary);
    if (o.mode === "single") {
      if (flags.selected)
        cell = cell.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).rounded(t.radiusM);
    } else {
      if (flags.rangeMiddle)
        cell = cell.bg(t.highlight);
      if (flags.rangeStart)
        cell = cell.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).rounded_l(t.radiusM);
      if (flags.rangeEnd)
        cell = cell.bg(t.interactiveAccentDefault).text_color(t.textAccentPrimary).rounded_r(t.radiusM);
    }
    if (flags.today && !flags.selected)
      cell = cell.bg(t.sunk).rounded(t.radiusM);
    if (flags.hidden)
      return cell;
    const focused = state.ring && focusedDay !== undefined && focusedDay.isEqualTo(day);
    const button = textStyle(div30().id(id(`day-${day.isoDate}`)).size_full().relative().flex().items_center().justify_center().border_1().border_color("#00000000").rounded(t.radiusM).cursor_pointer().hover((s) => s.bg(t.highlightSubtle)).on_click((_e, cx) => {
      cx.stop_propagation();
      state.focused = dayKey(day.date);
      state.ring = false;
      pick(day.date, cx);
      cx.notify();
    }), dayStyle).child(String(day.date.getDate()));
    const ring = 2 + t.space3xs;
    return cell.child(focused ? button.child(div30().absolute().top(-ring - 1).left(-ring - 1).size(DAY_SIZE + 2 * ring).border_2().border_color(t.borderAccent).rounded(t.radiusM + ring)) : button);
  };
  const weeks = model.month.weeks.map((week) => div30().flex().flex_row().children(week.days.map(dayCell)));
  const listSurface = (key, width, height, scroll, viewport, content, rows) => {
    const max = Math.max(0, content - viewport);
    const offset = Math.min(Math.max(0, state[scroll]), max);
    return shadow(div30().id(id(`${key}-list`)).absolute().w(width).h(height).bg(t.foreground).border_1().border_color(t.borderInteractive).rounded(t.radiusXl).p(GUTTER).overflow_hidden().text_color(t.textNeutralPrimary).on_scroll_wheel((e, cx) => {
      if (e.delta.y === 0)
        return;
      cx.stop_propagation();
      state[scroll] = Math.min(Math.max(0, offset - e.delta.y), max);
      cx.notify();
    }).child(div30().h(viewport).overflow_hidden().child(div30().relative().top(-offset).flex().flex_col().children(rows))), t.shadowM, t.foreground);
  };
  const monthList = () => {
    const items = model.monthOptions.map((opt) => {
      const checked = opt.value === displayed.getMonth();
      const icon = checked ? ctx.icon("Check", { size: 16 }) : null;
      return div30().id(id(`month-${opt.value}`)).relative().flex().flex_row().items_center().flex_none().h(ITEM_HEIGHT).pl(t.spaceML).pr(t.spaceXl).when(checked, (el) => el.bg(t.highlight)).when(opt.disabled, (el) => el.opacity(0.5)).when(!opt.disabled, (el) => el.cursor_pointer().hover((s) => s.bg(t.highlight)).on_click((_e, cx) => {
        cx.stop_propagation();
        goTo(withMonth(displayed, opt.value));
        state.open = null;
        cx.notify();
      })).child(textStyle(div30().flex_1().text_color(t.textNeutralPrimary), typography(t, "body", "default")).child(opt.label)).children(icon ? [div30().absolute().right(8).top((ITEM_HEIGHT - 14) / 2).w(14).h(14).child(icon)] : []);
    });
    const rows = [div30().h(GUTTER).flex_none(), ...items, div30().h(GUTTER).flex_none()];
    return listSurface("month", 280, monthListHeight, "monthScroll", monthViewport, monthContentHeight, rows).left(PADDING2).top(PADDING2 + CAPTION_HEIGHT + SIDE_OFFSET);
  };
  const yearList = () => {
    const width = YEAR_COLUMNS * YEAR_COLUMN_WIDTH + (YEAR_COLUMNS - 1) * YEAR_GAP + LIST_CHROME;
    const years = model.yearOptions;
    const rows = [div30().h(GUTTER).flex_none()];
    for (let r = 0;r < yearRows; r++) {
      rows.push(div30().flex().flex_row().flex_none().gap(YEAR_GAP).h(ITEM_HEIGHT).when(r < yearRows - 1, (el) => el.mb(YEAR_GAP)).children(years.slice(r * YEAR_COLUMNS, (r + 1) * YEAR_COLUMNS).map((opt) => {
        const checked = opt.value === displayed.getFullYear();
        const item = textStyle(div30().id(id(`year-${opt.value}`)).flex().items_center().justify_center().h(ITEM_HEIGHT).px(t.spaceS).rounded(t.radiusS).text_color(t.textNeutralPrimary).when(checked, (el) => el.bg(t.highlight)).cursor_pointer().hover((s) => s.bg(t.highlight)).on_click((_e, cx) => {
          cx.stop_propagation();
          goTo(withYear(displayed, opt.value));
          state.open = null;
          cx.notify();
        }), typography(t, "body", "default")).child(opt.label);
        return div30().w(YEAR_COLUMN_WIDTH).h(ITEM_HEIGHT).flex_none().flex().items_center().justify_center().child(item);
      })));
    }
    rows.push(div30().h(GUTTER).flex_none());
    const left = Math.max(0, Math.min(PADDING2 + state.monthTriggerWidth + YEAR_ALIGN_OFFSET, 2 * PADDING2 + 7 * DAY_SIZE - width));
    return listSurface("year", width, listHeight, "yearScroll", yearViewport, yearContentHeight, rows).left(left).top(PADDING2 + CAPTION_HEIGHT + SIDE_OFFSET);
  };
  const content = div30().flex().flex_col().p(PADDING2).child(div30().flex().flex_row().items_center().h(CAPTION_HEIGHT).mb(CAPTION_GAP).child(trigger("month", model.monthOptions[displayed.getMonth()]?.label ?? "")).child(trigger("year", String(displayed.getFullYear())))).child(weekdays).children(weeks);
  const catcher = div30().id(id("catcher")).absolute().top(0).left(0).size_full().on_click((_e, cx) => {
    cx.stop_propagation();
    state.open = null;
    cx.notify();
  });
  let panel = textStyle(div30().id(id("panel")).relative().w(2 * PADDING2 + 7 * DAY_SIZE).text_color(t.textNeutralPrimary).overflow_hidden(), typography(t, "body", "default")).child(content).when(state.open !== null, (el) => el.child(catcher).child(state.open === "month" ? monthList() : yearList()));
  if (o.focus) {
    panel = panel.track_focus(o.focus).key_context(KEY_CONTEXT).on_action(ENTER_ACTION, (_e, cx) => {
      if (!focusedDay)
        return cx.propagate();
      cx.stop_propagation();
      state.ring = true;
      if (o.onEnter)
        o.onEnter(cx);
      else
        pick(focusedDay.date, cx);
      cx.notify();
    }).on_action(SPACE_ACTION, (_e, cx) => {
      if (!focusedDay)
        return cx.propagate();
      cx.stop_propagation();
      state.ring = true;
      pick(focusedDay.date, cx);
      cx.notify();
    }).on_key_down((e, cx) => {
      state.ring = true;
      const move = keyMove(e.key, e.modifiers.shift);
      if (!move)
        return;
      cx.stop_propagation();
      if (!focusedDay) {
        if (target)
          state.focused = dayKey(target.date);
      } else {
        const next = moveFocus(focusedDay, move.by, move.dir, model.navStart, model.navEnd);
        if (next) {
          state.focused = dayKey(next.date);
          if (!dateLib.isSameMonth(next.date, displayed))
            goTo(next.date);
        }
      }
      cx.notify();
    });
    bindPickKeys(ctx);
  }
  return div30().when(o.framed, (el) => el.bg(t.foreground).border_1().border_color(t.borderInteractive).rounded(t.radius3xl).overflow_hidden()).child(panel);
}

// src/components/datepicker.ts
var calendarHeight = (weeks) => 120 + 40 * weeks;
var MENU_OFFSET = 5;
function datePickerControl(ctx, o) {
  const t = ctx.t;
  const part = o.part ?? "";
  const id = (name) => ctx.id(part ? `${name}:${part}` : name);
  const { mode, single, range } = o;
  const state = ctx.local({ open: false, epoch: 0, field: null, side: null, height: 0 }, part ? `picker:${part}` : "");
  let focusCalendar = false;
  if (o.open !== undefined && o.open !== state.open) {
    if (o.open) {
      state.epoch += 1;
      focusCalendar = true;
    }
    state.open = o.open;
  }
  const focus = o.inert ? null : ctx.retained(id("focus"), { kind: "focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
  if (focusCalendar && focus)
    ctx.after(() => focus.focus());
  if (!state.open) {
    state.side = null;
    state.height = 0;
  } else {
    const pane = ctx.pane;
    const field = state.field;
    state.side = "below";
    if (pane && field) {
      const height = state.height || calendarHeight(weeksInMonth(initialMonth(new Date, DATE_PICKER_START_MONTH, DATE_PICKER_END_MONTH)));
      const below = pane.bottom - field.bottom;
      if (below < height + MENU_OFFSET && field.top - pane.top > below)
        state.side = "above";
    }
  }
  const selected = mode === "single" ? single : range;
  const hasValue = hasSelectedDate(mode, single, range);
  const chevron = ctx.icon(state.open ? "ChevronUp" : "ChevronDown", { size: 16 });
  const input = shadow(textStyle(div31().id(id("input")).flex().flex_row().items_center().justify_between().w_full().border_1().border_color(state.open ? t.borderInteractive : t.borderDefault).rounded(t.radiusM).bg(t.sunk).px(t.spaceM).py(t.spaceS).text_color(hasValue ? t.textNeutralPrimary : t.textNeutralSecondary).cursor_pointer().when(!state.open, (el) => el.hover((s) => s.border_color(t.borderInteractive))).when(!!o.onFieldHover, (el) => el.on_hover((hovered, cx) => o.onFieldHover(hovered, cx))).on_mouse_down("left", (e) => {
    if (!e.bounds || !e.local_position)
      return;
    const top = e.position.y - e.local_position.y;
    state.field = { top, bottom: top + e.bounds.height };
  }), typography(t, "body", "default")).child(div31().min_w_0().overflow_hidden().whitespace_nowrap().child(mode === "single" ? e1100(single) : e040(range))).children(optional(chevron)), t.shadowS, t.sunk);
  if (o.inert)
    return div31().w_full().child(input);
  const above = state.side === "above";
  const menu = () => (above ? div31().pb(MENU_OFFSET) : div31().pt(MENU_OFFSET)).child(shadow(div31().bg(t.foreground).border_1().border_color(t.borderInteractive).rounded(t.radius2xl).overflow_hidden().on_size_change((size, cx) => {
    if (state.height !== size.height) {
      state.height = size.height;
      cx.notify();
    }
  }), t.shadowS, t.foreground).child(calendarView(ctx, `cal${part}`, {
    mode,
    selected,
    onSelect: (next, cx) => {
      o.onSelect(next, cx);
      cx.notify();
    },
    startMonth: DATE_PICKER_START_MONTH,
    endMonth: DATE_PICKER_END_MONTH,
    framed: false,
    epoch: state.epoch,
    focus,
    onEnter: o.onEnter
  })));
  const popover = Popover.new(id("popover")).open(state.open).on_open_change((open, cx) => {
    if (o.onOpenChange) {
      o.onOpenChange(open, cx);
      cx.notify();
      if (o.open !== undefined)
        return;
    }
    if (open && !state.open)
      state.epoch += 1;
    state.open = open;
    cx.notify();
  }).trigger(input).when(state.open, (el) => el.content(menu())).when(above, (el) => el.anchor("bottom_left"));
  return div31().w_full().child(focus ? popover.track_focus(focus) : popover);
}
var DatePicker = {
  render(props, ctx) {
    const session = ctx.session;
    const name = String(props.name ?? "");
    const formName = ctx.formName;
    const mode = props.mode === "range" ? "range" : "single";
    const field = ctx.field(name, props.value);
    const rules = e34(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) {
      form.registerField(name, rules, () => forValidation(session.stateField(formName, name, props.value).value));
    }
    const onSelect = (next) => {
      field.setValue(next);
      if (rules.length)
        form?.validateField(name, forValidation(next), rules);
    };
    return datePickerControl(ctx, {
      mode,
      single: mode === "single" ? asDate(field.value) : undefined,
      range: mode === "range" ? asRange(field.value) : undefined,
      onSelect
    });
  }
};

// src/components/disclosure.ts
import { Accordion as BaseAccordion, AccordionHeader, AccordionItem as BaseAccordionItem, AccordionPanel, AccordionTrigger, Tab } from "gpui-base";
import { div as div32 } from "gpui-kit";

// src/components/disclosure-state.ts
function contentSize(content) {
  try {
    return JSON.stringify(content)?.length ?? 0;
  } catch {
    return 0;
  }
}
function syncActive(state, items) {
  const first = items[0];
  if (items.length && !state.active && first)
    state.active = String(first.props.value);
  if (state.interacted)
    return;
  let candidate = null;
  const next = {};
  for (const item of items) {
    const value = String(item.props.value);
    const size = contentSize(item.props.content);
    next[value] = size;
    if (size > (state.sizes[value] ?? 0))
      candidate = value;
  }
  state.sizes = next;
  if (candidate && candidate !== state.active)
    state.active = candidate;
}
function autoOpen(state, items) {
  if (!state.interacted && items.length > state.prevCount) {
    const newest = items[items.length - 1];
    if (newest)
      state.open = String(newest.props.value);
  }
  state.prevCount = items.length;
}
function toggled(open, value) {
  return open === value ? "" : value;
}

// src/components/disclosure.ts
var accordionHeader = (trigger) => AccordionHeader.new(trigger);
var asArray3 = (v) => Array.isArray(v) ? v : v == null ? [] : [v];
var clamp2 = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
function keyTrigger(id, toggle) {
  return div32().id(`${id}:key`).w_full().tab_index(0).on_key_down((e, cx) => {
    if (e.key !== "enter" && e.key !== "space" && e.key !== " ")
      return;
    cx.stop_propagation();
    toggle(cx);
  });
}
var TabItem = {
  render() {
    return null;
  }
};
var AccordionItem = TabItem;
var StepsItem = TabItem;
var TAB_SLIDE = { duration: 250, easing: "ease-in-out" };
var TAB_SCROLL_STEP = 120;
var Tabs = {
  render(props, ctx) {
    const t = ctx.t;
    const items = (Array.isArray(props.items) ? props.items : []).filter((item) => item?.props?.value != null);
    const local = ctx.local({ active: "", interacted: false, sizes: {}, widths: {}, viewport: 0, offset: 0, smooth: false });
    syncActive(local, items);
    if (!items.length)
      return null;
    const gap = t.spaceL;
    const widths = items.map((_, i) => local.widths[i]);
    const measured = local.viewport > 0;
    const lefts = [];
    let total = 0;
    widths.forEach((w, i) => {
      lefts.push(total);
      total += (w ?? 0) + (i < widths.length - 1 ? gap : 0);
    });
    const maxOffset = measured ? Math.max(0, total - local.viewport) : 0;
    const offset = clamp2(local.offset, 0, maxOffset);
    const scrollTo = (next, cx) => {
      local.offset = clamp2(next, 0, maxOffset);
      local.smooth = true;
      cx.notify();
    };
    const trigger = (item, i) => {
      const value = String(item.props.value);
      const active = value === local.active;
      let el = Tab.new(ctx.id(`tab-${i}`)).selected(active).flex().flex_row().flex_none().items_center().justify_center().gap(t.spaceS).py(t.spaceS).cursor_pointer().text_color(active ? t.textNeutralPrimary : t.textNeutralSecondary);
      el = textStyle(el, typography(t, "label", active ? "heavy" : "default"));
      if (!active)
        el = el.hover((s) => s.text_color(t.textNeutralPrimary));
      const tab = el.on_click((_e, cx) => {
        local.interacted = true;
        local.active = value;
        const w = local.widths[i];
        if (measured && w !== undefined)
          scrollTo(lefts[i] - local.viewport / 2 + w / 2, cx);
        else
          cx.notify();
      }).child(div32().flex().flex_col().items_center().gap(t.space3xs).min_w(0).child(div32().max_w(232).overflow_hidden().whitespace_nowrap().text_ellipsis().child(String(item.props.trigger ?? ""))));
      return div32().id(ctx.id(`tab-box-${i}`)).flex().flex_none().on_size_change((size, cx) => {
        if (local.widths[i] !== size.width) {
          local.widths[i] = size.width;
          cx.notify();
        }
      }).child(tab);
    };
    const active = items.findIndex((item) => String(item.props.value) === local.active);
    const row = div32().id(ctx.id("row")).relative().flex().flex_row().flex_none().gap(gap).when(maxOffset > 0, (el) => el.left(-offset)).when(local.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" })).children(items.map(trigger)).when(widths[active] !== undefined && active >= 0, (el) => el.child(div32().id(ctx.id("indicator")).absolute().bottom(0).left(lefts[active]).w(widths[active]).h(1.5).bg(t.borderInteractiveSelected).transition("left", TAB_SLIDE).transition("width", TAB_SLIDE)));
    const viewport = div32().id(ctx.id("list")).flex().flex_row().flex_1().min_w(0).overflow_hidden().on_size_change((size, cx) => {
      if (local.viewport !== size.width) {
        local.viewport = size.width;
        cx.notify();
      }
    }).when(maxOffset > 0, (el) => el.on_scroll_wheel((e, cx) => {
      const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
      if (dx === 0)
        return;
      cx.stop_propagation();
      local.offset = clamp2(local.offset - dx, 0, maxOffset);
      local.smooth = false;
      cx.notify();
    })).child(row);
    const scrollButton = (side) => {
      const canGo = side === "left" ? offset > 0 : offset < maxOffset - 1;
      if (!canGo)
        return null;
      return div32().absolute().top(0).h_full().flex().items_center().justify_center().bg(t.foreground).when(side === "left", (el) => el.left(0).pr(4)).when(side === "right", (el) => el.right(0).pl(4)).child(iconButton(ctx, {
        id: ctx.id(`scroll-${side}`),
        icon: side === "left" ? "ChevronLeft" : "ChevronRight",
        size: "small",
        variant: "secondary",
        surface: t.foreground,
        onClick: (cx) => scrollTo(offset + (side === "left" ? -TAB_SCROLL_STEP : TAB_SCROLL_STEP), cx)
      }));
    };
    const container = div32().id(ctx.id("list-container")).relative().flex().flex_row().items_center().overflow_hidden().child(div32().absolute().bottom(0).left(0).right(0).h(1).bg(t.borderDefault)).child(viewport).children([scrollButton("left"), scrollButton("right")].flatMap(optional));
    const current = active >= 0 ? items[active] : null;
    const content = current ? textStyle(div32().id(ctx.id("content")).flex().flex_col().py(t.space3xs), typography(t, "body", "default")).child(div32().flex().flex_col().gap(t.spaceL).children(ctx.children(asArray3(current.props.content), `tab-${String(current.props.value)}`))) : null;
    return div32().id(ctx.id()).flex().flex_col().gap(t.spaceL).child(container).children(optional(content));
  }
};
var ACCORDION_SLIDE = { duration: 300, easing: "ease-in-out" };
var Accordion = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray3(props.items);
    const local = ctx.local({
      open: "",
      interacted: false,
      prevCount: 0,
      heights: {},
      mounted: {},
      initiallyOpen: {},
      wasOpen: {},
      sliding: {},
      gen: {}
    });
    autoOpen(local, items);
    if (!items.length)
      return null;
    const rows = items.map((item, i) => {
      const value = String(item.props.value);
      const open = local.open === value;
      if (local.initiallyOpen[value] === undefined) {
        local.initiallyOpen[value] = open;
        local.wasOpen[value] = open;
        if (open)
          local.mounted[value] = true;
      } else if (local.wasOpen[value] !== open) {
        local.wasOpen[value] = open;
        const gen = local.gen[value] = (local.gen[value] ?? 0) + 1;
        local.sliding[value] = true;
        if (open)
          local.mounted[value] = true;
        ctx.after((cx) => {
          cx.timer.after(ACCORDION_SLIDE.duration, (cx) => {
            if (local.gen[value] !== gen)
              return;
            local.sliding[value] = false;
            if (local.open !== value) {
              local.mounted[value] = false;
              delete local.heights[value];
            }
            cx.notify();
          });
        });
      }
      const mounted = local.mounted[value] === true;
      const first = i === 0;
      const last = i === items.length - 1;
      const toggle = (cx) => {
        local.interacted = true;
        local.open = toggled(local.open, value);
        cx.notify();
      };
      const trigger = textStyle(AccordionTrigger.new(ctx.id(`trigger-${i}`)).flex().flex_row().items_center().justify_between().w_full().text_center().text_color(t.textNeutralPrimary).pt(first ? 0 : t.spaceL).pb(t.spaceL).cursor_pointer().on_change((_open, cx) => toggle(cx)), typography(t, "body", "default")).child(keyTrigger(ctx.id(`trigger-${i}`), toggle).flex().flex_row().items_center().justify_between().child(div32().min_w(0).text_color(t.textNeutralPrimary).child(String(item.props.trigger ?? ""))).children(optional(ctx.icon(open ? "ChevronUp" : "ChevronDown", { size: 16 }))));
      const sliding = local.sliding[value] === true;
      const measured = local.heights[value];
      const height = !open ? 0 : measured ?? (sliding ? 0 : undefined);
      const panel = div32().id(ctx.id(`panel-${i}`)).overflow_hidden().when(height !== undefined, (el) => el.h(height)).when(sliding, (el) => el.transition("height", ACCORDION_SLIDE)).child(textStyle(div32().id(ctx.id(`panel-inner-${i}`)).flex().flex_col().flex_none().w_full().gap(t.spaceM).pb(t.spaceL).text_color(t.textNeutralPrimary).on_size_change((size, cx) => {
        if (local.heights[value] !== size.height) {
          local.heights[value] = size.height;
          cx.notify();
        }
      }), typography(t, "body", "default")).children(mounted ? ctx.children(asArray3(item.props.content), `item-${value}`) : []));
      return BaseAccordionItem.new().open(mounted).flex().flex_col().overflow_hidden().border_b_1().border_color(last ? TRANSPARENT : t.borderDefault).header(accordionHeader(trigger).flex()).panel(AccordionPanel.new().child(mounted ? panel : div32()));
    });
    return BaseAccordion.new(ctx.id()).flex().flex_col().border_1().border_color(TRANSPARENT).children(rows);
  }
};
var Steps = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray3(props.items);
    const list = items.map((item, i) => {
      const last = i === items.length - 1;
      const details = item.props.details;
      const body = typeof details === "string" ? [ctx.piece(`step${i}`, details, (o, text) => markdownBlock(o, `step${i}`, text, { profile: "plain" }).w_auto())] : ctx.children(details, `step${i}`);
      const connector = div32().flex().flex_col().items_center().child(div32().flex().items_center().justify_center().py(t.space2xs).child(textStyle(div32().flex().items_center().justify_center().w(24).h(24).rounded(12).bg(t.elevated).text_color(t.textNeutralSecondary).border_1().border_color(t.borderDefault), typography(t, "label", "small")).child(String(i + 1)))).when(!last, (el) => el.child(div32().w(1).flex_1().bg(t.sunk)));
      const content = div32().flex().flex_col().min_w_0().gap(t.space3xs).pt(t.space2xs).mb(last ? 0 : t.spaceL).child(div32().text_color(t.textNeutralSecondary).child(String(item.props.title ?? ""))).child(textStyle(div32().flex().flex_col().items_center().gap(t.spaceM + 2), typography(t, "body", "default")).children(body));
      return div32().id(ctx.id(`step-${i}`)).flex().flex_row().gap(t.spaceM).child(connector).child(content);
    });
    return div32().id(ctx.id()).w_full().min_w(280).flex().flex_col().children(list);
  }
};

// src/components/diagram.ts
import { div as div34, PathBuilder as PathBuilder10 } from "gpui-kit";

// src/diagram/types.ts
var NODE_KINDS = ["actor", "process", "module", "file", "store", "external", "decision", "start", "end", "event", "task", "service", "queue", "ui"];
var EDGE_STYLES = ["solid", "dashed"];
var EDGE_HEADS = ["arrow", "none", "triangle", "diamond"];
var FIELD_KEYS = ["pk", "fk"];

// src/diagram/model.ts
var text2 = (v) => typeof v === "string" ? v : undefined;
var elements = (v, typeName) => Array.isArray(v) ? v.filter((x) => e24(x) && x.typeName === typeName) : [];
var oneOf = (values, v, fallback) => values.includes(v) ? v : fallback;
var isBox = (v) => e24(v) && (v.typeName === "Node" || v.typeName === "Entity");
function fields(v) {
  return elements(v, "Field").flatMap((el) => {
    const name = text2(el.props.name);
    if (name === undefined)
      return [];
    const type = text2(el.props.type);
    const key = FIELD_KEYS.includes(el.props.key) ? el.props.key : undefined;
    return [{ name, ...type ? { type } : {}, ...key ? { key } : {} }];
  });
}
function diagramModel(props, streaming) {
  const nodes = [];
  const groups = [];
  const addNode = (el, group) => {
    const id = text2(el.props.id);
    if (!id)
      return;
    const sub = text2(el.props.sub);
    const action = el.props.action;
    nodes.push({
      id,
      label: text2(el.props.label) ?? "",
      kind: oneOf(NODE_KINDS, el.props.kind, "process"),
      ...sub ? { sub } : {},
      ...group !== undefined ? { group } : {},
      ...action != null ? { action } : {},
      ...el.typeName === "Entity" ? { fields: fields(el.props.fields) } : {}
    });
  };
  for (const item of Array.isArray(props.nodes) ? props.nodes.filter(e24) : []) {
    if (item.typeName === "Node" || item.typeName === "Entity")
      addNode(item);
    else if (item.typeName === "Group") {
      const id = text2(item.props.id);
      if (!id)
        continue;
      groups.push({ id, label: text2(item.props.label) ?? "" });
      for (const node of Array.isArray(item.props.nodes) ? item.props.nodes.filter(isBox) : [])
        addNode(node, id);
    }
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = [];
  for (const el of elements(props.edges, "Edge")) {
    const from = text2(el.props.from);
    const to = text2(el.props.to);
    if (from === undefined || to === undefined)
      continue;
    if (streaming && !(nodeIds.has(from) && nodeIds.has(to)))
      continue;
    const label = text2(el.props.label);
    const style = oneOf(EDGE_STYLES, el.props.style, "solid");
    const head = oneOf(EDGE_HEADS, el.props.head, "arrow");
    edges.push({ id: `${from}>${to}`, from, to, ...label ? { label } : {}, style, head });
  }
  return { nodes, groups, edges, steps: diagramSteps(props.steps, streaming), direction: props.direction === "right" ? "right" : "down" };
}
function diagramSteps(value, streaming) {
  const stepEls = elements(value, "DiagramStep");
  const cut = new Set;
  if (streaming) {
    const lastInline = stepEls.findLast((s) => s.partial && !s.statementId);
    const lastStatement = stepEls.findLast((s) => s.partial && !!s.statementId);
    if (lastInline)
      cut.add(lastInline);
    if (lastStatement)
      cut.add(lastStatement);
  }
  return stepEls.map((el) => {
    const action = el.props.action;
    return {
      title: text2(el.props.title) ?? "",
      details: text2(el.props.details) ?? "",
      highlight: Array.isArray(el.props.highlight) ? el.props.highlight.filter((h) => typeof h === "string") : [],
      ...action != null ? { action } : {},
      complete: !cut.has(el)
    };
  });
}

// src/components/diagram/canvas.ts
import { div as div33 } from "gpui-kit";
var DIMMED = 0.35;
var PAD = 16;
var ZOOM_MIN = 0.25;
var ZOOM_MAX = 2;
var ZOOM_STEP = 1.25;
var DRAG_SLOP = 4;
var MAX_VIEW_SHARE = 0.7;
var FALLBACK_PANE_H = 800;
var MIN_FIT_SHARE = 0.75;
var KEY_PAN = 40;
var scaled = (s, z) => ({ ...s, size: s.size * z });
var camera = () => ({ zoom: null, panX: 0, panY: 0, width: 0, height: 0 });
function canvasState(ctx, stepCount) {
  const state = ctx.local({ inline: camera(), full: camera(), step: null, hover: null, drag: null, moved: false, expanded: false }, "canvas");
  if (state.step !== null && state.step >= stepCount)
    state.step = null;
  return state;
}
function pointable(el, state, id, onClick) {
  return el.cursor_pointer().on_hover((hovered, cx) => {
    const next = hovered ? id : state.hover === id ? null : state.hover;
    if (next === state.hover)
      return;
    state.hover = next;
    cx.notify();
  }).on_click((_e, cx) => {
    state.drag = null;
    if (state.moved)
      return;
    cx.stop_propagation();
    onClick();
  });
}
function stepQuestion(ctx, statementId, steps, i) {
  const step = steps[i];
  if (!step)
    return;
  const message = `Tell me more about step ${i + 1}: ${step.title}`;
  ctx.trigger(message, step.action ?? { steps: [{ type: e0.ToAssistant, message, context: { diagram: statementId, step: i + 1, highlight: step.highlight } }] });
}
function fitScale(cam, size, expanded) {
  const byWidth = Math.min(1, Math.max(0.01, cam.width - PAD * 2) / Math.max(1, size.width));
  const byHeight = Math.max(0.01, cam.height - PAD * 2) / Math.max(1, size.height);
  if (expanded)
    return Math.min(byWidth, byHeight);
  return byHeight >= byWidth ? byWidth : Math.max(byHeight, byWidth * MIN_FIT_SHARE);
}
function clampPan(pan, view, content) {
  const lo = Math.min(PAD, view - content - PAD);
  const hi = Math.max(PAD, view - content - PAD);
  return Math.min(hi, Math.max(lo, pan));
}
function viewOf(cam, size, expanded) {
  if (cam.zoom === null) {
    const z = fitScale(cam, size, expanded);
    const w = size.width * z;
    const h = size.height * z;
    return { z, panX: (cam.width - w) / 2, panY: expanded ? (cam.height - h) / 2 : PAD };
  }
  const z = cam.zoom;
  return {
    z,
    panX: clampPan(cam.panX, cam.width, size.width * z),
    panY: clampPan(cam.panY, cam.height, size.height * z)
  };
}
function freeze(cam, size, expanded) {
  const v = viewOf(cam, size, expanded);
  cam.zoom = v.z;
  cam.panX = v.panX;
  cam.panY = v.panY;
  return v;
}
function zoomAt(cam, size, expanded, factor, px, py) {
  const v = freeze(cam, size, expanded);
  const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.z * factor));
  cam.panX = px - (px - v.panX) * z / v.z;
  cam.panY = py - (py - v.panY) * z / v.z;
  cam.zoom = z;
}
function reveal(cam, size, box, expanded) {
  if (!box || cam.width <= 0)
    return;
  const v = viewOf(cam, size, expanded);
  const { x0, y0, x1, y1 } = box;
  const inView = v.panX + x0 * v.z >= 0 && v.panX + x1 * v.z <= cam.width && v.panY + y0 * v.z >= 0 && v.panY + y1 * v.z <= cam.height;
  if (inView)
    return;
  freeze(cam, size, expanded);
  cam.panX = cam.width / 2 - (x0 + x1) / 2 * v.z;
  cam.panY = cam.height / 2 - (y0 + y1) / 2 * v.z;
}
function controls(o, c, cam, expanded, wake) {
  const { content } = c;
  const act = (fn) => (cx) => {
    fn();
    cx.notify();
    wake();
  };
  const zoomBy = (f) => act(() => zoomAt(cam, content, expanded, f, cam.width / 2, cam.height / 2));
  const small = (id, icon, onClick) => iconButton(o, { id: o.id(id), icon, variant: "tertiary", size: "2-extra-small", onClick });
  return div33().absolute().top(8).right(8).flex().flex_row().gap(2).p(2).rounded(o.t.radiusM).bg(o.t.foreground).border_1().border_color(o.t.borderDefault).child(small(expanded ? "full-out" : "in-out", "Minus", zoomBy(1 / ZOOM_STEP))).child(small(expanded ? "full-in" : "in-in", "Plus", zoomBy(ZOOM_STEP))).child(small(expanded ? "full-fit" : "in-fit", "Scan", act(() => cam.zoom = null))).child(small(expanded ? "full-close" : "in-expand", expanded ? "Minimize2" : "Maximize2", act(() => {
    c.state.expanded = !expanded;
    c.state.full = camera();
  })));
}
function viewport(o, c, expanded, focus, wake) {
  const t = o.t;
  const { state, content } = c;
  const cam = expanded ? state.full : state.inline;
  const v = cam.width > 0 && (!expanded || cam.height > 0) ? viewOf(cam, content, expanded) : null;
  const redraw = (cx) => {
    cx.notify();
    wake();
  };
  const onWheel = (e, cx) => {
    const zoom = e.modifiers.platform || e.modifiers.control;
    if (!zoom && !expanded)
      return;
    cx.stop_propagation();
    if (zoom) {
      const p = e.local_position ?? { x: cam.width / 2, y: cam.height / 2 };
      zoomAt(cam, content, expanded, Math.exp(-e.delta.y * 0.01), p.x, p.y);
    } else {
      freeze(cam, content, expanded);
      cam.panX += e.delta.x;
      cam.panY += e.delta.y;
    }
    redraw(cx);
  };
  const onKey = (e, cx) => {
    const k = e.key;
    const center = () => zoomAt(cam, content, expanded, 1, cam.width / 2, cam.height / 2);
    if (k === "+" || k === "=")
      zoomAt(cam, content, expanded, ZOOM_STEP, cam.width / 2, cam.height / 2);
    else if (k === "-")
      zoomAt(cam, content, expanded, 1 / ZOOM_STEP, cam.width / 2, cam.height / 2);
    else if (k === "0")
      cam.zoom = null;
    else if (k === "left" || k === "right" || k === "up" || k === "down") {
      center();
      cam.panX += k === "left" ? KEY_PAN : k === "right" ? -KEY_PAN : 0;
      cam.panY += k === "up" ? KEY_PAN : k === "down" ? -KEY_PAN : 0;
    } else if (k === "[" || k === "]")
      selectStep(c, state.step === null ? k === "]" ? 0 : c.spec.steps.length - 1 : state.step + (k === "]" ? 1 : -1), expanded);
    else if (k === "escape" && expanded)
      state.expanded = false;
    else
      return;
    cx.stop_propagation();
    redraw(cx);
  };
  const size = (sz, cx) => {
    if (cam.width === sz.width && (!expanded || cam.height === sz.height))
      return;
    cam.width = sz.width;
    if (expanded)
      cam.height = sz.height;
    cx.notify();
  };
  const paneH = o.viewportHeight ?? FALLBACK_PANE_H;
  if (!expanded && cam.width > 0) {
    cam.height = Math.max(120, paneH * MAX_VIEW_SHARE);
    const fit = fitScale(cam, content, false);
    cam.height = Math.min(content.height * fit + PAD * 2, paneH * MAX_VIEW_SHARE);
  }
  let el = div33().id(o.id(expanded ? "full" : "viewport")).relative().overflow_hidden().w_full().rounded(expanded ? 0 : t.radiusL).border_1().border_color(t.borderDefault).bg(t.foreground).when(state.drag !== null && state.moved, (e) => e.cursor_grabbing()).on_size_change(size).on_scroll_wheel(onWheel).on_mouse_down("left", (e, cx) => {
    focus?.focus();
    state.drag = { x: e.position.x, y: e.position.y, panX: 0, panY: 0 };
    state.moved = false;
  }).on_mouse_move((e, cx) => {
    const drag = state.drag;
    if (!drag)
      return;
    const dx = e.position.x - drag.x;
    const dy = e.position.y - drag.y;
    if (!state.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP)
        return;
      const v0 = freeze(cam, content, expanded);
      drag.panX = v0.panX;
      drag.panY = v0.panY;
      state.moved = true;
    }
    cam.panX = drag.panX + dx;
    cam.panY = drag.panY + dy;
    redraw(cx);
  }).on_mouse_up("left", (_e, cx) => {
    if (!state.drag)
      return;
    state.drag = null;
    redraw(cx);
  }).on_hover((hovered, cx) => {
    if (hovered || !state.drag)
      return;
    state.drag = null;
    redraw(cx);
  }).on_key_down(onKey);
  if (focus)
    el = el.track_focus(focus);
  el = expanded ? el.size_full() : el.h(cam.width > 0 ? cam.height : 160);
  if (v) {
    el = el.child(div33().absolute().left(v.panX).top(v.panY).child(content.draw(o, v.z, expanded ? "full" : "in")));
  }
  return el.child(controls(o, c, cam, expanded, wake));
}
function selectStep(c, i, expanded) {
  const { state, spec, content } = c;
  if (i < 0 || i >= spec.steps.length)
    return;
  state.step = state.step === i ? null : i;
  if (state.step === null)
    return;
  const step = spec.steps[state.step];
  if (!step.complete)
    return;
  reveal(expanded ? state.full : state.inline, content, content.reveal(step.highlight), expanded);
}
function steps(ctx, c) {
  const t = ctx.t;
  const { state, spec } = c;
  if (!spec.steps.length)
    return null;
  const n = spec.steps.length;
  const nav = div33().flex().flex_row().items_center().gap(t.spaceS).child(button(ctx, {
    id: ctx.id("prev"),
    label: "Previous",
    variant: "secondary",
    size: "extra-small",
    disabled: state.step === null || state.step === 0,
    onClick: (cx) => {
      if (state.step !== null)
        selectStep(c, state.step - 1, false);
      cx.notify();
    }
  })).child(button(ctx, {
    id: ctx.id("next"),
    label: state.step === null ? "Start" : "Next",
    variant: "secondary",
    size: "extra-small",
    disabled: state.step === n - 1,
    onClick: (cx) => {
      selectStep(c, state.step === null ? 0 : state.step + 1, false);
      cx.notify();
    }
  })).child(textStyle(div33(), typography(t, "label", "small")).text_color(t.textNeutralTertiary).child(state.step === null ? `${n} steps` : `Step ${state.step + 1} of ${n}`));
  const list = spec.steps.map((step, i) => {
    const selected = state.step === i;
    const last = i === n - 1;
    const connector = div33().flex().flex_col().items_center().child(div33().flex().items_center().justify_center().py(t.space2xs).child(textStyle(div33().flex().items_center().justify_center().w(24).h(24).rounded(12).bg(selected ? t.interactiveAccentDefault : t.elevated).text_color(selected ? t.textWhite : t.textNeutralSecondary).border_1().border_color(selected ? t.interactiveAccentDefault : t.borderDefault), typography(t, "label", "small")).child(String(i + 1)))).when(!last, (el) => el.child(div33().w(1).flex_1().bg(t.sunk)));
    const head = div33().flex().flex_row().items_center().gap(t.spaceXs).child(div33().flex_1().min_w_0().text_color(selected ? t.textNeutralPrimary : t.textNeutralSecondary).child(step.title)).child(iconButton(ctx, {
      id: ctx.id(`ask-${i}`),
      icon: "MessageCircleQuestion",
      variant: "tertiary",
      size: "2-extra-small",
      onClick: () => spec.askStep(i)
    }));
    const details = step.details ? [ctx.piece(`step${i}`, step.details, (o, text) => markdownBlock(o, `step${i}`, text, { profile: "plain" }).w_auto())] : [];
    const content = div33().flex().flex_col().flex_1().min_w_0().gap(t.space3xs).pt(t.space2xs).mb(last ? 0 : t.spaceL).child(head).child(textStyle(div33().flex().flex_col().gap(t.spaceM + 2), typography(t, "body", "default")).children(details));
    return div33().id(ctx.id(`step-${i}`)).flex().flex_row().gap(t.spaceM).rounded(t.radiusM).cursor_pointer().on_click((_e, cx) => {
      selectStep(c, i, false);
      cx.notify();
    }).child(connector).child(content);
  });
  return div33().flex().flex_col().gap(t.spaceM).child(nav).child(div33().flex().flex_col().children(list));
}
function placeholder(ctx, text, error) {
  const t = ctx.t;
  return textStyle(div33(), typography(t, "body", "small")).flex().items_center().justify_center().w_full().h(120).rounded(t.radiusL).border_1().border_color(t.borderDefault).bg(t.sunkLight).text_color(error ? t.textDangerPrimary : t.textNeutralTertiary).child(text);
}
function canvas(ctx, state, spec) {
  const t = ctx.t;
  const wake = ctx.waker();
  const c = spec.content ? { ctx, state, content: spec.content, spec } : null;
  const focus = ctx.retained(ctx.id("focus"), { kind: "diagram-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
  if (c && state.expanded) {
    ctx.overlay("expanded", (o) => {
      const ofocus = o.retained(o.id("full-focus"), { kind: "diagram-focus", meta: null, create: (_entry, cx) => cx.focus_handle() });
      if (!state.expanded)
        return null;
      return { el: div33().size_full().bg(o.t.foreground).child(viewport(o, c, true, ofocus, wake)), focus: ofocus };
    });
  }
  return div33().id(ctx.id()).relative().w_full().flex().flex_col().gap(t.spaceM).child(c && !spec.error ? viewport(ctx, c, false, focus, wake) : placeholder(ctx, spec.placeholder, !!spec.error)).children(optional(c ? steps(ctx, c) : null)).children(spec.extra ?? []);
}

// src/components/diagram/kinds.ts
var KIND_ICON = {
  actor: "User",
  process: "Cpu",
  module: "Package",
  file: "FileText",
  store: "Database",
  external: "Cloud",
  decision: "Diamond",
  start: "Play",
  end: "Flag",
  event: "Zap",
  task: "SquareCheck",
  service: "Server",
  queue: "Layers",
  ui: "AppWindow"
};

// src/components/diagram.ts
var NODE_PAD_X = 12;
var PILL_PAD_X = 16;
var NODE_PAD_Y = 8;
var NODE_ICON = 16;
var NODE_ICON_GAP = 8;
var NODE_MIN_W = 88;
var SUB_GAP = 2;
var EDGE_LABEL_PAD_X = 6;
var EDGE_LABEL_PAD_Y = 2;
var GROUP_TITLE_PAD_X = 8;
var GROUP_TITLE_PAD_Y = 4;
var HEAD_LEN = { arrow: 8, none: 0, triangle: 11, diamond: 16 };
var HEAD_HALF = { arrow: 4.5, none: 0, triangle: 6.5, diamond: 6 };
var DASH = [5, 4];
var ROW_PAD_Y = 3;
var ROWS_PAD_Y = 4;
var KEY_ICON = 12;
var KEY_GAP = 6;
var TYPE_GAP = 16;
var styles = (t) => ({
  label: typography(t, "label", "heavy"),
  sub: typography(t, "body", "small"),
  edge: typography(t, "label", "small"),
  title: typography(t, "label", "small-heavy"),
  field: typography(t, "code", "small")
});
function measurers(ctx, s, model) {
  const m = {
    label: new Measurer(ctx, s.label, "m-label"),
    sub: new Measurer(ctx, s.sub, "m-sub"),
    edge: new Measurer(ctx, s.edge, "m-edge"),
    title: new Measurer(ctx, s.title, "m-title"),
    field: new Measurer(ctx, s.field, "m-field")
  };
  m.label.want(model.nodes.map((n) => n.label));
  m.sub.want(model.nodes.flatMap((n) => n.sub ? [n.sub] : []));
  m.edge.want(model.edges.flatMap((e) => e.label ? [e.label] : []));
  m.title.want(model.groups.map((g) => g.label));
  m.field.want(model.nodes.flatMap((n) => (n.fields ?? []).flatMap((f) => f.type ? [f.name, f.type] : [f.name])));
  return m;
}
var ready2 = (m) => m.label.ready && m.sub.ready && m.edge.ready && m.title.ready && m.field.ready;
var isPill = (n) => !n.fields && (n.kind === "start" || n.kind === "end");
var padX = (n) => isPill(n) ? PILL_PAD_X : NODE_PAD_X;
function cardRows(n, m) {
  return {
    head: NODE_PAD_Y * 2 + m.label.lineHeight + (n.sub ? SUB_GAP + m.sub.lineHeight : 0),
    row: m.field.lineHeight + ROW_PAD_Y * 2,
    keys: (n.fields ?? []).some((f) => f.key)
  };
}
function nodeSize(n, m) {
  const text = Math.max(m.label.width(n.label), n.sub ? m.sub.width(n.sub) : 0);
  if (!n.fields) {
    return {
      w: Math.max(NODE_MIN_W, Math.ceil(padX(n) * 2 + NODE_ICON + NODE_ICON_GAP + text)),
      h: NODE_PAD_Y * 2 + m.label.lineHeight + (n.sub ? SUB_GAP + m.sub.lineHeight : 0)
    };
  }
  const card = cardRows(n, m);
  const keyCol = card.keys ? KEY_ICON + KEY_GAP : 0;
  const rows = n.fields.map((f) => keyCol + m.field.width(f.name) + (f.type ? TYPE_GAP + m.field.width(f.type) : 0));
  return {
    w: Math.max(NODE_MIN_W, Math.ceil(NODE_PAD_X * 2 + Math.max(text, ...rows) + 2)),
    h: card.head + (n.fields.length ? ROWS_PAD_Y * 2 + card.row * n.fields.length + 1 : 0) + 2
  };
}
function sizedGraph(model, m) {
  const ids = new Set(model.nodes.map((n) => n.id));
  return {
    direction: model.direction,
    nodes: model.nodes.map((n) => {
      const { w, h } = nodeSize(n, m);
      return n.group ? { id: n.id, w, h, group: n.group } : { id: n.id, w, h };
    }),
    groups: model.groups.map((g) => ({
      id: g.id,
      titleW: Math.ceil(m.title.width(g.label) + GROUP_TITLE_PAD_X * 2),
      titleH: m.title.lineHeight + GROUP_TITLE_PAD_Y * 2
    })),
    edges: model.edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => e.label ? {
      id: e.id,
      from: e.from,
      to: e.to,
      labelW: Math.ceil(m.edge.width(e.label) + EDGE_LABEL_PAD_X * 2),
      labelH: m.edge.lineHeight + EDGE_LABEL_PAD_Y * 2
    } : { id: e.id, from: e.from, to: e.to })
  };
}
function marks(model, highlight, hover) {
  const nodes = new Set;
  const edges = new Set;
  for (const id of highlight ?? []) {
    const edge = model.edges.find((e) => e.id === id);
    if (edge) {
      edges.add(edge.id);
      nodes.add(edge.from);
      nodes.add(edge.to);
    } else
      nodes.add(id);
  }
  if (hover) {
    nodes.add(hover);
    for (const e of model.edges)
      if (e.from === hover || e.to === hover)
        edges.add(e.id);
  }
  return { active: highlight !== null, nodes, edges };
}
function revealBox(drawn, model, highlight) {
  const lit = marks(model, highlight, null).nodes;
  const boxes = drawn.graph.nodes.filter((n) => lit.has(n.id) && drawn.layout.nodes[n.id]);
  if (!boxes.length)
    return null;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const n of boxes) {
    const p = drawn.layout.nodes[n.id];
    box.x0 = Math.min(box.x0, p.x);
    box.y0 = Math.min(box.y0, p.y);
    box.x1 = Math.max(box.x1, p.x + n.w);
    box.y1 = Math.max(box.y1, p.y + n.h);
  }
  return box;
}
function edgePaths(drawn, z, edgeOf, classOf, color) {
  const builders = new Map;
  const k = Math.max(z, 0.6);
  const get = (c) => {
    let b = builders.get(c);
    if (!b) {
      const width = c === "lit" ? 2 : 1.25;
      b = { solid: PathBuilder10.stroke(width), dashed: PathBuilder10.stroke(width).dash_array(DASH.map((v) => v * k)), fill: PathBuilder10.fill(), used: new Set };
      builders.set(c, b);
    }
    return b;
  };
  for (const e of drawn.graph.edges) {
    const route = drawn.layout.edges[e.id];
    if (!route || route.points.length < 2)
      continue;
    const edge = edgeOf(e.id);
    const head = edge?.head ?? "arrow";
    const style = edge?.style ?? "solid";
    const pts = route.points.map(([x, y]) => [x * z, y * z]);
    const [tx, ty] = pts[pts.length - 1];
    const [sx, sy] = pts[pts.length - 2];
    const len = Math.hypot(tx - sx, ty - sy) || 1;
    const dx = (tx - sx) / len;
    const dy = (ty - sy) / len;
    const headLen = Math.min(HEAD_LEN[head] * k, len);
    const half = HEAD_HALF[head] * k;
    const bx = tx - dx * headLen;
    const by = ty - dy * headLen;
    const b = get(classOf(e.id));
    const line = style === "dashed" ? b.dashed : b.solid;
    b.used.add(style);
    line.move_to(pts[0][0], pts[0][1]);
    for (let i = 1;i < pts.length - 1; i++)
      line.line_to(pts[i][0], pts[i][1]);
    line.line_to(bx, by);
    if (head === "arrow") {
      b.used.add("fill");
      b.fill.add_polygon([[tx, ty], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], true);
    } else if (head === "triangle") {
      b.used.add("solid");
      b.solid.add_polygon([[tx, ty], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], true);
    } else if (head === "diamond") {
      const mx = tx - dx * headLen / 2;
      const my = ty - dy * headLen / 2;
      b.used.add("fill");
      b.fill.add_polygon([[tx, ty], [mx - dy * half, my + dx * half], [bx, by], [mx + dy * half, my - dx * half]], true);
    }
  }
  const out = [];
  for (const c of ["dim", "normal", "lit"]) {
    const b = builders.get(c);
    if (!b)
      continue;
    for (const part of ["dashed", "solid", "fill"])
      if (b.used.has(part))
        out.push({ path: b[part].build(), paint: color[c] });
  }
  return out;
}
function askNode(d, id) {
  const node = d.model.nodes.find((n) => n.id === id);
  if (!node)
    return;
  const message = `Tell me more about ${node.label}`;
  d.ctx.trigger(message, node.action ?? { steps: [{ type: e0.ToAssistant, message, context: { diagram: d.statementId, node: id } }] });
}
function drawing(o, d, z, part) {
  const t = o.t;
  const { drawn, model, local, state, s } = d;
  const step = state.step === null ? undefined : model.steps[state.step];
  const m = marks(model, step?.complete ? step.highlight : null, state.hover);
  const nodeClass = (id) => m.nodes.has(id) ? "lit" : m.active ? "dim" : "normal";
  const edgeClass = (id) => m.edges.has(id) ? "lit" : m.active ? "dim" : "normal";
  const pathKey = `${z}|${m.active}|${[...m.edges].join(",")}|${model.edges.map((e) => `${e.style}${e.head}`).join(",")}`;
  let built = local.paths[part];
  if (built?.key !== pathKey) {
    const muted = t.textNeutralSecondary;
    const byId = new Map(model.edges.map((e) => [e.id, e]));
    built = { key: pathKey, painted: edgePaths(drawn, z, (id) => byId.get(id), edgeClass, { normal: muted, dim: alpha(muted, DIMMED), lit: t.interactiveAccentDefault }) };
    local.paths[part] = built;
  }
  const groups = model.groups.flatMap((g) => {
    const box = drawn.layout.groups[g.id];
    if (!box)
      return [];
    const frame = div34().absolute().left(box.x * z).top(box.y * z).w(box.w * z).h(box.h * z).rounded(t.radiusM * z).bg(t.sunkLight).border_1().border_color(t.borderDefault).when(m.active, (el) => el.opacity(0.6));
    const title = textStyle(div34().absolute().whitespace_nowrap(), scaled(s.title, z)).left((box.titleX + GROUP_TITLE_PAD_X) * z).top((box.titleY + GROUP_TITLE_PAD_Y) * z).text_color(t.textNeutralSecondary).child(g.label);
    return [frame, title];
  });
  const labels = drawn.graph.edges.flatMap((e) => {
    const route = drawn.layout.edges[e.id];
    const text = model.edges.find((x) => x.id === e.id)?.label;
    if (!route || route.labelX === undefined || route.labelY === undefined || !text || !e.labelW || !e.labelH)
      return [];
    const c = edgeClass(e.id);
    return [
      textStyle(div34().absolute().flex().items_center().justify_center().whitespace_nowrap(), scaled(s.edge, z)).left(route.labelX * z).top(route.labelY * z).w(e.labelW * z).h(e.labelH * z).rounded(t.radiusS * z).bg(t.foreground).text_color(c === "lit" ? t.interactiveAccentDefault : t.textNeutralSecondary).when(c === "dim", (el) => el.opacity(DIMMED)).child(text)
    ];
  });
  const nodes = drawn.graph.nodes.flatMap((g) => {
    const p = drawn.layout.nodes[g.id];
    const n = model.nodes.find((x) => x.id === g.id);
    if (!p || !n)
      return [];
    const c = nodeClass(n.id);
    const label = textStyle(div34().whitespace_nowrap(), scaled(s.label, z)).text_color(t.textNeutralPrimary).child(n.label);
    const sub = n.sub ? [textStyle(div34().whitespace_nowrap(), scaled(s.sub, z)).text_color(t.textNeutralSecondary).child(n.sub)] : [];
    let box = pointable(div34().id(o.id(`${part}-node-${n.id}`)).absolute().left(p.x * z).top(p.y * z).w(g.w * z).h(g.h * z).flex().rounded(isPill(n) ? g.h * z / 2 : t.radiusM * z).bg(c === "lit" ? t.highlightSubtle : t.elevated).border_1().border_color(c === "lit" ? t.interactiveAccentDefault : t.borderDefault).text_color(c === "lit" ? t.interactiveAccentDefault : t.textNeutralSecondary), state, n.id, () => askNode(d, n.id));
    if (n.fields) {
      const card = cardRows(n, d.m);
      const rows = n.fields.map((f) => textStyle(div34().flex().flex_row().items_center().flex_none().h(card.row * z).px(NODE_PAD_X * z), scaled(s.field, z)).children(card.keys ? [
        div34().flex_none().w(KEY_ICON * z).mr(KEY_GAP * z).children(f.key ? optional(o.icon(f.key === "pk" ? "KeyRound" : "Link", { size: KEY_ICON * z })) : [])
      ] : []).child(div34().flex_1().min_w_0().whitespace_nowrap().text_color(t.textNeutralPrimary).child(f.name)).children(f.type ? [div34().flex_none().ml(TYPE_GAP * z).whitespace_nowrap().text_color(t.textNeutralSecondary).child(f.type)] : []));
      box = box.flex_col().overflow_hidden().child(div34().flex_none().h(card.head * z).flex().flex_col().justify_center().px(NODE_PAD_X * z).gap(SUB_GAP * z).child(label).children(sub)).children(rows.length ? [
        div34().flex_1().flex().flex_col().py(ROWS_PAD_Y * z).border_t_1().border_color(c === "lit" ? t.interactiveAccentDefault : t.borderDefault).children(rows)
      ] : []);
    } else {
      box = box.flex_row().items_center().gap(NODE_ICON_GAP * z).px(padX(n) * z).children(optional(o.icon(KIND_ICON[n.kind], { size: NODE_ICON * z }))).child(div34().flex().flex_col().min_w_0().gap(SUB_GAP * z).child(label).children(sub));
      if (n.kind === "external")
        box = box.border_dashed();
    }
    if (c === "dim")
      box = box.opacity(DIMMED);
    return [box];
  });
  return div34().relative().w(drawn.layout.width * z).h(drawn.layout.height * z).children(groups).children(built.painted.map(layer)).children(labels).children(nodes);
}
var Diagram = {
  render(props, ctx, node) {
    const t = ctx.t;
    const model = diagramModel(props, ctx.streaming);
    const statementId = node.statementId ?? "";
    const local = ctx.local({ drawn: null, paths: {}, reported: null });
    const state = canvasState(ctx, model.steps.length);
    const s = styles(t);
    const m = measurers(ctx, s, model);
    let error = null;
    if (model.nodes.length && ready2(m)) {
      const graph = sizedGraph(model, m);
      const laid = ctx.layout(graph);
      if (laid.status === "ready" && local.drawn?.layout !== laid.layout) {
        local.drawn = { graph, layout: laid.layout };
        local.paths = {};
      } else if (laid.status === "failed") {
        error = laid.error;
        if (local.reported !== error) {
          local.reported = error;
          const failure = error;
          ctx.after(() => ctx.session.reportRenderError({
            source: "runtime",
            code: "diagram-layout-failed",
            message: `Diagram layout failed: ${failure}`,
            component: "Diagram",
            statementId
          }));
        }
      }
    }
    const probes = [m.label.probes(), m.sub.probes(), m.edge.probes(), m.title.probes(), m.field.probes()].filter((p) => p !== null);
    const drawn = local.drawn;
    let content = null;
    if (drawn) {
      const d = { ctx, model, drawn, local, state, s, m, statementId };
      content = {
        width: drawn.layout.width,
        height: drawn.layout.height,
        draw: (o, z, part) => drawing(o, d, z, part),
        reveal: (highlight) => revealBox(drawn, model, highlight)
      };
    }
    const n = model.nodes.length;
    return canvas(ctx, state, {
      content,
      placeholder: error ? `Diagram layout failed: ${error}` : n ? `Laying out ${n} boxes…` : "No boxes yet",
      error: error !== null,
      steps: model.steps,
      askStep: (i) => stepQuestion(ctx, statementId, model.steps, i),
      extra: probes
    });
  }
};
var DiagramPart = {
  render() {
    return null;
  }
};

// src/components/sequence.ts
import { div as div35, PathBuilder as PathBuilder11 } from "gpui-kit";

// opengpui-shared:zod
var m63 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["zod"];
var e056 = m63["$brand"];
var e1105 = m63["$input"];
var e256 = m63["$output"];
var e329 = m63["INVALID"];
var e421 = m63["NEVER"];
var e519 = m63["TimePrecision"];
var e613 = m63["ZodAny"];
var e711 = m63["ZodArray"];
var e811 = m63["ZodBase64"];
var e910 = m63["ZodBase64URL"];
var e1010 = m63["ZodBigInt"];
var e1114 = m63["ZodBigIntFormat"];
var e1213 = m63["ZodBoolean"];
var e1311 = m63["ZodCIDRv4"];
var e1410 = m63["ZodCIDRv6"];
var e1510 = m63["ZodCUID"];
var e1610 = m63["ZodCUID2"];
var e1710 = m63["ZodCatch"];
var e1810 = m63["ZodCodec"];
var e1910 = m63["ZodCompileAsyncError"];
var e2010 = m63["ZodCompileUnsupportedError"];
var e2111 = m63["ZodCreditCard"];
var e2211 = m63["ZodCustom"];
var e2310 = m63["ZodCustomStringFormat"];
var e2410 = m63["ZodDate"];
var e257 = m63["ZodDefault"];
var e265 = m63["ZodDiscriminatedUnion"];
var e275 = m63["ZodE164"];
var e284 = m63["ZodEmail"];
var e294 = m63["ZodEmoji"];
var e304 = m63["ZodEnum"];
var e3111 = m63["ZodError"];
var e3210 = m63["ZodExactOptional"];
var e334 = m63["ZodFile"];
var e344 = m63["ZodFirstPartyTypeKind"];
var e354 = m63["ZodFunction"];
var e364 = m63["ZodGUID"];
var e374 = m63["ZodIBAN"];
var e384 = m63["ZodIPv4"];
var e394 = m63["ZodIPv6"];
var e404 = m63["ZodISODate"];
var e4110 = m63["ZodISODateTime"];
var e424 = m63["ZodISODuration"];
var e434 = m63["ZodISOTime"];
var e444 = m63["ZodInstanceOf"];
var e453 = m63["ZodIntersection"];
var e463 = m63["ZodIssueCode"];
var e473 = m63["ZodJWT"];
var e483 = m63["ZodKSUID"];
var e493 = m63["ZodLazy"];
var e503 = m63["ZodLiteral"];
var e5110 = m63["ZodMAC"];
var e524 = m63["ZodMap"];
var e534 = m63["ZodNaN"];
var e543 = m63["ZodNanoID"];
var e553 = m63["ZodNever"];
var e563 = m63["ZodNonOptional"];
var e573 = m63["ZodNull"];
var e583 = m63["ZodNullable"];
var e593 = m63["ZodNumber"];
var e603 = m63["ZodNumberFormat"];
var e614 = m63["ZodObject"];
var e624 = m63["ZodOptional"];
var e633 = m63["ZodPipe"];
var e643 = m63["ZodPrefault"];
var e653 = m63["ZodPreprocess"];
var e663 = m63["ZodPromise"];
var e672 = m63["ZodReadonly"];
var e682 = m63["ZodRealError"];
var e692 = m63["ZodRecord"];
var e702 = m63["ZodSet"];
var e712 = m63["ZodString"];
var e723 = m63["ZodStringFormat"];
var e733 = m63["ZodSuccess"];
var e743 = m63["ZodSymbol"];
var e753 = m63["ZodTemplateLiteral"];
var e762 = m63["ZodTransform"];
var e772 = m63["ZodTuple"];
var e782 = m63["ZodType"];
var e792 = m63["ZodULID"];
var e802 = m63["ZodURL"];
var e812 = m63["ZodUUID"];
var e823 = m63["ZodUndefined"];
var e833 = m63["ZodUnion"];
var e843 = m63["ZodUnknown"];
var e853 = m63["ZodVoid"];
var e862 = m63["ZodXID"];
var e872 = m63["ZodXor"];
var e882 = m63["_ZodString"];
var e892 = m63["_default"];
var e902 = m63["_function"];
var e912 = m63["any"];
var e923 = m63["array"];
var e933 = m63["base64"];
var e943 = m63["base64url"];
var e953 = m63["bigint"];
var e962 = m63["boolean"];
var e972 = m63["catch"];
var e982 = m63["check"];
var e992 = m63["cidrv4"];
var e1002 = m63["cidrv6"];
var e1012 = m63["clone"];
var e1023 = m63["codec"];
var e1033 = m63["coerce"];
var e1043 = m63["compile"];
var e1053 = m63["config"];
var e1062 = m63["core"];
var e1072 = m63["creditCard"];
var e1082 = m63["cuid"];
var e1092 = m63["cuid2"];
var e1106 = m63["currencyCode"];
var e1115 = m63["custom"];
var e1123 = m63["date"];
var e1133 = m63["decode"];
var e1143 = m63["decodeAsync"];
var e1153 = m63["deepPartial"];
var e1163 = m63["describe"];
var e1173 = m63["discriminatedUnion"];
var e1183 = m63["e164"];
var e1193 = m63["email"];
var e1203 = m63["emoji"];
var e1214 = m63["encode"];
var e1223 = m63["encodeAsync"];
var e1233 = m63["endsWith"];
var e1243 = m63["enum"];
var e1253 = m63["exactOptional"];
var e1263 = m63["file"];
var e1273 = m63["flattenError"];
var e1283 = m63["float32"];
var e1293 = m63["float64"];
var e1303 = m63["formatError"];
var e1313 = m63["fromJSONSchema"];
var e1323 = m63["function"];
var e1333 = m63["getDiscriminatedOption"];
var e1343 = m63["getErrorMap"];
var e1353 = m63["globalRegistry"];
var e1363 = m63["gt"];
var e1373 = m63["gte"];
var e1383 = m63["guid"];
var e1393 = m63["hash"];
var e1403 = m63["hex"];
var e1413 = m63["hostname"];
var e1423 = m63["httpUrl"];
var e1433 = m63["iban"];
var e1443 = m63["includes"];
var e1453 = m63["input"];
var e1463 = m63["instanceof"];
var e1473 = m63["int"];
var e1483 = m63["int32"];
var e1492 = m63["int64"];
var e1502 = m63["intersection"];
var e1512 = m63["invertCodec"];
var e1523 = m63["ipv4"];
var e1533 = m63["ipv6"];
var e1543 = m63["iso"];
var e1553 = m63["json"];
var e1562 = m63["jwt"];
var e1572 = m63["keyof"];
var e1582 = m63["ksuid"];
var e1592 = m63["lazy"];
var e1602 = m63["length"];
var e1612 = m63["literal"];
var e1623 = m63["locales"];
var e1633 = m63["looseObject"];
var e1643 = m63["looseRecord"];
var e1653 = m63["lowercase"];
var e1662 = m63["lt"];
var e1672 = m63["lte"];
var e1682 = m63["mac"];
var e1692 = m63["map"];
var e1702 = m63["maxLength"];
var e1712 = m63["maxSize"];
var e1723 = m63["memoizer"];
var e1733 = m63["meta"];
var e1743 = m63["mime"];
var e1753 = m63["minLength"];
var e1762 = m63["minSize"];
var e1772 = m63["multipleOf"];
var e1782 = m63["nan"];
var e1792 = m63["nanoid"];
var e1802 = m63["nativeEnum"];
var e1812 = m63["negative"];
var e1823 = m63["never"];
var e1833 = m63["nonnegative"];
var e1843 = m63["nonoptional"];
var e1853 = m63["nonpositive"];
var e1862 = m63["normalize"];
var e1872 = m63["null"];
var e1882 = m63["nullable"];
var e1892 = m63["nullish"];
var e1902 = m63["number"];
var e1912 = m63["object"];
var e1923 = m63["optional"];
var e1933 = m63["output"];
var e1943 = m63["overwrite"];
var e1952 = m63["parse"];
var e1962 = m63["parseAsync"];
var e1972 = m63["partialRecord"];
var e1982 = m63["pipe"];
var e1992 = m63["positive"];
var e2002 = m63["prefault"];
var e2012 = m63["preprocess"];
var e2023 = m63["prettifyError"];
var e2033 = m63["promise"];
var e2043 = m63["properties"];
var e2052 = m63["property"];
var e2062 = m63["readonly"];
var e2072 = m63["record"];
var e2082 = m63["refine"];
var e2092 = m63["regex"];
var e2103 = m63["regexes"];
var e2113 = m63["registry"];
var e2123 = m63["safeDecode"];
var e2133 = m63["safeDecodeAsync"];
var e2143 = m63["safeEncode"];
var e2153 = m63["safeEncodeAsync"];
var e2163 = m63["safeParse"];
var e2173 = m63["safeParseAsync"];
var e2183 = m63["set"];
var e2193 = m63["setErrorMap"];
var e2203 = m63["size"];
var e2213 = m63["slugify"];
var e2223 = m63["startsWith"];
var e2233 = m63["strictObject"];
var e2243 = m63["string"];
var e2253 = m63["stringFormat"];
var e2263 = m63["stringbool"];
var e2273 = m63["success"];
var e2283 = m63["superRefine"];
var e2293 = m63["symbol"];
var e2303 = m63["templateLiteral"];
var e2313 = m63["toJSONSchema"];
var e2323 = m63["toLowerCase"];
var e2333 = m63["toUpperCase"];
var e2343 = m63["toZod"];
var e2353 = m63["transform"];
var e2363 = m63["treeifyError"];
var e2373 = m63["trim"];
var e2383 = m63["tuple"];
var e2392 = m63["uint32"];
var e2402 = m63["uint64"];
var e2412 = m63["ulid"];
var e2423 = m63["undefined"];
var e2433 = m63["union"];
var e2443 = m63["unknown"];
var e2452 = m63["uppercase"];
var e2462 = m63["url"];
var e2472 = m63["util"];
var e2482 = m63["uuid"];
var e2492 = m63["uuidv4"];
var e2502 = m63["uuidv6"];
var e2512 = m63["uuidv7"];
var e2522 = m63["validate"];
var e2532 = m63["validateAsync"];
var e2542 = m63["void"];
var e2552 = m63["withParser"];
var e2562 = m63["xid"];
var e2572 = m63["xor"];
var e258 = m63["z"];
var zod_default = m63.default;

// src/diagram/step.ts
var DiagramStep = e15({
  name: "DiagramStep",
  props: e258.object({
    title: e258.string(),
    details: e258.string(),
    highlight: e258.array(e258.string()),
    action: e4().optional()
  }),
  description: 'A numbered step under a Diagram, Sequence or Timeline. details is markdown. highlight lists the ids it lights: in a Diagram node ids and edge ids (from>to; an edge lights both its ends), in a Sequence participant ids and message numbers ("3"), in a Timeline task ids.',
  component: null
});

// src/diagram/validate.ts
var MAX_NODES = 30;
function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1;i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1;j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(above + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}
function closest(id, ids) {
  let best;
  let bestDistance = Infinity;
  for (const candidate of ids) {
    const d = levenshtein(id, candidate);
    if (d < bestDistance)
      [best, bestDistance] = [candidate, d];
  }
  return bestDistance <= Math.max(2, id.length / 3) ? best : undefined;
}
function validateDiagram(model, statementId) {
  const errors = [];
  const report = (code, message, hint, warning = false) => errors.push({
    source: "parser",
    code,
    message,
    component: "Diagram",
    ...statementId ? { statementId } : {},
    ...hint ? { hint } : {},
    ...warning ? { severity: "warning" } : {}
  });
  const didYouMean = (id, ids) => {
    const match = closest(id, ids);
    return match ? `Did you mean "${match}"?` : undefined;
  };
  if (!model.nodes.length) {
    report("diagram-empty", "the Diagram has no nodes", "Give it Nodes or Entities (directly or in Groups), or remove it.");
    return errors;
  }
  const nodeIds = new Set(model.nodes.map((n) => n.id));
  const groupIds = new Set(model.groups.map((g) => g.id));
  const seen = new Set;
  for (const id of [...model.groups.map((g) => g.id), ...model.nodes.map((n) => n.id)]) {
    if (seen.has(id))
      report("diagram-duplicate-id", `id "${id}" is used twice`, "Nodes and groups share one id space per Diagram: rename one.");
    seen.add(id);
  }
  for (const n of model.nodes) {
    const names = new Set;
    for (const f of n.fields ?? []) {
      if (names.has(f.name))
        report("diagram-duplicate-field", `entity "${n.id}": field "${f.name}" is listed twice`, "Keep one Field per name in an Entity.");
      names.add(f.name);
    }
  }
  if (model.nodes.length > MAX_NODES) {
    report("diagram-too-big", `the Diagram has ${model.nodes.length} nodes`, `More than ${MAX_NODES} is hard to read: split it into several Diagrams.`, true);
  }
  const edgeIds = new Set;
  for (const e of model.edges) {
    for (const end of [e.from, e.to]) {
      if (nodeIds.has(end))
        continue;
      const hint = groupIds.has(end) ? `"${end}" is a group; edges connect nodes, so point it at one of the group's nodes.` : didYouMean(end, nodeIds);
      report("diagram-unknown-node", `edge "${e.id}": no node "${end}"`, hint);
    }
    if (edgeIds.has(e.id))
      report("diagram-duplicate-edge", `edge "${e.id}" is written twice`, "Keep one Edge per pair and merge the labels.");
    edgeIds.add(e.id);
  }
  model.steps.forEach((step, i) => {
    if (!step.complete)
      return;
    for (const id of step.highlight) {
      if (nodeIds.has(id) || edgeIds.has(id))
        continue;
      const [from, to, ...rest] = id.split(">");
      let hint;
      if (groupIds.has(id))
        hint = `"${id}" is a group; highlight its nodes.`;
      else if (to !== undefined && !rest.length && edgeIds.has(`${to}>${from}`))
        hint = `The edge goes the other way: "${to}>${from}".`;
      else
        hint = didYouMean(id, to === undefined ? nodeIds : edgeIds);
      report("diagram-unknown-highlight", `step ${i + 1} "${step.title}": no node or edge "${id}"`, hint);
    }
  });
  return errors;
}

// src/diagram/sequence.ts
var MESSAGE_STYLES = ["call", "reply", "async"];
var Participant = e15({
  name: "Participant",
  props: e258.object({
    id: e258.string(),
    label: e258.string(),
    kind: e258.enum(NODE_KINDS).optional(),
    sub: e258.string().optional(),
    action: e4().optional()
  }),
  description: "A column of a Sequence. id: short, unique in its Sequence. kind picks the icon (as a Node's). sub: a smaller second line. action replaces what a click sends.",
  component: null
});
var Message = e15({
  name: "Message",
  props: e258.object({
    from: e258.string(),
    to: e258.string(),
    label: e258.string(),
    style: e258.enum(MESSAGE_STYLES).optional()
  }),
  description: "An arrow between two participant ids of its Sequence (from == to: a self message). Numbered 1..N in list order. style: call (default; solid), reply (dashed) or async (open arrowhead).",
  component: null
});
var Block = e15({
  name: "Block",
  props: e258.object({ label: e258.string(), first: e258.number(), last: e258.number() }),
  description: 'A labelled frame ("loop every 5 s", "alt: cache miss") around messages first..last (message numbers, inclusive).',
  component: null
});
var Sequence = e15({
  name: "Sequence",
  props: e258.object({
    participants: e258.array(Participant.ref),
    messages: e258.array(Message.ref),
    steps: e258.array(DiagramStep.ref).optional(),
    blocks: e258.array(Block.ref).optional()
  }),
  description: "A sequence diagram: participants as columns, messages as numbered arrows top to bottom, with optional numbered steps and blocks.",
  component: null
});
var SEQUENCE_NOTES = [
  'A Sequence step highlights participant ids and message numbers as strings ("3"); a message number lights the message and both its participants.',
  "Clicking a participant sends `Tell me more about <label>` with {diagram, node}; clicking a message sends `Tell me more about message <n>: <label>` with {diagram, message: <n>}."
];
var text3 = (v) => typeof v === "string" ? v : undefined;
var is = (v, typeName) => e24(v) && v.typeName === typeName;
var oneOf2 = (values, v, fallback) => values.includes(v) ? v : fallback;
function sequenceModel(props, streaming) {
  const participants = [];
  for (const el of Array.isArray(props.participants) ? props.participants : []) {
    if (!is(el, "Participant"))
      continue;
    const id = text3(el.props.id);
    if (!id)
      continue;
    const sub = text3(el.props.sub);
    const action = el.props.action;
    participants.push({
      id,
      label: text3(el.props.label) ?? "",
      kind: oneOf2(NODE_KINDS, el.props.kind, "process"),
      ...sub ? { sub } : {},
      ...action != null ? { action } : {}
    });
  }
  const ids = new Set(participants.map((p) => p.id));
  const list = Array.isArray(props.messages) ? props.messages : [];
  const messages = [];
  list.forEach((el, i) => {
    if (!is(el, "Message"))
      return;
    const from = text3(el.props.from);
    const to = text3(el.props.to);
    if (from === undefined || to === undefined)
      return;
    if (streaming && !(ids.has(from) && ids.has(to)))
      return;
    messages.push({ n: i + 1, from, to, label: text3(el.props.label) ?? "", style: oneOf2(MESSAGE_STYLES, el.props.style, "call") });
  });
  const blocks = [];
  for (const el of Array.isArray(props.blocks) ? props.blocks : []) {
    if (!is(el, "Block"))
      continue;
    const { first, last } = el.props;
    if (typeof first !== "number" || typeof last !== "number")
      continue;
    const block = { label: text3(el.props.label) ?? "", first, last };
    if (!streaming || blockFits(block, list.length))
      blocks.push(block);
  }
  return { participants, messages, count: list.length, blocks, steps: diagramSteps(props.steps, streaming) };
}
var blockFits = (b, count) => Number.isInteger(b.first) && Number.isInteger(b.last) && b.first >= 1 && b.first <= b.last && b.last <= count;
var MAX_PARTICIPANTS = 12;
var MAX_MESSAGES = 40;
function validateSequence(model, statementId) {
  const errors = [];
  const report = (code, message, hint, warning = false) => errors.push({
    source: "parser",
    code,
    message,
    component: "Sequence",
    ...statementId ? { statementId } : {},
    ...hint ? { hint } : {},
    ...warning ? { severity: "warning" } : {}
  });
  const didYouMean = (id, ids) => {
    const match = closest(id, ids);
    return match ? `Did you mean "${match}"?` : undefined;
  };
  if (!model.participants.length) {
    report("sequence-empty", "the Sequence has no participants", "Give it Participants and Messages between them, or remove it.");
    return errors;
  }
  if (!model.count)
    report("sequence-empty", "the Sequence has no messages", "Add Messages between its participants, or use a Diagram.");
  const ids = new Set;
  for (const p of model.participants) {
    if (ids.has(p.id))
      report("sequence-duplicate-id", `participant id "${p.id}" is used twice`, "Participant ids are unique per Sequence: rename one.");
    ids.add(p.id);
  }
  if (model.participants.length > MAX_PARTICIPANTS || model.count > MAX_MESSAGES) {
    report("sequence-too-big", `the Sequence has ${model.participants.length} participants and ${model.count} messages`, `More than ${MAX_PARTICIPANTS} participants or ${MAX_MESSAGES} messages is hard to read: split it into several Sequences.`, true);
  }
  for (const m of model.messages) {
    for (const end of m.from === m.to ? [m.from] : [m.from, m.to]) {
      if (!ids.has(end))
        report("sequence-unknown-participant", `message ${m.n} "${m.label}": no participant "${end}"`, didYouMean(end, ids));
    }
  }
  const range = model.count ? `1..${model.count}` : "none (it has no messages)";
  for (const b of model.blocks) {
    if (blockFits(b, model.count))
      continue;
    const why = !Number.isInteger(b.first) || !Number.isInteger(b.last) ? "message numbers are whole" : b.first > b.last ? "first is after last" : `messages run ${range}`;
    report("sequence-bad-block", `block "${b.label}" (${b.first}..${b.last}): ${why}`, `first and last are message numbers in ${range}, first ≤ last.`);
  }
  model.steps.forEach((step, i) => {
    if (!step.complete)
      return;
    for (const id of step.highlight) {
      if (ids.has(id) || isMessageNumber(id, model.count))
        continue;
      let hint;
      const [from, to, ...rest] = id.split(">");
      if (to !== undefined && !rest.length) {
        const numbers = model.messages.filter((m) => m.from === from && m.to === to).map((m) => `"${m.n}"`);
        hint = numbers.length ? `Highlight messages by number: ${numbers.join(", ")}.` : 'Highlight messages by their number ("3"), not from>to.';
      } else if (/^\d+$/.test(id))
        hint = `Messages are numbered ${range}.`;
      else
        hint = didYouMean(id, ids);
      report("sequence-unknown-highlight", `step ${i + 1} "${step.title}": no participant or message "${id}"`, hint);
    }
  });
  return errors;
}
var isMessageNumber = (id, count) => /^[1-9]\d*$/.test(id) && Number(id) <= count;

// src/diagram/sequenceLayout.ts
var HEAD_PAD_X = 12;
var HEAD_PAD_Y = 8;
var HEAD_ICON = 16;
var HEAD_ICON_GAP = 8;
var SUB_GAP2 = 2;
var HEAD_MIN_W = 88;
var COL_GAP = 32;
var LABEL_PAD_X = 6;
var LABEL_GAP = 3;
var BADGE_PAD_X = 4;
var SELF_W = 32;
var SELF_H = 18;
var FIRST_GAP = 18;
var ROW_GAP = 12;
var TAIL = 14;
var BLOCK_PAD_X = 16;
var BLOCK_INSET = 8;
var BLOCK_TITLE_PAD_X = 8;
var BLOCK_TITLE_PAD_Y = 3;
var BLOCK_TITLE_GAP = 6;
var BLOCK_END_PAD = 10;
var MARGIN = 2;
var ARROW_HALF = 4.5;
function sequenceLayout(model, m) {
  const col = new Map;
  model.participants.forEach((p, i) => {
    if (!col.has(p.id))
      col.set(p.id, i);
  });
  const heads = model.participants.filter((p, i) => col.get(p.id) === i);
  col.clear();
  heads.forEach((p, i) => col.set(p.id, i));
  const headH = Math.max(0, ...heads.map((p) => HEAD_PAD_Y * 2 + m.label.lineHeight + (p.sub ? SUB_GAP2 + m.sub.lineHeight : 0)));
  const headW = heads.map((p) => {
    const text = Math.max(m.label.width(p.label), p.sub ? m.sub.width(p.sub) : 0);
    return Math.max(HEAD_MIN_W, Math.ceil(HEAD_PAD_X * 2 + HEAD_ICON + HEAD_ICON_GAP + text));
  });
  const rows = model.messages.filter((msg) => col.has(msg.from) && col.has(msg.to));
  const badgeH = m.badge.lineHeight + 2;
  const badgeW = (n) => Math.max(badgeH, Math.ceil(m.badge.width(String(n)) + BADGE_PAD_X * 2));
  const plateW = (label) => Math.ceil(m.message.width(label) + LABEL_PAD_X * 2);
  const gaps = headW.slice(1).map((w, i) => (headW[i] + w) / 2 + COL_GAP);
  let right = (headW[headW.length - 1] ?? 0) / 2;
  const spans = rows.map((msg) => {
    const a = col.get(msg.from);
    const b = col.get(msg.to);
    const self = a === b;
    const need = self ? badgeW(msg.n) / 2 + LABEL_GAP + Math.max(plateW(msg.label), SELF_W) + LABEL_GAP : badgeW(msg.n) / 2 + LABEL_GAP + plateW(msg.label) + LABEL_GAP * 2;
    return { lo: Math.min(a, b), hi: self ? a + 1 : Math.max(a, b), need };
  }).sort((p, q) => p.hi - p.lo - (q.hi - q.lo));
  for (const s of spans) {
    if (s.lo >= gaps.length) {
      right = Math.max(right, s.need);
      continue;
    }
    let have = 0;
    for (let i = s.lo;i < s.hi; i++)
      have += gaps[i];
    const short = (s.need - have) / (s.hi - s.lo);
    if (short > 0)
      for (let i = s.lo;i < s.hi; i++)
        gaps[i] += short;
  }
  const cx = [];
  heads.forEach((_, i) => cx.push(i ? cx[i - 1] + gaps[i - 1] : headW[0] / 2));
  const rowOf = new Map(rows.map((msg, i) => [msg.n, i]));
  const blocks = model.blocks.flatMap((b, index) => {
    if (!blockFits(b, model.count))
      return [];
    let first = -1;
    let last = -1;
    for (let n = b.first;n <= b.last; n++) {
      const r = rowOf.get(n);
      if (r === undefined)
        continue;
      if (first < 0)
        first = r;
      last = r;
    }
    return first < 0 ? [] : [{ block: b, index, first, last, inner: 0, top: 0, bottom: 0 }];
  });
  const inside = (k, j) => k !== j && k.first >= j.first && k.last <= j.last && (k.first !== j.first || k.last !== j.last || k.index > j.index);
  const bySize = [...blocks].sort((p, q) => p.last - p.first - (q.last - q.first) || q.index - p.index);
  for (const j of bySize)
    for (const k of bySize)
      if (inside(k, j))
        j.inner = Math.max(j.inner, k.inner + 1);
  const outerFirst = (p, q) => q.last - p.last || p.index - q.index;
  const innerFirst = (p, q) => p.first - q.first || q.index - p.index;
  const titleH = m.block.lineHeight + BLOCK_TITLE_PAD_Y * 2;
  const messages = [];
  let y = headH + FIRST_GAP;
  rows.forEach((msg, r) => {
    for (const b of blocks.filter((b) => b.first === r).sort(outerFirst)) {
      b.top = y;
      y += titleH + BLOCK_TITLE_GAP;
    }
    const a = cx[col.get(msg.from)];
    const b = cx[col.get(msg.to)];
    const lh = m.message.lineHeight;
    const arrowY = y + lh + LABEL_GAP;
    const bw = badgeW(msg.n);
    const badge = { x: a - bw / 2, y: arrowY - badgeH / 2, w: bw, h: badgeH };
    const pw = plateW(msg.label);
    let row;
    if (a === b) {
      const x0 = a + bw / 2;
      const loopRight = x0 + SELF_W;
      const bottom = arrowY + SELF_H;
      const label = { x: x0 + LABEL_GAP, y, w: pw, h: lh };
      row = {
        n: msg.n,
        from: msg.from,
        to: msg.to,
        y: arrowY,
        x0,
        x1: a,
        self: { right: loopRight, bottom },
        badge,
        label,
        hit: { x: badge.x, y, w: Math.max(label.x + pw, loopRight) - badge.x, h: bottom + ARROW_HALF - y },
        depth: 0
      };
      y = bottom;
    } else {
      const dir = Math.sign(b - a);
      const x0 = a + dir * bw / 2;
      const mid = (x0 + b) / 2;
      const label = { x: mid - pw / 2, y, w: pw, h: lh };
      const lo = Math.min(badge.x, b, label.x);
      const hi = Math.max(badge.x + bw, b, label.x + pw);
      row = { n: msg.n, from: msg.from, to: msg.to, y: arrowY, x0, x1: b, badge, label, hit: { x: lo, y, w: hi - lo, h: badge.y + badgeH - y }, depth: 0 };
      y = arrowY;
    }
    row.depth = blocks.filter((blk) => blk.first <= r && r <= blk.last).length;
    messages.push(row);
    y += Math.max(badgeH / 2, ARROW_HALF);
    for (const blk of blocks.filter((blk) => blk.last === r).sort(innerFirst)) {
      y += BLOCK_END_PAD;
      blk.bottom = y;
    }
    y += ROW_GAP;
  });
  const lifelineEnd = rows.length ? y - ROW_GAP + TAIL : headH + FIRST_GAP + TAIL;
  const frames = blocks.map((blk) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let r = blk.first;r <= blk.last; r++) {
      const row = messages[r];
      lo = Math.min(lo, cx[col.get(row.from)], cx[col.get(row.to)]);
      hi = Math.max(hi, cx[col.get(row.from)], cx[col.get(row.to)], row.self ? Math.max(row.self.right, row.label.x + row.label.w) : -Infinity);
    }
    const pad = BLOCK_PAD_X + blk.inner * BLOCK_INSET;
    const titleW = Math.ceil(m.block.width(blk.block.label) + BLOCK_TITLE_PAD_X * 2);
    const x = lo - pad;
    const w = Math.max(hi + pad - x, titleW + BLOCK_INSET * 2);
    return { label: blk.block.label, first: blk.block.first, last: blk.block.last, x, y: blk.top, w, h: blk.bottom - blk.top, titleW, titleH };
  });
  const minX = Math.min(0, ...frames.map((f) => f.x));
  const dx = MARGIN - minX;
  const dy = MARGIN;
  const participants = heads.map((p, i) => ({ id: p.id, x: cx[i] - headW[i] / 2 + dx, y: dy, w: headW[i], h: headH, cx: cx[i] + dx }));
  const move = (r) => ({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h });
  const placed = messages.map((row) => ({
    ...row,
    y: row.y + dy,
    x0: row.x0 + dx,
    x1: row.x1 + dx,
    ...row.self ? { self: { right: row.self.right + dx, bottom: row.self.bottom + dy } } : {},
    badge: move(row.badge),
    label: move(row.label),
    hit: move(row.hit)
  }));
  const placedFrames = frames.map((f) => ({ ...f, x: f.x + dx, y: f.y + dy }));
  const lastCx = cx.length ? cx[cx.length - 1] : 0;
  const maxX = Math.max(lastCx + right, ...placed.map((row) => row.hit.x + row.hit.w - dx), ...frames.map((f) => f.x + f.w));
  return {
    width: Math.ceil(maxX + dx + MARGIN),
    height: Math.ceil(lifelineEnd + dy + MARGIN),
    participants,
    lifeline: { y0: headH + dy, y1: lifelineEnd + dy },
    messages: placed,
    blocks: placedFrames
  };
}

// src/components/sequence.ts
var ARROW_LEN = 8;
var ARROW_HALF2 = 4.5;
var DASH2 = [5, 4];
var LIFELINE_DASH = [4, 4];
var styles2 = (t) => ({
  label: typography(t, "label", "heavy"),
  sub: typography(t, "body", "small"),
  message: typography(t, "label", "small"),
  block: typography(t, "label", "small-heavy"),
  badge: typography(t, "number", "extra-small-heavy")
});
function measurers2(ctx, s, model) {
  const m = {
    label: new Measurer(ctx, s.label, "m-label"),
    sub: new Measurer(ctx, s.sub, "m-sub"),
    message: new Measurer(ctx, s.message, "m-message"),
    block: new Measurer(ctx, s.block, "m-block"),
    badge: new Measurer(ctx, s.badge, "m-badge")
  };
  m.label.want(model.participants.map((p) => p.label));
  m.sub.want(model.participants.flatMap((p) => p.sub ? [p.sub] : []));
  m.message.want(model.messages.map((msg) => msg.label));
  m.block.want(model.blocks.map((b) => b.label));
  m.badge.want(model.messages.map((msg) => String(msg.n)));
  return m;
}
function marks2(model, highlight, hover) {
  const participants = new Set;
  const messages = new Set;
  const ids = new Set(model.participants.map((p) => p.id));
  const lightMessage = (n) => {
    const msg = model.messages.find((x) => x.n === n);
    if (!msg)
      return;
    messages.add(n);
    participants.add(msg.from);
    participants.add(msg.to);
  };
  for (const id of highlight ?? []) {
    if (ids.has(id))
      participants.add(id);
    else if (isMessageNumber(id, model.count))
      lightMessage(Number(id));
  }
  if (hover?.startsWith("p:")) {
    const id = hover.slice(2);
    participants.add(id);
    for (const msg of model.messages)
      if (msg.from === id || msg.to === id)
        messages.add(msg.n);
  } else if (hover?.startsWith("m:"))
    lightMessage(Number(hover.slice(2)));
  return { active: highlight !== null, participants, messages };
}
function revealBox2(drawn, highlight) {
  const { layout, model } = drawn;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x0, y0, x1, y1) => {
    box.x0 = Math.min(box.x0, x0);
    box.y0 = Math.min(box.y0, y0);
    box.x1 = Math.max(box.x1, x1);
    box.y1 = Math.max(box.y1, y1);
  };
  const ids = new Set(model.participants.map((p) => p.id));
  for (const id of highlight) {
    if (ids.has(id)) {
      const p = layout.participants.find((x) => x.id === id);
      if (p)
        add(p.x, p.y, p.x + p.w, p.y + p.h);
    } else if (isMessageNumber(id, model.count)) {
      const row = layout.messages.find((r) => r.n === Number(id));
      if (row)
        add(row.hit.x, row.hit.y, row.hit.x + row.hit.w, row.hit.y + row.hit.h);
    }
  }
  return box.x0 === Infinity ? null : box;
}
function paths(drawn, z, m, color) {
  const k = Math.max(z, 0.6);
  const builders = new Map;
  const get = (c) => {
    let b = builders.get(c);
    if (!b) {
      const width = c === "lit" ? 2 : 1.25;
      b = {
        lifeline: PathBuilder11.stroke(c === "lit" ? 1.5 : 1).dash_array(LIFELINE_DASH.map((v) => v * k)),
        solid: PathBuilder11.stroke(width),
        dashed: PathBuilder11.stroke(width).dash_array(DASH2.map((v) => v * k)),
        open: PathBuilder11.stroke(width),
        fill: PathBuilder11.fill(),
        used: new Set
      };
      builders.set(c, b);
    }
    return b;
  };
  const classOf = (lit) => lit ? "lit" : m.active ? "dim" : "normal";
  const { layout, model } = drawn;
  for (const p of layout.participants) {
    const b = get(classOf(m.participants.has(p.id)));
    b.used.add("lifeline");
    b.lifeline.move_to(p.cx * z, layout.lifeline.y0 * z).line_to(p.cx * z, layout.lifeline.y1 * z);
  }
  const styleOf = new Map(model.messages.map((msg) => [msg.n, msg.style]));
  for (const row of layout.messages) {
    const style = styleOf.get(row.n) ?? "call";
    const b = get(classOf(m.messages.has(row.n)));
    const line = style === "reply" ? b.dashed : b.solid;
    b.used.add(style === "reply" ? "dashed" : "solid");
    const y = row.y * z;
    let sx;
    if (row.self) {
      line.move_to(row.x0 * z, y).line_to(row.self.right * z, y).line_to(row.self.right * z, row.self.bottom * z);
      sx = row.self.right * z;
    } else {
      line.move_to(row.x0 * z, y);
      sx = row.x0 * z;
    }
    const ty = row.self ? row.self.bottom * z : y;
    const tx = row.x1 * z;
    const dx = Math.sign(tx - sx) || 1;
    const len = Math.min(ARROW_LEN * k, Math.abs(tx - sx));
    const half = ARROW_HALF2 * k;
    const bx = tx - dx * len;
    if (style === "call") {
      line.line_to(bx, ty);
      b.used.add("fill");
      b.fill.add_polygon([[tx, ty], [bx, ty - half], [bx, ty + half]], true);
    } else {
      line.line_to(tx, ty);
      b.used.add("open");
      b.open.move_to(bx, ty - half).line_to(tx, ty).line_to(bx, ty + half);
    }
  }
  const out = [];
  for (const c of ["dim", "normal", "lit"]) {
    const b = builders.get(c);
    if (!b)
      continue;
    for (const part of ["lifeline", "dashed", "solid", "open", "fill"])
      if (b.used.has(part))
        out.push({ path: b[part].build(), paint: color[c] });
  }
  return out;
}
function askParticipant(d, id) {
  const p = d.drawn.model.participants.find((x) => x.id === id);
  if (!p)
    return;
  const message = `Tell me more about ${p.label}`;
  d.ctx.trigger(message, p.action ?? { steps: [{ type: e0.ToAssistant, message, context: { diagram: d.statementId, node: id } }] });
}
function askMessage(d, n) {
  const msg = d.drawn.model.messages.find((x) => x.n === n);
  if (!msg)
    return;
  const message = `Tell me more about message ${n}: ${msg.label}`;
  d.ctx.trigger(message, { steps: [{ type: e0.ToAssistant, message, context: { diagram: d.statementId, message: n } }] });
}
function drawing2(o, d, z, part) {
  const t = o.t;
  const { drawn, local, state, s } = d;
  const { layout, model } = drawn;
  const step = state.step === null ? undefined : model.steps[state.step];
  const m = marks2(model, step?.complete ? step.highlight : null, state.hover);
  const classOf = (lit) => lit ? "lit" : m.active ? "dim" : "normal";
  const pathKey = `${z}|${m.active}|${[...m.participants].join(",")}|${[...m.messages].join(",")}`;
  let built = local.paths[part];
  if (built?.key !== pathKey) {
    const muted = t.textNeutralSecondary;
    built = { key: pathKey, painted: paths(drawn, z, m, { normal: muted, dim: alpha(muted, DIMMED), lit: t.interactiveAccentDefault }) };
    local.paths[part] = built;
  }
  const frames = layout.blocks.map((f) => {
    const lit = [...m.messages].some((n) => n >= f.first && n <= f.last);
    const frame = div35().absolute().left(f.x * z).top(f.y * z).w(f.w * z).h(f.h * z).rounded(t.radiusM * z).bg(t.sunkLight).border_1().border_color(t.borderDefault).when(m.active && !lit, (el) => el.opacity(0.6));
    const title = div35().absolute().left(f.x * z).top(f.y * z).rounded_tl(t.radiusM * z).rounded_br(t.radiusM * z).bg(t.foreground).when(m.active && !lit, (el) => el.opacity(0.6)).child(textStyle(div35().flex().items_center().whitespace_nowrap(), scaled(s.block, z)).h(f.titleH * z).px(BLOCK_TITLE_PAD_X * z).rounded_tl(t.radiusM * z).rounded_br(t.radiusM * z).bg(t.sunk).border_r_1().border_b_1().border_color(t.borderDefault).text_color(t.textNeutralSecondary).child(f.label));
    return { frame, title };
  });
  const labelOf = new Map(model.messages.map((msg) => [msg.n, msg.label]));
  const messages = layout.messages.map((row) => {
    const c = classOf(m.messages.has(row.n));
    const lit = c === "lit";
    let label = textStyle(div35().size_full().flex().items_center().justify_center().whitespace_nowrap(), scaled(s.message, z)).text_color(lit ? t.interactiveAccentDefault : t.textNeutralSecondary).child(labelOf.get(row.n) ?? "");
    for (let i = 0;i < row.depth; i++)
      label = div35().size_full().bg(t.sunkLight).child(label);
    const plate = div35().absolute().left((row.label.x - row.hit.x) * z).top((row.label.y - row.hit.y) * z).w(row.label.w * z).h(row.label.h * z).bg(t.foreground).child(label);
    const badge = div35().absolute().left((row.badge.x - row.hit.x) * z).top((row.badge.y - row.hit.y) * z).w(row.badge.w * z).h(row.badge.h * z).rounded(row.badge.h * z).bg(t.foreground).child(textStyle(div35().size_full().flex().items_center().justify_center(), scaled(s.badge, z)).rounded(row.badge.h * z).bg(lit ? t.interactiveAccentDefault : t.elevated).border_1().border_color(lit ? t.interactiveAccentDefault : t.borderDefault).text_color(lit ? t.textWhite : t.textNeutralSecondary).child(String(row.n)));
    return pointable(div35().id(o.id(`${part}-msg-${row.n}`)).absolute().left(row.hit.x * z).top(row.hit.y * z).w(row.hit.w * z).h(row.hit.h * z).when(c === "dim", (el) => el.opacity(DIMMED)), state, `m:${row.n}`, () => askMessage(d, row.n)).children([plate, badge]);
  });
  const heads = layout.participants.flatMap((p) => {
    const info = model.participants.find((x) => x.id === p.id);
    if (!info)
      return [];
    const c = classOf(m.participants.has(p.id));
    const lit = c === "lit";
    const icon = o.icon(KIND_ICON[info.kind], { size: HEAD_ICON * z });
    const text = div35().flex().flex_col().min_w_0().gap(SUB_GAP2 * z).child(textStyle(div35().whitespace_nowrap(), scaled(s.label, z)).text_color(t.textNeutralPrimary).child(info.label)).children(info.sub ? [textStyle(div35().whitespace_nowrap(), scaled(s.sub, z)).text_color(t.textNeutralSecondary).child(info.sub)] : []);
    let box = pointable(div35().id(o.id(`${part}-p-${p.id}`)).absolute().left(p.x * z).top(p.y * z).w(p.w * z).h(p.h * z).flex().flex_row().items_center().gap(HEAD_ICON_GAP * z).px(HEAD_PAD_X * z).rounded(t.radiusM * z).bg(lit ? t.highlightSubtle : t.elevated).border_1().border_color(lit ? t.interactiveAccentDefault : t.borderDefault).text_color(lit ? t.interactiveAccentDefault : t.textNeutralSecondary), state, `p:${p.id}`, () => askParticipant(d, p.id)).children(optional(icon)).child(text);
    if (info.kind === "external")
      box = box.border_dashed();
    if (c === "dim")
      box = box.opacity(DIMMED);
    return [box];
  });
  return div35().relative().w(layout.width * z).h(layout.height * z).children(frames.map((f) => f.frame)).children(built.painted.map(layer)).children(frames.map((f) => f.title)).children(messages).children(heads);
}
var Sequence2 = {
  render(props, ctx, node) {
    const model = sequenceModel(props, ctx.streaming);
    const statementId = node.statementId ?? "";
    const local = ctx.local({ drawn: null, key: null, paths: {} });
    const state = canvasState(ctx, model.steps.length);
    const s = styles2(ctx.t);
    const m = measurers2(ctx, s, model);
    const ms = Object.values(m);
    if (model.participants.length && ms.every((x) => x.charsReady)) {
      const widths = widthsVersion();
      if (local.key?.props !== props || local.key.widths !== widths) {
        local.drawn = { model, layout: sequenceLayout(model, m) };
        local.key = { props, widths };
        local.paths = {};
      }
    } else if (!model.participants.length)
      local.drawn = null;
    const drawn = local.drawn;
    let content = null;
    if (drawn) {
      const current = { model: { ...drawn.model, steps: model.steps }, layout: drawn.layout };
      const d = { ctx, drawn: current, local, state, s, statementId };
      content = {
        width: drawn.layout.width,
        height: drawn.layout.height,
        draw: (o, z, part) => drawing2(o, d, z, part),
        reveal: (highlight) => revealBox2(drawn, highlight)
      };
    }
    return canvas(ctx, state, {
      content,
      placeholder: model.participants.length ? "Measuring…" : "No participants yet",
      steps: model.steps,
      askStep: (i) => stepQuestion(ctx, statementId, model.steps, i),
      extra: ms.map((x) => x.probes()).filter((p) => p !== null)
    });
  }
};

// src/components/timeline.ts
import { div as div36, PathBuilder as PathBuilder12 } from "gpui-kit";

// src/diagram/timeline.ts
var TASK_STATUSES = ["planned", "active", "done", "blocked"];
var MAX_TASKS = 40;
var when = e258.union([e258.string(), e258.number()]);
var Task = e15({
  name: "Task",
  props: e258.object({
    id: e258.string(),
    label: e258.string(),
    start: when,
    end: when.optional(),
    lane: e258.string().optional(),
    after: e258.array(e258.string()).optional(),
    status: e258.enum(TASK_STATUSES).optional()
  }),
  description: 'A bar on a Timeline from start to end, both included. start/end: ISO days ("2027-01-04") or numbers (sprint 1, 2…), one kind per Timeline; no end: a milestone (a diamond at start). lane: rows group under lane headers. after: ids of the tasks it waits for. status: planned (default), active, done or blocked.',
  component: null
});
var Timeline = e15({
  name: "Timeline",
  props: e258.object({
    tasks: e258.array(Task.ref),
    steps: e258.array(DiagramStep.ref).optional()
  }),
  description: "Tasks on a time axis (a Gantt chart, a roadmap), one row each, grouped by lane, with arrows from each task's dependencies. steps: DiagramSteps whose highlight lists task ids.",
  component: null
});
var TIMELINE_NOTES = [
  "Write each Timeline as its own statement and its tasks as their own list: `t = Timeline(tTasks, tSteps)`.",
  'Clicking a task sends you `Tell me more about <label>` with context {diagram: "<statement id>", task: "<id>"}.'
];
var ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
var DAY_MS = 86400000;
function parseWhen(v) {
  if (typeof v === "number")
    return Number.isFinite(v) ? { unit: "number", value: v } : null;
  if (typeof v !== "string")
    return null;
  const m = ISO_DAY.exec(v);
  if (!m)
    return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
    return null;
  return { unit: "date", value: ms / DAY_MS };
}
function dayParts(day) {
  const d = new Date(day * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate(), weekday: ((day + 3) % 7 + 7) % 7 };
}
var dayOf = (year, month, date = 1) => Date.UTC(year, month, date) / DAY_MS;
var text4 = (v) => typeof v === "string" ? v : undefined;
var written = (v) => typeof v === "string" ? `"${v}"` : String(v);
function timelineModel(props, streaming) {
  const els = Array.isArray(props.tasks) ? props.tasks.filter((x) => e24(x) && x.typeName === "Task") : [];
  let tasks = [];
  for (const el of els) {
    const p = el.props;
    const id = text4(p.id);
    if (!id || p.start == null)
      continue;
    const start = parseWhen(p.start);
    const hasEnd = p.end != null;
    const end = hasEnd ? parseWhen(p.end) : null;
    if (streaming && (!start || hasEnd && !end))
      continue;
    const lane = text4(p.lane);
    tasks.push({
      id,
      label: text4(p.label) ?? "",
      start,
      end,
      startText: written(p.start),
      ...hasEnd ? { endText: written(p.end) } : {},
      ...lane ? { lane } : {},
      after: Array.isArray(p.after) ? p.after.filter((a) => typeof a === "string") : [],
      status: TASK_STATUSES.includes(p.status) ? p.status : "planned"
    });
  }
  const unit = tasks.find((t) => t.start)?.start?.unit ?? null;
  if (streaming) {
    const ids = new Set(tasks.map((t) => t.id));
    tasks = tasks.map((t) => ({ ...t, after: t.after.filter((a) => ids.has(a)) }));
  }
  return { tasks, steps: diagramSteps(props.steps, streaming), unit };
}
function badTimeHint(raw) {
  const v = raw.startsWith('"') ? raw.slice(1, -1) : raw;
  if (/^-?\d+(\.\d+)?$/.test(v))
    return `Write the number without quotes: ${v}.`;
  const day = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(v);
  if (day)
    return `Use the calendar day alone: "${day[1]}".`;
  if (ISO_DAY.test(v))
    return `${raw} is no calendar day.`;
  return 'Write an ISO day ("2027-01-04") or a number (1, 2, 3).';
}
function validateTimeline(model, statementId) {
  const errors = [];
  const report = (code, message, hint, warning = false) => errors.push({
    source: "parser",
    code,
    message,
    component: "Timeline",
    ...statementId ? { statementId } : {},
    ...hint ? { hint } : {},
    ...warning ? { severity: "warning" } : {}
  });
  const didYouMean = (id, ids) => {
    const match = closest(id, ids);
    return match ? `Did you mean "${match}"?` : undefined;
  };
  if (!model.tasks.length) {
    report("timeline-empty", "the Timeline has no tasks", "Give it Tasks, or remove it.");
    return errors;
  }
  const ids = new Set;
  for (const t of model.tasks) {
    if (ids.has(t.id))
      report("timeline-duplicate-id", `task id "${t.id}" is used twice`, "Task ids are unique per Timeline: rename one.");
    ids.add(t.id);
  }
  if (model.tasks.length > MAX_TASKS) {
    report("timeline-too-big", `the Timeline has ${model.tasks.length} tasks`, `More than ${MAX_TASKS} is hard to read: split it into several Timelines.`, true);
  }
  const unit = model.unit;
  const first = model.tasks.find((t) => t.start);
  for (const t of model.tasks) {
    if (!t.start)
      report("timeline-bad-date", `task "${t.id}": start ${t.startText} is no date or number`, badTimeHint(t.startText));
    if (t.endText !== undefined && !t.end)
      report("timeline-bad-date", `task "${t.id}": end ${t.endText} is no date or number`, badTimeHint(t.endText));
    const odd = [t.start && ["start", t.startText, t.start], t.end && ["end", t.endText, t.end]].find((x) => x && unit && x[2].unit !== unit);
    if (odd && unit && first) {
      report("timeline-mixed-units", `task "${t.id}": ${odd[0]} ${odd[1]} is a ${odd[2].unit}, but this Timeline uses ${unit === "date" ? "dates" : "numbers"} (task "${first.id}" starts ${first.startText})`, 'One Timeline uses ISO days ("2027-01-04") or numbers (1, 2, 3), not both.');
    } else if (t.start && t.end && t.end.value < t.start.value) {
      report("timeline-end-before-start", `task "${t.id}": ends ${t.endText} before it starts ${t.startText}`, "Swap them; or leave end out for a milestone.");
    }
  }
  const lanes = new Set(model.tasks.flatMap((t) => t.lane ? [t.lane] : []));
  for (const t of model.tasks) {
    for (const a of t.after) {
      if (ids.has(a))
        continue;
      report("timeline-unknown-dependency", `task "${t.id}": after "${a}": no task "${a}"`, lanes.has(a) ? `"${a}" is a lane; name the tasks it waits for.` : didYouMean(a, ids));
    }
  }
  model.steps.forEach((step, i) => {
    if (!step.complete)
      return;
    for (const id of step.highlight) {
      if (ids.has(id))
        continue;
      report("timeline-unknown-highlight", `step ${i + 1} "${step.title}": no task "${id}"`, lanes.has(id) ? `"${id}" is a lane; highlight its tasks.` : didYouMean(id, ids));
    }
  });
  return errors;
}

// src/diagram/timelineLayout.ts
var PLOT_W = 840;
var LEFT = 16;
var RIGHT = 16;
var AXIS_TOP = 22;
var AXIS_BOTTOM = 6;
var TICK_LABEL_PAD = 5;
var TICK_LABEL_GAP = 8;
var LANE_PAD_Y = 6;
var LANE_PAD_X = 10;
var ROW_PAD_Y2 = 7;
var BAR_PAD_X = 8;
var BAR_PAD_Y = 5;
var LABEL_GAP2 = 6;
var STUB = 10;
var INSET = 6;
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var clamp3 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function numberScale(lo, hi) {
  const a = Math.floor(lo);
  const b = Math.max(Math.ceil(hi), a + 1);
  const ppu = clamp3(PLOT_W / (b - a), 6, 140);
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((s) => s * ppu >= 28) ?? 1000;
  const first = Math.floor(a / step) * step;
  const last = Math.ceil(b / step) * step;
  const ticks = [];
  for (let v = first;v <= last; v += step)
    ticks.push({ v, label: String(v) });
  return { kind: "number", lo: first, hi: last, ppu, ticks };
}
function dateScale(lo, hi) {
  const span = Math.max(hi - lo, 1);
  const label = (day, long) => {
    const p = dayParts(day);
    return long ? `${MONTHS[p.month]} ${p.date}` : String(p.date);
  };
  if (span <= 31) {
    const ppu = clamp3(PLOT_W / span, 28, 80);
    const ticks = [];
    for (let d = lo;d <= hi; d++)
      ticks.push({ v: d, label: label(d, d === lo || dayParts(d).date === 1) });
    return { kind: "day", lo, hi, ppu, ticks };
  }
  if (span <= 140) {
    const first = lo - dayParts(lo).weekday;
    const last = hi + (7 - dayParts(hi).weekday) % 7;
    const ppu = clamp3(PLOT_W / (last - first), 6, 24);
    const ticks = [];
    for (let d = first;d <= last; d += 7)
      ticks.push({ v: d, label: label(d, true) });
    return { kind: "week", lo: first, hi: last, ppu, ticks };
  }
  const start = dayParts(lo);
  const end = dayParts(hi);
  const firstMonth = start.year * 12 + start.month;
  const lastMonth = end.year * 12 + end.month + (end.date > 1 ? 1 : 0);
  const days = dayOf(Math.floor(lastMonth / 12), lastMonth % 12) - dayOf(start.year, start.month);
  const ppu = clamp3(PLOT_W / days, 0.3, 4);
  const step = [1, 3, 6, 12].find((s) => s * 30.4 * ppu >= 34) ?? 12;
  const from = Math.floor(firstMonth / step) * step;
  const to = Math.ceil(lastMonth / step) * step;
  const ticks = [];
  for (let m = from;m <= to; m += step) {
    const [year, month] = [Math.floor(m / 12), m % 12];
    const text = step === 12 ? String(year) : m === from || month === 0 ? `${MONTHS[month]} ${year}` : MONTHS[month];
    ticks.push({ v: dayOf(year, month), label: text });
  }
  return { kind: "month", lo: ticks[0].v, hi: ticks[ticks.length - 1].v, ppu, ticks };
}
function span(t, unit) {
  if (!t.start || t.start.unit !== unit)
    return null;
  if (t.endText === undefined)
    return [t.start.value, t.start.value];
  if (!t.end || t.end.unit !== unit)
    return null;
  const [a, b] = t.start.value <= t.end.value ? [t.start.value, t.end.value] : [t.end.value, t.start.value];
  return [a, b + 1];
}
function route(src, dst) {
  const ty = dst.y + dst.h / 2;
  const tx = dst.x0;
  if (src.inside && tx - src.x1 >= 2 * STUB) {
    const sy = src.y + src.h / 2;
    return [[src.x1, sy], [src.x1 + STUB, sy], [src.x1 + STUB, ty], [tx, ty]];
  }
  const down = dst.rowY > src.rowY;
  const leave = down ? src.y + src.h : src.y;
  const ex = src.milestone ? (src.x0 + src.x1) / 2 : clamp3(Math.min(tx, src.x1) - STUB, src.x0 + INSET, src.x1 - INSET);
  if (tx - ex >= STUB)
    return [[ex, leave], [ex, ty], [tx, ty]];
  if (!dst.milestone && ex >= dst.x0 + INSET && ex <= dst.x1 - INSET)
    return [[ex, leave], [ex, down ? dst.y : dst.y + dst.h]];
  const gy = down ? dst.rowY : dst.rowY + dst.rowH;
  return [[ex, leave], [ex, gy], [tx - STUB, gy], [tx - STUB, ty], [tx, ty]];
}
function timelineLayout(model, m) {
  const unit = model.unit;
  if (!unit)
    return null;
  const placed = model.tasks.flatMap((t) => {
    const s = span(t, unit);
    return s ? [{ t, s }] : [];
  });
  if (!placed.length)
    return null;
  const lo = Math.min(...placed.map((p) => p.s[0]));
  const hi = Math.max(...placed.map((p) => p.s[1]));
  const scale = unit === "date" ? dateScale(lo, hi) : numberScale(lo, hi);
  const x = (v) => LEFT + (v - scale.lo) * scale.ppu;
  const lastStart = Math.max(...placed.map((p) => p.s[0]));
  const ticks = [];
  let free = -Infinity;
  scale.ticks.forEach((tk, i) => {
    const tx = x(tk.v);
    const labelX = tx + TICK_LABEL_PAD;
    const fits = labelX >= free && (i < scale.ticks.length - 1 || lastStart >= tk.v);
    ticks.push({ x: tx, label: fits ? tk.label : null, labelX });
    if (fits)
      free = labelX + m.tick(tk.label) + TICK_LABEL_GAP;
  });
  const axisH = AXIS_TOP + m.tickH + AXIS_BOTTOM;
  const order = [];
  for (const p of placed)
    if (!order.includes(p.t.lane))
      order.push(p.t.lane);
  const barH = m.contentH + BAR_PAD_Y * 2;
  const rowH = barH + ROW_PAD_Y2 * 2;
  const laneH = m.laneH + LANE_PAD_Y * 2;
  const lanes = [];
  const bars = [];
  const after = [];
  let y = axisH;
  let right = x(scale.hi);
  for (const lane of order) {
    if (lane !== undefined) {
      lanes.push({ label: lane, labelX: LANE_PAD_X, y, h: laneH });
      right = Math.max(right, LANE_PAD_X * 2 + m.lane(lane));
      y += laneH;
    }
    for (const { t, s } of placed.filter((p) => p.t.lane === lane)) {
      const w = m.content(t);
      const milestone = t.endText === undefined;
      const by = y + ROW_PAD_Y2;
      let bar;
      if (milestone) {
        const cx = x(s[0]);
        bar = { id: t.id, rowY: y, rowH, x0: cx - barH / 2, x1: cx + barH / 2, y: by, h: barH, milestone, labelX: cx + barH / 2 + LABEL_GAP2, labelW: w, inside: false };
      } else {
        const [x0, x1] = [x(s[0]), x(s[1])];
        const inside = w + BAR_PAD_X * 2 <= x1 - x0;
        bar = { id: t.id, rowY: y, rowH, x0, x1, y: by, h: barH, milestone, labelX: inside ? x0 + BAR_PAD_X : x1 + LABEL_GAP2, labelW: w, inside };
      }
      bars.push(bar);
      after.push(t.after);
      right = Math.max(right, bar.inside ? bar.x1 : bar.labelX + w);
      y += rowH;
    }
  }
  const byId = new Map(bars.map((b) => [b.id, b]));
  const arrows = [];
  bars.forEach((b, i) => {
    for (const dep of new Set(after[i])) {
      const src = byId.get(dep);
      if (!src || dep === b.id)
        continue;
      arrows.push({ id: `${dep}>${b.id}`, from: dep, to: b.id, points: route(src, b) });
    }
  });
  const ticksRight = ticks.reduce((r, tk) => tk.label ? Math.max(r, tk.labelX + m.tick(tk.label)) : r, 0);
  return {
    width: Math.ceil(Math.max(right, ticksRight) + RIGHT),
    height: y,
    unit,
    tickKind: scale.kind,
    axisH,
    tickY: AXIS_TOP,
    x0: x(scale.lo),
    x1: x(scale.hi),
    ticks,
    lanes,
    bars,
    arrows
  };
}

// src/components/timeline.ts
var ICON = 12;
var ICON_GAP = 5;
var RING = 3;
var DIAMOND = 0.42;
var ARROW_LEN2 = 7;
var ARROW_HALF3 = 4;
var STATUS_ICON = { done: "Check", blocked: "Ban" };
var styles3 = (t) => ({
  label: typography(t, "label", "heavy"),
  lane: typography(t, "label", "small-heavy"),
  tick: typography(t, "label", "small")
});
function look2(t, status) {
  switch (status) {
    case "active":
      return { bg: t.interactiveAccentDefault, border: t.interactiveAccentDefault, fg: t.textAccentPrimary, outside: t.textNeutralPrimary };
    case "done":
      return { bg: over(t.sunk, t.foreground), border: t.borderInteractive, fg: t.textNeutralSecondary, outside: t.textNeutralSecondary };
    case "blocked":
      return { bg: over(t.dangerBackground, t.foreground), border: t.borderDanger, fg: t.textDangerPrimary, outside: t.textDangerPrimary };
    default:
      return { bg: t.foreground, border: t.borderInteractiveEmphasis, fg: t.textNeutralPrimary, outside: t.textNeutralPrimary };
  }
}
function marks3(layout, highlight, hover) {
  const tasks = new Set(highlight ?? []);
  const arrows = new Set(layout.arrows.filter((a) => tasks.has(a.from) && tasks.has(a.to)).map((a) => a.id));
  if (hover) {
    tasks.add(hover);
    for (const a of layout.arrows)
      if (a.from === hover || a.to === hover)
        arrows.add(a.id);
  }
  return { active: highlight !== null, tasks, arrows };
}
var extent = (b) => ({ x0: b.x0, y0: b.y, x1: b.inside ? b.x1 : b.labelX + b.labelW, y1: b.y + b.h });
function revealBox3(layout, highlight) {
  const lit = layout.bars.filter((b) => highlight.includes(b.id));
  if (!lit.length)
    return null;
  return lit.map(extent).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
}
function paths2(d, z, m) {
  const { t, layout, model } = d;
  const fills = new Map;
  const strokes = new Map;
  const fill = (c) => fills.get(c) ?? (fills.set(c, PathBuilder12.fill()), fills.get(c));
  const stroke = (c, width) => {
    const key = `${c}|${width}`;
    let s = strokes.get(key);
    if (!s)
      strokes.set(key, s = { width, color: c, b: PathBuilder12.stroke(width) });
    return s.b;
  };
  const muted = t.textNeutralSecondary;
  const arrowColor = { normal: muted, dim: alpha(muted, DIMMED), lit: t.interactiveAccentDefault };
  const out = [];
  for (const c of ["dim", "normal", "lit"]) {
    const arrows = layout.arrows.filter((a) => (m.arrows.has(a.id) ? "lit" : m.active ? "dim" : "normal") === c);
    if (!arrows.length)
      continue;
    const line = PathBuilder12.stroke(c === "lit" ? 2 : 1.25);
    const head = PathBuilder12.fill();
    for (const a of arrows) {
      const pts = a.points.map(([x, y]) => [x * z, y * z]);
      const [tx, ty] = pts[pts.length - 1];
      const [sx, sy] = pts[pts.length - 2];
      const len = Math.hypot(tx - sx, ty - sy) || 1;
      const [dx, dy] = [(tx - sx) / len, (ty - sy) / len];
      const arrow = Math.min(ARROW_LEN2 * Math.max(z, 0.6), len);
      const half = ARROW_HALF3 * Math.max(z, 0.6);
      const [bx, by] = [tx - dx * arrow, ty - dy * arrow];
      line.move_to(pts[0][0], pts[0][1]);
      for (let i = 1;i < pts.length - 1; i++)
        line.line_to(pts[i][0], pts[i][1]);
      line.line_to(bx, by);
      head.add_polygon([[tx, ty], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], true);
    }
    out.push({ path: line.build(), paint: arrowColor[c] }, { path: head.build(), paint: arrowColor[c] });
  }
  for (const b of layout.bars) {
    if (!b.milestone)
      continue;
    const task = model.tasks.find((x) => x.id === b.id);
    const cx = (b.x0 + b.x1) / 2 * z;
    const cy = (b.y + b.h / 2) * z;
    const r = b.h * DIAMOND * z;
    const diamond = (half) => [[cx, cy - half], [cx + half, cy], [cx, cy + half], [cx - half, cy]];
    const lit = m.tasks.has(b.id);
    const k = look2(t, task.status);
    const fade = (c) => m.active && !lit ? alpha(c, DIMMED) : c;
    fill(fade(k.bg)).add_polygon(diamond(r), true);
    stroke(fade(k.border), 1.25).add_polygon(diamond(r), true);
    if (lit)
      stroke(t.interactiveAccentDefault, 2).add_polygon(diamond(r + RING * 1.5 * z), true);
  }
  for (const [c, b] of fills)
    out.push({ path: b.build(), paint: c });
  for (const s of strokes.values())
    out.push({ path: s.b.build(), paint: s.color });
  return out;
}
function askTask(d, id) {
  const task = d.model.tasks.find((x) => x.id === id);
  if (!task)
    return;
  const message = `Tell me more about ${task.label}`;
  d.ctx.trigger(message, { steps: [{ type: e0.ToAssistant, message, context: { diagram: d.statementId, task: id } }] });
}
function content(o, d, task, z, color) {
  const name = STATUS_ICON[task.status];
  return div36().flex().flex_row().items_center().gap(ICON_GAP * z).text_color(color).children(name ? optional(o.icon(name, { size: ICON * z })) : []).child(textStyle(div36().whitespace_nowrap(), scaled(d.s.label, z)).child(task.label));
}
function drawing3(o, d, z, part) {
  const t = o.t;
  const { layout, model, local, state, s } = d;
  const step = state.step === null ? undefined : model.steps[state.step];
  const m = marks3(layout, step?.complete ? step.highlight : null, state.hover);
  const W = layout.width * z;
  const pathKey = `${z}|${m.active}|${[...m.tasks].join(",")}|${[...m.arrows].join(",")}`;
  let built = local.paths[part];
  if (built?.key !== pathKey) {
    built = { key: pathKey, painted: paths2(d, z, m) };
    local.paths[part] = built;
  }
  const lines = layout.ticks.map((tk) => div36().absolute().left(tk.x * z).top(0).w(1).h(layout.height * z).bg(t.borderDefault));
  const tickLabels = layout.ticks.flatMap((tk) => tk.label ? [
    textStyle(div36().absolute().whitespace_nowrap(), scaled(s.tick, z)).left(tk.labelX * z).top(layout.tickY * z).text_color(t.textNeutralSecondary).child(tk.label)
  ] : []);
  const bands = layout.lanes.flatMap((l) => [
    div36().absolute().left(0).top(l.y * z).w(W).h(l.h * z).bg(over(t.sunkLight, t.foreground)).border_t_1().border_b_1().border_color(t.borderDefault),
    textStyle(div36().absolute().whitespace_nowrap(), scaled(s.lane, z)).left(l.labelX * z).top(l.y * z).h(l.h * z).flex().items_center().text_color(t.textNeutralSecondary).when(m.active, (el) => el.opacity(0.6)).child(l.label)
  ]);
  const axisLine = div36().absolute().left(0).top(layout.axisH * z - 1).w(W).h(1).bg(t.borderDefault);
  const tasks = layout.bars.flatMap((b) => {
    const task = model.tasks.find((x) => x.id === b.id);
    if (!task)
      return [];
    const lit = m.tasks.has(b.id);
    const dim = m.active && !lit;
    const k = look2(t, task.status);
    const items = [];
    if (!b.milestone) {
      let bar = pointable(div36().id(o.id(`${part}-task-${b.id}`)).absolute().left(b.x0 * z).top(b.y * z).w((b.x1 - b.x0) * z).h(b.h * z).flex().items_center().overflow_hidden().rounded(t.radiusM * z).bg(k.bg).border_1().border_color(k.border), state, b.id, () => askTask(d, b.id));
      if (b.inside)
        bar = bar.pl((b.labelX - b.x0) * z).child(content(o, d, task, z, k.fg));
      if (dim)
        bar = bar.opacity(DIMMED);
      if (lit) {
        items.push(div36().absolute().left((b.x0 - RING) * z).top((b.y - RING) * z).w((b.x1 - b.x0 + RING * 2) * z).h((b.h + RING * 2) * z).rounded((t.radiusM + RING) * z).border_2().border_color(t.interactiveAccentDefault));
      }
      items.push(bar);
    } else {
      items.push(pointable(div36().id(o.id(`${part}-task-${b.id}`)).absolute().left(b.x0 * z).top(b.y * z).w((b.x1 - b.x0) * z).h(b.h * z), state, b.id, () => askTask(d, b.id)));
    }
    if (!b.inside) {
      let label = pointable(div36().id(o.id(`${part}-label-${b.id}`)).absolute().left(b.labelX * z).top(b.y * z).h(b.h * z).flex().items_center().child(content(o, d, task, z, lit ? t.interactiveAccentDefault : k.outside)), state, b.id, () => askTask(d, b.id));
      if (dim)
        label = label.opacity(DIMMED);
      items.push(label);
    }
    return items;
  });
  return div36().relative().w(W).h(layout.height * z).children(lines).children(bands).children(tickLabels).child(axisLine).children(built.painted.map(layer)).children(tasks);
}
var TICK_CHARS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec -0123456789";
var Timeline2 = {
  render(props, ctx, node) {
    const t = ctx.t;
    const model = timelineModel(props, ctx.streaming);
    const statementId = node.statementId ?? "";
    const local = ctx.local({ layout: null, key: "", paths: {} });
    const state = canvasState(ctx, model.steps.length);
    const s = styles3(t);
    const m = {
      label: new Measurer(ctx, s.label, "m-label").want(model.tasks.map((x) => x.label)),
      lane: new Measurer(ctx, s.lane, "m-lane").want(model.tasks.flatMap((x) => x.lane ? [x.lane] : [])),
      tick: new Measurer(ctx, s.tick, "m-tick").want([TICK_CHARS])
    };
    if (m.label.ready && m.lane.ready && m.tick.charsReady) {
      const laid = timelineLayout(model, {
        content: (task) => m.label.width(task.label) + (STATUS_ICON[task.status] ? ICON + ICON_GAP : 0),
        contentH: m.label.lineHeight,
        lane: (label) => m.lane.width(label),
        laneH: m.lane.lineHeight,
        tick: (label) => m.tick.width(label),
        tickH: m.tick.lineHeight
      });
      const key = laid ? JSON.stringify(laid) : "";
      if (key !== local.key) {
        local.layout = laid;
        local.key = key;
        local.paths = {};
      }
    }
    const probes = [m.label.probes(), m.lane.probes(), m.tick.probes()].filter((p) => p !== null);
    const layout = local.layout;
    const d = layout && { ctx, t, model, layout, local, state, s, statementId };
    const n = model.tasks.length;
    return canvas(ctx, state, {
      content: d && {
        width: d.layout.width,
        height: d.layout.height,
        draw: (o, z, part) => drawing3(o, { ...d, t: o.t }, z, part),
        reveal: (highlight) => revealBox3(d.layout, highlight)
      },
      placeholder: n ? `Laying out ${n} tasks…` : "No tasks yet",
      steps: model.steps,
      askStep: (i) => stepQuestion(ctx, statementId, model.steps, i),
      extra: probes
    });
  }
};
var TimelinePart = {
  render() {
    return null;
  }
};

// src/components/editable-table.ts
import { Input as GInput, InputState } from "gpui-base";
import { div as div38 } from "gpui-kit";

// src/components/editable-table-model.ts
var DEFAULT_COLUMN_WIDTH = 120;
var columnSize = (column) => column.width || DEFAULT_COLUMN_WIDTH;
function toRows(columnKeys, data) {
  return data.map((row) => {
    const values = Array.isArray(row.values) ? row.values : [];
    const valuesMap = {};
    columnKeys.forEach((key, index) => {
      valuesMap[key] = values[index];
    });
    return { ...valuesMap, id: row.id };
  });
}
function fromRows(columnKeys, rows) {
  return rows.map((row) => ({ id: row.id, values: columnKeys.map((key) => row[key]) }));
}
function baselineOf(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}
function changedCellCount(columnKeys, rows, baseline) {
  if (!baseline)
    return 0;
  let count = 0;
  const changedMap = new Map(rows.map(({ id, ...values }) => [id, values]));
  baseline.forEach((baseValues, id) => {
    const changedValues = changedMap.get(id);
    if (!changedValues)
      return;
    for (const key of columnKeys) {
      if (changedValues[key] !== baseValues[key])
        count++;
    }
  });
  return count;
}
function updateData(rows, rowIndex, columnId, value) {
  const oldRow = rows[rowIndex];
  if (!oldRow)
    return null;
  const next = [...rows];
  next[rowIndex] = { ...oldRow, [columnId]: value };
  return next;
}
function navigate(position, direction, columns, rowCount) {
  const { row, column } = position;
  const columnIndex = columns.findIndex((col) => col.key === column);
  let newRow = row;
  let newColumnIndex = columnIndex;
  switch (direction) {
    case "up":
      newRow = Math.max(0, row - 1);
      break;
    case "down":
      newRow = Math.min(rowCount - 1, row + 1);
      break;
    case "left":
      newColumnIndex = Math.max(0, columnIndex - 1);
      break;
    case "right":
      newColumnIndex = Math.min(columns.length - 1, columnIndex + 1);
      break;
  }
  return { row: newRow, column: columns[newColumnIndex]?.key || column };
}
var toDisplayString = (value) => value === undefined || value === null ? "" : String(value);
function parseNumber(raw) {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
function toDate(value) {
  if (value instanceof Date)
    return value;
  if (typeof value !== "string" && typeof value !== "number")
    return;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function columnLayout(min, max, viewport, wasScrollable = false) {
  const maxes = max.map((m, i) => Math.max(m, min[i] ?? 0));
  const sumMin = min.reduce((a, b) => a + b, 0);
  const sumMax = maxes.reduce((a, b) => a + b, 0);
  if (sumMin > viewport || wasScrollable && sumMax > viewport)
    return { widths: maxes, scrollable: true };
  if (sumMax >= viewport) {
    const room = sumMax - sumMin;
    const share = room > 0 ? (viewport - sumMin) / room : 0;
    return { widths: min.map((m, i) => m + (maxes[i] - m) * share), scrollable: false };
  }
  if (sumMax === 0)
    return { widths: maxes, scrollable: false };
  return { widths: maxes.map((m) => m + (viewport - sumMax) * m / sumMax), scrollable: false };
}

// src/components/select.ts
import { Popup as Popup2, Select as GSelect, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { div as div37 } from "gpui-kit";

// src/components/menu.ts
var MENU_ROW_HEIGHT = 32;
var menuGutter = (t) => t.space2xs;
var menuInsetX = (t) => t.spaceML;
var menuEdgeRowRadius = (t) => t.radius2xl - menuGutter(t);
function hexToOklch(hex) {
  const byte = (i) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
  const linear = (v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const [r, g, b] = [linear(byte(0)), linear(byte(1)), linear(byte(2))];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = Math.atan2(B, A) * 180 / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: (h + 360) % 360, a: hex.length >= 9 ? byte(3) : 1 };
}
function colorMix(a, b, percent) {
  const p = percent / 100;
  const x = hexToOklch(a);
  const y = hexToOklch(b);
  const alphaOut = x.a * (1 - p) + y.a * p;
  if (alphaOut === 0)
    return toHex("oklch(0 0 0 / 0)");
  const mix = (u, v) => (u * x.a * (1 - p) + v * y.a * p) / alphaOut;
  let hx = x.h;
  let hy = y.h;
  if (x.c < 0.0001)
    hx = hy;
  else if (y.c < 0.0001)
    hy = hx;
  let delta = hy - hx;
  if (delta > 180)
    delta -= 360;
  else if (delta < -180)
    delta += 360;
  const h = (hx + delta * p + 360) % 360;
  const fixed = (v) => Math.max(0, v).toFixed(6);
  return toHex(`oklch(${fixed(mix(x.l, y.l))} ${fixed(mix(x.c, y.c))} ${h.toFixed(4)} / ${alphaOut.toFixed(4)})`);
}
var menuBackground = (t) => colorMix(t.foreground, t.textWhite, 6);
var menuRing = (t) => colorMix(t.textNeutralPrimary, "#00000000", 94);
function menuSurface(t, el) {
  const fill = menuBackground(t);
  return shadow(el.flex().flex_col().bg(fill).text_color(t.textNeutralPrimary).rounded(t.radius2xl).border_1().border_color(menuRing(t)).overflow_hidden().py(menuGutter(t)), "md", fill);
}
function menuRow(t, el, o = {}) {
  const edge = menuEdgeRowRadius(t);
  return el.flex().flex_row().items_center().h(MENU_ROW_HEIGHT).px(menuInsetX(t)).bg(o.highlighted ? t.highlight : "#00000000").when(o.first, (e) => e.rounded_t(edge)).when(o.last, (e) => e.rounded_b(edge));
}

// src/components/select.ts
var MENU_MAX_HEIGHT = 372;
var SIDE_OFFSET2 = 2;
var COLLISION_PADDING = 10;
var TYPEAHEAD_MS = 1000;
var MENU_ANCHOR = "top_left";
function nextMatch(labels, search, current) {
  const repeated = search.length > 1 && [...search].every((c) => c === search[0]);
  const query = (repeated ? search[0] : search).toLowerCase();
  const start = Math.max(current, 0);
  let order = labels.map((_, i) => (start + i) % labels.length);
  if (query.length === 1)
    order = order.filter((i) => i !== current);
  const found = order.find((i) => labels[i].toLowerCase().startsWith(query));
  return found !== undefined && found !== current ? found : -1;
}
function triggerBox(t, size) {
  switch (size) {
    case "sm":
      return { py: t.spaceXs - 1.5, px: t.spaceS, radius: t.radiusS + 1 };
    case "lg":
      return { py: t.spaceS - 1, px: t.spaceM, radius: t.radiusL };
    default:
      return { py: t.spaceXs - 1, px: t.spaceM - 1, radius: t.radiusM };
  }
}
function selectControl(o) {
  const { ctx, items } = o;
  const t = ctx.t;
  const size = o.size ?? "md";
  const part = o.part ?? "";
  const key = ctx.id(`select${part ? `:${part}` : ""}`);
  const ui = ctx.local({ open: false, hi: -1, triggerWidth: 0, overTrigger: false, openAtPress: false, search: "", searchAt: 0, scrollTo: null, refocus: false, field: null, side: null }, `select${part}`);
  const selected = items.findIndex((i) => i.value === o.value);
  const shown = selected >= 0 ? items[selected].label : "";
  const placeholder = o.value === "";
  const body = typography(t, "body", size === "sm" || o.triggerText === "small" ? "small" : "default");
  const box = triggerBox(t, size);
  let focusList = false;
  if (o.open !== undefined && o.open !== ui.open) {
    ui.open = o.open;
    if (o.open) {
      ui.hi = selected >= 0 ? selected : 0;
      ui.scrollTo = ui.hi;
      focusList = true;
    }
  }
  const open = ui.open && !o.disabled && !o.inert;
  const native = o.inert ? null : ctx.retained(`select:${key}`, {
    kind: "select",
    meta: {},
    create(_entry, cx) {
      const trigger = cx.focus_handle();
      const list = cx.focus_handle();
      const scroll = VirtualListScrollHandle.new();
      return {
        trigger,
        list,
        scroll,
        release() {
          trigger.release();
          list.release();
          scroll.release();
        }
      };
    }
  });
  let trigger = textStyle(div37().id(`${key}:trigger`).flex().flex_row().items_center().justify_between().gap(t.spaceS).border_1().py(box.py).px(box.px).rounded(box.radius).when(o.width !== undefined, (e) => e.w(o.width)).when(o.width === undefined, (e) => e.w_full()).when(o.height !== undefined, (e) => e.h(o.height)), body);
  const valueText = div37().child(placeholder ? o.placeholder ?? "" : shown);
  const chevron = ctx.icon(open ? "ChevronUp" : "ChevronDown", { size: 16 });
  trigger = trigger.child(valueText).children(optional(chevron));
  if (o.disabled) {
    return trigger.bg(t.highlightSubtle).border_color(t.borderDefault).text_color(placeholder ? t.textNeutralSecondary : t.textNeutralTertiary).cursor_not_allowed();
  }
  trigger = trigger.bg(open ? t.highlight : t.highlightSubtle).border_color(open ? t.borderInteractive : t.borderDefault).text_color(placeholder ? t.textNeutralSecondary : t.textNeutralPrimary).cursor_pointer().hover((s) => s.bg(t.highlight).border_color(t.borderInteractive));
  if (!native)
    return trigger;
  if (focusList)
    ctx.after(() => native.list.focus());
  if (ui.refocus) {
    ui.refocus = false;
    ctx.after(() => native.trigger.focus());
  }
  const setOpen = (next, cx) => {
    if (ui.open === next)
      return;
    if (o.onOpenChange) {
      o.onOpenChange(next, cx);
      cx.notify();
      if (o.open !== undefined)
        return;
    }
    ui.open = next;
    if (next) {
      ui.hi = selected >= 0 ? selected : 0;
      ui.scrollTo = ui.hi;
    }
    cx.notify();
  };
  const choose = (index, cx) => {
    const item = items[index];
    if (!item)
      return;
    o.onChange(item.value, cx);
    if (o.open !== undefined)
      setOpen(false, cx);
    else
      ui.open = false;
    native.trigger.focus();
    ui.refocus = true;
    cx.notify();
  };
  const typing = () => ui.search !== "" && Date.now() - ui.searchAt <= TYPEAHEAD_MS;
  const typeahead = (e, current) => {
    const char = e.key_char;
    if (!char || e.modifiers.control || e.modifiers.alt || e.modifiers.platform)
      return -1;
    if (char === " " && !typing())
      return -1;
    ui.search = typing() ? ui.search + char : char;
    ui.searchAt = Date.now();
    return nextMatch(items.map((i) => i.label), ui.search, current);
  };
  const triggerEl = trigger.track_focus(native.trigger).tab_index(0).on_hover((hovered, _cx) => {
    ui.overTrigger = hovered;
  }).on_size_change((size, cx) => {
    if (Math.abs(size.width - ui.triggerWidth) > 0.5) {
      ui.triggerWidth = size.width;
      cx.notify();
    }
  }).on_mouse_down("left", (e) => {
    ui.openAtPress = ui.open;
    if (!e.bounds || !e.local_position)
      return;
    const top = e.position.y - e.local_position.y;
    ui.field = { top, bottom: top + e.bounds.height };
  }).on_click((_e, cx) => {
    cx.stop_propagation();
    setOpen(!ui.openAtPress, cx);
  }).on_key_down((e, cx) => {
    if (ui.open)
      return;
    if (e.key === "space" && !typing() || e.key === "up") {
      cx.stop_propagation();
      setOpen(true, cx);
      return;
    }
    const match = typeahead(e, selected);
    if (match >= 0) {
      cx.stop_propagation();
      o.onChange(items[match].value, cx);
      cx.notify();
    }
  });
  const rows = items.length;
  const listHeight = Math.min(rows * MENU_ROW_HEIGHT, MENU_MAX_HEIGHT - 2 * menuGutter(t) - 2);
  if (!open)
    ui.side = null;
  else if (ui.side === null) {
    ui.side = "below";
    const pane = ctx.pane;
    if (pane && ui.field) {
      const below = pane.bottom - ui.field.bottom - COLLISION_PADDING;
      if (below < listHeight + 2 * menuGutter(t) + 2 + SIDE_OFFSET2 && ui.field.top - pane.top - COLLISION_PADDING > below)
        ui.side = "above";
    }
  }
  const longest = items.reduce((best, item, i) => item.label.length > items[best].label.length ? i : best, 0);
  const itemText = typography(t, "body", size === "sm" ? "small" : "default");
  if (open && ui.scrollTo !== null) {
    const target = ui.scrollTo;
    ui.scrollTo = null;
    ctx.after(() => native.scroll.scroll_to_item(target, "center"));
  }
  const buildMenu = () => {
    const list = v_virtual_list(`${key}:list`, rows, MENU_ROW_HEIGHT, (i) => String(i), (range) => {
      const out = [];
      for (let i = range.start;i < range.end; i++) {
        const item = items[i];
        const isSelected = i === selected;
        const row = textStyle(menuRow(t, div37().w_full().justify_between().relative().pr(t.spaceXl), {
          highlighted: isSelected || i === ui.hi,
          first: i === 0,
          last: i === rows - 1
        }), itemText).cursor_default().hover((s) => s.bg(t.highlight)).child(div37().flex_1().whitespace_nowrap().text_color(t.textNeutralPrimary).child(item.label));
        out.push(isSelected ? row.child(div37().absolute().right(6).top(9).child(ctx.icon("Check", { size: 16 }))) : row);
      }
      return out;
    }).track_scroll(native.scroll).when(rows > 0, (e) => e.with_item_to_measure_index(longest)).h(listHeight).on_item_click((k, cx) => choose(Number(k), cx));
    return menuSurface(t, div37().id(`${key}:menu`)).min_w(Math.max(o.width ?? 0, ui.triggerWidth)).when(ui.side === "above", (e) => e.mb(SIDE_OFFSET2)).when(ui.side !== "above", (e) => e.mt(SIDE_OFFSET2)).track_focus(native.list).on_mouse_down_out((_e, cx) => {
      if (!ui.overTrigger)
        setOpen(false, cx);
    }).on_key_down((e, cx) => {
      if (!rows)
        return;
      const move = (index) => {
        ui.hi = Math.max(0, Math.min(rows - 1, index));
        native.scroll.scroll_to_item(ui.hi);
        cx.stop_propagation();
        cx.notify();
      };
      switch (e.key) {
        case "down":
          return move(ui.hi + 1);
        case "up":
          return move(ui.hi - 1);
        case "home":
          return move(0);
        case "end":
          return move(rows - 1);
        case "space":
          if (!typing()) {
            cx.stop_propagation();
            choose(ui.hi, cx);
            return;
          }
      }
      const match = typeahead(e, ui.hi);
      if (match >= 0)
        move(match);
    }).child(list);
  };
  return GSelect.new(key).flex().flex_col().open(open).track_focus(native.trigger).content_focus_handle(native.list).on_open_change((next, cx) => setOpen(next, cx)).on_confirm((_e, cx) => choose(ui.hi, cx)).child(Popup2.new(`${key}:popup`, triggerEl).anchor(ui.side === "above" ? "bottom_left" : MENU_ANCHOR).when(open, (el) => el.content(buildMenu())));
}
var Select = {
  render(props, ctx) {
    const name = String(props.name ?? "");
    const field = ctx.field(name, props.value);
    const rules = e34(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) {
      const formName = ctx.formName;
      form.registerField(name, rules, () => ctx.session.stateField(formName, name, props.value).value);
    }
    const items = (props.items ?? []).filter((item) => e24(item) && !!item.props?.value).map((item) => ({ value: String(item.props.value), label: String(item.props.label || item.props.value) }));
    return selectControl({
      ctx,
      value: field.value ?? "",
      items,
      placeholder: String(props.placeholder || "Select..."),
      size: { small: "sm", medium: "md", large: "lg" }[props.size] ?? "md",
      disabled: ctx.streaming,
      onChange(value) {
        field.setValue(value);
        if (rules.length && form)
          form.validateField(name, value, rules);
      }
    });
  }
};
var SelectItem = {
  render() {
    return null;
  }
};

// src/components/editable-table.ts
var CELL_TYPES = ["text", "number", "date-single", "select", "url"];
var PORTAL_CELL_TYPES = ["date-single", "select"];
var TEXT_CELL_TYPES = ["text", "number", "url"];
var OPENABLE_URL = /^https?:\/\/[^\s/?#]+/i;
var KEY_CONTEXT2 = "OpenGPUIEditableTable";
var TAB_ACTION = "opengpui-editable-table-tab";
var TAB_PREV_ACTION = "opengpui-editable-table-tab-prev";
var tabKeysBound = false;
function bindTabKeys(cx) {
  if (tabKeysBound)
    return;
  cx.bind_keys([
    { keystroke: "tab", action: TAB_ACTION, context: KEY_CONTEXT2 },
    { keystroke: "shift-tab", action: TAB_PREV_ACTION, context: KEY_CONTEXT2 }
  ]);
  tabKeysBound = true;
}
var ROW_HEIGHT = 48;
var ICON2 = 16;
function readColumns(value) {
  if (!Array.isArray(value))
    return [];
  return value.filter((c) => !!c && typeof c === "object").map((c) => ({
    type: CELL_TYPES.includes(c.type) ? c.type : undefined,
    key: c.key === undefined ? "default" : String(c.key),
    header: c.header === undefined ? "" : String(c.header),
    width: typeof c.width === "number" ? c.width : undefined,
    options: Array.isArray(c.options) ? c.options.filter((o) => !!o && typeof o === "object").map((o) => ({ value: String(o.value ?? ""), label: String(o.label ?? "") })) : undefined
  }));
}
function readData(value) {
  if (!Array.isArray(value))
    return [];
  return value.filter((r) => !!r && typeof r === "object").map((r) => ({ id: String(r.id ?? ""), values: Array.isArray(r.values) ? r.values : [] }));
}
function headerIcon(type) {
  switch (type) {
    case undefined:
      return null;
    case "url":
      return "Link";
    case "date-single":
      return "CalendarDays";
    case "select":
      return "List";
    default:
      return "Type";
  }
}
var EditableTable = {
  render(props, ctx) {
    const t = ctx.t;
    const session = ctx.session;
    const name = String(props.name ?? "");
    const columns = readColumns(props.columns);
    const columnKeys = columns.map((c) => c.key);
    const st = ctx.local({
      source: null,
      sourceRef: undefined,
      sourceKeys: "",
      scrollable: false,
      rows: [],
      baseline: undefined,
      changed: 0,
      selected: null,
      editing: null,
      overField: null,
      justEnded: false,
      focus: null,
      sizes: {},
      viewport: 0,
      offset: 0,
      smooth: false
    });
    const existingValue = ctx.watch(() => session.getFieldValue(name, name));
    const rawSource = existingValue || props.data;
    const sourceData = () => existingValue || readData(props.data);
    const sourceKeys = columnKeys.join(`
`);
    if (st.sourceRef !== rawSource || st.sourceKeys !== sourceKeys) {
      st.sourceRef = rawSource;
      st.sourceKeys = sourceKeys;
      const data = sourceData();
      const source = JSON.stringify([columnKeys, data]);
      if (st.source !== source) {
        st.source = source;
        st.rows = toRows(columnKeys, data);
      }
    }
    if (!ctx.streaming && st.baseline === undefined)
      st.baseline = baselineOf(toRows(columnKeys, sourceData()));
    const rows = st.rows;
    const columnOf = (key) => columns.find((c) => c.key === key);
    const typeOf = (key) => columnOf(key)?.type || "text";
    const native = ctx.retained(ctx.id("native"), {
      kind: "editable-table",
      meta: { onSubmit: (cx) => onSubmit(cx), onBlur: (cx) => onBlur(cx) },
      create(entry, cx) {
        bindTabKeys(cx);
        const focus = cx.focus_handle();
        const input = InputState.new({});
        input.on("submit", (_e, cx) => entry.meta.onSubmit(cx));
        input.on("blur", (_e, cx) => entry.meta.onBlur(cx));
        return {
          focus,
          input,
          release() {
            focus.release();
            input.release();
          }
        };
      }
    });
    if (st.focus && native) {
      const target = st.focus;
      st.focus = null;
      ctx.after(() => {
        if (target === "table") {
          native.focus.focus();
          return;
        }
        native.input.focus();
        native.input.set_selected_range({ start: 0, end: native.input.value().length });
      });
    }
    if (st.justEnded)
      ctx.after(() => st.justEnded = false);
    const update = (rowIndex, columnId, value) => {
      const next = updateData(st.rows, rowIndex, columnId, value);
      if (!next)
        return;
      st.rows = next;
      st.changed = changedCellCount(columnKeys, next, st.baseline);
    };
    const finishEdit = () => {
      if (!st.editing)
        return;
      st.editing = null;
      st.justEnded = true;
      st.focus = "table";
    };
    const saveText = () => {
      const e = st.editing;
      if (!e || !TEXT_CELL_TYPES.includes(typeOf(e.column)) || !native)
        return;
      const raw = native.input.value();
      update(e.row, e.column, typeOf(e.column) === "number" ? parseNumber(raw) : raw);
      finishEdit();
    };
    const handleCellSelect = (row, column) => {
      saveText();
      st.selected = { row, column };
      st.editing = null;
      st.focus = "table";
    };
    const handleStartEdit = (row, column, char) => {
      const e = st.editing;
      if (e && e.row === row && e.column === column)
        return;
      saveText();
      const cellType = columnOf(column)?.type ?? "text";
      st.selected = { row, column };
      st.editing = { row, column, cellType };
      if (TEXT_CELL_TYPES.includes(typeOf(column)) && native) {
        native.input.set_value(char ?? toDisplayString(rows[row]?.[column]));
        st.focus = "input";
      }
    };
    const handleNavigate = (direction) => {
      if (!st.selected)
        return;
      st.selected = navigate(st.selected, direction, columns, rows.length);
      st.editing = null;
      st.focus = "table";
      reveal(st.selected.column);
    };
    function onSubmit(cx) {
      if (!st.editing || !TEXT_CELL_TYPES.includes(typeOf(st.editing.column)))
        return;
      saveText();
      handleNavigate("down");
      cx.notify();
    }
    function onBlur(cx) {
      if (!st.editing || !TEXT_CELL_TYPES.includes(typeOf(st.editing.column)))
        return;
      saveText();
      cx.notify();
    }
    const onKey = (e, cx) => {
      const handled = () => {
        cx.stop_propagation();
        cx.notify();
      };
      const editing = st.editing;
      if (editing) {
        const type = typeOf(editing.column);
        if (e.key === "escape") {
          finishEdit();
          return handled();
        }
        if (e.key === "enter") {
          if (TEXT_CELL_TYPES.includes(type)) {
            saveText();
            handleNavigate("down");
            return handled();
          }
          if (type === "date-single") {
            handleNavigate("down");
            return handled();
          }
        }
        return;
      }
      if (st.justEnded)
        return;
      const selected = st.selected;
      if (!selected)
        return;
      switch (e.key) {
        case "enter":
        case "f2":
          handleStartEdit(selected.row, selected.column);
          return handled();
        case "up":
        case "down":
        case "left":
        case "right":
          handleNavigate(e.key);
          return handled();
      }
      const char = e.key_char;
      if (char && char.length === 1 && !e.modifiers.control && !e.modifiers.platform && !e.modifiers.alt) {
        const text = TEXT_CELL_TYPES.includes(typeOf(selected.column));
        handleStartEdit(selected.row, selected.column, text ? char : undefined);
        return handled();
      }
    };
    const onTab = (shift, cx) => {
      const sideways = shift ? "left" : "right";
      const editing = st.editing;
      if (editing) {
        const type = typeOf(editing.column);
        if (TEXT_CELL_TYPES.includes(type))
          saveText();
        else if (type === "select") {
          update(editing.row, editing.column, rows[editing.row]?.[editing.column] || "");
          finishEdit();
        }
        handleNavigate(sideways);
      } else if (!st.selected) {
        if (rows.length > 0 && columns.length > 0)
          st.selected = { row: 0, column: columns[0].key };
      } else
        handleNavigate(sideways);
      cx.stop_propagation();
      cx.notify();
    };
    const pad = 2 * t.spaceM;
    const measure = (key, content) => div38().id(ctx.id(`m-${key}`)).flex().flex_row().flex_none().items_center().whitespace_nowrap().on_size_change((size, cx) => {
      if (st.sizes[key] !== size.width) {
        st.sizes[key] = size.width;
        cx.notify();
      }
    }).children(content);
    const ghost = (key, text, style) => div38().absolute().top(0).left(0).h(0).opacity(0).overflow_hidden().flex().flex_row().child(textStyle(measure(key, [text]), style));
    const width = (key) => st.sizes[key] ?? 0;
    const smallText = typography(t, "body", "small");
    const defaultText = typography(t, "body", "default");
    const mins = columns.map((col, ci) => {
      const border = ci < columns.length - 1 ? 1 : 0;
      let min = pad + width(`h${ci}`) + t.spaceS + (headerIcon(col.type) ? ICON2 : 0);
      for (let ri = 0;ri < rows.length; ri++) {
        const type = col.type || "text";
        if (type === "select")
          min = Math.max(min, pad + 2 + 2 * (t.spaceM - 1) + width(`r${ri}c${ci}`) + t.spaceS + ICON2);
        else if (type === "date-single")
          min = Math.max(min, pad + 2 + 2 * t.spaceM + width(`r${ri}c${ci}`) + ICON2);
      }
      return Math.ceil(min) + border;
    });
    const maxes = columns.map((col) => columnSize(col));
    const layout = st.viewport > 0 ? columnLayout(mins, maxes, st.viewport, st.scrollable) : { widths: maxes, scrollable: false };
    st.scrollable = layout.scrollable;
    const widths = layout.widths;
    const tableWidth = widths.reduce((a, b) => a + b, 0);
    const maxOffset = layout.scrollable ? tableWidth - st.viewport : 0;
    const offset = Math.min(Math.max(0, st.offset), maxOffset);
    const starts = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
    const lefts = [...new Set(starts.map(Math.round))].sort((a, b) => a - b);
    function reveal(column) {
      const ci = columns.findIndex((c) => c.key === column);
      if (ci < 0 || maxOffset <= 0)
        return;
      const left = starts[ci];
      const right = left + widths[ci];
      if (left < st.offset)
        st.offset = left;
      else if (right > st.offset + st.viewport)
        st.offset = right - st.viewport;
      st.offset = Math.min(Math.max(0, st.offset), maxOffset);
      st.smooth = false;
    }
    const header = div38().flex().flex_row().children(columns.map((col, ci) => {
      const icon = headerIcon(col.type);
      return textStyle(div38().flex().flex_row().items_center().flex_none().w(widths[ci]).h(ROW_HEIGHT).py(t.spaceS).px(t.spaceM).overflow_hidden().text_color(t.textNeutralSecondary).when(ci < columns.length - 1, (el) => el.border_r_1().border_color(t.borderDefault)), smallText).child(div38().flex().flex_row().items_center().justify_between().gap(t.spaceS).w_full().child(measure(`h${ci}`, [col.header])).child(div38().flex_none().children(icon ? optional(ctx.icon(icon, { size: ICON2 })) : [])));
    }));
    const outline = (selected, editing) => {
      if (!selected && !editing)
        return [];
      const w = editing ? 1.5 : 1;
      const bar = () => div38().absolute().bg(t.borderInteractiveSelected);
      return [
        bar().top(0).left(0).w_full().h(w),
        bar().bottom(0).left(0).w_full().h(w),
        bar().top(0).left(0).h_full().w(w),
        bar().top(0).right(0).h_full().w(w)
      ];
    };
    const displayLine = () => div38().absolute().left(t.spaceM).right(t.spaceM).top(0).bottom(0).flex().flex_row().items_center();
    const clipped = (text) => div38().min_w_0().overflow_hidden().whitespace_nowrap().text_ellipsis().child(text);
    const cell = (ri, ci) => {
      const col = columns[ci];
      const columnId = col.key;
      const type = typeOf(columnId);
      const value = rows[ri][columnId];
      const isSelected = st.selected?.row === ri && st.selected?.column === columnId;
      const isEditing = st.editing?.row === ri && st.editing?.column === columnId;
      const live = isSelected || isEditing;
      const part = `r${ri}c${ci}`;
      const key = ctx.id(`cell-${part}`);
      let base = textStyle(div38().id(key).relative().flex().flex_col().flex_1().py(t.spaceS).px(t.spaceM).text_color(t.textNeutralPrimary), smallText);
      if (TEXT_CELL_TYPES.includes(type)) {
        base = base.on_click((_e, cx) => {
          cx.stop_propagation();
          if (!isSelected && !isEditing)
            handleCellSelect(ri, columnId);
          else
            handleStartEdit(ri, columnId);
          cx.notify();
        });
        if (isEditing && native) {
          base = base.child(textStyle(GInput.new(native.input).w_full().flex_1().bg("#00000000"), smallText));
        } else if (type === "url") {
          const raw = toDisplayString(value);
          const safeHref = e117(raw);
          let link = div38().id(ctx.id(`link-${part}`)).flex_1().min_w_0().overflow_hidden().whitespace_nowrap().text_ellipsis().hover((s) => s.underline()).on_click((_e, cx) => {
            cx.stop_propagation();
            if (safeHref && OPENABLE_URL.test(safeHref)) {
              try {
                cx.open_url(safeHref);
              } catch {}
            }
          }).child(raw);
          if (safeHref)
            link = link.cursor_pointer();
          base = base.child(displayLine().gap(t.spaceS).child(div38().flex_none().text_color(t.textNeutralSecondary).children(optional(ctx.icon("Link", { size: ICON2 })))).child(link));
        } else if (type === "number") {
          base = base.child(textStyle(displayLine().justify_end(), typography(t, "number", "small")).child(clipped(toDisplayString(value))));
        } else {
          base = base.child(displayLine().child(clipped(String(value ?? ""))));
        }
      } else if (type === "select") {
        const options = col.options ?? [];
        const current = value || "";
        const shown = options.find((o) => o.value === current)?.label ?? (current === "" ? "Select an option" : "");
        base = base.on_click((_e, cx) => {
          if (!isSelected && !isEditing)
            handleCellSelect(ri, columnId);
          else if (isSelected && !isEditing)
            handleStartEdit(ri, columnId);
          cx.notify();
        }).child(ghost(part, shown, smallText)).child(selectControl({
          ctx,
          part,
          value: current,
          items: options,
          placeholder: "Select an option",
          triggerText: "small",
          inert: !live,
          open: isEditing,
          onOpenChange(open) {
            if (open)
              handleStartEdit(ri, columnId);
            else if (st.editing?.row === ri && st.editing.column === columnId)
              finishEdit();
          },
          onChange(next) {
            update(ri, columnId, next);
            finishEdit();
          }
        }));
      } else {
        const date = toDate(value);
        if (!live && st.overField === part)
          st.overField = null;
        base = base.on_click((_e, cx) => {
          if (isEditing || isSelected && st.overField === part)
            return;
          if (!isSelected)
            handleCellSelect(ri, columnId);
          else
            handleStartEdit(ri, columnId);
          cx.notify();
        }).child(ghost(part, e1100(date), defaultText)).child(datePickerControl(ctx, {
          part,
          mode: "single",
          single: date,
          inert: !live,
          open: isEditing,
          onOpenChange(open) {
            if (open)
              handleStartEdit(ri, columnId);
            else
              finishEdit();
          },
          onFieldHover(hovered) {
            if (hovered)
              st.overField = part;
            else if (st.overField === part)
              st.overField = null;
          },
          onEnter() {
            handleNavigate("down");
          },
          onSelect(next) {
            update(ri, columnId, next instanceof Date ? next.toISOString() : undefined);
            finishEdit();
          }
        }));
      }
      return div38().flex().flex_col().flex_none().w(widths[ci]).when(ci < columns.length - 1, (el) => el.border_r_1().border_color(t.borderDefault)).child(base.children(outline(isSelected, isEditing)));
    };
    const body = rows.map((_, ri) => div38().flex().flex_row().min_h(ROW_HEIGHT).when(ri < rows.length - 1, (el) => el.border_b_1().border_color(t.borderDefault)).children(columns.map((_, ci) => cell(ri, ci))));
    const scrollTo = (next, smooth, cx) => {
      st.offset = Math.min(Math.max(0, next), maxOffset);
      st.smooth = smooth;
      cx.notify();
    };
    const control = (side) => {
      const canGo = side === "left" ? offset > 0 : offset < maxOffset - 1;
      if (!layout.scrollable || !canGo)
        return null;
      return div38().absolute().top(t.spaceS).when(side === "left", (el) => el.left(t.spaceS)).when(side === "right", (el) => el.right(t.spaceS)).rounded(t.radiusS).bg(t.elevated).child(iconButton(ctx, {
        id: ctx.id(`scroll-${side}`),
        icon: side === "left" ? "ChevronLeft" : "ChevronRight",
        size: "small",
        variant: "secondary",
        iconSize: ICON2,
        onClick: (cx) => {
          const target = side === "left" ? lefts.filter((l) => l < offset - 1).at(-1) ?? 0 : lefts.find((l) => l > offset + 1) ?? maxOffset;
          scrollTo(Math.min(target, maxOffset), true, cx);
        }
      }));
    };
    let wrapper = div38().id(ctx.id()).relative().w_full().overflow_hidden().border_1().border_color(t.borderDefault).rounded_t(t.radiusXl).on_size_change((size, cx) => {
      const inner = size.width - 2;
      if (st.viewport !== inner) {
        st.viewport = inner;
        cx.notify();
      }
    }).on_mouse_down_out((_e, cx) => {
      const portal = st.editing && PORTAL_CELL_TYPES.includes(st.editing.cellType);
      if (portal || !st.selected && !st.editing)
        return;
      saveText();
      st.selected = null;
      st.editing = null;
      st.focus = null;
      cx.notify();
    }).when(maxOffset > 0, (el) => el.on_scroll_wheel((e, cx) => {
      const dx = e.delta.x !== 0 ? e.delta.x : e.modifiers.shift ? e.delta.y : 0;
      if (dx === 0)
        return;
      cx.stop_propagation();
      scrollTo(st.offset - dx, false, cx);
    }));
    if (native) {
      wrapper = wrapper.track_focus(native.focus).tab_index(0).key_context(KEY_CONTEXT2).on_action(TAB_ACTION, (_e, cx) => onTab(false, cx)).on_action(TAB_PREV_ACTION, (_e, cx) => onTab(true, cx)).on_key_down(onKey);
    }
    const table = wrapper.children(columns.length ? [div38().absolute().top(0).left(0).right(0).h(ROW_HEIGHT).bg(t.highlightSubtle)] : []).child(div38().id(ctx.id("content")).relative().flex().flex_col().when(layout.scrollable, (el) => el.w(tableWidth).left(-offset)).when(!layout.scrollable, (el) => el.w_full()).when(st.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" })).when(columns.length > 0, (el) => el.child(header)).children(body)).children([control("left"), control("right")].filter((c) => c !== null));
    const out = [table];
    if (st.changed > 0)
      out.push(changesBar());
    return out;
    function changesBar() {
      const handleReset = (cx) => {
        st.changed = 0;
        if (st.baseline)
          st.rows = Array.from(st.baseline.values());
        cx.notify();
      };
      const handleSubmit = (cx) => {
        const saved = st.rows;
        session.setFieldValue(name, "EditableTable", name, fromRows(columnKeys, saved));
        ctx.action("Save Changes", name);
        st.changed = 0;
        st.baseline = baselineOf(saved);
        cx.notify();
      };
      return shadow(div38().flex().flex_row().items_center().justify_between().gap(t.spaceS).pt(t.spaceS).pr(t.spaceS).pb(t.spaceS).pl(t.spaceM).bg(t.elevated).rounded(t.radiusXl).border_1().border_color(t.borderDefault), t.shadowS, t.elevated).child(textStyle(div38().text_color(t.textNeutralPrimary), defaultText).child(`${st.changed} changes made`)).child(div38().flex().flex_row().gap(t.spaceS).child(button(ctx, { id: ctx.id("reset"), label: "Reset", variant: "secondary", size: "small", iconLeft: "RotateCcw", onClick: handleReset })).child(button(ctx, { id: ctx.id("save"), label: "Save Changes", variant: "primary", size: "small", iconLeft: "Check", onClick: handleSubmit })));
    }
  }
};

// src/components/forms.ts
import { Input as GInput2, InputState as InputState2, Textarea, TextareaState } from "gpui-base";
import { div as div39 } from "gpui-kit";
var Form = {
  render(props, ctx) {
    const name = String(props.name ?? "form");
    const inner = ctx.child("form", { ...ctx.scope, formName: name });
    return div39().id(ctx.id()).flex().flex_col().gap(16).children(inner.children(props.fields, "f")).children(inner.children(props.buttons, "b"));
  }
};
function inputName(input) {
  if (!e24(input))
    return;
  const raw = input.props.name;
  if (typeof raw === "string")
    return raw;
  return raw && typeof raw === "object" && "name" in raw && typeof raw.name === "string" ? raw.name : undefined;
}
function isRequired(input) {
  if (!e24(input))
    return false;
  const rules = input.props.rules;
  return !!rules && typeof rules === "object" && "required" in rules && rules.required === true;
}
var FormControl = {
  render(props, ctx) {
    const t = ctx.t;
    const name = inputName(props.input);
    const error = name ? ctx.form?.getFieldError(name) : undefined;
    const label = textStyle(div39().flex().flex_row().gap(t.space3xs).text_color(t.textNeutralPrimary), typography(t, "body", "default")).child(String(props.label ?? "")).when(isRequired(props.input), (el) => el.child("*"));
    const hint = (text, isError) => textStyle(div39().flex().flex_row().items_center().gap(t.spaceXs).text_color(isError ? t.textDangerPrimary : t.textNeutralSecondary), typography(t, "body", "small")).children(isError ? optional(ctx.icon("AlertCircle", { size: 14 })) : []).child(text);
    return div39().flex().flex_col().gap(t.spaceS).child(label).children(ctx.children(props.input, "in")).when(!!error, (el) => el.child(hint(String(error), true))).when(!error && !!props.hint, (el) => el.child(hint(String(props.hint), false)));
  }
};
function textField(kind, props, ctx, makeState, makeElement, frame) {
  const t = ctx.t;
  const session = ctx.session;
  const name = String(props.name ?? "");
  const formName = ctx.formName;
  const field = ctx.field(name, props.value);
  const rules = e34(props.rules);
  const form = ctx.form;
  if (form && rules.length && !ctx.streaming) {
    form.registerField(name, rules, () => session.stateField(formName, name, props.value).value);
  }
  const key = field.isReactive ? `${kind}:${props.value.target}` : `${kind}:${formName ?? ""}:${name}`;
  const meta = { formName, name, binding: props.value, rules };
  const current = (m) => session.stateField(m.formName, m.name, m.binding);
  const state = ctx.retained(key, {
    kind,
    meta,
    create(entry) {
      const s = makeState(String(field.value ?? ""));
      s.on("change", () => {
        const m = entry.meta;
        current(m).setValue(s.value());
        if (m.rules.length && m.formName !== undefined)
          session.form(m.formName).clearFieldError(m.name);
      });
      s.on("focus", () => {
        const m = entry.meta;
        if (m.formName !== undefined)
          session.form(m.formName).clearFieldError(m.name);
      });
      s.on("blur", () => {
        const m = entry.meta;
        if (m.rules.length && m.formName !== undefined)
          session.form(m.formName).validateField(m.name, s.value(), m.rules);
      });
      return s;
    }
  });
  if (state && state.value() !== String(field.value ?? "")) {
    ctx.after(() => {
      const value = String(current(meta).value ?? "");
      if (state.value() !== value)
        state.set_value(value);
    });
  }
  const styled = (el) => {
    const base = textStyle(el.w_full().border_1(), typography(t, "body", "default"));
    return ctx.streaming ? frame(base).bg(t.sunk).border_color(t.borderDefault).text_color(t.textNeutralTertiary) : frame(base).bg(t.highlightSubtle).border_color(t.borderInteractive).text_color(t.textNeutralPrimary).focus((s) => s.border_color(t.borderInteractiveEmphasis));
  };
  if (!state) {
    const value = String(field.value ?? "");
    return styled(div39()).text_color(value ? t.textNeutralPrimary : t.textNeutralSecondary).child(value || String(props.placeholder ?? ""));
  }
  return styled(makeElement(state));
}
var Input = {
  render(props, ctx) {
    const t = ctx.t;
    const body = typography(t, "body", "default");
    return textField("input", props, ctx, (value) => {
      const s = InputState2.new({ placeholder: String(props.placeholder ?? ""), value });
      if (props.type === "password")
        s.set_masked(true);
      return s;
    }, (state) => GInput2.new(state), (el) => el.rounded(t.radiusM).py(t.spaceXs - 1).px(t.spaceM - 1).h(body.size * body.lineHeight + 2 * (t.spaceXs - 1) + 2));
  }
};
var TextArea = {
  render(props, ctx) {
    const t = ctx.t;
    const body = typography(t, "body", "default");
    const rows = Number(props.rows) || 3;
    return textField("textarea", props, ctx, (value) => TextareaState.new({ placeholder: String(props.placeholder ?? ""), value, rows }), (state) => Textarea.new(state), (el) => el.rounded(t.radiusXl).py(t.spaceS).px(t.spaceM).h(rows * body.size * body.lineHeight + 2 * t.spaceS + 2));
  }
};

// src/components/images.ts
import { div as div40, svg as svg2 } from "gpui-kit";
function measure(ctx, part) {
  const local = ctx.local({ width: 0 }, part);
  const report = (size, cx) => {
    if (local.width !== size.width) {
      local.width = size.width;
      cx.notify();
    }
  };
  return {
    width: local.width,
    track: (el) => el.id(ctx.id(`${part}-size`)).on_size_change(report),
    probe: () => div40().id(ctx.id(`${part}-probe`)).absolute().top(0).left(0).size_full().on_size_change(report)
  };
}
function picture(state, box, fit, alt, options = {}) {
  if (box.width <= 0 || box.height <= 0)
    return null;
  if (state.status === "ready")
    return fitImage(state, box, fit, options);
  if (state.status === "failed" && alt)
    return div40().w(box.width).h(box.height).overflow_hidden().child(alt);
  return null;
}
var IMAGE_RATIO = 3 / 2;
var Image = {
  render(props, ctx) {
    const t = ctx.t;
    const src = typeof props.src === "string" ? props.src : "";
    const alt = String(props.alt ?? "");
    const state = ctx.image(src);
    const local = ctx.local({ width: 0, height: 0 }, "ratio");
    const img = state.status === "failed" ? null : div40().size_full().overflow_hidden().border_1().border_color(t.borderDefault).rounded(t.radiusM).bg(t.foreground).children(optional(picture(state, { width: local.width - 2, height: local.height - 2 }, "cover", alt)));
    const fill = div40().id(ctx.id("ratio-fill")).absolute().top(0).left(0).size_full().on_size_change((size, cx) => {
      if (local.width !== size.width || local.height !== size.height) {
        local.width = size.width;
        local.height = size.height;
        cx.notify();
      }
    }).children(optional(img));
    return div40().relative().w_full().min_w_0().pb(`${100 / IMAGE_RATIO}%`).child(fill);
  }
};
var SPINNER_ARC = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' + '<path d="M4.575 4.575A10.5 10.5 0 0 1 19.425 4.575" fill="none" stroke="#000" stroke-width="3"/></svg>');
function spinner(ctx) {
  const arc = ctx.image(SPINNER_ARC);
  return div40().absolute().size(24).rounded(ctx.t.radiusFull).border(3).border_color("#d1d5dbff").when(arc.status === "ready", (el) => el.child(svg2(arc.path).absolute().top(-3).left(-3).size(24).text_color("#2563ebff").spin(1000)));
}
var BLOCK_HEIGHT = 240;
var ImageBlock = {
  render(props, ctx) {
    const t = ctx.t;
    const src = typeof props.src === "string" ? props.src : "";
    if (!src)
      return null;
    const state = ctx.image(src);
    const { width, track } = measure(ctx, "block");
    const mobile = width < 480;
    const wrapper = track(div40()).relative().flex().flex_row().flex_1().min_w_0().w_full().min_h(BLOCK_HEIGHT).max_h(BLOCK_HEIGHT).h(BLOCK_HEIGHT).justify_center().items_center().overflow_hidden().rounded(t.radius2xl);
    if (state.status === "failed")
      return wrapper;
    const padX = mobile ? 0 : t.spaceL + 2;
    const padY = mobile ? 0 : t.spaceL - 2;
    const inner = { width: width - 2 * padX, height: BLOCK_HEIGHT - 2 * padY };
    const border = 4;
    let content = [];
    if (state.status === "ready" && width > 0) {
      const back = { width: width + 40, height: BLOCK_HEIGHT + 40 };
      const bw = back.width * 1.5;
      const bh = bw * state.height / state.width;
      const backdrop = div40().absolute().left(-20 + (back.width - bw) / 2).top(-20 + (back.height - bh) / 2).opacity(0.2).child(fitImage(state, { width: bw, height: bh }, "cover"));
      const ratio = state.width / state.height;
      const box = mobile ? { width: inner.width - 2 * border, height: (inner.width - 2 * border) / ratio } : { width: Math.min((inner.height - 2 * border) * ratio, inner.width - 2 * border), height: inner.height - 2 * border };
      const radius = mobile ? t.radius2xl : t.radiusL;
      const img = div40().flex_none().w(box.width + 2 * border).h(box.height + 2 * border).border(border).border_color(t.borderDefault).rounded(radius).overflow_hidden().child(fitImage(state, box, "cover", { radius: radius - border }));
      content = [backdrop, img];
    }
    return wrapper.children(content).when(state.status === "loading", (el) => el.child(spinner(ctx)));
  }
};
function gridSpec(count, narrow) {
  switch (count) {
    case 1:
      return { columns: [1], frRows: false, areas: [[0, 1, 0, 1]] };
    case 2:
      return { columns: [1, 1], frRows: false, areas: [[0, 1, 0, 1], [1, 1, 0, 1]] };
    case 3:
      return narrow ? { columns: [1, 1], frRows: true, areas: [[0, 2, 0, 1], [0, 1, 1, 1], [1, 1, 1, 1]] } : { columns: [1, 1], frRows: true, areas: [[0, 1, 0, 2], [1, 1, 0, 1], [1, 1, 1, 1]] };
    case 4:
      return { columns: [1, 1, 1, 1], frRows: true, areas: [[0, 2, 0, 2], [2, 2, 0, 1], [2, 1, 1, 1], [3, 1, 1, 1]] };
    default:
      return narrow ? { columns: [1, 1, 1, 1, 1, 1], frRows: true, areas: [[0, 3, 0, 1], [3, 3, 0, 1], [0, 2, 1, 1], [2, 2, 1, 1], [4, 2, 1, 1]] } : { columns: [2, 1, 1], frRows: true, areas: [[0, 1, 0, 2], [1, 1, 0, 1], [2, 1, 0, 1], [1, 1, 1, 1], [2, 1, 1, 1]] };
  }
}
var GRID_MAX_HEIGHT = 376;
function galleryGrid(spec, width, gap, natural) {
  const unit = (width - gap * (spec.columns.length - 1)) / spec.columns.reduce((a, b) => a + b, 0);
  const colX = spec.columns.map((_, i) => spec.columns.slice(0, i).reduce((a, fr) => a + fr * unit + gap, 0));
  const span = (start, n) => spec.columns.slice(start, start + n).reduce((a, fr) => a + fr * unit, 0) + gap * (n - 1);
  const needs = spec.areas.map(([c, cs, , rs], i) => {
    const h = natural(i, span(c, cs));
    return rs === 2 ? (h - gap) / 2 : h;
  });
  let row = Math.max(0, ...needs);
  if (spec.frRows && 2 * row + gap > GRID_MAX_HEIGHT)
    row = (GRID_MAX_HEIGHT - gap) / 2;
  const gridHeight = spec.frRows ? 2 * row + gap : row;
  const cells = spec.areas.map(([c, cs, r, rs]) => ({
    left: colX[c],
    top: r * (row + gap),
    width: span(c, cs),
    height: rs * row + (rs - 1) * gap
  }));
  return { cells, height: Math.min(gridHeight, GRID_MAX_HEIGHT) };
}
var MAX_GRID_IMAGES = 5;
var ImageGallery = {
  render(props, ctx) {
    const images = (Array.isArray(props.images) ? props.images : []).map((i) => ({
      src: typeof i?.src === "string" ? i.src : "",
      alt: typeof i?.alt === "string" ? i.alt : undefined
    }));
    if (!images.length)
      return null;
    const t = ctx.t;
    const local = ctx.retained(ctx.id("gallery-state"), { kind: "gallery-state", meta: null, create: () => galleryLocal() }) ?? galleryLocal();
    const visible = images.slice(0, MAX_GRID_IMAGES);
    const states = (local.open ? images : visible).map((i) => ctx.image(i.src));
    const { width, probe } = measure(ctx, "gallery");
    const body = typography(t, "body", "default");
    const altLine = body.size * body.lineHeight;
    const grid = galleryGrid(gridSpec(visible.length, width <= 768), width, t.spaceS, (i, cellWidth) => {
      const s = states[i];
      return s.status === "ready" ? cellWidth * s.height / s.width : s.status === "failed" ? altLine : 0;
    });
    const open = (index, cx) => {
      local.selected = index;
      local.open = true;
      local.offset = 0;
      cx.notify();
    };
    if (local.open)
      ctx.overlay("gallery", (o) => galleryModal(o, images, states, local));
    const cells = visible.map((item, i) => {
      const cell = grid.cells[i];
      const alt = item.alt || `Gallery image ${i + 1}`;
      return div40().id(ctx.id(`img-${i}`)).absolute().left(cell.left).top(cell.top).w(cell.width).h(cell.height).overflow_hidden().cursor_pointer().on_hover((hovered, cx) => {
        const next = hovered ? i : local.hovered === i ? -1 : local.hovered;
        if (next !== local.hovered) {
          local.hovered = next;
          cx.notify();
        }
      }).on_click((_e, cx) => {
        if (local.overShowAll)
          return;
        open(i, cx);
      }).children(optional(picture(states[i], cell, "cover", alt, { zoom: local.hovered === i && !local.overShowAll ? 1.05 : 1, transition: 300 })));
    });
    const showAll = images.length > MAX_GRID_IMAGES ? div40().absolute().bottom(5).right(5).id(ctx.id("show-all-box")).on_hover((hovered, cx) => {
      if (local.overShowAll !== hovered) {
        local.overShowAll = hovered;
        cx.notify();
      }
    }).child(button(ctx, { id: ctx.id("show-all"), label: "Show All", variant: "primary", size: "small", bubble: true, onClick: (cx) => open(local.selected, cx) })) : null;
    return div40().relative().w_full().h(grid.height).min_w_0().overflow_hidden().rounded(t.radiusM).child(probe()).children(cells).children(optional(showAll));
  }
};
var galleryLocal = () => ({ selected: 0, hovered: -1, open: false, offset: 0, smooth: false, thumbHovered: -1, width: 0, height: 0, overShowAll: false, overControl: { left: false, right: false } });
var THUMB_HEIGHT = 116;
var THUMB_MIN_WIDTH = 174;
function galleryModal(ctx, images, states, local) {
  if (!local.open)
    return null;
  const t = ctx.t;
  const close = (cx) => {
    local.open = false;
    cx.notify();
  };
  const focus = ctx.retained(ctx.id("modal-focus"), {
    kind: "gallery-modal-focus",
    meta: null,
    create: (_entry, cx) => cx.focus_handle()
  });
  const full = local.width <= 768;
  const boxW = full ? local.width : Math.min(local.width - 80, 720);
  const boxH = full ? local.height : Math.min(local.height - 80, 640);
  const pad = t.spaceXl;
  const selected = Math.min(local.selected, images.length - 1);
  const state = states[selected];
  const strip = local;
  const header = div40().flex().flex_row().items_center().justify_between().px(pad).child(textStyle(div40().text_color(t.textNeutralPrimary), typography(t, "heading", "extra-small")).child("All Photos")).child(iconButton(ctx, { id: ctx.id("modal-close"), icon: "X", size: "small", variant: "secondary", onClick: close }));
  const mainW = boxW - 2 - 2 * pad;
  const mainH = Math.max(0, boxH - 2 - 2 * pad - 2 * t.spaceXl - ICON_BUTTON.small.box - THUMB_HEIGHT);
  let shown = null;
  if (state.status === "ready") {
    const scale = Math.max(0, Math.min(1, mainW / state.width, mainH / state.height));
    shown = fitImage(state, { width: state.width * scale, height: state.height * scale }, "contain", { radius: t.radiusS });
  } else if (state.status === "failed") {
    shown = div40().max_w(mainW).overflow_hidden().child(images[selected].alt || `Gallery image ${selected + 1}`);
  }
  const main = div40().flex().flex_1().min_h_0().justify_center().items_center().px(pad).children(optional(shown));
  const viewW = boxW - 2;
  const gap = t.spaceS;
  const n = images.length;
  const thumbW = Math.max(THUMB_MIN_WIDTH, (viewW - 2 * pad - gap * (n - 1)) / n);
  const contentW = 2 * pad + n * thumbW + gap * (n - 1);
  const maxOffset = Math.max(0, contentW - viewW);
  const offset = Math.min(Math.max(0, strip.offset), maxOffset);
  const scrollTo = (next, smooth, cx) => {
    strip.offset = Math.min(Math.max(0, next), maxOffset);
    strip.smooth = smooth;
    cx.notify();
  };
  const onControl = strip.overControl.left && offset > 0 || strip.overControl.right && offset + viewW < contentW - 0.5;
  const thumbs = images.map((_, i) => {
    const active = i === selected;
    return div40().id(ctx.id(`thumb-${i}`)).flex_none().w(thumbW).h(THUMB_HEIGHT).cursor_pointer().rounded(t.radiusS).border_1().border_color(active ? t.borderInteractiveSelected : TRANSPARENT).overflow_hidden().opacity(active ? 1 : strip.thumbHovered === i && !onControl ? 0.8 : 0.6).transition("opacity", { duration: 200, easing: "ease-in-out" }).on_hover((hovered, cx) => {
      strip.thumbHovered = hovered ? i : strip.thumbHovered === i ? -1 : strip.thumbHovered;
      cx.notify();
    }).on_click((_e, cx) => {
      if (onControl)
        return;
      local.selected = i;
      cx.notify();
    }).children(optional(picture(states[i], { width: thumbW - 2, height: THUMB_HEIGHT - 2 }, "cover", "")));
  });
  const carousel = div40().id(ctx.id("modal-carousel")).w(viewW).h(THUMB_HEIGHT).overflow_hidden().when(maxOffset > 0, (el) => el.on_scroll_wheel((e, cx) => {
    const dx = e.delta.x !== 0 ? e.delta.x : e.delta.y;
    if (dx === 0)
      return;
    cx.stop_propagation();
    scrollTo(strip.offset - dx, false, cx);
  })).child(div40().relative().flex().flex_row().gap(gap).px(pad).w(contentW).left(-offset).when(strip.smooth, (el) => el.transition("left", { duration: 300, easing: "ease-in-out" })).children(thumbs));
  const control = (side) => {
    const show = side === "left" ? offset > 0 : offset + viewW < contentW - 0.5;
    if (!show)
      return null;
    return div40().id(ctx.id(`modal-control-${side}`)).on_hover((hovered, cx) => {
      if (strip.overControl[side] !== hovered) {
        strip.overControl[side] = hovered;
        cx.notify();
      }
    }).absolute().top((THUMB_HEIGHT - ICON_BUTTON["extra-small"].box) / 2).when(side === "left", (el) => el.left(24)).when(side === "right", (el) => el.right(24)).bg(t.foreground).rounded(t.radiusXs).overflow_hidden().child(iconButton(ctx, {
      id: ctx.id(`modal-scroll-${side}`),
      icon: side === "left" ? "ChevronLeft" : "ChevronRight",
      size: "extra-small",
      variant: "secondary",
      onClick: (cx) => scrollTo(offset + (side === "left" ? -1 : 1) * viewW * 0.28, true, cx)
    }));
  };
  const carouselContainer = div40().relative().flex().flex_row().items_center().justify_center().w_full().child(carousel).children([control("left"), control("right")].filter((c) => c !== null));
  const content = div40().id(ctx.id("modal")).flex().flex_col().flex_none().w(boxW).h(boxH).overflow_hidden().gap(t.spaceXl).py(pad).border_1().border_color(t.borderDefault).bg(t.foreground).rounded(full ? 0 : t.radiusXl).on_mouse_down("left", (_e, cx) => cx.stop_propagation()).child(header).child(main).child(carouselContainer);
  const backdrop = div40().id(ctx.id("modal-backdrop")).size_full().flex().justify_center().items_center().bg(t.overlay).on_mouse_down("left", (_e, cx) => {
    cx.stop_propagation();
    close(cx);
  }).on_key_down((e, cx) => {
    if (e.key !== "escape")
      return;
    cx.stop_propagation();
    close(cx);
  }).on_scroll_wheel((_e, cx) => cx.stop_propagation()).on_size_change((size, cx) => {
    if (local.width !== size.width || local.height !== size.height) {
      local.width = size.width;
      local.height = size.height;
      cx.notify();
    }
  });
  return { el: (focus ? backdrop.track_focus(focus) : backdrop).children(local.width > 0 ? [content] : []), focus };
}
var ImageText = {
  render(props, ctx) {
    const t = ctx.t;
    const title = String(props.title ?? "");
    const src = typeof props.src === "string" ? props.src : "";
    const alt = typeof props.alt === "string" ? props.alt : title;
    const horizontal = props.layout !== "vertical";
    const size = typeof props.imageSize === "number" && props.imageSize > 0 ? props.imageSize : t.space2xl + t.space2xs;
    const state = ctx.image(src);
    const box = div40().flex().flex_none().items_center().justify_center().w(size).h(size).rounded(t.radiusM).overflow_hidden().bg(t.sunk).children(optional(picture(state, { width: size, height: size }, "cover", alt)));
    const block = textBlock(ctx, props.bold === true ? "highlight-text-number-subtext" : "text-subtext", {
      value: title,
      subtext: props.subtitle,
      size: horizontal ? "xs" : "sm"
    });
    const content = div40().flex().flex_col().min_w_0().when(horizontal, (el) => el.pt(t.space3xs)).child(block);
    const root = div40().flex().gap(t.spaceM).child(box).child(content);
    return horizontal ? root.flex_row().items_center() : root.flex_col().items_start();
  }
};
var LARGE_HEIGHT = 180;
var ImageTextLarge = {
  render(props, ctx) {
    const t = ctx.t;
    const title = String(props.title ?? "");
    const src = typeof props.src === "string" ? props.src : "";
    const alt = typeof props.alt === "string" ? props.alt : title;
    const state = ctx.image(src);
    const { width, track } = measure(ctx, "banner");
    const wrap = track(div40()).relative().flex().w_full().h(LARGE_HEIGHT).flex_none().rounded(t.radiusM).overflow_hidden().bg(t.sunk).children(optional(picture(state, { width, height: LARGE_HEIGHT }, "cover", alt)));
    return div40().flex().flex_col().w_full().min_w_0().gap(t.spaceM).child(wrap).child(textBlock(ctx, "highlight-text", { value: title, subtext: props.subtitle, size: "sm" }));
  }
};

// src/components/layout.ts
import { div as div41 } from "gpui-kit";
function gap(t, value) {
  switch (value) {
    case "none":
      return 0;
    case "xs":
      return t.spaceXs;
    case "s":
      return t.spaceS;
    case "l":
      return t.spaceL;
    case "xl":
      return t.spaceXl;
    case "2xl":
      return t.space2xl;
    default:
      return t.spaceM;
  }
}
function alignItems(el, value) {
  switch (value) {
    case "start":
      return el.items_start();
    case "center":
      return el.items_center();
    case "end":
      return el.items_end();
    case "stretch":
      return el.items_stretch();
    case "baseline":
      return el.items_baseline();
    default:
      return el;
  }
}
function justifyContent(el, value) {
  switch (value) {
    case "start":
      return el.justify_start();
    case "center":
      return el.justify_center();
    case "end":
      return el.justify_end();
    case "between":
      return el.justify_between();
    case "around":
      return el.justify_around();
    case "evenly":
      return el.justify_evenly();
    default:
      return el;
  }
}
function flexBox(direction) {
  return direction === "row" ? div41().flex().flex_row() : div41().flex().flex_col();
}
var Stack = {
  render(props, ctx) {
    const justify = props.wrap && props.justify === "between" ? "start" : props.justify;
    let el = flexBox(props.direction ?? "column").id(ctx.id()).gap(gap(ctx.t, props.gap));
    el = justifyContent(alignItems(el, props.align), justify);
    if (props.wrap)
      el = el.flex_wrap();
    return el.children(ctx.children(props.children));
  }
};
function cardFrame(t, variant, props) {
  let el = flexBox(props.direction ?? "column").w_full().flex_1().min_w_0().border_1().border_color(TRANSPARENT).text_color(t.textNeutralPrimary).gap(gap(t, props.gap));
  el = textStyle(el, typography(t, "body", "default"));
  el = justifyContent(alignItems(el, props.align ?? "stretch"), props.justify ?? "start");
  el = props.wrap ? el.flex_wrap() : el.flex_nowrap();
  switch (variant) {
    case "clear":
      return el.px(t.spaceL).rounded(t.radius3xl);
    case "sunk":
      return shadow(el.p(t.spaceL).rounded(t.radius3xl).bg(t.sunk).border_color(t.borderDefault), t.shadowM, t.sunk);
    default:
      return el;
  }
}
var Card = {
  render(props, ctx) {
    return cardFrame(ctx.t, props.variant ?? "card", props).id(ctx.id()).children(ctx.children(props.children));
  }
};
var CardHeader = {
  render(props, ctx) {
    const t = ctx.t;
    const top = div41().flex().flex_row().justify_between().items_center().child(textStyle(div41().flex().flex_row().items_center().gap(t.spaceXs).text_color(t.textNeutralPrimary), typography(t, "heading", "small")).when(props.title != null && props.title !== "", (el) => el.child(String(props.title))));
    return div41().flex().flex_col().gap(t.spaceXs).mb(t.space2xs).child(top).when(!!props.subtitle, (el) => el.child(textStyle(div41().text_color(t.textNeutralSecondary), typography(t, "body", "default")).child(String(props.subtitle))));
  }
};
var Separator = {
  render(props, ctx) {
    const line = div41().flex_none().bg(ctx.t.borderDefault);
    return props.orientation === "vertical" ? line.w(1).h_full() : line.h(1).w_full();
  }
};

// src/components/lists.ts
import { Accordion as BaseAccordion2, AccordionHeader as AccordionHeader2, AccordionItem as BaseAccordionItem2, AccordionPanel as AccordionPanel2, AccordionTrigger as AccordionTrigger2, Button as GButton2 } from "gpui-base";
import { div as div42 } from "gpui-kit";

// src/components/lists-state.ts
function getRowConfiguration(n, maxPerRow) {
  if (n <= 0)
    return [];
  if (n === 1)
    return [1];
  if (maxPerRow === 2) {
    const fullRows = Math.floor(n / 2);
    const remainder = n % 2;
    const result = Array(fullRows).fill(2);
    if (remainder)
      result.push(1);
    return result;
  }
  if (n % 3 === 0) {
    return Array(n / 3).fill(3);
  }
  if (n % 3 === 2) {
    const threes = Math.floor(n / 3);
    const result = Array(threes).fill(3);
    result.splice(Math.ceil(result.length / 2), 0, 2);
    return result;
  }
  const threes = Math.floor((n - 4) / 3);
  const result = Array(threes).fill(3);
  return [...result, 2, 2];
}
var freshSectionOpenState = () => ({
  open: [],
  userSelected: false,
  prevLength: 0,
  prevIsStreaming: undefined
});
function syncSectionOpen(state, items, isStreaming) {
  if (state.prevIsStreaming === undefined)
    state.prevIsStreaming = isStreaming;
  const firstItemValue = items[0];
  const d = state.deps1;
  if (!d || d.length !== items.length || d.streaming !== isStreaming || d.first !== firstItemValue) {
    state.deps1 = { length: items.length, streaming: isStreaming, first: firstItemValue };
    if (items.length > 0) {
      if (isStreaming && items.length > state.prevLength && !state.userSelected) {
        const lastValue = items[items.length - 1];
        if (lastValue && !state.open.includes(lastValue))
          state.open = [...state.open, lastValue];
      } else if (state.open.length === 0 && firstItemValue) {
        state.open = [firstItemValue];
      }
      state.prevLength = items.length;
    }
  }
  if (state.deps2 !== isStreaming) {
    state.deps2 = isStreaming;
    if (state.prevIsStreaming && !isStreaming && !state.userSelected && items.length > 0) {
      state.open = firstItemValue ? [firstItemValue] : [];
    }
    state.prevIsStreaming = isStreaming;
  }
}
function toggleSection(state, value) {
  state.userSelected = true;
  state.open = state.open.includes(value) ? state.open.filter((v) => v !== value) : [...state.open, value];
}

// src/components/lists.ts
var accordionHeader2 = (trigger) => AccordionHeader2.new(trigger);
var asArray4 = (v) => Array.isArray(v) ? v : v == null ? [] : [v];
var propsOf = (node) => e24(node) ? node.props ?? {} : {};
var Item2 = { render: () => null };
var ListItem = Item2;
var FollowUpItem = Item2;
var SectionItem = Item2;
function entityRow(ctx, raw, rowType, size, key, last) {
  const t = ctx.t;
  const row = raw !== null && typeof raw === "object" ? Object.fromEntries(Object.entries(raw)) : {};
  const right = row.rightVariant === "number" ? "number" : "text";
  const small = size === "small";
  const leftFont = typography(t, "body", small ? "small" : "default");
  const rightFont = small ? right === "number" ? typography(t, "number", "small-heavy") : typography(t, "body", "small-heavy") : rowType === "footer" ? right === "number" ? typography(t, "number", "large-heavy") : typography(t, "body", "large-heavy") : right === "number" ? typography(t, "number", "heavy") : typography(t, "body", "heavy");
  const color = rowType === "header" ? t.textNeutralSecondary : t.textNeutralPrimary;
  const cell = (part, text, font, align) => textStyle(div42().flex_1().min_w(0).max_w("50%").text_color(color), font).children(text ? [markdownInline(ctx, `${key}-${part}`, text, { font, color, align })] : []);
  return div42().flex().flex_row().justify_between().items_start().gap(t.spaceM).py(t.spaceM).w_full().text_color(t.textNeutralPrimary).when(!last, (el) => el.border_b_1().border_color(t.borderDefault)).child(cell("left", String(row.left ?? ""), leftFont)).child(cell("right", String(row.right ?? ""), rightFont, "right"));
}
var EntityList = {
  render(props, ctx) {
    const size = props.size === "small" ? "small" : "default";
    const rows = asArray4(props.rows);
    const showHeaderFooter = size === "default";
    const header = showHeaderFooter && props.header ? props.header : null;
    const footer = showHeaderFooter && props.footer ? props.footer : null;
    const all = [
      ...header ? [{ row: header, type: "header" }] : [],
      ...rows.map((row) => ({ row, type: "body" })),
      ...footer ? [{ row: footer, type: "footer" }] : []
    ];
    return div42().flex().flex_col().w_full().children(all.map((r, i) => entityRow(ctx, r.row, r.type, size, `row${i}`, i === all.length - 1)));
  }
};
function listItem(ctx, o, hover) {
  const t = ctx.t;
  const small = o.size === "small";
  const hasAction = !!o.onClick;
  const focus = hasAction ? ctx.retained(ctx.id(`item${o.index}:focus`), { kind: "focus", meta: null, create: (_entry, cx) => cx.focus_handle() }) : null;
  const hovered = hasAction && (hover.over === o.index || focus?.is_focused() === true);
  const id = ctx.id(`item${o.index}`);
  const dim = o.listHasSubtitle ? small ? 36 : 40 : small ? 20 : 24;
  const indicator = div42().flex().flex_none().items_center().justify_center().w(dim).h(dim).rounded(o.listHasSubtitle ? t.radiusM : t.radiusS).overflow_hidden().bg(hovered ? t.highlightStrong : t.sunk).text_color(t.textNeutralSecondary).when(o.listHasSubtitle, (el) => el.mt(t.space2xs));
  if (o.variant === "number") {
    indicator.child(textStyle(div42().text_color(t.textNeutralSecondary), small ? typography(t, "number", "small") : typography(t, "label", "default")).child(String(o.index + 1)));
  } else if (o.image && (o.image.src || o.image.alt)) {
    const state = ctx.image(o.image.src);
    const picture = state.status === "ready" ? fitImage(state, { width: dim, height: dim }, "cover") : state.status === "failed" && o.image.alt ? div42().w(dim).h(dim).overflow_hidden().whitespace_nowrap().child(o.image.alt) : null;
    indicator.child(div42().flex().items_center().justify_center().w_full().h_full().rounded(t.radiusS).overflow_hidden().children(optional(picture)));
  }
  const bodyFont = typography(t, "body", small ? "small" : "default");
  const content = div42().flex().flex_col().flex_1().min_w(0).when(!!o.title, (el) => el.child(textStyle(div42().text_color(t.textNeutralPrimary), bodyFont).child(o.title))).when(!!o.subtitle, (el) => el.child(textStyle(div42().text_color(t.textNeutralSecondary), bodyFont).child(o.subtitle)));
  const actionColor = hovered ? t.textNeutralPrimary : t.textNeutralSecondary;
  const action = hasAction ? div42().flex().flex_row().flex_none().items_center().gap(t.space2xs).text_color(actionColor).children(optional(o.actionLabel ? textStyle(div42().text_color(actionColor), bodyFont).child(o.actionLabel) : null)).child(textStyle(div42().text_color(actionColor), bodyFont).children(optional(ctx.icon("ChevronRight", { size: 16 })))) : null;
  const row = div42().id(id).flex().flex_row().gap(small ? t.spaceSM : t.spaceM).when(!!o.subtitle, (el) => el.items_start()).when(!o.subtitle, (el) => el.items_center()).child(indicator).child(div42().flex().flex_row().items_start().justify_between().flex_1().min_w(0).child(content).children(optional(action))).when(hasAction, (el) => el.cursor_pointer().tab_index(0).when(!!focus, (e) => e.track_focus(focus)).on_hover((over, cx) => {
    const next = over ? o.index : hover.over === o.index ? -1 : hover.over;
    if (next !== hover.over) {
      hover.over = next;
      cx.notify();
    }
  }).on_click(() => o.onClick()));
  return div42().flex().flex_col().gap(small ? t.spaceS : t.spaceM).w_full().when(hasAction && !o.last, (el) => el.pb(t.spaceM).border_b_1().border_color(t.borderDefault)).child(row);
}
var ListBlock = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray4(props.items);
    const variant = props.variant ?? "number";
    const size = props.size ?? "default";
    const listHasSubtitle = items.some((item) => !!propsOf(item).subtitle);
    const hover = ctx.local({ over: -1 }, "hover");
    return div42().flex().flex_col().items_start().w_full().gap(size === "small" ? t.spaceM : t.spaceL).children(items.map((item, index) => {
      const p = propsOf(item);
      const title = String(p.title ?? "");
      const action = p.action;
      const hasAction = !!action;
      return listItem(ctx, {
        title,
        subtitle: p.subtitle ? String(p.subtitle) : undefined,
        image: variant === "image" ? p.image : undefined,
        actionLabel: hasAction && p.actionLabel ? String(p.actionLabel) : undefined,
        onClick: hasAction ? () => ctx.action(title, undefined, action) : undefined,
        variant,
        size,
        index,
        listHasSubtitle,
        last: index === items.length - 1
      }, hover);
    }));
  }
};
var FollowUpBlock = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray4(props.items);
    return div42().flex().flex_col().child(div42().text_color(t.textNeutralSecondary).py(t.spaceS).mb(t.spaceM).border_b_1().border_color(t.borderDefault).child("Related Queries")).children(items.map((item, i) => {
      const text = String(propsOf(item).text ?? "");
      return textStyle(GButton2.new(ctx.id(`followup${i}`)).on_click(() => ctx.action(text, undefined)).flex().flex_row().items_center().justify_between().w_full().gap(t.spaceS).py(t.spaceS).text_color(t.textNeutralPrimary).text_left().cursor_pointer().when(i < items.length - 1, (el) => el.border_b_1().border_color(t.borderDefault)), typography(t, "body", "default")).children(text ? [div42().flex_1().min_w(0).text_left().child(text)] : []);
    }));
  }
};
function sectionTrigger(ctx, t, id, text, open, toggle) {
  const wrapper = div42().flex().flex_col().items_start().justify_center().gap(t.spaceL).w_full().child(div42().flex_none().w_full().h(1).bg(t.borderDefault).m(t.space3xs)).child(div42().flex().flex_row().items_center().justify_start().gap(t.spaceS).w_full().child(div42().id(`${id}-chevron`).flex().flex_none().items_center().justify_center().w(20).h(20).border_1().border_color(t.borderInteractive).rounded(t.radiusS).text_color(t.textNeutralPrimary).hover((s) => s.bg(t.highlight)).children(optional(ctx.icon(open ? "ChevronDown" : "ChevronRight", { size: 10 })))).child(textStyle(div42().flex().flex_1().items_center().justify_start().text_color(t.textNeutralPrimary), typography(t, "heading", "small")).child(text)));
  const focusable = keyTrigger(id, toggle).child(wrapper);
  return AccordionTrigger2.new(id).flex().flex_row().items_center().justify_between().w_full().flex_1().pt(t.spaceM).pb(t.spaceXs).text_color(t.textNeutralPrimary).cursor_pointer().on_change((_open, cx) => toggle(cx)).child(focusable);
}
var SectionBlock = {
  render(props, ctx) {
    const t = ctx.t;
    const items = asArray4(props.sections);
    const isFoldable = props.isFoldable !== false;
    const local = ctx.local(freshSectionOpenState());
    syncSectionOpen(local, items.map((item) => propsOf(item).value), ctx.streaming);
    if (!isFoldable) {
      return items.map((item, i) => {
        const p = propsOf(item);
        return div42().flex().flex_col().items_start().justify_center().gap(t.spaceXl).mt(t.spaceM).child(div42().flex().flex_col().items_start().justify_center().w_full().gap(t.spaceXl).child(div42().flex_none().w_full().h(1).bg(t.borderDefault)).child(div42().flex().flex_row().items_center().justify_start().gap(t.spaceS).mb(t.space2xs).child(textStyle(div42().text_color(t.textNeutralPrimary), typography(t, "heading", "small")).child(String(p.trigger ?? "")))).child(div42().flex().flex_col().w_full().gap(t.spaceXl).children(ctx.children(p.content, `section${i}`))));
      });
    }
    return BaseAccordion2.new(ctx.id()).flex().flex_col().gap(t.spaceL).children(items.map((item, i) => {
      const p = propsOf(item);
      const value = String(p.value ?? i);
      const open = local.open.includes(value);
      const toggle = (cx) => {
        toggleSection(local, value);
        cx.notify();
      };
      const panel = div42().flex().flex_col().w_full().gap(t.spaceXl).pl(28).children(ctx.children(p.content, `section${i}`));
      return BaseAccordionItem2.new().open(open).flex().flex_col().gap(t.spaceL).w_full().header(accordionHeader2(sectionTrigger(ctx, t, ctx.id(`trigger-${i}`), String(p.trigger ?? ""), open, toggle)).flex()).panel(AccordionPanel2.new().child(open ? panel : div42()));
    }));
  }
};

// src/components/modal.ts
import { div as div43 } from "gpui-kit";
var WIDTHS = { sm: 400, md: 560, lg: 720 };
var RADIUS = 12;
var CLOSE_BOX = 28;
var CLOSE_RADIUS = 6;
var CLOSE_ICON = 18;
var FADE_MS2 = 150;
var Modal = {
  render(props, ctx) {
    const field = ctx.field("open", props.open);
    const isOpen = field.value === true || field.value === "true";
    const local = ctx.local({ shown: false, pressed: false, closeHover: false });
    if (!isOpen) {
      local.shown = false;
      local.pressed = false;
      local.closeHover = false;
      return null;
    }
    const close = () => field.setValue(false);
    ctx.overlay("modal", (o) => {
      const t = o.t;
      const focus = o.retained(o.id("focus"), {
        kind: "modal-focus",
        meta: null,
        create: (_entry, cx) => cx.focus_handle()
      });
      const opacity = local.shown ? 1 : 0;
      if (!local.shown) {
        local.shown = true;
        o.after(() => {});
      }
      const size = props.size ?? "md";
      const width = WIDTHS[size];
      const title = textStyle(div43().flex_1().min_w(0), typography(t, "body", "heavy")).child(String(props.title ?? ""));
      const closeButton = div43().id(o.id("close")).flex().flex_none().items_center().justify_center().w(CLOSE_BOX).h(CLOSE_BOX).rounded(CLOSE_RADIUS).cursor_pointer().text_color(local.closeHover ? t.textNeutralPrimary : t.textNeutralSecondary).on_hover((hovered, cx) => {
        if (local.closeHover === hovered)
          return;
        local.closeHover = hovered;
        cx.notify();
      }).on_click((_e, cx) => {
        cx.stop_propagation();
        close();
      }).children(optional(o.icon("X", { size: CLOSE_ICON })));
      const header = div43().flex().flex_row().flex_none().items_center().justify_between().p(t.spaceM).border_b_1().border_color(t.borderDefault).child(title).child(closeButton);
      const body = div43().id(o.id("body")).flex().flex_col().flex_1().min_h(0).gap(t.spaceM).p(t.spaceM).overflow_y_scroll().children(o.children(props.children, "c"));
      let content = div43().id(o.id("content")).flex().flex_col().max_h("85%").bg(t.foreground).text_color(t.textNeutralPrimary).border_1().border_color(t.borderDefault).rounded(RADIUS).opacity(opacity).transition("opacity", { duration: FADE_MS2, easing: "ease-out" }).on_mouse_down("left", (_e, cx) => {
        cx.stop_propagation();
        local.pressed = false;
      }).on_mouse_up("left", (_e, cx) => {
        cx.stop_propagation();
        local.pressed = false;
      }).on_key_down((e, cx) => {
        if (e.key !== "escape")
          return;
        cx.stop_propagation();
        close();
      }).child(header).child(body);
      content = shadow(content, "2xl", t.foreground);
      if (width !== undefined)
        content = content.w(width).max_w("90%");
      if (focus)
        content = content.track_focus(focus);
      const backdrop = textStyle(div43().id(o.id("overlay")).relative().flex().items_center().justify_center().size_full().cursor_default().text_color(t.textNeutralPrimary), typography(t, "body", "default")).child(div43().absolute().inset_0().bg(t.overlay).opacity(opacity).transition("opacity", { duration: FADE_MS2, easing: "ease-out" })).child(content).on_mouse_down("left", (_e, cx) => {
        cx.stop_propagation();
        local.pressed = true;
      }).on_mouse_up("left", (_e, cx) => {
        cx.stop_propagation();
        if (!local.pressed)
          return;
        local.pressed = false;
        close();
      }).on_mouse_down("right", (_e, cx) => cx.stop_propagation()).on_scroll_wheel((_e, cx) => cx.stop_propagation());
      return { el: backdrop, focus };
    });
    return null;
  }
};

// src/components/option-cards.ts
import { Button as GButton3 } from "gpui-base";
import { div as div44 } from "gpui-kit";
var OptionCard = { render: () => null };
function isImageTopContent(topContent) {
  return e24(topContent) && typeof topContent.props?.src === "string";
}
var TWO_COLUMNS_MAX = 768;
var ONE_COLUMN_MAX = 480;
function cardRows2(count, width) {
  const indices = Array.from({ length: count }, (_, i) => i);
  if (width === 0 || width > TWO_COLUMNS_MAX) {
    let next = 0;
    return getRowConfiguration(count, 3).map((inRow) => indices.slice(next, next += inRow));
  }
  const columns = width > ONE_COLUMN_MAX ? 2 : 1;
  const rows = [];
  for (let i = 0;i < count; i += columns)
    rows.push(indices.slice(i, i + columns));
  return rows;
}
function card(ctx, item, i, selected, disabled, onToggle) {
  const t = ctx.t;
  const hasTop = item.topContent != null;
  const image = isImageTopContent(item.topContent);
  const top = hasTop ? image ? div44().flex_none().self_start().w(72).h(72).rounded(t.radiusM).overflow_hidden().children(ctx.children(item.topContent, `card${i}:top`)) : div44().flex().flex_none().self_start().items_center().justify_center().w(32).h(32).rounded(t.radiusS).bg(t.sunk).text_color(t.textNeutralPrimary).children(ctx.children(item.topContent, `card${i}:top`)) : null;
  const titleFont = typography(t, "body", "heavy");
  const titleColor = disabled ? t.textNeutralTertiary : t.textNeutralPrimary;
  const subtitleFont = typography(t, "body", "small");
  const subtitleColor = disabled ? t.textNeutralTertiary : t.textNeutralSecondary;
  const subtitle = item.subtitle ? String(item.subtitle) : "";
  const text = div44().flex().flex_col().gap(t.space3xs).min_w(0).child(textStyle(div44().text_color(titleColor), titleFont).child(markdownInline(ctx, `card${i}-title`, String(item.title ?? ""), { font: titleFont, color: titleColor }))).children(subtitle ? [
    textStyle(div44().text_color(subtitleColor), subtitleFont).child(markdownInline(ctx, `card${i}-subtitle`, subtitle, { font: subtitleFont, color: subtitleColor }))
  ] : []);
  const content = div44().flex().flex_col().items_start().justify_start().gap(t.spaceM).w_full().children(optional(top)).child(text);
  const el = GButton3.new(ctx.id(`card${i}`)).selected(selected).disabled(disabled).on_click(onToggle).flex().flex_row().items_start().justify_start().flex_1().w_full().p(t.spaceSM).border_1().rounded(t.radius2xl).child(content);
  const styled = selected ? el.border_color(t.borderInteractiveSelected).bg(t.sunk) : el.border_color(t.borderInteractive).bg(TRANSPARENT).when(!disabled, (b) => b.hover((s) => s.border_color(t.borderInteractiveEmphasis)));
  return disabled ? styled.opacity(0.5).cursor_not_allowed() : styled.cursor_pointer();
}
var OptionCards = {
  render(props, ctx) {
    const t = ctx.t;
    const selection = selectionField(ctx, "OptionCards", { name: String(props.name), type: props.type, rules: props.rules, defaultValue: props.defaultValue }, "single");
    const items = (Array.isArray(props.items) ? props.items : []).flatMap((item) => e24(item) ? [item.props ?? {}] : []).filter((p) => p.value);
    const size = ctx.local({ width: 0 }, "size");
    const rows = cardRows2(items.length, size.width);
    return div44().id(ctx.id("size")).flex().flex_col().gap(t.spaceM).w_full().on_size_change((s, cx) => {
      if (size.width !== s.width) {
        size.width = s.width;
        cx.notify();
      }
    }).children(rows.map((row) => div44().flex().flex_row().gap(t.spaceM).w_full().children(row.map((index) => {
      const item = items[index];
      const i = index;
      const selected = selection.selected.includes(String(item.value));
      const disabled = selection.disabled || item.disabled === true;
      return div44().flex().flex_col().flex_1().min_w(0).child(card(ctx, item, i, selected, disabled, () => selection.toggle(String(item.value))));
    }))));
  }
};

// src/components/slider.ts
import {
  Input as GInput3,
  InputState as InputState3,
  Slider as GSlider,
  SliderIndicator,
  SliderState,
  SliderThumb,
  SliderTrack
} from "gpui-base";
import { div as div45 } from "gpui-kit";

// src/components/slider-values.ts
function formatNumber(num) {
  if (num === undefined)
    return "";
  if (num < 1000)
    return String(num);
  const suffixes = ["k", "m", "b", "t"];
  let unit = Math.min(Math.floor(Math.log10(num) / 3), 4);
  for (;; ) {
    const scale = 10 ** (3 * unit);
    const scaled = num / scale;
    const rounded = scaled < 10 ? Math.round(num / (scale / 10)) / 10 : Math.round(scaled);
    if (rounded >= 1000 && unit < 4) {
      unit++;
      continue;
    }
    return `${rounded}${suffixes[unit - 1]}`;
  }
}
function effectiveStep(discrete, step) {
  return discrete ? step ?? 1 : Math.max(1, step ?? 1);
}
function valueErrors(value, min, max) {
  const [minValue, maxValue] = value;
  const check = (v) => {
    if (isNaN(v))
      return "Invalid number";
    if (v < min || v > max)
      return `Value must be between ${min} and ${max}`;
    return "";
  };
  const error = { min: check(minValue), max: check(maxValue) };
  if (value.length > 1 && minValue > maxValue)
    error.min = "Min must be less than max";
  return error;
}
function typedNumber(text) {
  const n = Number(text);
  return Number.isNaN(n) ? undefined : n;
}
var MAX_STEPS = 20000;
function stepCount(min, max, step) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min))
    return null;
  if (!Number.isFinite(step) || !(step > 0))
    return null;
  const count = Math.floor((max - min) / step);
  return count > MAX_STEPS ? null : count;
}
function dots(min, max, step, value) {
  const count = stepCount(min, max, step);
  if (count === null)
    return [];
  const isRange = value.length > 1;
  const current = value[0] ?? min;
  return Array.from({ length: count + 1 }, (_, index) => {
    const v = min + step * index;
    return {
      position: (v - min) / (max - min) * 100,
      active: isRange ? v >= (value[0] ?? min) && v <= (value[1] ?? max) : v <= current
    };
  });
}
function clampToRange(value, min, max) {
  return value.map((v) => Number.isNaN(v) ? min : Math.min(max, Math.max(min, v)));
}
function canUseNative(min, max, step) {
  return Number.isFinite(min) && Number.isFinite(max) && max > min && Number.isFinite(step) && step > 0;
}
function decimalCount(value) {
  return (String(value).split(".")[1] || "").length;
}
function roundValue(value, decimals) {
  const rounder = 10 ** decimals;
  return Math.round(value * rounder) / rounder;
}
function toNative(value, min, max) {
  return clampToRange(value, min, max).map((v) => v - min);
}
function fromNative(raw, min, max, step) {
  const decimals = decimalCount(step);
  return raw.map((s) => Math.min(max, Math.max(min, roundValue(Math.round(s / step) * step + min, decimals))));
}
function hasMinStepBetween(value, step) {
  if (value.length < 2)
    return true;
  return value[1] - value[0] >= step - 0.000000001 * step;
}
function holdApart(raw, before, step, span) {
  if (raw.length < 2 || before.length < 2)
    return null;
  const lowMoved = raw[0] !== before[0];
  const highMoved = raw[1] !== before[1];
  if (lowMoved === highMoved)
    return null;
  const held = lowMoved ? [raw[1] - step, raw[1]] : [raw[0], raw[0] + step];
  return held[0] >= 0 && held[1] <= span ? held : null;
}

// src/components/slider.ts
var COMMIT_DELAY_MS = 200;
var sameNumbers = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
var toArray = (v) => typeof v === "number" ? [v] : [...v];
function setValueAndCommit(ui, value, cx) {
  ui.value = value;
  ui.pushTexts();
  ui.pending = value;
  ui.timer?.cancel();
  ui.timer = cx.timer.after(COMMIT_DELAY_MS, () => flush(ui));
  cx.notify();
  ui.wake();
}
function pushNative(ui, slider, native) {
  ui.pushing = true;
  ui.pushed = native;
  try {
    slider.set_value(native.length > 1 ? [native[0], native[1]] : native[0]);
  } finally {
    ui.pushing = false;
  }
}
function flush(ui) {
  ui.timer?.cancel();
  ui.timer = null;
  const value = ui.pending;
  ui.pending = null;
  if (value)
    ui.commit(value);
}
function sliderBlock(o) {
  const { ctx, min, max } = o;
  const t = ctx.t;
  const streaming = o.streaming;
  const discrete = o.variant === "discrete";
  const step = effectiveStep(discrete, o.step);
  const seen = JSON.stringify([o.defaultValue ?? null, min]);
  const ui = ctx.local({
    value: o.defaultValue ? [...o.defaultValue] : [min],
    seen,
    min,
    max,
    nativeValue: [],
    pushed: [],
    pushing: false,
    dragging: false,
    dragStart: null,
    dragThumb: -1,
    texts: [],
    focused: [false, false],
    hover: -1,
    trackWidth: 0,
    pending: null,
    timer: null,
    commit: o.onCommit,
    wake: () => {},
    pushTexts: () => {}
  }, "slider");
  ui.commit = o.onCommit;
  ui.wake = ctx.waker();
  ui.min = min;
  ui.max = max;
  if (ui.seen !== seen) {
    ui.seen = seen;
    ui.value = o.defaultValue ? [...o.defaultValue] : [min];
  }
  const value = ui.value;
  const isRange = value.length > 1;
  const shownValue = clampToRange(value, min, max);
  const native = canUseNative(min, max, step) ? ctx.retained(`slider:${ctx.id()}:${isRange}:${min}:${max}:${step}`, {
    kind: "slider",
    meta: {},
    create() {
      const start = toNative(value, min, max);
      const slider = SliderState.new({ min: 0, max: max - min, step, value: isRange ? [start[0], start[1]] : start[0] });
      ui.nativeValue = shownValue;
      ui.pushed = start;
      slider.on("change", (v, cx) => {
        if (ui.pushing)
          return;
        let raw = toArray(v);
        if (sameNumbers(raw, ui.pushed))
          return;
        if (ui.dragging)
          ui.dragThumb = raw.findIndex((n, i) => n !== ui.pushed[i]);
        let next = fromNative(raw, min, max, step).sort((a, b) => a - b);
        if (!hasMinStepBetween(next, step)) {
          const held = holdApart(raw, ui.pushed, step, max - min);
          if (!held || sameNumbers(held, ui.pushed)) {
            pushNative(ui, slider, ui.pushed);
            return;
          }
          raw = held;
          next = fromNative(raw, min, max, step).sort((a, b) => a - b);
          pushNative(ui, slider, raw);
        }
        ui.pushed = raw;
        ui.nativeValue = next;
        setValueAndCommit(ui, next, cx);
        if (!ui.dragging)
          ui.commit(next);
      });
      slider.on("release", (v, cx) => {
        const before = ui.dragStart;
        ui.dragging = false;
        ui.dragStart = null;
        ui.dragThumb = -1;
        const next = fromNative(toArray(v), min, max, step).sort((a, b) => a - b);
        if (before && String(next) !== String(before))
          ui.commit(next);
        cx.notify();
        ui.wake();
      });
      return {
        slider,
        release() {
          flush(ui);
          slider.release();
        }
      };
    }
  }) : null;
  const inputs = discrete ? null : ctx.retained(`slider-inputs:${ctx.id()}:${isRange}`, {
    kind: "slider-inputs",
    meta: {},
    create() {
      const states = [];
      for (let i = 0;i < (isRange ? 2 : 1); i++) {
        const input = InputState3.new({ value: String(ui.value[i] ?? (i === 0 ? ui.min : ui.max)) });
        ui.texts[i] = input.value();
        input.on("change", (_e, cx) => {
          ui.texts[i] = input.value();
          const n = typedNumber(input.value());
          if (n === undefined || n === ui.value[i])
            return;
          const [low, high] = ui.value;
          setValueAndCommit(ui, i === 0 ? isRange ? [n, high ?? ui.max] : [n] : [low ?? ui.min, n], cx);
        });
        input.on("focus", () => {
          ui.focused[i] = true;
        });
        input.on("blur", (_e, cx) => {
          ui.focused[i] = false;
          cx.notify();
        });
        states.push(input);
      }
      return {
        inputs: states,
        release() {
          for (const input of states)
            input.release();
        }
      };
    }
  });
  ui.pushTexts = () => inputs?.inputs.forEach((input, i) => {
    const text = String(ui.value[i]);
    if (ui.focused[i] || ui.texts[i] === text)
      return;
    ui.texts[i] = text;
    input.set_value(text);
  });
  const texts = value.map((v) => String(v));
  const thumbStale = native !== null && !sameNumbers(ui.nativeValue, shownValue);
  const textStale = !streaming && inputs !== null && inputs.inputs.some((_, i) => !ui.focused[i] && ui.texts[i] !== texts[i]);
  if (thumbStale || textStale) {
    ctx.after(() => {
      if (native && !sameNumbers(ui.nativeValue, shownValue)) {
        ui.nativeValue = shownValue;
        pushNative(ui, native.slider, toNative(value, min, max));
      }
      inputs?.inputs.forEach((input, i) => {
        if (ui.focused[i] || ui.texts[i] === texts[i])
          return;
        ui.texts[i] = texts[i];
        input.set_value(texts[i]);
      });
    });
  }
  const errors = valueErrors(value, min, max);
  const hasError = !streaming && !discrete && (isRange ? Boolean(errors.min || errors.max) : Boolean(errors.min));
  const errorMessage = (text) => textStyle(div45().flex().flex_row().items_center().gap(t.space2xs).whitespace_nowrap().pr(t.space2xs).text_color(t.textDangerPrimary), typography(t, "label", "small")).children(optional(ctx.icon("AlertCircle", { size: 14 }))).child(text);
  const separator = () => div45().w(8).h(2).flex_none().bg(t.textNeutralSecondary);
  const valueInput = (i, error, width) => {
    const frame = (el) => textStyle(el.w(width).h(36).border_1().rounded(t.radiusM).py(t.spaceXs - 1).px(t.spaceS).text_right().whitespace_nowrap().overflow_hidden().bg(t.highlightSubtle).border_color(error ? t.borderDangerEmphasis : t.borderInteractive).text_color(t.textNeutralPrimary), typography(t, "body", "default"));
    const state = inputs?.inputs[i];
    if (!state)
      return frame(div45()).child(String(value[i] ?? (i === 0 ? min : max)));
    return frame(GInput3.new(state)).focus((s) => s.border_color(error ? t.borderDangerEmphasis : t.borderInteractiveEmphasis));
  };
  const optionsFor = (keep) => {
    const count = stepCount(min, max, step);
    const out = [];
    if (count === null)
      return out;
    for (let i = 0;i <= count; i++) {
      const o = min + i * step;
      if (keep(o))
        out.push({ value: String(o), label: String(o) });
    }
    return out;
  };
  let controls = null;
  if (!streaming) {
    const column = () => div45().flex().flex_col().items_end().gap(t.spaceXs).relative();
    if (discrete) {
      const [low, high] = value;
      const pick = (part, current, items, width, change) => selectControl({
        ctx,
        part,
        value: String(current),
        items,
        width,
        height: 36,
        onChange: (v, cx) => setValueAndCommit(ui, change(Number(v)), cx)
      });
      controls = isRange ? column().child(div45().flex().flex_row().items_center().gap(t.spaceXs).child(pick("low", low, optionsFor((o) => o < (high ?? max)), 80, (n) => [n, high ?? max].sort((a, b) => a - b))).child(separator()).child(pick("high", high, optionsFor((o) => o > (low ?? min)), 80, (n) => [low ?? min, n].sort((a, b) => a - b)))) : column().child(pick("single", low, optionsFor(() => true), 100, (n) => [n]));
    } else if (isRange) {
      const error = errors.min || errors.max;
      controls = column().child(div45().flex().flex_row().items_center().gap(t.spaceXs).child(valueInput(0, errors.min, 64)).child(separator()).child(valueInput(1, errors.max, 64))).when(!!error, (el) => el.child(errorMessage(error)));
    } else {
      controls = column().child(valueInput(0, errors.min, 80)).when(!!errors.min, (el) => el.child(errorMessage(errors.min)));
    }
  }
  const header = div45().flex().flex_row().justify_between().when(hasError, (el) => el.items_start().mb(t.spaceS)).when(!hasError, (el) => el.items_center().mb(t.spaceS + t.spaceXs)).child(textStyle(div45().pt(t.spaceXs).text_color(t.textNeutralPrimary), typography(t, "label", "default")).child(o.label)).children(optional(controls));
  return div45().id(ctx.id()).flex().flex_col().w_full().child(header).child(div45().flex().flex_row().items_center().child(slider(ctx, ui, native, { variant: streaming ? "continuous" : o.variant, min, max, step, streaming, shownValue })));
}
function slider(ctx, ui, native, v) {
  const t = ctx.t;
  const { min, max } = v;
  const dim = (el) => v.streaming ? el.opacity(0.5) : el;
  const isRange = v.shownValue.length > 1;
  const span = max - min;
  const share = (n) => span > 0 ? (n - min) / span : 0;
  const track = Math.max(0, ui.trackWidth - 20);
  const [low, high] = isRange ? [v.shownValue[0], v.shownValue[1]] : [min, v.shownValue[0]];
  const fillLeft = isRange ? 10 + share(low) * track - 10 : 0;
  const fillRight = 10 + share(high) * track + 8;
  const fillHidden = !isRange && high === min;
  const fill = dim(div45().absolute().top(0).left(fillLeft).w(Math.max(0, fillRight - fillLeft)).h(10).rounded(t.radiusS).bg(fillHidden || track === 0 || !(span > 0) ? "#00000000" : t.interactiveAccentDefault));
  const dotLayer = v.variant === "discrete" && track > 0 ? dots(min, max, v.step, v.shownValue).map((d) => dim(div45().absolute().top(3).left(10 + d.position / 100 * track - 2).size(4).rounded(t.radiusFull).bg(d.active ? t.foreground : t.textNeutralTertiary))) : [];
  const startPress = () => {
    ui.dragging = true;
    ui.dragStart = [...ui.value];
  };
  const thumb = (i) => {
    const state = native.slider;
    const handle = shadow(div45().size(20).rounded(t.radiusS).overflow_hidden().flex().items_center().justify_center().bg(t.foreground).hover((s) => s.bg(over(t.sunk, t.foreground))).on_mouse_down("left", startPress).on_hover((hovered, cx) => {
      const next = hovered ? i : ui.hover === i ? -1 : ui.hover;
      if (next !== ui.hover) {
        ui.hover = next;
        cx.notify();
      }
    }), t.shadowS, t.foreground).child(div45().size(6).rounded(t.radius3xs).bg(t.interactiveAccentDefault));
    const bubble = shadow(textStyle(div45().p(t.space2xs).rounded(t.radiusS).border_1().border_color(t.borderInteractive).bg(t.foreground).text_color(t.textNeutralPrimary).whitespace_nowrap(), typography(t, "label", "small")), t.shadowS, t.foreground).child(formatNumber(v.shownValue[i]));
    const el = SliderThumb.new(state).id(ctx.id(`thumb${i}`)).size(22).ml(-11).rounded(t.radiusS + 1).border_1().border_color(t.borderDefault).flex().items_center().justify_center().child(handle).when(!v.streaming && (ui.hover === i || ui.dragging && ui.dragThumb === i), (e) => e.child(div45().absolute().top(-35).left(-1).w(22).flex().flex_row().justify_center().child(bubble)));
    return isRange && i === 0 ? el.start(true) : el;
  };
  const travel = native ? dim(GSlider.new(native.slider).flex().flex_row().items_center().w_full().h(20).min_w(100).child(SliderTrack.new(native.slider).flex().flex_row().items_center().w_full().h(20).child(SliderIndicator.new(native.slider).relative().flex_1().h(22).child(thumb(0)).when(isRange, (e) => e.child(thumb(1)))))) : div45().w_full().h(20);
  const container = div45().relative().flex().flex_row().items_center().w_full().h(10).px(10).bg(t.sunk).rounded(t.radiusS).on_mouse_down("left", startPress).on_size_change((size, cx) => {
    if (Math.abs(size.width - ui.trackWidth) > 0.5) {
      ui.trackWidth = size.width;
      cx.notify();
    }
  }).child(fill).children(dotLayer).child(travel).when(v.streaming, (e) => e.child(div45().absolute().inset_0().on_mouse_down("left", (_e, cx) => cx.stop_propagation())));
  const labels = textStyle(div45().flex().flex_row().justify_between().mt(t.spaceS).px(t.space2xs).text_color(t.textNeutralSecondary), typography(t, "label", "small")).child(formatNumber(min)).child(formatNumber(max));
  return div45().flex().flex_row().items_center().gap(t.spaceS).w_full().child(div45().w_full().child(container).child(labels));
}
var Slider = {
  render(props, ctx) {
    const name = String(props.name ?? "");
    const field = ctx.field(name, props.value);
    const rules = e34(props.rules);
    const form = ctx.form;
    if (form && rules.length && !ctx.streaming) {
      const formName = ctx.formName;
      form.registerField(name, rules, () => ctx.session.stateField(formName, name, props.value).value);
    }
    const value = field.value ?? props.defaultValue;
    return sliderBlock({
      ctx,
      label: props.label || name,
      variant: props.variant || "continuous",
      min: props.min ?? 0,
      max: props.max ?? 100,
      step: props.step,
      defaultValue: value != null ? value : undefined,
      onCommit(vals) {
        field.setValue(vals);
        if (rules.length && form)
          form.validateField(name, vals[0], rules);
      },
      streaming: ctx.streaming
    });
  }
};

// src/components/index.ts
var view = (c) => ({ ...c, view: true });
var cardBlock2 = (c) => ({ ...c, view: true, inlineChildren: true });
var components = {
  Stack,
  Card,
  Tabs: view(Tabs),
  TabItem,
  Accordion: view(Accordion),
  AccordionItem,
  Steps: view(Steps),
  StepsItem,
  Carousel: view(Carousel),
  Separator,
  Modal,
  CardHeader,
  TextContent: view(TextContent),
  MarkDownRenderer: view(MarkDownRenderer),
  Callout: view(Callout),
  TextCallout,
  Image: view(Image),
  ImageBlock: view(ImageBlock),
  ImageGallery: view(ImageGallery),
  CodeBlock: view(CodeBlock),
  InlineHeader,
  SnippetCardBlock: cardBlock2(SnippetCardBlock),
  SnippetCardItem,
  OverviewCardBlock: cardBlock2(OverviewCardBlock),
  OverviewCardItem,
  ContextCardBlock: cardBlock2(ContextCardBlock),
  ContextCardItem,
  CompositeCardBlock: view(CompositeCardBlock),
  CompositeCardItem,
  VisualCardBlock: cardBlock2(VisualCardBlock),
  VisualCardItem,
  Text,
  BoldText,
  IconText,
  ImageText,
  ImageTextLarge,
  MetricIndicatorInline,
  MetricIndicatorWithStrikethrough,
  TagBlock,
  Tag,
  Icon,
  EntityList: view(EntityList),
  ListBlock: view(ListBlock),
  ListItem,
  Table: view(Table),
  Col,
  EditableTable: view(EditableTable),
  BarChart: view(BarChart),
  LineChart: view(LineChart),
  AreaChart: view(AreaChart),
  RadarChart: view(RadarChart),
  HorizontalBarChart: view(HorizontalBarChart),
  Series,
  PieChart: view(PieChart),
  RadialChart: view(RadialChart),
  SingleStackedBarChart: view(SingleStackedBarChart),
  Slice,
  ScatterChart: view(ScatterChart),
  ScatterSeries,
  Point,
  FollowUpBlock,
  FollowUpItem,
  SectionBlock,
  SectionItem,
  Form,
  FormControl,
  Label,
  Input: view(Input),
  TextArea: view(TextArea),
  Select: view(Select),
  SelectItem,
  DatePicker: view(DatePicker),
  Slider: view(Slider),
  CheckBoxGroup: view(CheckBoxGroup),
  CheckBoxItem,
  RadioGroup: view(RadioGroup),
  RadioItem,
  SwitchGroup: view(SwitchGroup),
  SwitchItem,
  Chips: view(Chips),
  ChipItem,
  OptionCards: view(OptionCards),
  OptionCard,
  Button,
  Buttons,
  IconButton,
  Diagram: view(Diagram),
  Node: DiagramPart,
  Entity: DiagramPart,
  Field: DiagramPart,
  Group: DiagramPart,
  Edge: DiagramPart,
  DiagramStep: DiagramPart,
  Sequence: view(Sequence2),
  Participant: DiagramPart,
  Message: DiagramPart,
  Block: DiagramPart,
  Timeline: view(Timeline2),
  Task: TimelinePart
};
// opengpui-shared:openui-genui
var m64 = globalThis[Symbol.for("opengpui shared 160c5dd588f20b26")]["openui-genui"];
var e057 = m64["openuiAdditionalRules"];
var e1107 = m64["openuiChatAdditionalRules"];
var e259 = m64["openuiChatComponentGroups"];
var e330 = m64["openuiChatExamples"];
var e425 = m64["openuiChatLibrary"];
var e520 = m64["openuiChatPromptOptions"];
var e615 = m64["openuiComponentGroups"];
var e713 = m64["openuiExamples"];
var e813 = m64["openuiLibrary"];
var e911 = m64["openuiPromptOptions"];

// src/diagram/components.ts
var Node = e15({
  name: "Node",
  props: e258.object({
    id: e258.string(),
    label: e258.string(),
    kind: e258.enum(NODE_KINDS).optional(),
    sub: e258.string().optional(),
    action: e4().optional()
  }),
  description: "A box in a Diagram. id: short, unique in its Diagram. kind picks the icon (default process); start and end are pills. sub: a smaller second line. action replaces what a click sends.",
  component: null
});
var Field = e15({
  name: "Field",
  props: e258.object({ name: e258.string(), type: e258.string().optional(), key: e258.enum(FIELD_KEYS).optional() }),
  description: "A row of an Entity: a column, attribute or method (`save()`). type shows on the right; key marks a primary (pk) or foreign (fk) key.",
  component: null
});
var Entity = e15({
  name: "Entity",
  props: e258.object({
    id: e258.string(),
    label: e258.string(),
    fields: e258.array(Field.ref),
    sub: e258.string().optional(),
    action: e4().optional()
  }),
  description: "A box drawn as a card of fields (a table, a class), going wherever a Node goes and sharing its ids. Edges attach to the whole card; put cardinality in the edge label.",
  component: null
});
var Group = e15({
  name: "Group",
  props: e258.object({ id: e258.string(), label: e258.string(), nodes: e258.array(e258.union([Node.ref, Entity.ref])) }),
  description: "A labelled frame around its nodes (a process, a machine, a folder). Groups don't nest; edges connect nodes, not groups.",
  component: null
});
var Edge = e15({
  name: "Edge",
  props: e258.object({
    from: e258.string(),
    to: e258.string(),
    label: e258.string().optional(),
    style: e258.enum(EDGE_STYLES).optional(),
    head: e258.enum(EDGE_HEADS).optional()
  }),
  description: "A line between two node ids of its Diagram, ending at to. style: solid (default) or dashed. head: arrow (default), none, triangle (hollow: inherits) or diamond (filled: composition). Its id is from>to; one edge per pair (merge the labels).",
  component: null
});
var Diagram2 = e15({
  name: "Diagram",
  props: e258.object({
    nodes: e258.array(e258.union([Node.ref, Entity.ref, Group.ref])),
    edges: e258.array(Edge.ref),
    steps: e258.array(DiagramStep.ref).optional(),
    direction: e258.enum(["down", "right"]).optional()
  }),
  description: "Boxes and the edges between them, laid out automatically (architecture, flowchart, state machine, dependencies, ER or class diagram), with optional numbered steps that light up their part. direction: down (default) or right (gets wide fast).",
  component: null
});
var COMPONENTS = [Diagram2, Node, Entity, Field, Group, Edge, DiagramStep, Sequence, Participant, Message, Block, Timeline, Task];
var VIEWS = [Diagram2, Sequence, Timeline];
var SLOTS = ["TabItem.content", "AccordionItem.content", "Card.children"];
var NOTES = [
  "Write each Diagram as its own statement, and its nodes, edges and steps lists each as their own: `d = Diagram(dNodes, dEdges, dSteps)`.",
  "Ids are short and unique within one Diagram (nodes, entities and groups share them); two Diagrams may reuse an id.",
  "An edge points the way the diagram reads (cause to effect, caller to callee, one step to the next); the layout places its target after its source.",
  "At most about 20 nodes per Diagram: several Diagrams beat one big one.",
  "When you rewrite a Diagram, keep its nodes and edges in the same order: the layout depends on it.",
  'Clicking a box sends you `Tell me more about <label>` with context {diagram: "<statement id>", node: "<id>"}; a step\'s ask button sends `Tell me more about step <n>: <title>` with {diagram, step, highlight}. A box\'s or step\'s own action replaces it.',
  ...SEQUENCE_NOTES,
  ...TIMELINE_NOTES
];
function withDiagrams(source) {
  const { library } = source;
  const schema = library.toJSONSchema().$defs ?? {};
  const has = (slot) => {
    const [parent, prop] = slot.split(".");
    const def = schema[parent];
    return !!def?.properties?.[prop];
  };
  const slots = SLOTS.filter(has);
  const values = COMPONENTS.filter((c) => !VIEWS.includes(c));
  const views = VIEWS.map((component) => slots.length ? { component, slots } : component);
  const extended = library.extend({ components: { add: [...values, ...views] } });
  const extendedLibrary = e9({
    root: extended.root,
    id: extended.id,
    components: Object.values(extended.components),
    functions: Object.values(extended.functions),
    actions: Object.values(extended.actions),
    componentGroups: [...extended.componentGroups ?? [], { name: "Diagrams", components: COMPONENTS.map((c) => c.name), notes: NOTES }]
  });
  return { library: extendedLibrary, promptOptions: source.promptOptions };
}

// src/library.ts
var libraries = {
  openui: withDiagrams({ library: e813, promptOptions: e911 }),
  chat: withDiagrams({ library: e425, promptOptions: e520 })
};
function subsetLibrary(source, names) {
  const keep = new Set(names);
  const { library } = source;
  const known = new Set(Object.keys(library.components));
  const keeps = (text, pattern) => [...text.matchAll(pattern)].every(([, name]) => !known.has(name) || keep.has(name));
  const callsKept = (text) => keeps(text, /\b([A-Z][A-Za-z0-9]*)\s*\(/g);
  const mentionsKept = (text) => keeps(text, /\b([A-Z][A-Za-z0-9]*)\b/g);
  const namesAny = (text) => [...text.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)].some(([, name]) => known.has(name));
  const notesKept = (notes) => {
    let kept = true;
    return notes.filter((note) => kept = namesAny(note) ? mentionsKept(note) : kept);
  };
  const components = Object.values(library.components).filter((c) => keep.has(c.name));
  const componentGroups = (library.componentGroups ?? []).map((g) => ({
    ...g,
    components: g.components.filter((n) => keep.has(n)),
    ...g.notes ? { notes: notesKept(g.notes) } : {}
  })).filter((g) => g.components.length > 0);
  const subset = e9({ root: library.root, componentGroups, components });
  const availability = "Only the components listed under Component Signatures exist here. A component named only inside another's " + "signature (as an allowed child or input type) is not available: never write it.";
  const options = source.promptOptions;
  const promptOptions = {
    ...options,
    ...options.examples ? { examples: options.examples.filter(callsKept) } : {},
    ...options.toolExamples ? { toolExamples: options.toolExamples.filter(callsKept) } : {},
    additionalRules: [...(options.additionalRules ?? []).filter(mentionsKept), availability]
  };
  return { library: subset, promptOptions };
}
function selectLibrary(name, implemented, only) {
  const source = libraries[name ?? "openui"];
  const label = name ?? "openui";
  if (!source)
    throw new Error(`unknown library "${name}": ${Object.keys(libraries).join(" or ")}`);
  const available = new Set([...implemented].filter((n) => (n in source.library.components)));
  if (!only)
    return subsetLibrary(source, available);
  const wanted = new Set(only);
  if (!wanted.size)
    throw new Error("no components listed");
  const unknown = [...wanted].filter((n) => !available.has(n));
  if (unknown.length)
    throw new Error(`not in the ${label} library: ${unknown.join(", ")}`);
  if (source.library.root)
    wanted.add(source.library.root);
  const defs = source.library.toJSONSchema().$defs ?? {};
  const missing = new Map;
  for (let todo = [...wanted];todo.length; ) {
    const component = todo.pop();
    for (const slot of componentSlots(defs[component])) {
      const [sole] = slot.refs;
      if (slot.refs.length === 1) {
        if (!wanted.has(sole) && available.has(sole)) {
          wanted.add(sole);
          todo.push(sole);
        }
      } else if (slot.required) {
        missing.set(`${component}'s ${slot.prop}`, slot.refs.filter((r) => available.has(r)));
      }
    }
  }
  const unmet = [...missing].filter(([, refs]) => !refs.some((r) => wanted.has(r)));
  if (unmet.length) {
    throw new Error(`the ${label} subset is incomplete: ${unmet.map(([slot, refs]) => `${slot} needs one of ${refs.join(", ")}`).join("; ")}`);
  }
  return subsetLibrary(source, wanted);
}
var schemaNode = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : null;
function componentSlots(def) {
  const refsOf = (value) => {
    const s = schemaNode(value);
    if (!s)
      return null;
    if (typeof s.$ref === "string")
      return [s.$ref.split("/").pop()];
    if (s.items)
      return refsOf(s.items);
    if (Array.isArray(s.anyOf)) {
      const all = s.anyOf.map(refsOf);
      return all.every((r) => r) ? all.flatMap((r) => r) : null;
    }
    return null;
  };
  const slots = [];
  const walk = (s, path, required) => {
    const requiredProps = Array.isArray(s.required) ? s.required : [];
    for (const [prop, value] of Object.entries(schemaNode(s.properties) ?? {})) {
      const at = path ? `${path}.${prop}` : prop;
      const needed = required && requiredProps.includes(prop);
      const p = schemaNode(value);
      if (p?.properties)
        walk(p, at, needed);
      const refs = refsOf(value);
      if (refs?.length)
        slots.push({ prop: at, refs: [...new Set(refs)], required: needed });
    }
  };
  const schema = schemaNode(def);
  if (schema)
    walk(schema, "", true);
  return slots;
}
// src/render/imageHeader.ts
var u16be = (b, i) => b[i] << 8 | b[i + 1];
var u16le = (b, i) => b[i] | b[i + 1] << 8;
var u24le = (b, i) => b[i] | b[i + 1] << 8 | b[i + 2] << 16;
var u32be = (b, i) => (b[i] << 24 >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
var i32le = (b, i) => b[i] | b[i + 1] << 8 | b[i + 2] << 16 | b[i + 3] << 24;
var u32le = (b, i) => i32le(b, i) >>> 0;
var ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));
function readImageHeader(bytes) {
  const b = bytes;
  if (b.length >= 24 && b[0] === 137 && ascii(b, 1, 3) === "PNG" && ascii(b, 12, 4) === "IHDR") {
    return sized("png", "png", u32be(b, 16), u32be(b, 20));
  }
  if (b.length >= 10 && (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a")) {
    return sized("gif", "gif", u16le(b, 6), u16le(b, 8));
  }
  if (b.length >= 4 && b[0] === 255 && b[1] === 216)
    return jpeg(b);
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP")
    return webp(b);
  if (b.length >= 22 && ascii(b, 0, 2) === "BM") {
    if (u32le(b, 14) === 12)
      return sized("bmp", "bmp", u16le(b, 18), u16le(b, 20));
    if (b.length < 26)
      return null;
    return sized("bmp", "bmp", Math.abs(i32le(b, 18)), Math.abs(i32le(b, 22)));
  }
  return svg3(b);
}
function sized(format, ext, width, height) {
  return width > 0 && height > 0 ? { format, ext, width, height } : null;
}
function jpeg(b) {
  let i = 2;
  let swap = false;
  while (i + 9 < b.length) {
    if (b[i] !== 255)
      return null;
    const marker = b[i + 1];
    if (marker === 255) {
      i += 1;
      continue;
    }
    if (marker === 216 || marker === 1 || marker >= 208 && marker <= 215) {
      i += 2;
      continue;
    }
    const length = u16be(b, i + 2);
    if (marker === 225 && ascii(b, i + 4, 4) === "Exif")
      swap = exifSwapsAxes(b, i + 10, i + 2 + length);
    const sof = marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204;
    if (sof) {
      const height = u16be(b, i + 5);
      const width = u16be(b, i + 7);
      return swap ? sized("jpeg", "jpg", height, width) : sized("jpeg", "jpg", width, height);
    }
    i += 2 + length;
  }
  return null;
}
function exifSwapsAxes(b, start, end) {
  if (start + 8 > end || end > b.length)
    return false;
  const le = ascii(b, start, 2) === "II";
  const u16 = (i) => le ? u16le(b, i) : u16be(b, i);
  const u32 = (i) => le ? (u16le(b, i) | u16le(b, i + 2) << 16) >>> 0 : u32be(b, i);
  const ifd = start + u32(start + 4);
  if (ifd + 2 > end)
    return false;
  const count = u16(ifd);
  for (let n = 0;n < count; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > end)
      return false;
    if (u16(entry) === 274) {
      const orientation = u16(entry + 8);
      return orientation >= 5 && orientation <= 8;
    }
  }
  return false;
}
function webp(b) {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X")
    return sized("webp", "webp", u24le(b, 24) + 1, u24le(b, 27) + 1);
  if (chunk === "VP8L" && b[20] === 47) {
    const bits = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24;
    return sized("webp", "webp", (bits & 16383) + 1, (bits >>> 14 & 16383) + 1);
  }
  if (chunk === "VP8 " && b[23] === 157 && b[24] === 1 && b[25] === 42) {
    return sized("webp", "webp", u16le(b, 26) & 16383, u16le(b, 28) & 16383);
  }
  return null;
}
var UNITS = { "": 1, px: 1, pt: 4 / 3, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6, em: 16, rem: 16, ex: 8 };
function svg3(b) {
  let head = ascii(b, 0, Math.min(b.length, 4096)).replace(/^\xEF\xBB\xBF/, "");
  for (;; ) {
    const prolog = /^\s*(<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE\s+svg\b[^>[]*(\[[\s\S]*?\])?\s*>)/i.exec(head);
    if (!prolog)
      break;
    head = head.slice(prolog[0].length);
  }
  const tag = /^\s*<svg\b([^>]*)>/i.exec(head);
  if (!tag)
    return null;
  const attr = (name) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag[1])?.[1];
  const length = (value) => {
    const m = value === undefined ? null : /^\s*([\d.]+)\s*([a-z]*)\s*$/i.exec(value);
    const unit = m ? UNITS[m[2].toLowerCase()] : undefined;
    return m && unit !== undefined ? Number(m[1]) * unit : null;
  };
  const box = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  const ratio = box && box.length === 4 && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : null;
  let width = length(attr("width"));
  let height = length(attr("height"));
  if (width === null && height === null) {
    width = 300;
    height = ratio ? 300 / ratio : 150;
  } else if (width === null)
    width = ratio ? height * ratio : 300;
  else if (height === null)
    height = ratio ? width / ratio : 150;
  return sized("svg", "svg", width, height);
}
// src/runtime/response.ts
var SCRIPTS = "]]>openui:scripts";
var CONTENT_LINE = /^\]\]>openui:content(?:\?.*)?\r?$(\n?)/m;
var BARE_SCRIPTS = /^\]\]>openui:scripts(?=\?|\r?$)/gm;
function markerIndex(text) {
  if (!text.includes("]]>"))
    return -1;
  let quote = "";
  let escaped = false;
  for (let i = 0;i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (escaped)
        escaped = false;
      else if (c === "\\")
        escaped = true;
      else if (c === quote)
        quote = "";
    } else if (c === "#" || c === "/" && text[i + 1] === "/") {
      const newline = text.indexOf(`
`, i);
      if (newline < 0)
        return -1;
      i = newline;
    } else if (c === '"' || c === "'")
      quote = c;
    else if (text.startsWith("]]>", i))
      return i;
  }
  return -1;
}
function readScripts(header, payload) {
  try {
    const { count } = JSON.parse(header);
    const values = JSON.parse(payload);
    if (!Array.isArray(values) || !Number.isSafeInteger(count) || count !== values.length)
      return null;
    const names = new Set;
    for (const script of values) {
      if (!script || typeof script.name !== "string" || !script.name || typeof script.code !== "string" || names.has(script.name)) {
        return null;
      }
      names.add(script.name);
    }
    const revision = JSON.stringify(values.map((s) => ({ name: s.name, code: s.code })).sort((a, b) => a.name.localeCompare(b.name)));
    return { names, revision };
  } catch {
    return null;
  }
}
var isStreamingResponse = (text) => /^\]\]>openui:content/m.test(text) && !/^\]\]>openui:end\s*$/m.test(text);
function parseResponseBundle(response, streaming) {
  const text = response ?? "";
  const line = CONTENT_LINE.exec(text);
  const framed = !!line && (!streaming || line[1] === `
`);
  const { content, attributes, end } = e32(text.replace(BARE_SCRIPTS, "$& "), { streaming });
  let program = content;
  let section = false;
  let scripts = null;
  const at = markerIndex(program);
  if (at >= 0 && program.startsWith(SCRIPTS, at)) {
    section = true;
    const newline = program.indexOf(`
`, at);
    let to = program.length;
    if (newline >= 0) {
      const next = markerIndex(program.slice(newline + 1));
      if (next >= 0)
        to = newline + 1 + next;
      scripts = readScripts(program.slice(at + SCRIPTS.length, newline), program.slice(newline + 1, to));
    }
    const before = at > 0 ? program.slice(0, at).replace(/\r?\n$/, "") : "";
    const after = program.slice(to);
    program = after ? `${before}
${after}` : before;
  }
  const metadata = {};
  if (!framed && !section && !end) {
    return { program, metadata, scripts: new Set, complete: true, isBundle: false };
  }
  if (framed && attributes.name !== undefined)
    metadata.name = attributes.name;
  const error = section && !scripts ? "Invalid scripts bundle" : undefined;
  return {
    program,
    metadata,
    scripts: scripts?.names ?? new Set,
    complete: !error && (end || !streaming || !framed),
    isBundle: true,
    error: streaming ? undefined : error,
    ...scripts?.names.size ? { scriptRevision: scripts.revision } : {}
  };
}
// src/runtime/session.ts
function unwrapFieldValue(v) {
  if (isRecord(v) && "value" in v)
    return v.value;
  return v;
}
function isRecord(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function isMcpClient(input) {
  return "callTool" in input && typeof input.callTool === "function";
}
function toToolProvider(input) {
  if (input == null)
    return null;
  return {
    async callTool(toolName, args) {
      if (isMcpClient(input)) {
        const envelope = await input.callTool({ name: toolName, arguments: args });
        return e21(envelope);
      }
      const fn = input[toolName];
      if (typeof fn !== "function")
        throw new e3(toolName, Object.keys(input));
      return fn(args);
    }
  };
}
function diagramErrors(root) {
  const errors = [];
  const seen = new Set;
  const walk = (value) => {
    if (Array.isArray(value))
      value.forEach(walk);
    else if (e24(value) && !seen.has(value)) {
      seen.add(value);
      if (value.typeName === "Diagram")
        errors.push(...validateDiagram(diagramModel(value.props, false), value.statementId));
      else if (value.typeName === "Sequence")
        errors.push(...validateSequence(sequenceModel(value.props, false), value.statementId));
      else if (value.typeName === "Timeline")
        errors.push(...validateTimeline(timelineModel(value.props, false), value.statementId));
      else
        Object.values(value.props).forEach(walk);
    }
  };
  walk(root);
  return errors;
}

class FormValidation {
  onChange;
  errors = {};
  fields = {};
  constructor(onChange) {
    this.onChange = onChange;
  }
  getFieldError(name) {
    return this.errors[name];
  }
  setError(name, error) {
    if (this.errors[name] === error)
      return;
    this.errors = { ...this.errors, [name]: error };
    this.onChange();
  }
  validateField(name, value, rules) {
    const error = e41(value, rules);
    this.setError(name, error);
    return !error;
  }
  registerField(name, rules, getValue) {
    this.fields[name] = { rules, getValue };
  }
  clearFieldError(name) {
    this.setError(name, undefined);
  }
  validateForm() {
    let allValid = true;
    const next = {};
    for (const [name, reg] of Object.entries(this.fields)) {
      const error = e41(unwrapFieldValue(reg.getValue()), reg.rules);
      next[name] = error;
      if (error)
        allValid = false;
    }
    this.errors = next;
    this.onChange();
    return allValid;
  }
}

class Session {
  library;
  store;
  queryManager;
  evaluationContext;
  onChange;
  root = null;
  errors = [];
  options;
  schema;
  parser;
  raw = null;
  streaming = false;
  bundle = parseResponseBundle(null, false);
  result = null;
  parseException = null;
  runtimeErrors = [];
  renderErrors = [];
  forms = new Map;
  dirty = { parse: true, queries: true, evaluate: true, errors: true };
  initializing = false;
  storeInitKey = null;
  lastErrorKey = "";
  disposed = false;
  unsubscribe;
  constructor(options) {
    this.options = options;
    this.library = options.library;
    this.onChange = options.onChange ?? (() => {});
    this.schema = this.library.toJSONSchema();
    this.parser = e13(this.schema, this.library.root);
    const functions = Object.fromEntries(Object.entries(this.schema.functions ?? {}).flatMap(([name, s]) => {
      const fn = this.library.functions?.[name]?.fn;
      return fn ? [[name, { ...s, fn }]] : [];
    }));
    this.store = e12();
    this.queryManager = e11(toToolProvider(options.tools));
    this.queryManager.activate();
    this.evaluationContext = {
      getState: (name) => unwrapFieldValue(this.store.get(name)),
      resolveRef: (name) => this.queryManager.getMutationResult(name) ?? this.queryManager.getResult(name),
      functions,
      actions: this.schema.actions
    };
    this.unsubscribe = [
      this.store.subscribe(() => {
        this.dirty.queries = true;
        this.dirty.evaluate = true;
        if (!this.initializing)
          this.options.onStateUpdate?.(this.store.getSnapshot());
        this.onChange();
      }),
      this.queryManager.subscribe(() => {
        this.dirty.evaluate = true;
        this.onChange();
      })
    ];
  }
  setResponse(raw, streaming = false) {
    if (raw === this.raw && streaming === this.streaming)
      return;
    this.raw = raw;
    this.streaming = streaming;
    this.revision++;
    this.dirty.parse = true;
    this.onChange();
  }
  revision = 0;
  get isStreaming() {
    return this.streaming;
  }
  get blocked() {
    return this.streaming || !this.bundle.complete || !!this.bundle.error;
  }
  get isQueryLoading() {
    const snapshot = this.queryManager.getSnapshot();
    return snapshot.__openui_loading.length > 0 || this.streaming && this.bundle.isBundle && this.blocked && (this.result?.queryStatements.length ?? 0) > 0;
  }
  get queryErrors() {
    return this.queryManager.getSnapshot().__openui_errors.filter((e) => e.source === "query");
  }
  retryQueries() {
    if (this.bundle.isBundle && this.blocked)
      return;
    this.queryManager.invalidate(this.queryErrors.flatMap((e) => e.statementId ? [e.statementId] : []));
  }
  update() {
    if (this.disposed)
      return;
    if (this.dirty.parse) {
      this.dirty.parse = false;
      this.parse();
      this.dirty.queries = true;
      this.dirty.evaluate = true;
    }
    if (this.dirty.queries) {
      this.dirty.queries = false;
      this.runQueries();
    }
    if (this.dirty.evaluate) {
      this.dirty.evaluate = false;
      this.dirty.errors = true;
      this.evaluate();
    }
    if (this.dirty.errors) {
      this.dirty.errors = false;
      this.collectErrors();
    }
  }
  parse() {
    this.bundle = parseResponseBundle(this.raw, this.streaming);
    this.parseException = this.bundle.error ? { source: "parser", code: "parse-failed", message: this.bundle.error } : null;
    if (!this.bundle.program) {
      this.result = null;
      return;
    }
    try {
      this.result = this.parser.set(this.bundle.program, !this.streaming);
    } catch (e) {
      this.parseException = {
        source: "parser",
        code: "parse-exception",
        message: `Parser crashed: ${e instanceof Error ? e.message : String(e)}`,
        hint: "The response may contain syntax the parser cannot handle"
      };
      this.result = null;
    }
    this.initializeStore();
  }
  initializeStore() {
    const decls = this.result?.stateDeclarations;
    const initial = this.options.initialState;
    if (!decls && !initial)
      return;
    const key = `${JSON.stringify(decls)}::${JSON.stringify(initial)}`;
    if (this.storeInitKey === key)
      return;
    this.storeInitKey = key;
    const bindingDefaults = {};
    this.initializing = true;
    try {
      for (const [k, v] of Object.entries(initial ?? {})) {
        if (k.startsWith("$"))
          bindingDefaults[k] = v;
        else
          this.store.set(k, v);
      }
      this.store.initialize(decls ?? {}, bindingDefaults);
    } finally {
      this.initializing = false;
    }
  }
  runQueries() {
    if (this.blocked)
      return;
    this.queryManager.evaluateStatements(this.result?.queryStatements ?? [], this.evaluationContext);
    const nodes = (this.result?.mutationStatements ?? []).map((m) => ({
      statementId: m.statementId,
      toolName: m.toolAST ? e18(m.toolAST, this.evaluationContext) : ""
    }));
    this.queryManager.registerMutations(nodes);
  }
  evaluate() {
    this.runtimeErrors = [];
    const result = this.result;
    if (!result?.root && !result?.rootExpression) {
      this.root = result?.root ?? null;
      return;
    }
    const evalCtx = { ctx: this.evaluationContext, library: this.library, store: this.store, errors: this.runtimeErrors };
    try {
      this.root = e20(result, evalCtx);
    } catch (e) {
      this.runtimeErrors.push({
        source: "runtime",
        code: "runtime-error",
        message: `Prop evaluation failed: ${e instanceof Error ? e.message : String(e)}`
      });
      this.root = result.root;
    }
  }
  reportRenderError(error) {
    if (this.streaming)
      return;
    this.renderErrors.push(error);
    this.dirty.errors = true;
  }
  collectErrors() {
    if (this.streaming) {
      this.errors = [];
      if (this.lastErrorKey !== "") {
        this.lastErrorKey = "";
        this.options.onError?.([]);
      }
      return;
    }
    const errors = [];
    if (this.parseException)
      errors.push(this.parseException);
    if (this.bundle.program && !this.result?.meta.statementCount && !this.parseException) {
      errors.push({
        source: "parser",
        code: "parse-failed",
        message: "Response could not be parsed as valid openui-lang",
        hint: `The entire response must be valid openui-lang code starting with root = ${this.library.root ?? "Root"}(...)`
      });
    }
    if (this.result?.meta.errors.length) {
      errors.push(...e17(this.result.meta.errors, this.schema, Object.keys(this.library.components)));
    }
    errors.push(...this.runtimeErrors, ...diagramErrors(this.root), ...this.renderErrors);
    this.renderErrors = [];
    errors.push(...this.queryManager.getSnapshot().__openui_errors ?? []);
    this.errors = errors;
    const key = JSON.stringify(errors);
    if (key === this.lastErrorKey)
      return;
    this.lastErrorKey = key;
    this.options.onError?.(errors);
  }
  getFieldValue(formName, name) {
    if (!formName)
      return unwrapFieldValue(this.store.get(name));
    const data = this.store.get(formName);
    return isRecord(data) ? unwrapFieldValue(data[name]) : undefined;
  }
  setFieldValue(formName, componentType, name, value, persist = true) {
    const wrapped = { value, componentType };
    if (!formName) {
      this.store.set(name, wrapped);
    } else {
      const raw = this.store.get(formName);
      this.store.set(formName, { ...isRecord(raw) ? raw : {}, [name]: wrapped });
    }
    if (persist)
      this.options.onStateUpdate?.(this.store.getSnapshot());
  }
  stateField(formName, name, binding) {
    return e35(name, binding, this.store, this.evaluationContext, (field) => this.getFieldValue(formName, field), (field, next) => this.setFieldValue(formName, undefined, field, next));
  }
  form(formName) {
    let form = this.forms.get(formName);
    if (!form) {
      form = new FormValidation(() => this.onChange());
      this.forms.set(formName, form);
    }
    return form;
  }
  formPayload(formName) {
    if (formName) {
      const raw = this.store.get(formName);
      if (isRecord(raw))
        return { [formName]: raw };
    }
    return this.store.getSnapshot();
  }
  async triggerAction(label, formName, action) {
    if (this.bundle.isBundle && this.blocked)
      return;
    const emit = (event) => this.options.onAction?.(event);
    if (action && !("steps" in action)) {
      const type = action.type || e1.ContinueConversation;
      if (this.schema.actions && Object.prototype.hasOwnProperty.call(this.schema.actions, type))
        return;
      const params = { ...action.params || {} };
      if (action.url)
        params.url = action.url;
      if (action.context)
        params.context = action.context;
      emit({ type, params, humanFriendlyMessage: label, formState: this.formPayload(formName), formName });
      return;
    }
    if (action?.steps) {
      for (const step of action.steps) {
        switch (step.type) {
          case e0.Run: {
            if (step.refType === "mutation") {
              const m = this.result?.mutationStatements?.find((s) => s.statementId === step.statementId);
              const args = m?.argsAST ? e18(m.argsAST, this.evaluationContext) : {};
              if (!await this.queryManager.fireMutation(step.statementId, args))
                return;
            } else {
              this.queryManager.invalidate([step.statementId]);
            }
            break;
          }
          case e0.ToAssistant:
            emit({
              type: e1.ContinueConversation,
              params: step.context !== undefined ? { context: step.context } : {},
              humanFriendlyMessage: step.message,
              formState: this.formPayload(formName),
              formName
            });
            break;
          case e0.OpenUrl:
            emit({
              type: e1.OpenUrl,
              params: { url: step.url },
              humanFriendlyMessage: "",
              formState: this.formPayload(formName),
              formName
            });
            break;
          case "custom_action":
            emit({ type: step.name, params: step.params, humanFriendlyMessage: "", formState: this.formPayload(formName), formName });
            break;
          case e0.Set:
            if (step.valueAST)
              this.store.set(step.target, e18(step.valueAST, this.evaluationContext));
            break;
          case e0.Reset: {
            const decls = this.result?.stateDeclarations ?? {};
            for (const target of step.targets)
              this.store.set(target, decls[target] ?? null, { pristine: true });
            break;
          }
        }
      }
      return;
    }
    emit({
      type: e1.ContinueConversation,
      params: {},
      humanFriendlyMessage: label,
      formState: this.formPayload(formName),
      formName
    });
  }
  dispose() {
    this.disposed = true;
    for (const off of this.unsubscribe)
      off();
    this.queryManager.dispose();
    this.store.dispose();
  }
}
// herdr/src/contract.ts
import { join } from "path";
function pathTag(path) {
  let h = 2166136261;
  for (let i = 0;i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function eventsPath(herdrHome, src) {
  const name = src ? `${src.split("/").pop().replace(/\.[^.]*$/, "").replace(/[^\w.-]+/g, "_")}-${pathTag(src)}` : "demo";
  return join(herdrHome, "opengpui", "events", `${name}.jsonl`);
}
function statusPath(herdrHome, events) {
  return join(herdrHome, "opengpui", "status", `${events.split("/").pop().replace(/\.jsonl$/, "")}.json`);
}
function replyText(event) {
  const headline = event.type === "errors" && "errors" in event ? `errors: ${event.errors.length} in your OpenUI file` : `${event.type}: ${"message" in event && event.message ? event.message : "(no message)"}`;
  return `[opengpui ${event.src ?? "demo"}] ${headline}
${JSON.stringify(event)}`;
}

// herdr/src/demo.ts
var DEMO = `root = Stack([header, intro, steps])
header = CardHeader("openGPUI", "OpenUI Lang drawn with native gpui elements")
intro = Callout("info", "No file to show", "This pane opened without a **src** prop. Agents open it with \`opengpui show <file.oui>\`.")
steps = Steps([StepsItem("Learn the language", "\`opengpui prompt\` prints the OpenUI Lang manual."), StepsItem("Write and check a file", "\`opengpui check ui.oui\` reports what the pane would refuse."), StepsItem("Show it", "\`opengpui show ui.oui\` opens it beside your terminal."), StepsItem("Get the answer", "Clicks come back in your terminal, or through \`opengpui wait ui.oui\`.")])
`;

// herdr/src/icons.ts
import { exists, mkdir, writeFile } from "fs/promises";
import { appHome } from "herdr";
import { join as join2 } from "path";
var DIR = "opengpui/icons";
var writes = new Map;
var herdrIcons = (name, svg) => {
  let write = writes.get(name);
  if (!write) {
    write = (async () => {
      const path = `${DIR}/${name}.svg`;
      const file = join2(appHome(), path);
      if (await exists(file))
        return path;
      await mkdir(join2(appHome(), DIR), { recursive: true });
      await writeFile(file, svg).catch(async (e) => {
        if (!await exists(file))
          throw e;
      });
      return path;
    })();
    writes.set(name, write);
    write.catch(() => writes.delete(name));
  }
  return write;
};

// herdr/src/images.ts
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { exists as exists2, mkdir as mkdir2, readFile, readdir, unlink, writeFile as writeFile2 } from "fs/promises";
import { appHome as appHome2, exec, home } from "herdr";
import { join as join3, resolve as resolve2 } from "path";
var CACHE = "opengpui/images";
var CACHE_BYTES = 256 * 1024 * 1024;
var MAX_BYTES = 25 * 1024 * 1024;
var PARALLEL = 4;
var ORPHAN_MINUTES = 60;
var sha256 = (data) => createHash("sha256").update(data).digest("hex");
var asset = (e) => ({ path: `${CACHE}/${e.file}`, width: e.width, height: e.height });

class ImageCache {
  dir = join3(appHome2(), CACHE);
  index = null;
  pending = new Map;
  running = 0;
  queue = [];
  saving = Promise.resolve();
  saveQueued = false;
  entries() {
    this.index ??= (async () => {
      await mkdir2(this.dir, { recursive: true });
      let index;
      try {
        index = new Map(Object.entries(JSON.parse(await readFile(join3(this.dir, "index.json"), "utf8"))));
      } catch {
        index = new Map;
      }
      await this.reconcile(index);
      return index;
    })();
    return this.index;
  }
  async reconcile(index) {
    const files = new Set(await readdir(this.dir).catch(() => []));
    for (const [key, e] of index)
      if (!files.has(e.file))
        index.delete(key);
    const listed = new Set([...index.values()].map((e) => e.file));
    const old = await exec("find", [this.dir, "-maxdepth", "1", "-type", "f", "-mmin", `+${ORPHAN_MINUTES}`]).catch(() => null);
    for (const path of old?.code === 0 ? old.stdout.split(`
`).filter(Boolean) : []) {
      const name = path.slice(path.lastIndexOf("/") + 1);
      if (name !== "index.json" && !listed.has(name))
        await unlink(path).catch(() => {});
    }
  }
  load(src, base) {
    const trimmed = src.trim();
    if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
      const key = sha256(trimmed);
      return this.once(key, () => this.remote(trimmed, key));
    }
    return this.local(trimmed, base);
  }
  once(key, run) {
    let job = this.pending.get(key);
    if (!job) {
      job = run().finally(() => this.pending.delete(key));
      this.pending.set(key, job);
    }
    return job;
  }
  async remote(src, key) {
    const index = await this.entries();
    const hit = index.get(key);
    if (hit && await exists2(join3(this.dir, hit.file))) {
      hit.used = Date.now();
      this.save();
      return asset(hit);
    }
    return this.store(key, /^data:/i.test(src) ? dataUri(src) : await this.download(src, key));
  }
  async local(src, base) {
    const path = localPath(src, base);
    const r = await exec("/bin/sh", ["-c", 'realpath -- "$1" && realpath -- "$2" && wc -c < "$1"', "sh", path, home()]);
    const [real, homeDir, size] = r.stdout.trim().split(`
`);
    if (r.code !== 0 || !real || !homeDir)
      throw new Error(r.stderr.trim() || `can't read ${src}`);
    if (!real.startsWith(`${homeDir}/`))
      throw new Error(`local images must be under ${home()}: ${src}`);
    if (Number(size) > MAX_BYTES)
      throw new Error(`image is larger than ${MAX_BYTES} bytes`);
    return this.once(`file:${real}`, async () => {
      const bytes = await readFile(real);
      return this.store(sha256(bytes), bytes);
    });
  }
  async download(url, key) {
    await this.acquire();
    const part = join3(this.dir, `${key}.part`);
    try {
      const r = await exec("curl", [
        "-q",
        "--globoff",
        "--proto",
        "=http,https",
        "--proto-redir",
        "=http,https",
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "25",
        "--max-filesize",
        String(MAX_BYTES),
        "--user-agent",
        "opengpui (+https://github.com/lukachi/openGPUI)",
        "--output",
        part,
        url
      ]);
      if (r.code !== 0)
        throw new Error(r.stderr.trim() || `curl exited with ${r.code}`);
      return await readFile(part);
    } finally {
      await unlink(part).catch(() => {});
      this.release();
    }
  }
  async acquire() {
    if (this.running < PARALLEL) {
      this.running++;
      return;
    }
    await new Promise((go) => this.queue.push(go));
  }
  release() {
    const next = this.queue.shift();
    if (next)
      next();
    else
      this.running--;
  }
  store(key, bytes) {
    return this.once(`store:${key}`, async () => {
      if (bytes.length > MAX_BYTES)
        throw new Error(`image is larger than ${MAX_BYTES} bytes`);
      const header = readImageHeader(bytes);
      if (!header)
        throw new Error("not an image gpui can draw (png, jpeg, gif, webp, bmp, svg)");
      const index = await this.entries();
      const entry = { file: `${key}.${header.ext}`, width: header.width, height: header.height, bytes: bytes.length, used: Date.now() };
      const path = join3(this.dir, entry.file);
      if (!index.has(key) || !await exists2(path))
        await writeFile2(path, bytes);
      index.set(key, entry);
      await this.prune(index, key);
      return asset(entry);
    });
  }
  async prune(index, keep) {
    let total = [...index.values()].reduce((sum, e) => sum + e.bytes, 0);
    const oldest = [...index.entries()].filter(([k]) => k !== keep).sort((a, b) => a[1].used - b[1].used);
    for (const [k, e] of oldest) {
      if (total <= CACHE_BYTES)
        break;
      await unlink(join3(this.dir, e.file)).catch(() => {});
      index.delete(k);
      total -= e.bytes;
    }
    this.save();
  }
  save() {
    if (this.saveQueued)
      return;
    this.saveQueued = true;
    this.saving = this.saving.then(async () => {
      this.saveQueued = false;
      const index = await this.entries();
      await writeFile2(join3(this.dir, "index.json"), JSON.stringify(Object.fromEntries(index)));
    }).catch(() => {});
  }
}
function dataUri(src) {
  const comma = src.indexOf(",");
  if (comma < 0)
    throw new Error("malformed data: URI");
  const meta = src.slice(5, comma);
  const data = src.slice(comma + 1);
  return /;base64$/i.test(meta) ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data), "utf8");
}
function localPath(src, base) {
  if (src.startsWith("//"))
    throw new Error(`protocol-relative URL without a page to resolve it: ${src}`);
  const raw = /^file:\/\//i.test(src) ? decodeURIComponent(src.slice(7)) : src;
  const path = raw.startsWith("~/") ? join3(home(), raw.slice(2)) : raw.startsWith("/") ? resolve2(raw) : base ? resolve2(base, raw) : null;
  if (!path)
    throw new Error(`relative image path without a base folder: ${src}`);
  return path;
}
var shared = null;
function herdrImages(base) {
  return (src) => (shared ??= new ImageCache).load(src, base);
}

// herdr/src/layout.ts
import { exists as exists3, mkdir as mkdir3, readFile as readFile2, unlink as unlink2, writeFile as writeFile3 } from "fs/promises";
import { appHome as appHome3, exec as exec2 } from "herdr";
import { join as join4 } from "path";
var CACHE2 = "opengpui/layout";
var KEEP_DAYS = 30;
var PARTIAL_MINUTES = 60;
var running2 = new Map;
var pruned = null;
function herdrLayout(cli) {
  const launcher = cli ?? join4(appHome3(), "mods", "opengpui", "cli", "opengpui");
  return (graph) => {
    const key = layoutKey(graph);
    let job = running2.get(key);
    if (!job) {
      job = layout(launcher, key, graph).finally(() => running2.delete(key));
      running2.set(key, job);
    }
    return job;
  };
}
async function layout(launcher, key, graph) {
  const dir = join4(appHome3(), CACHE2);
  const output = join4(dir, `${key}.json`);
  const cached = await read(output);
  if (cached)
    return cached;
  await mkdir3(dir, { recursive: true });
  await (pruned ??= prune(dir));
  const input = join4(dir, `${key}.in.json`);
  try {
    for (let attempt = 1;; attempt++) {
      await writeFile3(input, JSON.stringify(graph));
      const r = await exec2(launcher, ["layout", input, output]).catch((e) => {
        throw new Error(`can't run ${launcher}: ${e instanceof Error ? e.message : e}`);
      });
      const done = await read(output);
      if (done)
        return done;
      if (attempt === 2)
        throw new Error(r.stderr.trim() || `${launcher} layout exited with ${r.code}`);
    }
  } finally {
    await unlink2(input).catch(() => {});
  }
}
async function read(path) {
  if (!await exists3(path))
    return null;
  try {
    return JSON.parse(await readFile2(path, "utf8"));
  } catch {
    await unlink2(path).catch(() => {});
    return null;
  }
}
async function prune(dir) {
  await exec2("find", [
    dir,
    "-maxdepth",
    "1",
    "-type",
    "f",
    "(",
    "(",
    "-name",
    "*.in.json",
    "-o",
    "-name",
    "*.tmp",
    ")",
    "-mmin",
    `+${PARTIAL_MINUTES}`,
    "-o",
    "-name",
    "*.json",
    "-mtime",
    `+${KEEP_DAYS}`,
    ")",
    "-delete"
  ]).catch(() => null);
}

// herdr/src/theme.ts
import { fonts, settings, theme } from "herdr";
var isHex = (v) => typeof v === "string" && v.startsWith("#");
var last = null;
function herdrTokens(look) {
  const dark = settings().dark;
  const installed = fonts();
  const h = look === "herdr" ? theme() : null;
  const key = JSON.stringify([look, dark, installed, h]);
  if (last?.key !== key)
    last = { key, tokens: makeTokens(look, dark === false ? "light" : "dark", new Set(installed), h) };
  return last.tokens;
}
function makeTokens(look, mode, installed, h) {
  const base = { fonts: openuiFonts((family) => installed.has(family)) };
  if (look === "openui" || !h)
    return resolveTokens(mode, base);
  const pick = (...names) => names.map((n) => h[n]).find(isHex);
  const fg = pick("foreground");
  const bg = pick("background");
  if (!fg || !bg)
    return resolveTokens(mode, base);
  const dark = mode === "dark";
  const brand = pick("accent") ?? fg;
  const info = pick("ansi4") ?? brand;
  const success = pick("ansi2") ?? fg;
  const alert = pick("ansi3") ?? fg;
  const danger = pick("ansi1") ?? fg;
  const purple = pick("ansi5") ?? brand;
  const pink = pick("ansi13", "ansi5") ?? brand;
  return resolveTokens(mode, {
    ...base,
    background: bg,
    foreground: pick("surface", "raised") ?? bg,
    popoverBackground: pick("popover", "surface") ?? bg,
    sunkLight: alpha(fg, 0.02),
    sunk: alpha(fg, 0.04),
    sunkDeep: alpha(fg, 0.08),
    elevatedLight: alpha(fg, 0.04),
    elevated: alpha(fg, 0.08),
    elevatedStrong: alpha(fg, 0.16),
    elevatedIntense: alpha(fg, 0.32),
    highlightSubtle: alpha(fg, 0.02),
    highlight: alpha(fg, 0.04),
    highlightStrong: alpha(fg, 0.08),
    highlightIntense: alpha(fg, dark ? 0.3 : 0.32),
    invertedBackground: fg,
    infoBackground: alpha(info, 0.12),
    successBackground: alpha(success, 0.12),
    alertBackground: alpha(alert, 0.16),
    dangerBackground: alpha(danger, 0.12),
    purpleBackground: alpha(purple, 0.12),
    pinkBackground: alpha(pink, 0.12),
    textNeutralPrimary: fg,
    textNeutralSecondary: alpha(fg, 0.6),
    textNeutralTertiary: alpha(fg, 0.2),
    textNeutralLink: fg,
    textBrand: brand,
    textAccentPrimary: pick("accent_foreground") ?? bg,
    textAccentSecondary: alpha(pick("accent_foreground") ?? bg, 0.5),
    textAccentTertiary: alpha(pick("accent_foreground") ?? bg, 0.2),
    textSuccessPrimary: success,
    textAlertPrimary: alert,
    textDangerPrimary: danger,
    textDangerSecondary: alpha(danger, 0.8),
    textDangerTertiary: alpha(danger, 0.5),
    textInfoPrimary: info,
    textPinkPrimary: pink,
    textPurplePrimary: purple,
    interactiveAccentDefault: brand,
    interactiveAccentHover: alpha(brand, 0.8),
    interactiveAccentDisabled: alpha(brand, 0.4),
    interactiveAccentPressed: brand,
    interactiveDestructiveDefault: alpha(danger, 0.02),
    interactiveDestructiveHover: alpha(danger, 0.08),
    interactiveDestructiveDisabled: alpha(danger, 0.02),
    interactiveDestructivePressed: alpha(danger, 0.1),
    interactiveDestructiveAccentDefault: danger,
    interactiveDestructiveAccentHover: alpha(danger, 0.9),
    interactiveDestructiveAccentPressed: danger,
    interactiveDestructiveAccentDisabled: alpha(danger, 0.4),
    borderDefault: alpha(fg, 0.06),
    borderInteractive: alpha(fg, 0.12),
    borderInteractiveEmphasis: alpha(fg, dark ? 0.4 : 0.3),
    borderInteractiveSelected: fg,
    borderAccent: alpha(brand, dark ? 0.2 : 0.08),
    borderAccentEmphasis: alpha(brand, dark ? 0.4 : 0.3),
    borderInfo: alpha(info, 0.08),
    borderInfoEmphasis: info,
    borderAlert: alpha(alert, 0.08),
    borderAlertEmphasis: alert,
    borderSuccess: alpha(success, 0.08),
    borderSuccessEmphasis: success,
    borderDanger: alpha(danger, 0.08),
    borderDangerEmphasis: danger
  });
}

// herdr/src/main.ts
var expand = (path) => path.startsWith("~/") ? join5(home2(), path.slice(2)) : path;
function plainFormState(state) {
  const unwrap = (v) => v && typeof v === "object" && !Array.isArray(v) ? "value" in v && "componentType" in v ? v.value : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unwrap(x)])) : v;
  return Object.fromEntries(Object.entries(state ?? {}).map(([k, v]) => [k, unwrap(v)]));
}
var WRITE_TICK_MS = 50;

class OpenGpui extends View2 {
  p = {};
  surface;
  session;
  srcPath = null;
  loaded = false;
  loadError = null;
  setupError = null;
  eventsPath = "";
  pendingEvents = [];
  writeError = null;
  lastErrorReport = "";
  statusPath = "";
  pendingStatus = null;
  viewportHeight = -1;
  tools = {};
  init(_props, cx) {
    this.p = props() ?? {};
    this.srcPath = this.p.src ? expand(this.p.src) : null;
    this.eventsPath = this.p.events ? expand(this.p.events) : eventsPath(appHome4(), this.srcPath);
    this.statusPath = statusPath(appHome4(), this.eventsPath);
    let source;
    try {
      source = selectLibrary(this.p.library, Object.keys(components), this.p.components);
    } catch (e) {
      this.setupError = String(e instanceof Error ? e.message : e);
      source = selectLibrary(undefined, Object.keys(components));
    }
    this.session = new Session({
      library: source.library,
      tools: this.tools,
      onAction: (event) => this.onAction(event),
      onError: (errors) => this.onErrors(errors)
    });
    this.surface = new Surface({
      session: this.session,
      components,
      tokens: herdrTokens(this.p.look ?? "herdr"),
      icons: herdrIcons,
      images: herdrImages(this.srcPath ? dirname(this.srcPath) : null),
      layout: herdrLayout(this.p.cli ? expand(this.p.cli) : undefined)
    });
    this.surface.onIdle = (idle) => this.reportIdle(idle);
    if (!this.srcPath) {
      this.session.setResponse(DEMO);
      this.session.update();
      this.loaded = true;
    }
    this.surface.attach(cx);
    if (this.srcPath)
      this.follow(this.srcPath, cx);
    this.startWriter(cx);
    if (this.p.tools) {
      const toolsPath = expand(this.p.tools);
      cx.spawn(async (cx) => {
        try {
          Object.assign(this.tools, await this.loadTools(toolsPath));
          this.session.queryManager.invalidate();
        } catch (e) {
          this.setupError = `Can't load tools from ${toolsPath}: ${e}`;
          cx.notify();
        }
      });
    }
  }
  follow(path, cx) {
    cx.spawn(async (cx) => {
      let last = null;
      for (;; ) {
        try {
          const text = await readTextFile(path);
          this.loadError = text == null ? `Waiting for ${path}` : null;
          if (text != null && text !== last) {
            last = text;
            this.loaded = true;
            this.session.setResponse(text, isStreamingResponse(text));
          }
        } catch (e) {
          this.loadError = `Can't read ${path}: ${e}`;
        }
        cx.notify();
        try {
          const changed = await watchFolder(dirname(path));
          if (!changed.some((c) => c === path))
            continue;
        } catch {
          await cx.sleep(2000);
        }
      }
    });
  }
  reportIdle(idle) {
    this.pendingStatus = JSON.stringify({ idle: idle && this.loaded, at: new Date().toISOString(), src: this.srcPath });
  }
  async loadTools(path) {
    const text = await readTextFile(path);
    if (!text)
      return {};
    const specs = JSON.parse(text);
    return Object.fromEntries(Object.entries(specs).map(([name, spec]) => [
      name,
      async (args) => {
        const r = await exec3(expand(spec.command), [...spec.args ?? [], JSON.stringify(args)], {
          cwd: spec.cwd ? expand(spec.cwd) : undefined
        });
        if (r.code !== 0)
          throw new Error(r.stderr.trim() || `${name} exited with ${r.code}`);
        try {
          return JSON.parse(r.stdout);
        } catch {
          return r.stdout;
        }
      }
    ]));
  }
  startWriter(cx) {
    cx.spawn(async (cx) => {
      for (;; ) {
        if (this.pendingEvents.length) {
          const lines = this.pendingEvents.splice(0);
          const path = this.eventsPath;
          try {
            await mkdir4(dirname(path), { recursive: true });
            const current = await readTextFile(path) ?? "";
            await writeFile4(path, `${current}${lines.map((l) => `${l}
`).join("")}`);
            this.writeError = null;
          } catch (e) {
            this.writeError = `Can't write ${path}: ${e}`;
          }
          cx.notify();
        }
        if (this.pendingStatus !== null) {
          const text = this.pendingStatus;
          this.pendingStatus = null;
          try {
            await mkdir4(dirname(this.statusPath), { recursive: true });
            await writeFile4(this.statusPath, text);
          } catch {}
        }
        await cx.sleep(WRITE_TICK_MS);
      }
    });
  }
  emit(event) {
    this.pendingEvents.push(JSON.stringify(event));
    if (event.type === "open_url" || !this.p.reply)
      return;
    hc(["send", this.p.reply, replyText(event)]).catch((e) => console.log(`[opengpui] hc send failed: ${e}`));
  }
  onAction(event) {
    if (event.type === "open_url") {
      const url = String(event.params?.url ?? "");
      if (/^https?:\/\//.test(url)) {
        const opener = herdrWindow()?.platform === "linux" ? "xdg-open" : herdrWindow()?.platform === "windows" ? "explorer" : "open";
        exec3(opener, [url]).catch(() => {});
      }
    }
    const plain = plainFormState(event.formState);
    this.emit({
      at: new Date().toISOString(),
      src: this.srcPath,
      type: event.type,
      message: event.humanFriendlyMessage ?? "",
      params: event.params ?? {},
      ...event.formName ? { formName: event.formName, formState: { [event.formName]: plain[event.formName] ?? {} } } : { formState: plain }
    });
  }
  onErrors(all) {
    const errors = all.filter((e) => e.severity !== "warning");
    const key = JSON.stringify(errors);
    if (key === this.lastErrorReport)
      return;
    this.lastErrorReport = key;
    if (!errors.length)
      return;
    this.emit({ at: new Date().toISOString(), src: this.srcPath, type: "errors", errors });
  }
  render(_cx) {
    this.surface.setTokens(herdrTokens(this.p.look ?? "herdr"));
    const t = this.surface.tokens;
    const errors = this.session.errors;
    const content = this.surface.renderContent();
    const pad = t.spaceL;
    const body = textStyle(div46().id("opengpui-body").flex().flex_col().flex_1().min_h(0).overflow_y_scrollbar().p(pad).text_color(t.textNeutralPrimary).on_size_change((size, cx) => {
      const height = Math.max(0, size.height - 2 * pad);
      if (this.viewportHeight !== height) {
        this.viewportHeight = height;
        this.surface.setViewportHeight(height);
        cx.notify();
      }
    }), typography(t, "body", "default"));
    const label = (el) => textStyle(el, typography(t, "label", "small"));
    return div46().id("opengpui-root").relative().flex().flex_col().size_full().bg(t.background).child(label(h_flex8().h(30).px(t.spaceM).gap(t.spaceS).items_center().border_b_1().border_color(t.borderDefault).text_color(t.textNeutralSecondary)).child(div46().flex_1().truncate().child(this.p.title ?? (this.srcPath ? this.srcPath.split("/").pop() ?? this.srcPath : "opengpui"))).when(this.session.blocked && this.loaded, (el) => el.child(div46().text_color(t.textInfoPrimary).child("streaming…"))).when(this.session.isQueryLoading, (el) => el.child(div46().child("loading data…"))).when(this.setupError != null, (el) => el.child(div46().text_color(t.textDangerPrimary).truncate().child(this.setupError ?? ""))).when(this.writeError != null, (el) => el.child(div46().text_color(t.textDangerPrimary).truncate().child(this.writeError ?? ""))).when(errors.length > 0, (el) => el.child(div46().text_color(t.textDangerPrimary).child(`${errors.length} error${errors.length > 1 ? "s" : ""}`)))).child(div46().flex().flex_col().flex_1().min_h(0).on_mouse_down("left", (e) => this.surface.notePane(e)).on_mouse_move((e) => this.surface.notePane(e)).child(content.length === 0 ? body.child(div46().text_color(t.textNeutralSecondary).child(this.loadError ?? (this.loaded ? "Nothing to show yet" : "Loading…"))) : body.children(content))).when(errors.length > 0, (el) => el.child(label(v_flex10().id("opengpui-errors").max_h(120).overflow_y_scrollbar().px(t.spaceM).py(t.spaceXs).gap(t.space3xs).border_t_1().border_color(t.borderDefault).text_color(t.textDangerPrimary)).children(errors.map((e) => `${e.code}${e.component ? ` (${e.component})` : ""}: ${e.message}`)))).children(this.surface.renderOverlays().map((o) => div46().absolute().top(0).left(0).size_full().child(o)));
  }
  async close(_cx) {
    this.surface.close();
  }
}
export {
  OpenGpui as default
};
