*[Read in English](./CONTRIBUTING.md)*

# Contributing

## Setup

1. `pnpm install` (instala las dependencias de todos los paquetes del
   workspace)

## Tests

- `pnpm test` corre los tests unitarios de todos los paquetes.
- `pnpm --filter @figtools/core test` corre solo los tests unitarios de ese
  paquete.
- `pnpm test:e2e` — **todavía en desarrollo.** Estos tests manejan un
  browser real de Playwright contra figma.com y todavía falta una forma
  estable de configurar contra qué archivos/nodos de Figma corren — el
  mecanismo de fixtures actual está en revisión y es probable que cambie.
  Todavía no confíes en él.
- `pnpm typecheck` corre `tsc --noEmit` en todos los paquetes.
- `pnpm build` compila todos los paquetes (Rslib) a `packages/*/dist/`.

## Estructura del monorepo

Cada paquete publicable vive en `packages/<nombre>/`, con su propio
`package.json`, `tsconfig.json` (que extiende `tsconfig.base.json` de la
raíz) y `vitest.config.ts`. Los ADRs y specs de cada paquete viven junto a
su código (`packages/<nombre>/adr/`, `packages/<nombre>/specs/`), no en la
raíz — documentan decisiones específicas de ese paquete.
