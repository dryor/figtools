---
"@figtools/core": minor
"@figtools/cli": minor
---

Make image and SVG capture opt-in instead of always-on. Each capture is a full Figma export-panel round-trip per node — a real cost on large trees — so both now default to off. `FigmaNodeSource.fetchNode`/`fetchDefaultPage` take a single `FigmaFetchRequest` (session + `FigmaFetchOptions`) instead of a separate `session` parameter — update any custom `FigmaNodeSource` implementation or direct caller. `resolveUrl(url, overrides?)` accepts the new options; the CLI adds `--images`/`--svg` flags to opt in.

Also fixes `--image-format`/`imageFormat`: `"webp"` was never a real option Figma's export panel offers (PNG/JPEG/PDF only) and silently produced PNG bytes under a `.webp` extension — `ImageFormat` is now `"png" | "jpg" | "pdf"`, and image capture actually requests the given format from Figma instead of always capturing PNG regardless of the flag.
