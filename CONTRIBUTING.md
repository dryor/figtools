# Contributing

## Setup

1. `pnpm install` (instala las dependencias de todos los paquetes del
   workspace)
2. Crear un `.env` en la raíz con una sesión real de Figma (necesaria para
   `pnpm test:e2e`, ver [Troubleshooting](#troubleshooting)):
   ```
   FIGMA_TEST_CREDENTIAL='[...]'   # cookies de sesión, ver PlaywrightLogin
   FIGMA_TEST_FILE_KEY=...         # archivo con permiso de edición
   FIGMA_TEST_NODE_ID=...
   FIGMA_TEST_VIEW_FILE_KEY=...    # archivo con permiso de solo view
   FIGMA_TEST_VIEW_NODE_ID=...
   ```

## Tests

- `pnpm test` corre los tests unitarios de todos los paquetes (no requiere
  `.env`).
- `pnpm --filter @figtools/core test` corre solo los tests unitarios de ese
  paquete.
- `pnpm test:e2e` corre los tests end-to-end contra figma.com real (requiere
  el `.env` del paso de Setup).
- `pnpm typecheck` corre `tsc --noEmit` en todos los paquetes.
- `pnpm build` compila todos los paquetes (Rslib) a `packages/*/dist/`.

## Troubleshooting

- **`pnpm test:e2e` tarda varios minutos**: recorre el árbol completo del
  nodo de prueba clickeando cada fila del layers panel vía Playwright real
  contra figma.com — no hay forma de acelerarlo sin dejar de probar contra
  el DOM real.
- **`pnpm test:e2e` falla con sesión expirada**: `FIGMA_TEST_CREDENTIAL` son
  cookies serializadas con expiración; corré el test de
  `playwright-login.e2e.test.ts` con `FIGMA_E2E_LOGIN=1` para generar una
  sesión nueva (requiere completar el login a mano en el browser que se
  abre).
- **Un nodeId que funcionaba deja de encontrarse**: los nodeIds de hijos en
  el layers panel son estables solo dentro de una misma carga de página, no
  entre corridas — confirmado corriendo contra sesiones reales.

## Estructura del monorepo

Cada paquete publicable vive en `packages/<nombre>/`, con su propio
`package.json`, `tsconfig.json` (que extiende `tsconfig.base.json` de la
raíz) y `vitest.config.ts`. Los ADRs y specs de cada paquete viven junto a
su código (`packages/<nombre>/adr/`, `packages/<nombre>/specs/`), no en la
raíz — documentan decisiones específicas de ese paquete.
