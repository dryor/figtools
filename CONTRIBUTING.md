*[Leer en español](./CONTRIBUTING.es.md)*

# Contributing

## Setup

1. `pnpm install` (installs dependencies for every package in the workspace)

## Tests

- `pnpm test` runs the unit tests for every package.
- `pnpm --filter @figtools/core test` runs only that package's unit tests.
- `pnpm test:e2e` — **still work in progress.** These tests drive a real
  Playwright browser against figma.com, and there's still no stable way to
  configure which Figma files/nodes they run against — the current fixture
  mechanism is under revision and likely to change. Don't rely on it yet.
- `pnpm typecheck` runs `tsc --noEmit` on every package.
- `pnpm build` builds every package (Rslib) into `packages/*/dist/`.

## Monorepo structure

Each publishable package lives in `packages/<name>/`, with its own
`package.json`, `tsconfig.json` (extending the root's `tsconfig.base.json`)
and `vitest.config.ts`. Each package's ADRs and specs live next to its code
(`packages/<name>/adr/`, `packages/<name>/specs/`), not at the root — they
document decisions specific to that package.
