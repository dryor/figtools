---
"@figtools/core": patch
---

Fix the Figma URL host check in `parseFigmaUrl` using `hostname.endsWith("figma.com")`, a substring check a host like `evil-figma.com` could satisfy without being Figma's domain. Now checks for an exact `figma.com` host or a proper `.figma.com` subdomain.
