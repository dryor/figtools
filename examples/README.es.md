*[Read in English](./README.md)*

# examples

Ejemplo end-to-end de `@figtools/cli` **publicado** resolviendo un archivo
real de Figma. Este workspace instala `@figtools/cli` desde el registro de
npm (un rango semver normal, nunca `workspace:*`), así que ejercita el mismo
paquete que instalaría un consumidor externo con
`npm install -g @figtools/cli` — no el build local del monorepo.

## Archivo objetivo

```
https://www.figma.com/design/HThrmBFcF8JMNq4q6d8C4T/Empresa-Inc.?node-id=0-1&p=f&t=Ww4o2KpC9cxfIpo9-0
```

`node-id=0-1` resuelve el nodo raíz del archivo junto con todos los nodos
anidados debajo, así que esta única URL ya cubre toda la página.

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

## Por qué está commiteado

`empresa-inc/json/` y `empresa-inc/markdown/` quedan versionados en el repo
como output de referencia generado — una foto de lo que produce
`@figtools/cli` 0.3.0 para este archivo, sin tener que correrlo ni
autenticarse de nuevo para ver la forma del resultado.

## Recursos adicionales

- [`@figtools/cli`](../packages/cli) — el paquete que instala este ejemplo.
- [README del monorepo](../README.es.md) — panorama general de `figtools`.
