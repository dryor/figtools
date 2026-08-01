---
"@figtools/cli": patch
---

Fix the CLI silently doing nothing (exit code 0, no output) when installed through a symlinked bin — which is how pnpm always installs it, and how npm/yarn install global binaries. The entry-point guard compared `process.argv[1]` (the symlink path) against `import.meta.url` (the resolved real path), which never matched under a symlink, so `main()` was never called. The guard now compares real paths on both sides.
