---
"@figtools/core": minor
---

Capture the style fields that were already declared in the model but never read from the inspection panel: `strokeWeight`/`strokes`, padding (`paddingTop/Right/Bottom/Left`), `itemSpacing`, `effects` (new `FigmaEffect` type), and extended typography (`style` variant name, `letterSpacing`, `textAlignHorizontal`, `textAlignVertical`). Also fix `cornerRadius` reading the wrong panel label (the property is named `"Radius"`, not `"Corner radius"`).

Capture TEXT nodes that never appear in Figma's layer tree, even after exhaustive expansion retries, by selecting the parent and pressing Enter to reveal the hidden TEXT child. The revealed node is added to the output tree as a real child with its own id, size, and styles, instead of being merged into the parent's fields.
