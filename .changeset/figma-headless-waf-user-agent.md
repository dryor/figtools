---
"@figtools/core": patch
---

Run Figma scraping in headless Chromium instead of headed. Figma's CloudFront WAF was rejecting headless requests with a 403 because Chromium's default headless User-Agent contains the literal string "HeadlessChrome" — present even in the "new" headless mode, which otherwise renders identically to headed. Stripping just that substring from the User-Agent is enough to pass. This removes the dependency on a real X server/display that headless:false required, so scraping can now run on headless CI/servers.
