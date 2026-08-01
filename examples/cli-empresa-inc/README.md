*[Leer en español](./README.es.md)*

# cli-empresa-inc

End-to-end example of the **published** `@figtools/cli` package resolving a
real Figma file. This workspace installs `@figtools/cli` from the npm
registry (a plain semver range, never `workspace:*`), so it exercises the
same package an external consumer would install with
`npm install -g @figtools/cli` — not the local monorepo build.

## Target file

```
https://www.figma.com/design/HThrmBFcF8JMNq4q6d8C4T/Empresa-Inc.
```

The URL is used **without** `node-id`: passing a specific node-id (the file
originally came with `?node-id=0-1`, the page's own CANVAS node) makes the
CLI call `fetchNode`, which can't read that node — a page's CANVAS node has
no row of its own in Figma's layers panel, only its top-level children do
(confirmed in [`playwright-figma-node-source.ts`](../../packages/core/src/adapters/playwright/playwright-figma-node-source.ts),
`buildNodeReader`). Omitting `node-id` makes the CLI call `fetchDefaultPage`
instead, which is built specifically to synthesize the CANVAS node and read
every one of its children — the actual way to get every node of the page.

## Prerequisites

A Figma session authenticated once via the CLI:

```bash
pnpm --filter cli-empresa-inc exec figtools login
```

Opens a Chromium window at the Figma login page; once you complete it, the
session is cached at `~/.figma-scraper/session.json` and reused by later
commands.

## Reproduce

```bash
pnpm install
pnpm --filter cli-empresa-inc run fetch
```

This runs the CLI twice against the target URL, once per output format:

- `pnpm run fetch:json` → `empresa-inc/json/` — a single `.json` file with
  the root node and all of its children.
- `pnpm run fetch:markdown` → `empresa-inc/markdown/` — a navigable Markdown
  tree (`index.md` per node with children, down to leaf `.md` files).

## Output isn't committed

`empresa-inc/` is gitignored, not checked in: the JSON output alone is over
20MB for this file, and `@figtools/core` drives a real headed Chromium
window against figma.com — how long a run takes (and whether it finishes at
all) depends on how fast that machine renders Figma's WebGL-heavy editor.
Run `pnpm --filter cli-empresa-inc run fetch` yourself to generate it locally.

## Additional resources

- [`@figtools/cli`](../../packages/cli) — the package this example installs.
- [Monorepo README](../../README.md) — overview of `figtools`.
