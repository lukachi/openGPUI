// `import text from "./file.md" with { type: "text" }`: Bun inlines the file as a string.
declare module "*.md" {
  const text: string;
  export default text;
}
