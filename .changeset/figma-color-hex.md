---
"@figtools/core": minor
"@figtools/cli": minor
---

`FigmaColor` is now `{ hex: string; a: number }` instead of `{ r, g, b, a }` — update any code constructing or reading FigmaColor's r/g/b fields directly.
