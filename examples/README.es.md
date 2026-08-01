*[Read in English](./README.md)*

# examples

Ejemplo end-to-end de `@figtools/cli` **publicado** resolviendo un archivo
real de Figma. Este workspace instala `@figtools/cli` desde el registro de
npm (un rango semver normal, nunca `workspace:*`), así que ejercita el mismo
paquete que instalaría un consumidor externo con
`npm install -g @figtools/cli` — no el build local del monorepo.

## Archivo objetivo

```
https://www.figma.com/design/HThrmBFcF8JMNq4q6d8C4T/Empresa-Inc.
```

La URL se usa **sin** `node-id`: pasar un node-id específico (la URL
original traía `?node-id=0-1`, el nodo CANVAS de la propia página) hace que
el CLI llame a `fetchNode`, que no puede leer ese nodo — el CANVAS de una
página no tiene fila propia en el panel de capas de Figma, solo la tienen
sus hijos de primer nivel (confirmado en
[`playwright-figma-node-source.ts`](../packages/core/src/adapters/playwright/playwright-figma-node-source.ts),
`buildNodeReader`). Omitir `node-id` hace que el CLI llame a
`fetchDefaultPage`, hecha específicamente para sintetizar el nodo CANVAS y
leer todos sus hijos — la forma real de traer todos los nodos de la página.

## Prerrequisitos

Una sesión de Figma autenticada una sola vez con el CLI:

```bash
pnpm --filter examples exec figtools login
```

Abre una ventana de Chromium en la página de login de Figma; al completarlo,
la sesión queda guardada en `~/.figma-scraper/session.json` y se reutiliza en
los siguientes comandos.

## Reproducir

```bash
pnpm install
pnpm --filter examples run fetch
```

Esto corre el CLI dos veces contra la URL objetivo, una por formato de
salida:

- `pnpm run fetch:json` → `empresa-inc/json/` — un único `.json` con el nodo
  raíz y todos sus hijos.
- `pnpm run fetch:markdown` → `empresa-inc/markdown/` — un árbol Markdown
  navegable (`index.md` por nodo con hijos, hasta llegar a archivos `.md`
  hoja).

## El output no se commitea

`empresa-inc/` está en el `.gitignore`, no queda versionado: solo el JSON de
este archivo ya pesa más de 20MB, y `@figtools/core` maneja una ventana real
de Chromium contra figma.com — cuánto tarda una corrida (y si llega a
terminar) depende de qué tan rápido esa máquina renderiza el editor de
Figma, pesado en WebGL. Corré `pnpm --filter examples run fetch` vos mismo
para generarlo localmente.

## Recursos adicionales

- [`@figtools/cli`](../packages/cli) — el paquete que instala este ejemplo.
- [README del monorepo](../README.es.md) — panorama general de `figtools`.
