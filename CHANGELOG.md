# Changelog

Releases are tagged `v<version>` from `package.json`'s `version`. Each one ships the mod folder
on herdr.dev (`gallery/opengpui/`) and as `opengpui-v<version>.tar.gz` on GitHub Releases. The
[agent contract](docs/agent-contract.md) changes only with a note here.

## Unreleased

- The skill asks agents to write panes to `~/.cache/opengpui/<project>-<topic>.oui`, out of the
  person's repositories, one file per topic, and never to delete them; the person clears that
  folder when they like.

## 0.2.0

- Diagrams, openGPUI's own components on top of OpenUI's libraries
  ([docs/diagram.md](docs/diagram.md)): the agent draws diagrams it writes itself, and the pane
  lays them out and draws them natively.
  - `Diagram` (`Node`, `Group`, `Edge`, `Entity`): boxes and arrows for architecture, flowcharts,
    state machines, pipelines, dependency graphs, data models and class diagrams. Laid out by ELK,
    which the CLI runs outside the pane.
  - `Sequence` (`Participant`, `Message`, `Block`): sequence diagrams.
  - `Timeline` (`Task`): roadmaps and Gantt charts by lane, with dates or numbers, dependencies
    and milestones.
  - All three share pan and zoom, an expanded view, optional numbered steps (`DiagramStep`) that
    light up their part, and a click on a box, message, task or step asking the agent about it.
- `opengpui examples [name]` lists and prints worked examples, one per common kind of diagram.
- `opengpui check` reports diagrams' unknown or duplicate ids and bad dates or ranges, with
  "did you mean" hints.
- Agent contract: `opengpui show` passes the CLI's own path to the pane (prop `cli`), and the
  internal `opengpui layout` command lays out a Diagram for the pane.

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
