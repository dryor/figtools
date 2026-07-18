# get-figma

Lee nodos y archivos de Figma sin depender de la REST API oficial (evita sus
rate limits en cuentas free) y sin depender del plan del usuario para tener
Dev Mode. El core scrapea el DOM de figma.com vía un browser real (Playwright)
para extraer tipo, posición, tamaño, estilos y jerarquía de un nodo, y
construye el mismo árbol de datos que la API oficial expondría.

Hoy solo existe el core (`src/figma/`) más el adapter de Playwright
(`src/adapters/playwright/`) — no hay CLI ni MCP server todavía. El roadmap
es migrar a un monorepo para publicar esos paquetes por separado; ver
[`adr/ADR-figma-scraper-core.md`](./adr/ADR-figma-scraper-core.md) para el
diseño de puertos que ya lo anticipa.

## Installation

1. `pnpm install`
2. Crear un `.env` en la raíz con una sesión real de Figma (necesaria para
   `pnpm test:e2e`, ver [Troubleshooting](#troubleshooting)):
   ```
   FIGMA_TEST_CREDENTIAL='[...]'   # cookies de sesión, ver PlaywrightLogin
   FIGMA_TEST_FILE_KEY=...         # archivo con permiso de edición
   FIGMA_TEST_NODE_ID=...
   FIGMA_TEST_VIEW_FILE_KEY=...    # archivo con permiso de solo view
   FIGMA_TEST_VIEW_NODE_ID=...
   ```
3. `pnpm test` corre los tests unitarios (no requiere `.env`)

## Examples

El core se usa de forma programática, inyectando sus tres puertos con
implementaciones concretas de Playwright:

```typescript
import { createFigmaScraperCore } from "./src/figma/core";
import { PlaywrightFigmaGateway } from "./src/adapters/playwright/playwright-figma-gateway";
import { PlaywrightLogin } from "./src/adapters/playwright/playwright-login";
import { CookieSessionStore } from "./src/adapters/cookie-session-store";

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
[`adr/ADR-panel-reader-bridge.md`](./adr/ADR-panel-reader-bridge.md).

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

- [`adr/ADR-figma-scraper-core.md`](./adr/ADR-figma-scraper-core.md) — diseño
  de puertos (Ports & Adapters), modelo de datos, y por qué el core nunca
  soporta acceso anónimo.
- [`adr/ADR-panel-reader-bridge.md`](./adr/ADR-panel-reader-bridge.md) — por
  qué el gateway necesita detectar el modo de panel de Figma en runtime, y
  qué datos expone cada uno (edición vs. inspección).
- [`specs/`](./specs) — criterios de aceptación en formato Gauge que derivan
  ambos ADRs.
