*[Leer en español](./README.es.md)*

# @figtools/cli

`@figtools/cli` resolves one or more Figma URLs from the command line and writes the result as JSON or as a navigable Markdown tree, meant to be used by an LLM as a data source without having to parse one giant JSON blob. It uses [`@figtools/core`](../core) under the hood, so it doesn't depend on the official Figma REST API or a Dev Mode account.

## Installation

```bash
npm install -g @figtools/cli
npx playwright install chromium
```

You can also install it as a local project dependency and run it with `npx figtools`.

## Examples

### Log in once

```bash
figtools login
```

Opens a Chromium window at the Figma login page. Complete the login manually (the Google SSO flow is supported); once done, the session is saved to `~/.figma-scraper/session.json` and later commands reuse it without asking to log in again.

### Resolve a URL to JSON (stdout by default)

```bash
figtools "https://www.figma.com/design/ABC123/My-Design?node-id=1-23"
```

If the URL doesn't include `node-id`, the entire active page of the file is resolved.

### Save the result to a file or folder

```bash
# A single .json file
figtools "https://www.figma.com/design/ABC123/My-Design?node-id=1-23" --output result.json

# A folder: writes "<folder>/<fileKey>-<nodeId>.json"
figtools "https://www.figma.com/design/ABC123/My-Design?node-id=1-23" --output ./output
```

### Export as a navigable Markdown tree

```bash
figtools "https://www.figma.com/design/ABC123/My-Design" --format markdown --output ./docs
```

Generates `./docs/<fileKey>/index.md` with a link for each top-level node, and a folder per node that has children (with its own `index.md`), down to leaf nodes as `<slug>.md`. This format is meant for an LLM to navigate the tree one file at a time, instead of receiving the entire design in a single JSON blob.

### Resolve several URLs in a single run

```bash
figtools "https://www.figma.com/design/ABC123/A?node-id=1-1" "https://www.figma.com/design/ABC123/A?node-id=1-2" --format markdown --output ./docs
```

Each URL is resolved in parallel after authenticating once. If any of them fail, the process continues with the rest and exits with code `1`; the errors are listed on stderr at the end.

### Silence progress output

```bash
figtools "https://www.figma.com/design/ABC123/My-Design" --quiet
```

Omits the `Resolving N URL(s)...` message on stderr — useful if you're capturing stdout in a script.

## Flags

| Flag | Values | Default | Description |
| --- | --- | --- | --- |
| `--format` | `json`, `markdown` | `json` | Output format |
| `--output` | file or folder path | stdout (json) / `.` (markdown) | Where to write the result |
| `--quiet` | — | `false` | Omits the progress message on stderr |
| `--help`, `-h` | — | — | Prints usage information and exits |
| `--version`, `-v` | — | — | Prints the CLI's version and exits |

## Troubleshooting

- **`Error: unsupported extension "<ext>"`**: with `--format markdown`, `--output` is always treated as a folder. With `--format json`, only a path ending in `.json` or with no extension (treated as a folder) is accepted; any other extension fails explicitly.
- **`--format` argument 'xml' is invalid. Allowed choices are json, markdown.**: an unsupported `--format` value is rejected explicitly instead of silently falling back to `json`.
- **`error: unknown option '--foo'`**: an unrecognized flag is rejected explicitly instead of being silently ignored.
- **The process exits with code `1` but printed results**: at least one of the URLs failed — check the `URLs with errors:` block at the end of stderr for each one's code (`FigmaScraperErrorCode`) and message. See the error table in the [`@figtools/core` README](../core#possible-errors).
- **`figtools login` doesn't progress**: the Chromium window waits indefinitely for you to finish the manual login; confirm you reached `https://www.figma.com/files/...` before closing the window.

## Additional resources

- [`@figtools/core`](../core) — the underlying library, useful if you'd rather integrate URL resolution directly into your own code instead of invoking a binary.
- [Monorepo README](../../README.md) — overview of `figtools`, ADRs, and acceptance specs.

## License

MIT — see [LICENSE](./LICENSE).
