# ADR-figma-scraper-core

## Contexto

Se necesita un core que obtenga información de Figma (nodos y archivos completos)
sin depender de los rate limits de la REST API / MCP server de Figma en cuentas
free. El core debe estar desacoplado de cómo se obtienen los datos (scraping vía
headless browser, hoy con Playwright) y de la interfaz que lo consume (hoy un CLI
y un MCP server). Los criterios de aceptación de este comportamiento ya están
definidos en [`specs/gestionar_sesion_figma.spec`](../specs/gestionar_sesion_figma.spec)
y [`specs/obtener_informacion_figma.spec`](../specs/obtener_informacion_figma.spec).

## Decisión

- **Stack:** TypeScript/Node.

- **Patrón — desacople del mecanismo de scraping y sesión:** Ports & Adapters.
  El core define tres puertos (`SessionStore`, `InteractiveLogin`,
  `FigmaGateway`) y nunca importa un adapter directamente; las
  implementaciones concretas (`CookieSessionStore`, `PlaywrightLogin`,
  `PlaywrightFigmaGateway`) se inyectan vía `createFigmaScraperCore(deps)`.
  Consecuencia directa de la restricción ya acordada en `/bdd`: el core no
  debe conocer Playwright ni ningún detalle de cómo se scrapea.

- **`PlaywrightLogin` y `PlaywrightFigmaGateway` no comparten browser:** cada
  uno abre su propia instancia de Playwright cuando la necesita; lo único que
  cruza entre login y scraping es el valor `FigmaSession` vía `SessionStore`.
  Es el único diseño compatible con el caso real del CLI (login y
  `resolveUrl` corren en procesos separados, sin ningún objeto vivo que
  sobreviva entre ambos), así que ni el reintento interno de `resolveUrl`
  tras una sesión expirada comparte contexto de browser — reabre uno nuevo.

- **`FigmaSession.credential`, no `.cookies`:** el nombre no fija el
  mecanismo concreto (hoy son cookies serializadas), para no filtrar ese
  detalle volátil en un tipo que el core y los tres puertos comparten
  directamente.

- **Patrón — parseo de URL:** ninguno GoF. Una URL de Figma solo puede decir
  "hay un `node-id`" o "no hay ninguno" — nunca dice si ese id es una página
  o un elemento cualquiera, porque una página es, en los datos reales de
  Figma, un nodo más (`type: "CANVAS"`). Por eso `FigmaGateway` no distingue
  "traer un nodo" de "traer una página": ambas van por `fetchNode`, y es
  `build-tree.ts` quien decide después, mirando el `type` del nodo ya traído,
  si arma un `FigmaNode` o un `FigmaPage`. Solo el caso sin ningún `node-id`
  necesita su propio método (`fetchDefaultPage`), porque ahí no hay id que
  buscar.
  Cada instancia de un componente ya es, en el modelo real de Figma, un nodo
  completo e independiente (puede tener overrides propios) — no hay datos
  geométricos repetidos que deduplicar, así que `build-tree.ts` tampoco tiene
  lógica de dedup: solo mapea de la forma cruda a la forma final.

- **Modelo de errores:** `Result<T, E>` explícito (sin `throw`). Las funciones
  del core que pueden fallar devuelven `{ ok: true, value }` o
  `{ ok: false, error }`, donde `error` trae un código constante (string) y un
  mensaje legible. Se prefirió sobre excepciones nativas para forzar a CLI/MCP a
  manejar el error en el tipo de retorno en vez de depender de `try/catch`.

- **Volatilidad:**
  - **Volátil:** el mecanismo de scraping y de sesión (Playwright hoy; podría
    cambiar si Figma habilita la REST API sin rate limits, o si se cambia de
    herramienta de scraping). Vive en la capa de adapters, fuera del core.
  - **Estable:** el contrato de datos (forma del árbol de nodos, reglas de
    validación de URL). Vive en el core y no depende de cómo se obtienen los
    datos.

- **Organización — dominio vs. feature:** por dominio. Un único módulo `figma`
  agrupa sesión + obtención de información, porque comparten el mismo dominio y
  hoy solo hay un consumidor real (CLI y MCP, ambos wrappers finos sobre el
  mismo core). No se fragmenta por feature.

- **Gateway devuelve datos crudos, no la forma final del core:**
  `FigmaGateway` expone `RawFigmaNode` — la forma rica y volátil que trae
  Figma. `build-tree.ts` selecciona de ahí el subconjunto estable de campos
  que expone el core (`FigmaNode`/`FigmaPage`), para que el contrato del core
  no dependa de qué tan grande o cambiante sea la forma real de los datos de
  Figma. Ver sección de interfaces.

- **Relaciones:**
  - `DERIVES_FROM` [`specs/gestionar_sesion_figma.spec`](../specs/gestionar_sesion_figma.spec)
  - `DERIVES_FROM` [`specs/obtener_informacion_figma.spec`](../specs/obtener_informacion_figma.spec)

## Estructura de carpetas propuesta

```
src/
  figma/                        # dominio, estable
    core.ts                     # FigmaScraperCore: orquesta validar → parsear → sesión → gateway → armar árbol
    ports.ts                    # SessionStore, InteractiveLogin, FigmaGateway
    model.ts                    # FigmaNode, FigmaPage, estilos
    errors.ts                   # Result<T,E>, FigmaScraperError, códigos
    build-tree.ts               # resolve: RawFigmaNode → FigmaNode | FigmaPage
  adapters/
    cookie-session-store.ts     # implementa SessionStore; sin Playwright, es solo lectura/escritura de un archivo
    playwright/                 # volátil, aislado del core
      playwright-gateway.ts     # implementa FigmaGateway
      playwright-login.ts       # implementa InteractiveLogin
```

## Interfaces

### Diagrama (mermaid)

```mermaid
flowchart TD
    CLI[CLI] --> Core[FigmaScraperCore]
    MCP[MCP Server] --> Core

    Core --> PSession[["Port: SessionStore"]]
    Core --> PLogin[["Port: InteractiveLogin"]]
    Core --> PGateway[["Port: FigmaGateway"]]
    Core --> BuildTree[build-tree.ts]

    ACookie[CookieSessionStore] -.implementa.-> PSession
    ALogin[PlaywrightLogin] -.implementa.-> PLogin
    AGateway[PlaywrightFigmaGateway] -.implementa.-> PGateway

    ACookie -.usa.-> FS[(archivo local)]
    ALogin -.usa.-> Playwright[(Playwright / headless browser)]
    AGateway -.usa.-> Playwright
```

### TypeScript

```typescript
export type FigmaScraperErrorCode =
  | "VALIDATION_EMPTY_URL"
  | "VALIDATION_NOT_FIGMA_URL"
  | "NOT_FOUND_OR_NO_ACCESS"
  | "AUTHENTICATION_FAILED";

export interface FigmaScraperError {
  code: FigmaScraperErrorCode;
  message: string;
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface CommonStyles {
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: Effect[];
  opacity?: number;
  blendMode?: string;
}

export interface TypographyStyles {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: string;
  textAlignVertical: string;
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent?: number;
  textCase?: string;
  textDecoration?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  styles: CommonStyles & { typography?: TypographyStyles };
  image: File | null;
  children: FigmaNode[];
}

export interface FigmaPage {
  id: string;
  name: string;
  nodes: FigmaNode[];
}

export type FigmaScrapeResult = FigmaNode | FigmaPage;

export interface RawFigmaNode {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  styles: CommonStyles & { typography?: TypographyStyles };
  image: File | null;
  children: RawFigmaNode[];
}

export interface FigmaSession {
  credential: string;
}

export interface SessionStore {
  getSession(): Promise<FigmaSession | null>;
  saveSession(session: FigmaSession): Promise<void>;
}

export interface InteractiveLogin {
  authenticate(): Promise<FigmaSession>;
}

// El gateway distingue "sesión expirada" de "no existe / sin acceso": son la
// misma forma de fallo HTTP en Figma, pero el core necesita diferenciarlas
// para saber si debe disparar un re-login solo o devolver un error al caller.
export type FigmaFetchResult<T> =
  | { status: "ok"; value: T }
  | { status: "not-found-or-no-access" }
  | { status: "session-expired" };

export interface FigmaGateway {
  fetchNode(nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>>;
  fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>>;
}

// Si raw.type === "CANVAS" arma un FigmaPage (sus children pasan a ser los
// nodos de la página); para cualquier otro type devuelve un FigmaNode.
export function resolve(raw: RawFigmaNode): FigmaScrapeResult;

export interface FigmaScraperCoreDeps {
  sessionStore: SessionStore;
  interactiveLogin: InteractiveLogin;
  gateway: FigmaGateway;
}

export interface FigmaScraperCore {
  /**
   * No requiere reauthenticate() antes: si no hay sesión guardada, o si el
   * gateway responde "session-expired", dispara el login por su cuenta,
   * guarda la sesión nueva vía sessionStore, y reintenta esta misma
   * solicitud antes de devolver el resultado (spec: "La sesión expira
   * durante una solicitud").
   */
  resolveUrl(url: string): Promise<Result<FigmaScrapeResult, FigmaScraperError>>;

  /**
   * Independiente de resolveUrl: fuerza un login nuevo aunque la sesión
   * actual siga siendo válida (spec: "Iniciar sesión de nuevo..."). Guarda
   * la sesión resultante vía sessionStore antes de devolverla, para que
   * resolveUrl la use en llamadas siguientes.
   */
  reauthenticate(): Promise<Result<FigmaSession, FigmaScraperError>>;
}

export function createFigmaScraperCore(deps: FigmaScraperCoreDeps): FigmaScraperCore;
```

### Usage example

```typescript
import { createFigmaScraperCore } from "./figma/core";
import { PlaywrightFigmaGateway } from "./adapters/playwright/playwright-gateway";
import { PlaywrightLogin } from "./adapters/playwright/playwright-login";
import { CookieSessionStore } from "./adapters/playwright/cookie-session-store";

const core = createFigmaScraperCore({
  sessionStore: new CookieSessionStore(),
  interactiveLogin: new PlaywrightLogin(),
  gateway: new PlaywrightFigmaGateway(),
});

// Primer uso, sesión expirada, o sesión válida: mismo método en los tres
// casos, resolveUrl decide solo qué hacer con la sesión.
const result = await core.resolveUrl(
  "https://www.figma.com/file/ABC123/Mi-Diseno?node-id=1-23"
);

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else {
  const node = result.value as FigmaNode;
  console.log(node.type, node.children.length);
}

// Comando explícito "figma-scraper login" en el CLI, por ejemplo.
const reauth = await core.reauthenticate();
if (!reauth.ok) {
  console.error(reauth.error.code, reauth.error.message);
}
```

## Ver también

- [`specs/gestionar_sesion_figma.spec`](../specs/gestionar_sesion_figma.spec) — escenarios de login, reutilización de sesión y expiración que motivan `SessionStore` / `InteractiveLogin`.
- [`specs/obtener_informacion_figma.spec`](../specs/obtener_informacion_figma.spec) — escenarios de obtención de nodo/archivo que motivan `FigmaGateway` y `build-tree.ts`.
