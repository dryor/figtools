# Releasing figtools

Releasing is split into two independent steps, each its own manual GitHub Actions workflow: **versioning** bumps version numbers and writes changelogs; **publishing** builds and pushes to npm. They never run as one — you version, review, then publish.

```mermaid
flowchart TD
    A([Make a change]) --> B[pnpm changeset]
    B --> C[Commit the .changeset/*.md file]
    C --> D{{Run #quot;Bump Versions#quot; workflow}}
    D --> E[changesets bumps versions<br/>+ writes changelogs]
    E --> F[[PR: chore: version packages]]
    F --> G{Review &amp; merge PR}
    G --> H{{Run #quot;Publish Packages#quot; workflow}}
    H --> I[changeset status guard<br/>then build]
    I --> J[Publish core, then cli]
    J --> K([Live on npm])

    subgraph version [Step 1 · Bump Versions · release.yml]
        D
        E
        F
    end
    subgraph publish [Step 2 · Publish Packages · publish.yml]
        H
        I
        J
    end
```

## Step by step

### 1. Describe the change

Run `pnpm changeset` at the repo root, select the affected packages, pick a bump level (patch / minor / major), and write a short summary. Commit the generated `.changeset/*.md` file.

```bash
pnpm changeset
git add .changeset
git commit -m "chore: add changeset for <description>"
```

### 2. Version — open the bump PR

Go to **Actions → Bump Versions** and click **Run workflow**. The workflow:

- Consumes all pending `.changeset/*.md` files
- Bumps the `version` field in each affected `package.json`
- Regenerates `CHANGELOG.md` for each package
- Opens a `chore: version packages` pull request

It does **not** publish anything.

### 3. Review and merge

Review the PR. The diff should show only version bumps and changelog entries. Merging lands the new versions on `main`.

### 4. Publish — push to npm

Go to **Actions → Publish Packages** and click **Run workflow**. You can choose to publish only `core`, only `cli`, or both.

The workflow:

1. Guards against unpublished changesets (`changeset status`) — if any `.changeset/*.md` files are still pending, it stops. Run the version step first.
2. Builds all packages.
3. Publishes `@figtools/core` first.
4. Publishes `@figtools/cli` second (`cli` depends on `core` via `workspace:*`, which pnpm rewrites to the real version on pack).

## Notes

- **Internal dependency sync.** When `core` bumps, `cli` automatically gets a `patch` bump pointing at the new `core` version (`updateInternalDependencies: "patch"` in `.changeset/config.json`).
- **NPM_TOKEN.** Publishing requires an `NPM_TOKEN` secret in the repository settings with publish access for the `@figtools` scope.
- **No force-push to npm.** If you need to republish an already-published version, bump the version first.
