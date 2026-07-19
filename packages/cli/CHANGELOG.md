# @figtools/cli

## 0.2.0

### Minor Changes

- 7208ebd: Replace manual argument parsing with `commander`. Adds `--help` and `--version`, validates `--format` against `json`/`markdown` (previously an invalid value silently fell back to `json`), and rejects unknown flags explicitly instead of ignoring them. The `login` subcommand and the default `figtools <urls...> [flags]` invocation keep working exactly as before.
