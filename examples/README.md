*[Leer en español](./README.es.md)*

# examples

End-to-end example of the **published** `@figtools/cli` package resolving a
real Figma file. This workspace installs `@figtools/cli` from the npm
registry (a plain semver range, never `workspace:*`), so it exercises the
same package an external consumer would install with
`npm install -g @figtools/cli` — not the local monorepo build.

## Target file

```
https://www.figma.com/design/HThrmBFcF8JMNq4q6d8C4T/Empresa-Inc.?node-id=0-1&p=f&t=Ww4o2KpC9cxfIpo9-0
```

`node-id=0-1` resolves the file's root node together with every node nested
under it, so this single URL already covers the whole page.

## Prerequisites

A Figma session authenticated once via the CLI:

```bash
pnpm --filter examples exec figtools login
```

Opens a Chromium window at the Figma login page; once you complete it, the
session is cached at `~/.figma-scraper/session.json` and reused by later
commands.

## Reproduce

```bash
pnpm install
pnpm --filter examples run fetch
```

This runs the CLI twice against the target URL, once per output format:

- `pnpm run fetch:json` → `empresa-inc/json/` — a single `.json` file with
  the root node and all of its children.
- `pnpm run fetch:markdown` → `empresa-inc/markdown/` — a navigable Markdown
  tree (`index.md` per node with children, down to leaf `.md` files).

## Why it's committed

`empresa-inc/json/` and `empresa-inc/markdown/` are checked into the repo as
generated reference output — a live snapshot of what `@figtools/cli` 0.3.0
produces for this file, without having to run it and re-authenticate to see
the shape of the result.

## Additional resources

- [`@figtools/cli`](../packages/cli) — the package this example installs.
- [Monorepo README](../README.md) — overview of `figtools`.
