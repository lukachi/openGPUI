# Agent contract

What an agent, a skill author or an integrator can rely on. Stable means it changes only with
a note here; [Internal](#internal) may change at any time. The agent-facing summary is the
skill, [`skills/opengpui/SKILL.md`](../skills/opengpui/SKILL.md).

`opengpui` ships inside the mod, at `mods/opengpui/cli/opengpui`: a launcher that runs the CLI
next to it with Node.js 18+ or Bun. Link it into PATH; `bun run install-herdr` links it into
`~/.local/bin`.

## Commands

| Command | Does |
|---|---|
| `opengpui prompt [--library L] [--components A,B] [--tools T]` | Prints the OpenUI Lang manual: upstream's `library.prompt()` for the components this build draws, with our preamble (a file in a pane, not a chat answer), `$variables`/`@Set`/`@Reset` taught (the pane runs them), and the Query/Mutation sections plus the tools list only with `--tools`. Upstream's group notes and rules still mention `Query`, `@Run` and `data.rows` in passing without `--tools`; `check` catches a Query the pane can't run. |
| `opengpui check <file> [--library L] [--components A,B] [--tools T]` | Parses the file as the pane does. Prints `ok: <file>`, or one line per problem: lang-core's errors (`code (component, statement id): message`, `hint:`), the Diagram problems in the same form (`diagram-duplicate-id`, `diagram-unknown-node`, `diagram-duplicate-edge`, `diagram-unknown-highlight`, `diagram-empty`; an unknown id's hint guesses the meant one; see [diagram.md](diagram.md#validation)), `unresolved:`, `orphaned:`, `incomplete:`, `empty:`, `too large:` (over 1 MiB), `streaming:` for a framed file without its end line, and `tool:` for a `Query`/`Mutation` whose tool isn't in `--tools` (or with no `--tools`). `warning` lines (the no-root fallback, `diagram-too-big` over 30 nodes) don't fail. |
| `opengpui show <file> [--right\|--down\|--tab] [--title T] [--library L] [--components A,B] [--tools T] [--look herdr\|openui] [--no-reply\|--reply <terminal>]` | Opens the pane beside the agent's own terminal (`$HC_TERMINAL_ID`'s pane, else Herdr's focused one; `--tab`: a tab in its space). One pane per file: if an earlier `show` of the file opened one, it is closed first. Starts a new events log (before the pane opens). Replies go to `$HC_TERMINAL_ID` unless `--reply`/`--no-reply`. The header shows `--title`, else the file name. |
| `opengpui wait <file> [--timeout S]` | Prints every event `wait` hasn't printed since `show`, as JSONL, blocking until there is one (default 110 s, under the 2-minute limit common agent shell tools set; `0` no limit). Exit 1 on timeout: run it again, nothing is lost. Events between `show` and `wait` are not lost either. |
| `opengpui events <file>` | Prints every event since `show`. |
| `opengpui close <file>` | Closes what `show` opened. |
| `opengpui skill` | Prints the agent skill (`skills/opengpui/SKILL.md`), for an agent harness to install. |
| `opengpui examples [name]` | Without a name, lists the worked diagram examples (`skills/opengpui/examples/`), one line each; with one, prints it. An unknown name exits 2. |
| `opengpui --version` | Prints `opengpui <version>`: the release the CLI and the mod beside it come from. |

`show` opens the mod the CLI ships in, by its folder name, so a copy installed under another name
(Herdr renames a mod whose name is taken) opens itself.

A file is named by its real path (symlinks resolved, relative to the current folder), so
`wait`, `events` and `close` find a file `show` opened under another name for it.

Exit codes:

| Code | Meaning |
|---|---|
| 0 | ok |
| 1 | `check` found a problem, or `wait` timed out |
| 2 | bad usage or arguments: unknown flag, missing file, a file outside `$HOME`, unknown library or component, an incomplete `--components` subset, a bad tools file, `wait`/`close` on a file never shown |
| 3 | Herdr failed, with Herdr's words: `herdr-app is not on PATH`, `no Herdr window at …` (not running), `no mod "opengpui" in mods/`, or an answer without the pane/tab id `close` needs |

Messages go to stderr as `opengpui: …`.

### Libraries and subsets

`--library` is `openui` (root `Stack`, default) or `chat` (root `Card`).

`--components` restricts the library to a skill's subset: the manual teaches only those, and
`check` and the pane reject the rest as `unknown-component`. The subset is closed over what its
signatures need: the root, and every component a kept prop can only hold (`Table` brings `Col`,
`Form` brings `Buttons`, `FormControl` and `Button`). A required prop with a choice
(`FormControl`'s input, `Card`'s children) needs one of its options listed; otherwise it exits 2
naming the prop and the options. Notes about left-out components are left out too.

`--look herdr` (default) draws OpenUI's tokens in the Herdr theme's colors, `--look openui`
OpenUI's own light/dark theme.

## Events

Every action and every error report is one JSON line in the events file and, unless the pane
was shown with `--no-reply`, the same line in the reply.

The events file is `$HERDR_APP_HOME/opengpui/events/<stem>-<tag>.jsonl` (`~/.config/herdr-app`
by default), so same-named files in two folders never share a log (`herdr/src/contract.ts`):

- `<stem>` is the file name without its last extension, every run of characters outside
  `[A-Za-z0-9_.-]` replaced by `_`;
- `<tag>` is FNV-1a (32 bit, offset 0x811c9dc5, prime 0x01000193) over the UTF-16 code units of
  the real absolute path, as 8 lowercase hex digits.

`/work/a/review.oui` → `review-01b964b1.jsonl`. Simplest for an integrator: take the path from
`show`'s `events:` line. `show` empties it.

```json
{"at":"2026-11-07T02:42:32.549Z","src":"/abs/review.oui","type":"continue_conversation","message":"Approve deploy","params":{"context":{"id":42}},"formName":"review","formState":{"review":{"note":"ship it"}}}
{"at":"…","src":"/abs/review.oui","type":"open_url","message":"","params":{"url":"https://example.com"},"formState":{"$days":"7"}}
{"at":"…","src":"/abs/review.oui","type":"errors","errors":[{"source":"parser","code":"unknown-component","message":"…","hint":"…","component":"FollowUpBlock","statementId":"root"}]}
```

- `continue_conversation`: `@ToAssistant(message, context?)` (`params.context`), or a button
  without action (its label). Custom library actions would arrive under their own `type`
  (neither shipped library defines one).
- `open_url`: `@OpenUrl(url)`; the pane opens http(s) links itself. Logged, never replied.
- `errors`: lang-core's `OpenUIError`s once the file is complete, sent again only when they
  change. Warnings (`severity: "warning"`, the no-root fallback that still draws) are not sent.

### Form state

- Inside a `Form`, `formName` is present and `formState` is `{ "<form>": { "<field>": value } }`
  (`{ "<form>": {} }` before anything was entered).
- Outside a Form, `formState` is every form and every `$variable` (`"$days": "7"`).
- Fields the person never touched may be missing (a renderer stores a default only for some
  inputs).
- Values are what the inputs hold: strings, arrays, `{key: boolean}` for checkbox/switch
  groups, `[n]` for sliders.
- A DatePicker gives ISO instants of the picked day's local midnight
  (`"2026-11-11T22:00:00.000Z"` is Nov 12 at UTC+2), a range `{from, to}` of them: read the day
  in the person's time zone.
- The state survives rewrites of the file while names stay.

### Replies

The reply (`hc send <terminal>`, a paste plus Enter) is a headline, then the event line:

```
[opengpui /abs/review.oui] continue_conversation: Approve deploy
{"at":"…","src":"/abs/review.oui","type":"continue_conversation",…}
```

The errors headline is `errors: <n> in your OpenUI file`.

## The file

Re-read on every change of its folder. Plain OpenUI Lang, or framed for streaming: first line
`]]>openui:content`, last line `]]>openui:end` (lang-core's `buildMessage` format); without the
end line the pane shows "streaming…", holds buttons and inputs, and reports no errors. Under
`$HOME`, at most 1 MiB. Relative image paths resolve against the file's folder.

## Tools

`--tools tools.json`:

```json
{ "<name>": { "command": "/abs/path", "args": [], "cwd": "…", "description": "…", "inputSchema": {}, "outputSchema": {} } }
```

The pane runs `command …args '<JSON arguments>'` and parses stdout as JSON, else keeps it as
text; a non-zero exit is the tool's error. `description` and the JSON Schemas only feed
`prompt --tools` (upstream's tool signatures and Query defaults).

## Internal

The mod's props (set by `show`; listed in `herdr/src/main.ts`, `cli` among them: the path of the
launcher `show` ran from, which the pane runs to lay diagrams out; without it the pane uses
`<Herdr home>/mods/opengpui/cli/opengpui`), the idle status file
`opengpui/status/<events stem>.json` (for `tools/preview/preview.ts`), and `wait`'s and `close`'s
bookkeeping beside the events file (`<stem>-<tag>.cursor`, `.shown.json`).

`opengpui layout <in.json> <out.json>` (not in the usage text): reads a sized graph and writes
its layout, both as [diagram.md](diagram.md#layout) describes them (ELK layered, `src/diagram/elk.ts`).
A bad graph or unreadable input exits 2 with one `opengpui: …` line. The output is written to
`<out>.<pid>.tmp` and renamed, so a reader never sees half of it. The pane runs it through
`exec` for each new graph and keeps the results in `<Herdr home>/opengpui/layout/`: `<key>.json`
per layout (the key is `layoutKey(graph)`: 64-bit FNV-1a over `LAYOUT_VERSION` and the graph's
canonical JSON), `<key>.in.json` while one runs; layouts go 30 days after they were written,
leftover inputs after an hour (`herdr/src/layout.ts`).
