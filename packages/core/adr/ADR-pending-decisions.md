# ADR-pending-decisions

Tracks requirements from the specs that are known gaps in the current
implementation, where the mechanism to close them hasn't been decided yet.
Each entry states what's missing, why it isn't a postmortem (nothing failed
— it was scoped out or deferred), and the candidate mechanisms considered
so far, without picking one.

## `image` is declared in the contract but never implemented

Not a bug in the original decision: the `image: File | null` type was
declared correctly from the start in
[ADR-figtools-core](./ADR-figtools-core.md), and both spec scenarios
("Get a specific node from a Figma design with edit permission" and
"...with read-only permission" in
[`specs/get_figma_information.spec`](../specs/get_figma_information.spec))
explicitly require the returned node to include "a representative image".
The gap is that this requirement was never resolved with a mechanism
decision — it was left out of scope from the start.

`PlaywrightFigmaGateway.readNode()` hardcodes `image: null` for every node,
with the comment: "Requires Figma's image export API; that flow was never
designed, so it's left unresolved for now." Confirmed by running against a
real session (`experiments/pokedex/docs.json`): every node, including
component instances with no children of their own (e.g. an icon inserted
as an `Instance`), comes back with `image: null` — there's no case where
the field gets populated.

Candidate mechanisms, not yet decided:

- **Figma Image Export REST API** (`GET /v1/images/:file_key`): requires
  resolving how to authenticate that call within the current
  `FigmaSession` (`credential`, today serialized cookies) — Figma's REST
  API normally expects a personal access token, a different mechanism from
  the browser session `PlaywrightFigmaGateway` already uses. Returns an
  image faithful to Figma's actual render (PNG/SVG/PDF), but introduces a
  second authentication path alongside the Playwright session.
- **Playwright screenshot of the node's canvas area:** reuses the same
  browser session already open, with no extra auth mechanism needed.
  Depends on being able to locate the node's canvas coordinates (zoom,
  scroll, position) to crop the right region — more fragile to changes in
  Figma's UI layout than to changes in its API.
- **Other:** not explored yet.

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
