// The host module tools/oui-harness exports to the script (src/main.rs, `host_module`).
declare module "oui-harness" {
  export interface Job {
    /** The .oui file's text. */
    text: string;
    /** The .oui file's folder: relative image paths resolve against it. */
    base: string;
    home: string;
    /** A folder the script may write decoded data: images into. */
    scratch: string;
    mode: "light" | "dark";
    library: "openui" | "chat";
  }
  /** What to draw in the view being created. */
  export function job(): Job;
  /** Font families the harness registered or found. */
  export function fonts(): string[];
  /** How far the harness's simulated clock has run, in ms. */
  export function clock(): number;
  /** One JSON line for the harness's stdout. */
  export function emit(line: string): void;
}
