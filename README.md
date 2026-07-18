# @figtools/core

Trae la información de un nodo o archivo de Figma (posición, tamaño, estilos,
jerarquía) sin las limitaciones de una cuenta free: sin los rate limits de la
REST API oficial, sin requerir el plan de Dev Mode. La implementación actual
lee esos datos scrapeando el DOM de figma.com vía un browser real
(Playwright), pero ese mecanismo es un detalle de adapter — ver
[`packages/core/adr/ADR-figtools-core.md`](./packages/core/adr/ADR-figtools-core.md)
para el diseño de puertos que permite sumar otros mecanismos (REST API,
plugin, interceptar network) sin tocar el core.

Este repo es un monorepo con pnpm workspaces. Hoy publica un solo paquete,
[`@figtools/core`](./packages/core) (`packages/core/`), que junta el core y
sus adapters. El roadmap incluye separar un CLI y un MCP server como
paquetes propios (`@figtools/cli`, `@figtools/mcp`), y eventualmente extraer
los adapters a paquetes independientes (`@figtools/adapter-playwright`,
`@figtools/adapter-rest`) si el core llega a soportar más de un mecanismo a
la vez.

## Installation

1. `pnpm install` (instala todas las dependencias del monorepo)
2. Crear un `.env` en la raíz con una sesión real de Figma (necesaria para
   `pnpm test:e2e`, ver [Troubleshooting](#troubleshooting)):
   ```
   FIGMA_TEST_CREDENTIAL='[...]'   # cookies de sesión, ver PlaywrightLogin
   FIGMA_TEST_FILE_KEY=...         # archivo con permiso de edición
   FIGMA_TEST_NODE_ID=...
   FIGMA_TEST_VIEW_FILE_KEY=...    # archivo con permiso de solo view
   FIGMA_TEST_VIEW_NODE_ID=...
   ```
3. `pnpm test` corre los tests unitarios de todos los paquetes (no requiere
   `.env`); `pnpm --filter @figtools/core test` corre solo los de ese
   paquete.

## Examples

`@figtools/core` se usa de forma programática, inyectando sus tres puertos
con implementaciones concretas de Playwright:

```typescript
import {
  createFigmaScraperCore,
  PlaywrightFigmaGateway,
  PlaywrightLogin,
  CookieSessionStore,
} from "@figtools/core";

const core = createFigmaScraperCore({
  sessionStore: new CookieSessionStore(),
  interactiveLogin: new PlaywrightLogin(),
  gateway: new PlaywrightFigmaGateway(),
});

// mismo método sin importar si es el primer uso, la sesión expiró, o sigue
// válida — resolveUrl decide internamente qué hacer con la sesión.
const result = await core.resolveUrl(
  "https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23"
);

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else if ("nodes" in result.value) {
  console.log("page:", result.value.name, result.value.nodes.length);
} else {
  console.log("node:", result.value.type, result.value.children.length);
}
```

`PlaywrightFigmaGateway` detecta solo, sin configuración, si el usuario tiene
permiso de edición o de solo lectura sobre el archivo, y lee el panel de
propiedades correspondiente — ver
[`packages/core/adr/ADR-panel-reader-bridge.md`](./packages/core/adr/ADR-panel-reader-bridge.md).

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

## Additional resources

- [`packages/core/adr/ADR-figtools-core.md`](./packages/core/adr/ADR-figtools-core.md)
  — diseño de puertos (Ports & Adapters), modelo de datos, y por qué el core
  nunca soporta acceso anónimo.
- [`packages/core/adr/ADR-panel-reader-bridge.md`](./packages/core/adr/ADR-panel-reader-bridge.md)
  — por qué el gateway necesita detectar el modo de panel de Figma en
  runtime, y qué datos expone cada uno (edición vs. inspección).
- [`packages/core/specs/`](./packages/core/specs) — criterios de aceptación
  en formato Gauge que derivan ambos ADRs.
