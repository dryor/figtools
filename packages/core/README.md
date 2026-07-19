*[Leer en español](./README.es.md)*

# @figtools/core

`@figtools/core` fetches the data of a Figma node or file (position, size, styles, hierarchy) without the limitations of a free account: no official Figma REST API rate limits, and no Dev Mode plan required. Instead of calling the API, it drives a real browser with Playwright against the figma.com UI and reads the data directly from the panels Figma already renders for any account.

## Installation

```bash
npm install @figtools/core playwright
```

`playwright` is a peer dependency: your project installs it to control which browser version is used. The first time you install it, Playwright downloads the Chromium binaries if you don't already have them:

```bash
npx playwright install chromium
```

## Examples

### Resolve a node or file by URL

```ts
import {
  createFigmaScraperCore,
  CookieSessionStore,
  PlaywrightFigmaGateway,
  PlaywrightLogin,
} from "@figtools/core";

const core = createFigmaScraperCore({
  sessionStore: new CookieSessionStore(),
  interactiveLogin: new PlaywrightLogin(),
  gateway: new PlaywrightFigmaGateway(),
});

const result = await core.resolveUrl(
  "https://www.figma.com/design/ABC123/My-Design?node-id=1-23"
);

if (!result.ok) {
  console.error(result.error.code, result.error.message);
} else {
  console.log(result.value); // FigmaNode | FigmaPage
}
```

The first time you call `resolveUrl` (or `ensureSession`) without a saved session, `PlaywrightLogin` opens a Chromium window at `https://www.figma.com/login` and waits for you to complete the login manually — this includes the Google SSO flow if that's how you sign in. Once authenticated, `CookieSessionStore` saves the cookies to `~/.figma-scraper/session.json` so later calls don't need to log in again.

If the URL doesn't include `node-id`, `resolveUrl` returns the entire active page as a `FigmaPage` (its top-level nodes).

### Handle an expired session or force a new login

```ts
// If the saved cookie is no longer valid, resolveUrl retries the login
// automatically. To force a new login explicitly:
const session = await core.reauthenticate();

// To get or create a session without forcing a login if a valid one already exists:
const ensured = await core.ensureSession();
```

### Possible errors

Every result is a `Result<T, FigmaScraperError>` — check `result.ok` before reading `value` or `error`. The error codes (`FigmaScraperErrorCode`) are:

| Code | When it happens |
| --- | --- |
| `VALIDATION_EMPTY_URL` | The URL passed to `resolveUrl` is empty |
| `VALIDATION_NOT_FIGMA_URL` | The URL isn't a valid figma.com URL |
| `NOT_FOUND_OR_NO_ACCESS` | The node or file doesn't exist, or the authenticated account has no access |
| `AUTHENTICATION_FAILED` | Login couldn't complete, or the session is still expired after reauthenticating |
| `INCOMPLETE_NODE_DATA` | Figma didn't expose a readable panel with the node's data for this session |

### Using your own session storage

`SessionStore` is an interface — you can swap `CookieSessionStore` for any implementation of your own (for example, to store the session in a database instead of on disk):

```ts
import type { SessionStore, FigmaSession } from "@figtools/core";

class InMemorySessionStore implements SessionStore {
  private session: FigmaSession | null = null;
  async getSession() { return this.session; }
  async saveSession(session: FigmaSession) { this.session = session; }
}
```

## Troubleshooting

- **The Chromium window opens but never progresses**: `PlaywrightLogin` waits indefinitely (no timeout) for you to finish the manual login at `https://www.figma.com/login`, since it depends on a person completing it. Verify the login reached `https://www.figma.com/files/...`.
- **`INCOMPLETE_NODE_DATA` on a node that does exist**: Figma only exposes certain data panels depending on the active view mode (editing vs. inspection) and the account's role on the file. Try opening the same node manually with the account used for login and confirm the properties panel is visible.
- **The saved session stopped working**: call `core.reauthenticate()` to force a new login; it overwrites the session saved at `~/.figma-scraper/session.json`.

## Additional resources

- [`@figtools/cli`](../cli) — command-line interface built on top of this package.
- [Monorepo README](../../README.md) — overview of `figtools`, ADRs, and acceptance specs.

## License

MIT — see [LICENSE](./LICENSE).
