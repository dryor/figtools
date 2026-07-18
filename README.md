# figtools

Herramientas para trabajar con datos de Figma sin las limitaciones de una
cuenta free: sin los rate limits de la REST API oficial, sin requerir el
plan de Dev Mode. Este repo es un monorepo con pnpm workspaces — cada
herramienta se publica como un paquete independiente bajo el scope
[`@figtools`](https://www.npmjs.com/org/figtools).

## Packages

| Paquete | Qué hace |
| --- | --- |
| [`@figtools/core`](./packages/core) | Trae la información de un nodo o archivo de Figma (posición, tamaño, estilos, jerarquía) de forma programática. Hoy incluye el core y sus adapters (Playwright); ver su [ADR](./packages/core/adr/ADR-figtools-core.md) para el diseño de puertos que permite sumar otros mecanismos (REST API, plugin, interceptar network) sin tocarlo. |

Roadmap: un CLI (`@figtools/cli`) y un MCP server (`@figtools/mcp`) como
paquetes propios que consumen `@figtools/core`, y eventualmente extraer los
adapters a paquetes independientes (`@figtools/adapter-playwright`,
`@figtools/adapter-rest`) si el core llega a soportar más de un mecanismo a
la vez.

## Installation

Instalar el paquete que necesites con tu gestor de paquetes:

```sh
npm install @figtools/core
# o
pnpm add @figtools/core
# o
yarn add @figtools/core
```

`@figtools/core` declara `playwright` como peer dependency — instalalo
también en tu proyecto (`npm install playwright`) si vas a usar
`PlaywrightFigmaGateway` o `PlaywrightLogin`.

## Examples

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

## Additional resources

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — cómo levantar el monorepo,
  correr tests y contribuir código.
- [`packages/core/adr/ADR-figtools-core.md`](./packages/core/adr/ADR-figtools-core.md)
  — diseño de puertos (Ports & Adapters) de `@figtools/core`, modelo de
  datos, y por qué el core nunca soporta acceso anónimo.
- [`packages/core/adr/ADR-panel-reader-bridge.md`](./packages/core/adr/ADR-panel-reader-bridge.md)
  — por qué el gateway de Playwright necesita detectar el modo de panel de
  Figma en runtime, y qué datos expone cada uno (edición vs. inspección).
- [`packages/core/specs/`](./packages/core/specs) — criterios de aceptación
  en formato Gauge que derivan ambos ADRs.

## License

[MIT](./LICENSE)
