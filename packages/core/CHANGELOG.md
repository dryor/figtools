# @figtools/core

## 0.3.0

### Minor Changes

- b5e59d3: `FigmaColor` is now `{ hex: string; a: number }` instead of `{ r, g, b, a }` — update any code constructing or reading FigmaColor's r/g/b fields directly.
- e4c408d: Make image and icon (SVG) capture opt-in instead of always-on. Each capture is a full Figma export-panel round-trip per node — a real cost on large trees — so both now default to off. `FigmaNodeSource.fetchNode`/`fetchDefaultPage` take a single `FigmaFetchRequest` (session + `FigmaFetchOptions`) instead of a separate `session` parameter — update any custom `FigmaNodeSource` implementation or direct caller. `resolveUrl(url, overrides?)` accepts the new options; the CLI adds `--images`/`--icons` flags to opt in.

  Also fixes `--image-format`/`imageFormat`: `"webp"` was never a real option Figma's export panel offers (PNG/JPEG/PDF only) and silently produced PNG bytes under a `.webp` extension — `ImageFormat` is now `"png" | "jpg" | "pdf"`, and image capture actually requests the given format from Figma instead of always capturing PNG regardless of the flag.

### Patch Changes

- be16ac5: Run Figma scraping in headless Chromium instead of headed. Figma's CloudFront WAF was rejecting headless requests with a 403 because Chromium's default headless User-Agent contains the literal string "HeadlessChrome" — present even in the "new" headless mode, which otherwise renders identically to headed. Stripping just that substring from the User-Agent is enough to pass. This removes the dependency on a real X server/display that headless:false required, so scraping can now run on headless CI/servers.
- cf625cf: Fix silent data loss in `PlaywrightFigmaNodeSource` when reading a TEXT/Icon child hidden from Figma's layers panel: the Enter-driven drill-down (`readHiddenTextChild`) sometimes failed to register on the first attempt, causing the hidden child to be dropped from the scraped tree without any error. Confirmed by comparing repeated real fetches of the same file/node: a longer wait alone didn't help, and the failure showed up even in fully serial (non-concurrent) runs. Now retries the click+Enter sequence up to 4 times before giving up, matching the retry pattern `expandAndListChildren` already uses for the same class of "empty read right after an action" problem.

## 0.2.0

### Minor Changes

- ee38fd6: Add `svgCode` to `RawFigmaNode`/`FigmaNode`, `flow`/`widthSizing`/`heightSizing`/`strokeSide` to `CommonStyles`, and named `Position`/`Size` types (replacing inline `{x, y}`/`{width, height}`). Read `flow`, sizing modes, and stroke-side from the inspection panel's Width/Height and Border labels.

  Rename the exported `FigmaGateway` type to `FigmaNodeSource` — update imports accordingly.

- ee38fd6: Capture the style fields that were already declared in the model but never read from the inspection panel: `strokeWeight`/`strokes`, padding (`paddingTop/Right/Bottom/Left`), `itemSpacing`, `effects` (new `FigmaEffect` type), and extended typography (`style` variant name, `letterSpacing`, `textAlignHorizontal`, `textAlignVertical`). Also fix `cornerRadius` reading the wrong panel label (the property is named `"Radius"`, not `"Corner radius"`).

  Capture TEXT nodes that never appear in Figma's layer tree, even after exhaustive expansion retries, by selecting the parent and pressing Enter to reveal the hidden TEXT child. The revealed node is added to the output tree as a real child with its own id, size, and styles, instead of being merged into the parent's fields.

- ee38fd6: Extract `FigmaAssetCapturer` from the Playwright gateway, so PNG/SVG capture via the export panel is separate from tree traversal.

  Rename the exported `PlaywrightFigmaGateway` class to `PlaywrightFigmaNodeSource` (and its source file) — update imports accordingly.

### Patch Changes

- bec2b2a: Fix the scraped tree stopping at every component instance (`Instance` node), because `expandAndListChildren` only recognized a row as a child when its indentation was exactly the parent's plus one — Figma indents an instance's own content at the same level as the instance itself, so that check never matched and the child rows were dropped.
