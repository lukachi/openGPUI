# Changelog

Releases are tagged `v<version>` from `package.json`'s `version`. Each one ships the mod folder
on herdr.dev (`gallery/opengpui/`) and as `opengpui-v<version>.tar.gz` on GitHub Releases. The
[agent contract](docs/agent-contract.md) changes only with a note here.

## 0.1.0

First release.

- A Herdr mod that draws OpenUI Lang files with native gpui-kit elements: all 86 components of
  OpenUI's `openui` and `chat` libraries, ported from `@openuidev/react-ui` (differences in
  [docs/gpui-differences.md](docs/gpui-differences.md)).
- The `opengpui` CLI inside the mod (Node.js 18+ or Bun): `prompt`, `check`, `show`, `wait`,
  `events`, `close`, `skill`, `--version`.
- Events back to the agent: typed into its terminal with `hc send`, or read with
  `opengpui wait`; one JSON shape for both, logged per file.
- Streaming files, `$variables` and `@Set`/`@Reset`, Query/Mutation tools run from a tools file.
- The pane draws in the Herdr theme's colors (`--look herdr`) or OpenUI's own light and dark
  theme (`--look openui`), in shipped static cuts of Inter.
