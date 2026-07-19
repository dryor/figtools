# Pending decisions — packages/cli

This document records architecture decisions that haven't been made yet
for `@figtools/cli`, unlike [`ADR-figtools-cli.md`](./ADR-figtools-cli.md),
which documents what's already been decided and implemented. Each entry
describes the current state, the options evaluated, and the open question
that still needs answering before deciding.

## 1. Argument parsing: keep manual parsing or adopt a library (commander)?

### Current state

`parseArgs` (`src/cli.ts:38-69`) is a hand-written loop over `argv`. These
are the relevant facts about what it supports today, verified by reading
the code, not a quality assessment:

- There's no `--help`/`-h` or `--version` flag at all. If someone runs
  `figtools --help`, the loop doesn't recognize `--help` as a known flag
  (it doesn't enter any of the `--format`/`--output`/`--quiet` branches)
  and doesn't add it as a URL either because it starts with `--` — the
  flag is silently discarded, `urls` stays empty, and the command ends
  with `Error: At least one Figma URL is required` (`src/cli.ts:64`).
  Asking for help produces a validation error that doesn't mention the
  help request.
- The `login` subcommand is a special case (`argv[0] === "login"`,
  `src/cli.ts:39`), not a general subcommand system. Adding a second
  subcommand would mean another `if` at the start of the function.
- An unknown flag like `--foo` is silently ignored (it doesn't enter any
  branch), but the next positional argument (`bar` in `--foo bar`) is
  still interpreted as a URL because it doesn't start with `--`. A typo in
  a flag produces no "unknown flag" error at all: it produces an invalid
  URL that only fails later, during resolution, with a message that
  doesn't mention the original typo.
- `--format` doesn't validate against the allowed values:
  `format = argv[++i] as OutputFormat` (`src/cli.ts:51`) is a TypeScript
  cast, not a runtime validation. `--format xml` throws no error — `format`
  ends up holding the string `"xml"`, and since `"xml" !== "markdown"` in
  `main`'s check (`src/cli.ts:138`), the CLI simply writes as if the
  requested format were `json`, with no warning that the value wasn't
  valid.

None of these points is hypothetical: it's the reproducible behavior of
`parseArgs` and `decideOutputTarget` as they stand today.

### Option A — keep manual parsing

- For: zero new dependencies; `parseArgs` and `decideOutputTarget` are
  pure functions today, tested by passing string arrays with nothing
  mocked (the CLI's current 44 tests depend on this); full control over
  the exact text of every error message.
- Against: every capability a parsing library gives for free (`--help`
  text generated from the flag definitions, `--version`, nested
  subcommands, choice validation, "did you mean --format" suggestions on a
  typo) has to be hand-written, and today it isn't.

### Option B — adopt a library (commander, or equivalents like yargs/cac/clipanion)

- For: `--help` and `--version` are generated automatically from the
  declarative command/option definitions; first-class subcommands
  (commander models them as nested `Command` objects) instead of today's
  special `if` for `login`; type and choice validation
  (`.choices(["json", "markdown"])` for `--format`) with no extra code;
  consistent error messages for unknown flags.
- Against: `parseArgs` would stop being a pure function that takes
  `string[]` and returns a `Result` — it would instead build or invoke the
  library's `Command` object. Still to confirm whether commander allows
  parsing into a plain object without running its own side effects (for
  example, commander calls `process.exit()` internally when it processes
  `--help`); if it doesn't allow that, the testability
  `ADR-figtools-cli.md` set as an explicit decision for `parseArgs` gets
  lost (see the section there "Argument parsing and destination decision —
  pure functions, separate from the entrypoint").

### Open question

The answer depends on who actually uses this CLI: if it's people
discovering it interactively in a terminal, the lack of `--help` is a
concrete usability problem — "usability" here specifically means whether
someone can run `figtools --help` and learn what flags exist without
reading the source code. If the main use is programmatic (another process
invoking `figtools` with arguments already known in advance), `--help`
doesn't change any real flow and the current manual parsing already covers
the use case. This is the same distinction `ADR-figtools-cli.md` already
applies to the output format (volatility section, citing *Righting
Software* ch. 2, on solutions disguised as requirements): without knowing
what the real requirement behind "the CLI should be easy to use" is, there's
no way to assess whether Option B's cost is justified.

### Risk of not deciding

Every new flag (`--verbose`, `--config`, a second subcommand) would keep
being added by hand inside `parseArgs`, with no record anywhere that
replacing this approach was ever evaluated — Option A's maintenance cost
grows with every new flag, incrementally and silently.

---

## How to add a new decision to this document

Every new entry should have this shape: current state (verifiable facts,
with file and line references), options evaluated with their tradeoffs,
the open question still needing an answer, and what happens if the
decision keeps not being made.
