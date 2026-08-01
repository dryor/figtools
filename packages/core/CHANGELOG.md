# @figtools/core

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
