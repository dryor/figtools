---
"@figtools/core": minor
---

Rename `FigmaScraperCore.resolveUrl()` to `getDesign()`. `resolveUrl` named plain URL parsing, but the method authenticates, fetches (retrying on session expiry), and builds the resulting node/page tree — parsing the URL is only the first, already-internal step. The new name also avoids committing the port to a specific mechanism (scraping, HTTP fetch): `FigmaScraperCore` exists so the underlying `FigmaNodeSource` can change (Playwright today, the Figma REST API or a Figma plugin bridge later) without the contract implying how the design is obtained.

Consumers calling `.resolveUrl(url, overrides)` directly on a `FigmaScraperCore` need to switch to `.getDesign(url, overrides)` — the signature is unchanged.
