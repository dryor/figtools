---
"@figtools/core": patch
---

Fix silent data loss in `PlaywrightFigmaNodeSource` when reading a TEXT/Icon child hidden from Figma's layers panel: the Enter-driven drill-down (`readHiddenTextChild`) sometimes failed to register on the first attempt, causing the hidden child to be dropped from the scraped tree without any error. Confirmed by comparing repeated real fetches of the same file/node: a longer wait alone didn't help, and the failure showed up even in fully serial (non-concurrent) runs. Now retries the click+Enter sequence up to 4 times before giving up, matching the retry pattern `expandAndListChildren` already uses for the same class of "empty read right after an action" problem.
