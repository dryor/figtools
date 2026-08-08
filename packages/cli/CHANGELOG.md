# @figtools/cli

## 0.4.0

### Minor Changes

- b5e59d3: `FigmaColor` is now `{ hex: string; a: number }` instead of `{ r, g, b, a }` — update any code constructing or reading FigmaColor's r/g/b fields directly.
- e4c408d: Make image and icon (SVG) capture opt-in instead of always-on. Each capture is a full Figma export-panel round-trip per node — a real cost on large trees — so both now default to off. `FigmaNodeSource.fetchNode`/`fetchDefaultPage` take a single `FigmaFetchRequest` (session + `FigmaFetchOptions`) instead of a separate `session` parameter — update any custom `FigmaNodeSource` implementation or direct caller. `resolveUrl(url, overrides?)` accepts the new options; the CLI adds `--images`/`--icons` flags to opt in.

  Also fixes `--image-format`/`imageFormat`: `"webp"` was never a real option Figma's export panel offers (PNG/JPEG/PDF only) and silently produced PNG bytes under a `.webp` extension — `ImageFormat` is now `"png" | "jpg" | "pdf"`, and image capture actually requests the given format from Figma instead of always capturing PNG regardless of the flag.

### Patch Changes

- Updated dependencies [b5e59d3]
- Updated dependencies [be16ac5]
- Updated dependencies [e4c408d]
- Updated dependencies [cf625cf]
  - @figtools/core@0.3.0

## 0.3.1

### Patch Changes

- 57b4936: Fix the CLI silently doing nothing (exit code 0, no output) when installed through a symlinked bin — which is how pnpm always installs it, and how npm/yarn install global binaries. The entry-point guard compared `process.argv[1]` (the symlink path) against `import.meta.url` (the resolved real path), which never matched under a symlink, so `main()` was never called. The guard now compares real paths on both sides.

## 0.3.0

### Minor Changes

- ee38fd6: Write each node's captured SVG to a `.svg` file when present, and write markdown output to `slug/index.md` instead of `slug.md` so every node gets its own directory. Add an `--image-format` flag (`png` by default, `svg`) to choose which format gets captured.

### Patch Changes

- Updated dependencies [ee38fd6]
- Updated dependencies [ee38fd6]
- Updated dependencies [ee38fd6]
- Updated dependencies [bec2b2a]
  - @figtools/core@0.2.0

## 0.2.1

### Patch Changes

- 52ca094: Fix the markdown output dropping position, size, and styles (fills, strokes, corner radius, opacity, typography) for every node — the generated `.md` files only ever showed `name` and `type`, even though that data was already being scraped.

## 0.2.0

### Minor Changes

- 7208ebd: Replace manual argument parsing with `commander`. Adds `--help` and `--version`, validates `--format` against `json`/`markdown` (previously an invalid value silently fell back to `json`), and rejects unknown flags explicitly instead of ignoring them. The `login` subcommand and the default `figtools <urls...> [flags]` invocation keep working exactly as before.
