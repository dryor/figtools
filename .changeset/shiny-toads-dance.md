---
"@figtools/core": minor
---

Extract `FigmaAssetCapturer` from the Playwright gateway, so PNG/SVG capture via the export panel is separate from tree traversal.

Rename the exported `PlaywrightFigmaGateway` class to `PlaywrightFigmaNodeSource` (and its source file) — update imports accordingly.
