---
"@figtools/cli": patch
---

Fix the markdown output dropping position, size, and styles (fills, strokes, corner radius, opacity, typography) for every node — the generated `.md` files only ever showed `name` and `type`, even though that data was already being scraped.
