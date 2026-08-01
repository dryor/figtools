*[Read in English](./README.md)*

# @figtools/cli

`@figtools/cli` resuelve una o varias URLs de Figma desde la línea de comandos y escribe el resultado en JSON o en un árbol de Markdown navegable, pensado para que un LLM lo use como fuente de datos sin tener que procesar un único JSON gigante. Usa [`@figtools/core`](../core) por debajo, así que no depende de la REST API oficial de Figma ni de una cuenta con Dev Mode.

## Installation

```bash
npm install -g @figtools/cli
npx playwright install chromium
```

También puedes instalarlo como dependencia local del proyecto y correrlo con `npx figtools`.

## Examples

### Iniciar sesión una sola vez

```bash
figtools login
```

Abre una ventana de Chromium en el login de Figma. Completa el login manualmente (soporta el flujo de Google SSO); al terminar, la sesión queda guardada en `~/.figma-scraper/session.json` y los comandos siguientes la reutilizan sin volver a pedir login.

### Resolver una URL a JSON (por defecto, a stdout)

```bash
figtools "https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23"
```

Si la URL no trae `node-id`, se resuelve la página activa completa del archivo.

### Guardar el resultado en un archivo o carpeta

```bash
# Un archivo .json puntual
figtools "https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23" --output resultado.json

# Una carpeta: escribe "<carpeta>/<fileKey>-<nodeId>.json"
figtools "https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23" --output ./salida
```

### Exportar como árbol de Markdown navegable

```bash
figtools "https://www.figma.com/design/ABC123/Mi-Diseno" --format markdown --output ./docs
```

Genera `./docs/<fileKey>/index.md` con un link por cada nodo de nivel superior, y una carpeta por cada nodo que tiene hijos (con su propio `index.md`), hasta llegar a los nodos hoja como `<slug>.md`. Este formato está pensado para que un LLM navegue el árbol de a un archivo por vez, en vez de recibir el diseño completo en un solo bloque de JSON.

### Resolver varias URLs en una sola corrida

```bash
figtools "https://www.figma.com/design/ABC123/A?node-id=1-1" "https://www.figma.com/design/ABC123/A?node-id=1-2" --format markdown --output ./docs
```

Cada URL se resuelve en paralelo tras autenticar una sola vez. Si alguna falla, el proceso sigue con las demás y termina con código de salida `1`; los errores se listan en stderr al final.

### Silenciar el progreso

```bash
figtools "https://www.figma.com/design/ABC123/Mi-Diseno" --quiet
```

Omite el mensaje `Resolving N URL(s)...` en stderr — útil si estás capturando stdout en un script.

### Incluir imágenes de preview y/o íconos (código SVG)

```bash
figtools "https://www.figma.com/design/ABC123/Mi-Diseno" --images --image-format jpg
figtools "https://www.figma.com/design/ABC123/Mi-Diseno" --icons
```

Capturar una imagen o el SVG de un ícono de un nodo pasa por la UI de export de Figma, que es lenta en un árbol grande — **ambas están apagadas por default**. Pasá `--images` y/o `--icons` para habilitarlas. `--image-format` (`png`, `jpg`, o `pdf` — los mismos formatos que ofrece el panel de export de Figma) solo tiene efecto cuando también se pasa `--images`.

## Flags

| Flag | Valores | Default | Descripción |
| --- | --- | --- | --- |
| `--format` | `json`, `markdown` | `json` | Formato de salida |
| `--images` | — | `false` | Captura una imagen de preview por cada nodo |
| `--image-format` | `png`, `jpg`, `pdf` | `png` | Formato de las imágenes capturadas (solo aplica si se pasa `--images`) |
| `--icons` | — | `false` | Captura el código SVG de los nodos exportables (íconos) |
| `--output` | ruta de archivo o carpeta | stdout (json) / `.` (markdown) | Dónde escribir el resultado |
| `--quiet` | — | `false` | Omite el mensaje de progreso en stderr |
| `--help`, `-h` | — | — | Imprime información de uso y termina |
| `--version`, `-v` | — | — | Imprime la versión del CLI y termina |

## Troubleshooting

- **`Error: unsupported extension "<ext>"`**: con `--format markdown`, `--output` siempre se trata como una carpeta. Con `--format json`, solo se acepta una ruta terminada en `.json` o sin extensión (tratada como carpeta); cualquier otra extensión falla explícitamente.
- **`--format` argument 'xml' is invalid. Allowed choices are json, markdown.`**: un valor de `--format` no soportado se rechaza explícitamente en vez de caer en `json` en silencio.
- **`--image-format` argument 'gif' is invalid. Allowed choices are png, jpg, pdf.`**: solo se aceptan los formatos que el panel de export de Figma realmente ofrece.
- **No aparecen imágenes ni íconos en el resultado, aunque el archivo los tiene**: `--images`/`--icons` están apagadas por default (capturarlas tiene un costo real — un round-trip completo de UI por nodo). Pasá `--images` y/o `--icons` explícitamente.
- **`error: unknown option '--foo'`**: una flag no reconocida se rechaza explícitamente en vez de ser ignorada en silencio.
- **El proceso termina con código `1` pero imprimió resultados**: significa que al menos una de las URLs falló — revisa el bloque `URLs with errors:` al final de stderr para ver el código (`FigmaScraperErrorCode`) y mensaje de cada una. Ver la tabla de errores en el [README de `@figtools/core`](../core/README.es.md#errores-posibles).
- **`figtools login` no avanza**: la ventana de Chromium espera indefinidamente a que termines el login manual; confirma que llegaste a `https://www.figma.com/files/...` antes de cerrar la ventana.

## Additional resources

- [`@figtools/core`](../core) — la librería subyacente, útil si prefieres integrar la resolución de URLs directamente en tu propio código en vez de invocar un binario.
- [README del monorepo](../../README.md) — visión general de `figtools`, ADRs y specs de aceptación.

## License

MIT — ver [LICENSE](./LICENSE).
