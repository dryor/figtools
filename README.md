*[Leer en español](./README.es.md)*

# figtools

Tools for working with Figma data without the limitations of a free
account: no official REST API rate limits, no Dev Mode plan required. This
repo is a monorepo with pnpm workspaces — each tool is published as an
independent package under the [`@figtools`](https://www.npmjs.com/org/figtools)
scope.

## Packages

| Package | What it does |
| --- | --- |
| [`@figtools/core`](./packages/core) | Fetches the data of a Figma node or file (position, size, styles, hierarchy) programmatically. Currently includes the core and its adapters (Playwright); see its [ADR](./packages/core/adr/ADR-figtools-core.md) for the ports design that lets other mechanisms (REST API, plugin, network interception) be added without touching it. |
| [`@figtools/cli`](./packages/cli) | Resolves one or more Figma URLs from the command line and writes the result as JSON or as a navigable markdown tree meant to be used by an LLM as a data source. See its [ADR](./packages/cli/adr/ADR-figtools-cli.md) for how it orchestrates `@figtools/core`. |

Roadmap: an MCP server (`@figtools/mcp`) as its own package consuming
`@figtools/core`, and eventually extracting the adapters into independent
packages (`@figtools/adapter-playwright`, `@figtools/adapter-rest`) if the
core ends up supporting more than one mechanism at a time.

## Installation

Install the package you need with your package manager:

```sh
npm install @figtools/core
# or
npm install -g @figtools/cli
```

`@figtools/core` declares `playwright` as a peer dependency — install it in
your project too (`npm install playwright`) if you're going to use
`PlaywrightFigmaGateway` or `PlaywrightLogin`.

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

// same method regardless of whether it's the first use, the session
// expired, or it's still valid — resolveUrl decides internally what to do
// with the session.
const result = await core.resolveUrl(
  "https://www.figma.com/design/ABC123/My-Design?node-id=1-23"
);

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else if ("nodes" in result.value) {
  console.log("page:", result.value.name, result.value.nodes.length);
} else {
  console.log("node:", result.value.type, result.value.children.length);
}
```

Or from the command line, with `@figtools/cli`:

```sh
figtools "https://www.figma.com/design/ABC123/My-Design?node-id=1-23"
```

See each package's own README for full installation, usage, and
troubleshooting details.

## Additional resources

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to set up the monorepo, run
  tests, and contribute code.
- [`DEPLOY.md`](./DEPLOY.md) — how versioning and publishing to npm work
  (changesets + GitHub Actions).
- [`packages/core/adr/ADR-figtools-core.md`](./packages/core/adr/ADR-figtools-core.md)
  — `@figtools/core`'s ports design (Ports & Adapters), data model, and why
  the core never supports anonymous access.
- [`packages/core/adr/ADR-panel-reader-bridge.md`](./packages/core/adr/ADR-panel-reader-bridge.md)
  — why the Playwright gateway needs to detect Figma's panel mode at
  runtime, and what data each one exposes (edit vs. inspection).
- [`packages/cli/adr/ADR-figtools-cli.md`](./packages/cli/adr/ADR-figtools-cli.md)
  — how `@figtools/cli` orchestrates `@figtools/core` and organizes its
  output writers.
- [`packages/core/specs/`](./packages/core/specs) and
  [`packages/cli/specs/`](./packages/cli/specs) — Gauge acceptance criteria
  that derive the ADRs above.

## License

[MIT](./LICENSE)
