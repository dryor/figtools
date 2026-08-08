# ADR-pending-decisions

Tracks requirements from the specs that are known gaps in the current
implementation, where the mechanism to close them hasn't been decided yet.
Each entry states what's missing, why it isn't a postmortem (nothing failed
— it was scoped out or deferred), and the candidate mechanisms considered
so far, without picking one.

## ~~`image` is declared in the contract but never implemented~~ — resolved

Fixed in PR #49 (`feat/figma-image-svg-opt-in`, commits `f8794ab` and
`fc3a83e`): neither candidate mechanism below was picked — a third option,
Figma's own export panel (already open in the same Playwright session),
turned out to work without needing a second auth path or canvas-coordinate
math. `FigmaAssetCapturer.captureImage()`
(`panel-readers/figma-asset-capturer.ts`) adds a temporary export setting
to the selected node's properties panel, downloads it in the requested
format, then removes the setting to leave the node clean.
`PlaywrightFigmaNodeSource.readSelectedNodeData()` calls it behind
`shouldCaptureImage(request)`, gated on the caller opting in via
`request.image.enabled` — image capture isn't free, so it stays off by
default rather than paid on every node unconditionally. The same export
panel is reused for `svgCode` (`captureSvgCode`, gated by
`request.icons.enabled` and `canExportAsSvg(type)`), which didn't exist
as a separate requirement when this entry was first written.
Left here struck through rather than deleted, so the reasoning that led to
the fix stays discoverable from this file.

## Text content of TEXT nodes (`characters`) — mechanism confirmed, with known limits

Originally recorded here as fully unconfirmed (no TEXT node had been found
in either file explored at the time). A real TEXT node was later found
(`HThrmBFcF8JMNq4q6d8C4T`/Empresa-Inc., node `2:174`, content "Consulta de
Personas", nested under a "Heading 2" auto-layout parent, `2:173`), which
revealed something stronger than "the selector wasn't confirmed": that
node **never appears in the layers panel tree at all**, not even after
retrying `expandAndListChildren`'s full budget on its parent — confirmed
by tracing a real 116+-node traversal where `2:173` consistently reported
`aria-expanded=true` with zero child rows rendered, attempt after attempt.

The mechanism that does work, confirmed on two different real nodes
(`2:173→2:174` and `2:20→2:21`): with the parent row already selected
normally, pressing `Enter` drills Figma's own canvas selection into the
hidden TEXT child — no screen coordinates needed (ruling out the
double-click-on-canvas approach considered earlier, which would have been
*less* stable than the rest of this codebase's selectors, not more, since
it'd depend on x/y position, zoom, and scroll). `Escape` does **not**
restore the parent's selection (confirmed: it deselects everything), so
the caller must re-click the parent's own row afterward to keep working.

The revealed child isn't just readable for `characters` — confirmed on a
real node ("Heading 1" → hidden TEXT child "Empresa Inc."): it exposes its
own full properties panel (Layout with its own width/height, Content,
Typography — font/weight/size/line-height/letter-spacing/vertical
alignment — and Colors), the same shape any other node's panel has. The
reveal is ephemeral — the child goes back to being absent from the layers
panel tree once selection moves on — so there's no second chance to reach
it via a normal `readNode(childId)` recursion later; the implementation
(`PlaywrightFigmaGateway.readHiddenTextChild`) reads all of its fields
(id/name/type/size/styles/characters) in full *while it's still selected*,
and adds it as a **real node** under the parent's `children` — not folded
into the parent's own `characters`/`styles`, which was the first design
tried and rejected once the earlier real-session check showed how much
data that approach was silently dropping (Typography, Colors, its own
Layout).

Implemented behind a cost-gated condition
(`shouldAttemptHiddenTextRead` in `playwright-figma-gateway.ts`): only
attempted when the node has no children found by the normal mechanism,
and the active `PanelReader` confirms support (`supportsHiddenTextChild()`
— `true` for `InspectionPanelReader`, `false` for `EditModePanelReader`,
since this was never verified in edit mode). Not gated on the node's own
`characters` — a node could in principle have real children *and* a
separately hidden TEXT child, an untested combination (see limits below).
This still costs one attempt per leaf node in inspection mode, since no
cheaper signal (e.g. by node `type`) could be confirmed with the evidence
available — a heuristic by type is a candidate for a future session with
more real nodes to test against, not implemented now.

Limits of the evidence, not yet resolved:

- Only verified with exactly one hidden TEXT child per parent. A parent
  with more than one hidden TEXT child, or a mix of hidden TEXT and
  non-TEXT children under a parent with no caret, wasn't tested — the
  current mechanism doesn't attempt to distinguish those cases and would
  only ever capture one child's text.
- Never verified in edit mode at all (no editor-permission session was
  available in this investigation).
- The layer's `name` as an approximation for `characters` (considered
  earlier) is no longer needed as a fallback now that the real mechanism
  works, but remains untested as a heuristic if this mechanism ever fails
  to find a selected row in time.

## ~~`expandAndListChildren` assumes children are always indented one level deeper~~ — resolved

Fixed in PR #29 (`fix/tree-truncated-at-instance-nodes`): the indentation
logic was pulled out into a standalone `findChildIds` function that takes
whatever indentation the first row after the parent has — `parentIndents`
or `parentIndents + 1` — as the children's level, instead of hardcoding
`+1`. Covered by 8 unit tests and verified against the same real session
that originally reproduced the bug (root node
`https://www.figma.com/design/sNTGmFfSPm7S51VBed4PZR/Pok%C3%A9dex--Community-?node-id=1017-431`).
Left here struck through rather than deleted, so the reasoning that led to
the fix stays discoverable from this file.

## Selection/focus appears to jump backward while walking same-level Instance children

Not yet confirmed as a bug with a concrete consequence — this is a raw
observation to investigate further, not a diagnosed defect. Recorded here
so the reasoning isn't lost before the next session picks it up.

User's own description, verbatim (translated from Spanish): while running
the e2e test in the browser, watching the real recursive walk over the
Pokémon list — it reaches `List Item`, then enters `Number`, opens
`Number` and walks into the text — good, the previously reported bug is
resolved here. Then it goes to `Name`, opens `Name` and walks inside it —
good, also resolved here. Then it enters `Pikachu`, and inside it navigates
to the image — good, resolved here too. Here's where it gets strange: it
closes `Pikachu`, then goes back to `Name` to close `Name`, then moves on
to the next `List Item` — and sometimes at this point it goes back again
to `Pikachu` or `Name`.

This was investigated once already in this same session (see the
conversation this ADR came from) with two live diagnostics, both
inconclusive as *evidence of a real defect*:

- A `row-missing-at-read` / `row-missing-at-expand` trace over 200 real
  nodes found zero missing rows — no silent tree data loss detected from
  Figma's own re-virtualization of the layers panel (rows scrolling out of
  view don't disappear from Playwright's reach; `row.click()`/`.hover()`
  bring them back).
- A follow-up diagnostic on Pikachu's same-level child (`image`) found
  `size: { width: null, height: null }` in the final scraped data, which
  looked like a timing race with the properties panel at first — but
  turned out to be correct, documented behavior: `transform-width` /
  `transform-height` don't exist in the DOM at all for that node (an
  `Image` inside an auto-layout Fill/Hug container), matching the
  contract already noted in `model.ts`'s comment on `FigmaNode.size`
  ("null when the field doesn't exist for this node type/state ... as
  opposed to a real value of 0").

Neither diagnostic targeted the specific thing being reported here: the
selection/focus itself appearing to move backward (to an already-processed
sibling) during the return path of the recursion, specifically after
processing a same-level Instance child. The working hypothesis floated in
that conversation — that this is just the normal depth-first recursion
unwinding, visually coinciding with Figma's own layers-panel
re-virtualization — was **not verified against this specific
back-and-forth pattern**. It remains a hypothesis, not a confirmed
explanation.

Next step, not yet done: design a diagnostic that traces focus/selection
(not just row existence or panel field values) across the exact sequence
described — `List Item → Number → Name → Pikachu → image → back to
Pikachu (closes) → back to Name (closes) → next List Item → sometimes back
to Pikachu or Name again` — to see whether any read happens against the
wrong selected row during that backward movement, which is the scenario
that would actually corrupt data silently.

**Untested candidate cause, not yet compared against the trace above:**
`readHiddenTextChild` (see "Text content of TEXT nodes" below) also
changes Figma's active selection mid-recursion — it presses `Enter` to
drill into a hidden child, then `Escape`, which deselects everything
before the caller re-clicks the parent row. This runs once per leaf node
in inspection mode (gated by `shouldAttemptHiddenTextRead`), so it's a
real candidate for selection state bleeding into a sibling's read during
the backward-jump window — but no diagnostic has actually checked whether
the reported jumps coincide with a `readHiddenTextChild` attempt on a
neighboring leaf. Recorded here so the next session compares the two
instead of treating them as unrelated by default.

## E2e tests require too many env vars to be trustworthy as a real check

Not a bug — a gap in confidence. `playwright-figma-node-source.e2e.test.ts`
gates its five `describe` blocks on combinations of `FIGMA_TEST_CREDENTIAL`,
`FIGMA_TEST_FILE_KEY`/`FIGMA_TEST_NODE_ID`, `FIGMA_TEST_VIEW_FILE_KEY`/
`FIGMA_TEST_VIEW_NODE_ID`, `FIGMA_TEST_NO_PANEL_FILE_KEY`/
`FIGMA_TEST_NO_PANEL_NODE_ID`, and `FIGMA_TEST_HIDDEN_TEXT_FILE_KEY`/
`FIGMA_TEST_HIDDEN_TEXT_NODE_ID`/`FIGMA_TEST_HIDDEN_TEXT_PARENT_ID` (each
`Boolean(...)`-gated, `describe.skipIf(!RUN_X_MODE)`). Same pattern in
`inspection-panel-reader.e2e.test.ts`, hardcoded to one specific
`FILE_KEY`/`NODE_ID` instead of an env var. `CONTRIBUTING.md` already
flags the symptom ("no stable way to configure which Figma files/nodes
[the e2e tests] run against... don't rely on it yet") without naming this
as the cause.

Raised while adding the image/SVG opt-in feature (2026-08-01): running the
suite without every one of those env vars set doesn't fail — it silently
skips whichever blocks are missing their file/node keys, so `pnpm
test:e2e` can report all-green while having verified nothing beyond
whichever env vars happened to be exported that session. The only var
that should be structurally required is the session credential — the
specific files/nodes exercised are a fixture problem, not something the
person running the tests should have to supply by hand each time.

Candidate mechanisms, not yet decided:

- **Commit a fixed, stable Figma file** dedicated to fixtures (already
  partly done — `HThrmBFcF8JMNq4q6d8C4T`/Empresa-Inc. is reused across
  several tests and comments in this codebase) with the file/node keys
  hardcoded as constants instead of env vars, keeping only
  `FIGMA_TEST_CREDENTIAL` as an env var. Risk: the fixture file's content
  (specific nodes, hidden-text children, view-only permissions) has to
  stay stable indefinitely, and view-only/no-panel modes need a *second*
  account's session to set up realistically.
- **Resolve fixture nodes dynamically** (e.g. search the file for a node
  matching a type/name pattern at test-run time) instead of hardcoding
  ids, so the suite tolerates the fixture file being edited. Adds
  complexity and a new way for the suite to fail to find what it's
  looking for.
- **Other:** not explored yet.

Deliberately deferred, not implemented now — this session's scope was the
image/SVG opt-in feature plus documentation, not an e2e fixture redesign.

**Update — resolved for edit mode and view mode, still open for no-panel
mode.** `playwright-figma-node-source.e2e.test.ts` now hardcodes
`EDIT_MODE_FILE_KEY`/`EDIT_MODE_NODE_ID`
(`sNTGmFfSPm7S51VBed4PZR`/`1017:431` — the same file this document's
tree-truncation entry above was reproduced against, where the account
behind `figtools login` has editor access) and reuses
`VIEW_MODE_FILE_KEY`/`VIEW_MODE_NODE_ID`
(`HThrmBFcF8JMNq4q6d8C4T`/`2:5` — the same fixture
`inspection-panel-reader.e2e.test.ts` already hardcodes) instead of a second
dedicated file. Session comes from `CookieSessionStore` (the `figtools
login` flow), the same pattern `inspection-panel-reader.e2e.test.ts` already
used — `FIGMA_TEST_CREDENTIAL` and the rest of the `FIGMA_TEST_*` env vars
are gone from that file, and `playwright-login.e2e.test.ts` no longer gates
on `FIGMA_E2E_LOGIN` either, so `pnpm test:e2e` runs every suite by default.

The `RUN_HIDDEN_TEXT_MODE` scenario was removed rather than hardcoded: it
exercised the exact same `readHiddenTextChild` path that
`inspection-panel-reader.e2e.test.ts`'s own "Empresa Inc. (hidden TEXT
child)" suite already walks through in its `beforeAll`, with stronger
field-level assertions (exact color, exact typography) than the generic
`toBeTruthy()` checks the removed scenario had — keeping both was
duplicated coverage of the same code path, not two different checks.

No-panel mode stays open: no real file has ever been confirmed to reproduce
it (see the original note above — this was true from the start, not
something lost with the env vars). Its `describe` block was deleted rather
than left skipped, since there was nothing real to hardcode in its place —
this scenario has no e2e coverage today.

**Update — both files moved to full-tree fixture comparison.**
`inspection-panel-reader.e2e.test.ts` no longer has the four `describe`
blocks with per-field asserts described above (Aside, Empresa Inc., imagen
y SVG, Link Active) — it now runs two independent real fetches against the
same `FILE_KEY`/`NODE_ID`: one with `DEFAULT_FETCH_OPTIONS`, compared whole
against a committed fixture (`__fixtures__/inspection-mode-tree.json`) with
`toEqual`; another with image/icons enabled, which only checks that nodes
reporting `image`/`svgCode` have real, non-empty content — not compared
against any fixture, since PNG/SVG output isn't guaranteed byte-stable
between runs. The "Empresa Inc. (hidden TEXT child)" describe named above no
longer exists as such, but the mechanism it tested
(`readHiddenTextChild`) is still exercised implicitly: the fixture was
captured from a real `fetchNode` call against the same file/node, which
walks through that same code path to reach the hidden child. `find()`,
`findFirst()`, `hex()`, and the `canExportAsSvg` import were removed —
no longer needed once the check stopped depending on locating named nodes
by hand. `playwright-figma-node-source.e2e.test.ts` was updated the same
way in spirit: `testRequest()` (re-reading the session per test) was
replaced by a `beforeAll` that caches the session once, and the stray
`const gateway = new PlaywrightFigmaNodeSource()` — left over from when the
class was named `PlaywrightFigmaGateway` — was removed in favor of calling
`.fetchNode()`/`.fetchDefaultPage()` directly on a new instance. Both files
mark their `describe`/`it` blocks `.concurrent`, since no test depends on
another's result.

**Update — `readHiddenTextChild`'s 500ms wait was a real, reproducible bug,
now fixed with a retry, not a longer wait.** Running the two full-tree e2e
tests above for real (2026-08-05) surfaced actual data loss, not test
flakiness: comparing repeated real fetches of the same Empresa Inc.
file/node found up to 25 single-child containers ("Label", "Cell",
"Background", "Data" — a form/table with many of these) whose one child
(a hidden TEXT or Icon) was present in one fetch and silently missing in
the next, content otherwise identical. First attempt — bumping the
`selectedRow.waitFor` timeout from 500ms to 2000ms — made no difference
(still ~10-25 containers wrong per fetch), including in fully sequential,
single-browser runs, which rules out CPU contention from `.concurrent`
tests as the cause. The actual fix: retry the whole Enter-press sequence
up to 4 times, re-clicking the parent row before each attempt, mirroring
the resilience pattern `expandAndListChildren` already used for the
analogous "empty read right after an action" problem. Confirmed twice
against the real file (once serial, once `.concurrent`): two consecutive
fetches now produce byte-identical trees (177/177 nodes matching). See the
updated comment on `readHiddenTextChild` in `playwright-figma-node-source.ts`.

The retry is a confirmed, necessary mitigation for that data loss — not a
fully explained root-cause fix. Why any single Enter-driven attempt is
unreliable in the first place is still open — see "Why a single
Enter-drill attempt in `readHiddenTextChild` is unreliable" below.

**New finding — Instance-descendant node ids are not stable across
fetches, and this is expected Figma behavior, not a bug.** Comparing two
sequential real fetches of `EDIT_MODE_NODE_ID` (`1017:431`, an `Instance`
in the Pokédex file) found 75 of 76 descendant ids changed between fetches
— always the same suffix, prefix incremented by one (e.g. `1301:843` →
`1302:843`). Non-id fields (name, type, position, size, styles, structure)
stayed identical. Figma appears to assign descendants of an `Instance` a
fresh id scoped to that particular expansion rather than a permanent one;
only the instance's own root id (the one actually requested) stays stable.
`playwright-figma-node-source.e2e.test.ts`'s edit-mode-node test now
strips `id` recursively (`stripIds`) before comparing that one fixture,
same principle as excluding `image`/`svgCode` bytes elsewhere — one field
known not to be reproducible, verified by shape/consistency instead of
exact value. The other two node-source scenarios (default page, view mode)
don't touch an `Instance` root and compare `id` normally.

## Why a single Enter-drill attempt in `readHiddenTextChild` is unreliable

Not fixed — worked around. The retry loop added to `readHiddenTextChild`
(see the update above and the comment in `playwright-figma-node-source.ts`)
reliably stops the data loss it was built to fix, confirmed twice against
the real file (177/177 nodes matching, once serial and once `.concurrent`).
But *why* a single attempt fails intermittently in the first place was
never answered — the retry works around it, it doesn't explain it.

One narrower hypothesis was tested and ruled out: that keyboard focus
drifts off the layers-panel row before `Enter` is pressed, since
`readSelectedNodeData` reads several fields from the *properties* panel
immediately before this method runs. If that were the whole story, a
single explicit click on the parent row right before `Enter` — no retry —
should have fixed it. Tried exactly that (2026-08-06): one click, one
`Enter`, no loop. Result was worse than the original 500ms/no-click
version, not better — 20 changed nodes and the total node count came back
132-136 across two concurrent fetches, against a confirmed-correct 177.
So it isn't (only) a focus problem — multiple independent attempts are
doing real work, not just incidentally adding a click.

What's left unexplained: something about how Figma's own web app responds
to a synthetic `Enter` keypress for this specific "drill into hidden
child" interaction is closer to a coin flip than a slow-but-consistent
reaction. Candidate causes, none confirmed:

- Figma's own event handling for this interaction has genuine internal
  timing variance, independent of anything in this codebase.
- Playwright's CDP-level keyboard event dispatch isn't always processed
  identically to real hardware input for this specific interaction.
- Something about the previous panel reads leaves Figma's own UI in a
  state where the next `Enter` is dropped, distinct from a plain focus
  problem (the ruled-out hypothesis) — not identified.

Answering this needs live DOM/devtools inspection during an in-progress
failure — repeated black-box before/after fetches can confirm *that* it
fails and *that* retrying fixes it, but not observe *why* a given attempt
was dropped. Not something to chase blind against production Figma
without that tooling attached.

## ~~Color is stored as `{r, g, b}`, not hex~~ — resolved

Raised while writing golden-fixture comparisons for the e2e suite above: a
failing `toEqual` on a color today shows a diff on `color.r`/`color.g`/
`color.b` as separate numbers, not a recognizable value like `"#F2F3F8"`
(what the previous per-field assertions, e.g. `hex(node.styles.fills[0]
.color)`, used to produce). vitest still points at the exact field path
that changed, but the value itself is harder to eyeball than a hex string.

Fixed by changing `FigmaColor` (`packages/core/src/figma/model.ts`) to
`{ hex: string; a: number }`, replacing `r`/`g`/`b` rather than adding `hex`
alongside them — no production code read `r`/`g`/`b` individually except
the one formatter being replaced, so keeping them would have been redundant
derivable data with no reader. A serializer-based workaround
(`expect.addSnapshotSerializer`) was considered and ruled out first: it only
affects `toMatchSnapshot()`, not `toEqual()`, so it wouldn't have touched
the actual failing assertions.

Both color constructors were updated:
`hexToColor` (`inspection-panel-reader.ts`) already received a hex string
from the panel, so it now just normalizes and returns it directly, no
`parseInt` needed. `parseRgbaColor` (`edit-mode-panel-reader.ts`) still
parses the DOM's `rgba(...)` fill attribute (the only signal that panel
exposes) but converts to hex via a local `rgbToHex` helper before
returning. The one production consumer, `colorToHex` in
`packages/cli/src/output/markdown-writer.ts`, is now a trivial `formatColor`
that reads `color.hex` directly instead of computing it.

Since `FigmaColor` is exported from `@figtools/core`'s public API, this is
a breaking type change — recorded in `.changeset/figma-color-hex.md` as a
`minor` bump for both packages, matching this pre-1.0 repo's existing
precedent (`.changeset/figma-image-svg-opt-in.md`) of bumping minor rather
than major for public-type changes. The 4 committed golden e2e fixtures and
the checked-in example output were migrated with a throwaway script (not
committed) that mechanically rewrote every `{r,g,b,a}` color object to
`{hex,a}` using the same formula as `rgbToHex` — they couldn't be
regenerated from a real Figma session in this environment, so this was a
data migration, not a re-fetch. Left here struck through rather than
deleted, so the reasoning that led to the fix stays discoverable from this
file.
