// The reference page. The server copies this folder into react-ui as
// `.reference-page/` and builds it with Vite, so the relative imports below
// are react-ui's own sources and bare imports resolve to react-ui's
// dependencies, exactly as react-ui's Storybook compiles them.
//
// Query: file (absolute .oui path), mode light|dark, library openui|chat,
// width (CSS px of the frame). Sets data-reference-ready on <html> once the
// render is mounted and the fonts are loaded.
//
// Styles in the order OpenUI's docs give (api-reference/react-ui.mdx):
// Tailwind preflight (react-ui's Storybook copy) below react-ui's stylesheet,
// which is what `@openuidev/react-ui/styles/index.css` is compiled from.
import "../.storybook/preflight.css";
import "../src/components/index.scss";
// Math in markdown (rehype-katex) needs KaTeX's stylesheet; Storybook loads it too.
import "katex-css";
import "./page.css";

import type { OpenUIError } from "@openuidev/react-lang";
import { Renderer } from "@openuidev/react-lang";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../src/components/ThemeProvider";
import { openuiChatLibrary, openuiLibrary } from "../src/genui-lib";

declare global {
  interface Window {
    __referenceErrors: string[];
  }
}

const params = new URLSearchParams(location.search);
const file = params.get("file") ?? "";
const mode = params.get("mode") === "dark" ? "dark" : "light";
const library = params.get("library") === "chat" ? openuiChatLibrary : openuiLibrary;
const width = Number(params.get("width") ?? 720);

let rendererErrors: string[] = [];
const pageErrors: string[] = [];
Object.defineProperty(window, "__referenceErrors", { get: () => [...rendererErrors, ...pageErrors] });
window.addEventListener("error", (e) => pageErrors.push(String(e.message)));

const describe = (e: OpenUIError) => `${e.code}${e.component ? ` (${e.component})` : ""}: ${e.message}`;

async function main(): Promise<void> {
  const response = await fetch(`/source?file=${encodeURIComponent(file)}`);
  const source = await response.text();
  if (!response.ok) {
    pageErrors.push(source);
    document.body.textContent = source;
    return;
  }
  document.title = `${file.split("/").pop()} (${mode})`;
  createRoot(document.getElementById("root")!).render(
    <ThemeProvider mode={mode}>
      <div id="reference-frame" style={{ width: `${width}px` }}>
        <Renderer
          response={source}
          library={library}
          isStreaming={false}
          onError={(errors) => {
            rendererErrors = errors.map(describe);
          }}
        />
      </div>
    </ThemeProvider>,
  );
  await Promise.all([
    document.fonts.load('16px "Inter"'),
    document.fonts.load('italic 16px "Inter"'),
  ]);
  await document.fonts.ready;
  const painted = Promise.withResolvers<void>();
  requestAnimationFrame(() => requestAnimationFrame(() => painted.resolve()));
  await painted.promise;
}

main()
  .catch((error) => pageErrors.push(String(error)))
  .finally(() => {
    document.documentElement.dataset.referenceReady = "1";
  });
