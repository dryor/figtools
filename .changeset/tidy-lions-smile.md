---
"@figtools/core": patch
---

Fix the scraped tree stopping at every component instance (`Instance` node), because `expandAndListChildren` only recognized a row as a child when its indentation was exactly the parent's plus one — Figma indents an instance's own content at the same level as the instance itself, so that check never matched and the child rows were dropped.
