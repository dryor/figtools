*[Read in English](./README.md)*

# @figtools/core

`@figtools/core` trae la información de un nodo o archivo de Figma (posición, tamaño, estilos, jerarquía) sin las limitaciones de una cuenta free: sin los rate limits de la REST API oficial de Figma, y sin requerir el plan de Dev Mode. En vez de llamar a la API, automatiza un navegador real con Playwright contra la UI de figma.com y lee los datos directamente de los paneles que Figma ya renderiza para cualquier cuenta.

## Installation

```bash
npm install @figtools/core playwright
```

`playwright` es un peer dependency: lo instala tu proyecto para controlar qué versión del navegador usa. La primera vez que lo instalas, Playwright descarga los binarios de Chromium si aún no los tienes:

```bash
npx playwright install chromium
```

## Examples

### Resolver un nodo o archivo por URL

```ts
import {
  createFigmaScraperCore,
  CookieSessionStore,
  PlaywrightFigmaNodeSource,
  PlaywrightLogin,
} from "@figtools/core";

const core = createFigmaScraperCore({
  sessionStore: new CookieSessionStore(),
  interactiveLogin: new PlaywrightLogin(),
  gateway: new PlaywrightFigmaNodeSource(),
});

const result = await core.resolveUrl(
  "https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23"
);

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else {
  console.log(result.value); // FigmaNode | FigmaPage
}
```

La primera vez que llamas a `resolveUrl` (o `ensureSession`) sin una sesión guardada, `PlaywrightLogin` abre una ventana de Chromium en `https://www.figma.com/login` y espera a que completes el login manualmente — incluye el flujo de Google SSO si así inicias sesión. Una vez autenticado, `CookieSessionStore` guarda las cookies en `~/.figma-scraper/session.json` para no repetir el login en llamadas futuras.

Si la URL no trae `node-id`, `resolveUrl` devuelve la página activa completa como `FigmaPage` (sus nodos de nivel superior).

### Parámetros de `createFigmaScraperCore`

`createFigmaScraperCore(deps: FigmaScraperCoreDeps)` recibe un único objeto con tres dependencias obligatorias:

| Parámetro | Tipo | Propósito |
| --- | --- | --- |
| `sessionStore` | `SessionStore` | Persiste y recupera la sesión de Figma (cookies) entre corridas. `CookieSessionStore` escribe en `~/.figma-scraper/session.json`; reemplazalo por tu propia implementación para guardar la sesión en otro lado (ver "Usar tu propio almacenamiento de sesión" abajo). |
| `interactiveLogin` | `InteractiveLogin` | Ejecuta el login real cuando no hay sesión guardada o expiró. `PlaywrightLogin` abre una ventana de Chromium real para que una persona lo complete. |
| `gateway` | `FigmaNodeSource` | Trae los datos crudos del nodo/página. `PlaywrightFigmaNodeSource` es la única implementación incluida hoy — automatiza la UI de figma.com con Playwright. |

### Controlar la captura de imagen e íconos (SVG)

```ts
const result = await core.resolveUrl(url, {
  image: { enabled: true, format: "JPEG" }, // "PNG" | "JPEG" | "PDF"
  icons: { enabled: true },
});
```

El segundo argumento opcional de `resolveUrl` se combina con `DEFAULT_FETCH_OPTIONS` — **tanto `image.enabled` como `icons.enabled` son `false` por default**. Capturar cualquiera de los dos pasa por el panel de export real de Figma, un round-trip completo de UI por nodo (hasta decenas de segundos en el peor caso en un árbol grande), así que es opt-in en vez de pagarse siempre. Cuando está desactivado, `image`/`svgCode` vuelven `null` en cada nodo en vez de capturarse. `icons` nombra lo que pedís; lo capturado sigue siendo markup SVG, en `svgCode`.

### Manejar sesión expirada o forzar un nuevo login

```ts
// Si la cookie guardada ya no es válida, resolveUrl reintenta el login
// automáticamente. Para forzar un login nuevo de forma explícita:
const session = await core.reauthenticate();

// Para obtener o crear una sesión sin forzar un login si ya existe una válida:
const ensured = await core.ensureSession();
```

### Errores posibles

Todo resultado es un `Result<T, FigmaScraperError>` — revisa `result.ok` antes de leer `value` o `error`. Los códigos de error (`FigmaScraperErrorCode`) son:

| Código | Cuándo ocurre |
| --- | --- |
| `VALIDATION_EMPTY_URL` | La URL pasada a `resolveUrl` está vacía |
| `VALIDATION_NOT_FIGMA_URL` | La URL no es una URL válida de figma.com |
| `NOT_FOUND_OR_NO_ACCESS` | El nodo o archivo no existe, o la cuenta autenticada no tiene acceso |
| `AUTHENTICATION_FAILED` | El login no se pudo completar o la sesión sigue expirada tras reautenticar |
| `INCOMPLETE_NODE_DATA` | Figma no expuso un panel legible con los datos del nodo para esta sesión |

### Usar tu propio almacenamiento de sesión

`SessionStore` es una interfaz — puedes reemplazar `CookieSessionStore` por cualquier implementación propia (por ejemplo, para guardar la sesión en una base de datos en vez de en disco):

```ts
import type { SessionStore, FigmaSession } from "@figtools/core";

class InMemorySessionStore implements SessionStore {
  private session: FigmaSession | null = null;
  async getSession() { return this.session; }
  async saveSession(session: FigmaSession) { this.session = session; }
}
```

### El shape del nodo devuelto (`FigmaNode`)

`result.value` es un `FigmaNode` (nodo único) o un `FigmaPage` (`{ id, name, nodes: FigmaNode[] }`, cuando la URL no trae `node-id`). Cada `FigmaNode`:

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | `string` | El id de nodo propio de Figma (formato `"1:23"`) |
| `name` | `string` | La etiqueta editable de la capa |
| `type` | `string` | El tipo de nodo de Figma (`"FRAME"`, `"TEXT"`, `"COMPONENT"`, ...) |
| `position` | `{ x, y }` (nullable) | `null` cuando el campo no existe para el tipo/estado de este nodo (ej. auto-layout `Fill`/`Hug`), no es lo mismo que un `0` real |
| `size` | `{ width, height }` (nullable) | Mismo convenio de nullability que `position` |
| `visible` | `boolean` | Refleja el toggle de visibilidad de la capa — los nodos ocultos igual se incluyen en el árbol |
| `image` | `Buffer \| null` | `null` salvo que se haya pasado `image.enabled` a `resolveUrl` (ver arriba) |
| `svgCode` | `string \| null` | `null` salvo que se haya pasado `svg.enabled`, o el `type` del nodo no sea exportable a SVG |
| `characters` | `string \| null` | El contenido literal de un nodo TEXT; `null` para nodos que no son TEXT |
| `children` | `FigmaNode[]` | Recursivo |
| `styles` | `CommonStyles & { typography?: TypographyStyles }` | Ver abajo |

`styles` (`CommonStyles`) — todos los campos son opcionales, presentes solo cuando el panel de Figma los muestra para ese nodo:

`flow`, `widthSizing`, `heightSizing`, `fills` (`FigmaPaint[]`), `strokes` (`FigmaPaint[]`), `strokeWeight`, `strokeSide`, `cornerRadius`, `effects` (`FigmaEffect[]`), `opacity`, `blendMode`, `paddingTop`/`paddingRight`/`paddingBottom`/`paddingLeft`, `itemSpacing`.

`styles.typography` (`TypographyStyles`, solo en nodos con sección de Typography): `styleName`, `fontFamily`, `fontWeight`, `fontSize`, `lineHeightPx`, `style`, `textAlignHorizontal`, `textAlignVertical`, `letterSpacing`, `lineHeightPercent`, `textCase`, `textDecoration`.

## Troubleshooting

- **Se abre la ventana de Chromium pero nunca avanza**: `PlaywrightLogin` espera indefinidamente (sin timeout) a que termines el login manual en `https://www.figma.com/login`, porque depende de una persona completándolo. Verifica que el login haya llegado a `https://www.figma.com/files/...`.
- **`INCOMPLETE_NODE_DATA` en un nodo que sí existe**: Figma solo expone ciertos paneles de datos según el modo de vista activo (edición vs. inspección) y el rol de la cuenta sobre el archivo. Prueba abrir el mismo nodo manualmente con la cuenta usada para el login y confirma que el panel de propiedades es visible.
- **La sesión guardada dejó de funcionar**: llama a `core.reauthenticate()` para forzar un login nuevo; sobrescribe la sesión guardada en `~/.figma-scraper/session.json`.

## Additional resources

- [`@figtools/cli`](../cli) — interfaz de línea de comandos construida sobre este paquete.
- [README del monorepo](../../README.md) — visión general de `figtools`, ADRs y specs de aceptación.

## License

MIT — ver [LICENSE](./LICENSE).
