---
name: docs
description: Helps write or update the README of a project or module, applying the "Docs for Developers" framework (Bhatti, Corleissen, Lambourne, Nunez, Waterhouse) — first understanding who will read it and for what purpose, completing the book's standard content template, and running the draft through its 4 editing reviews before considering it done. Use WHENEVER the user asks to write, update, or review a README, or mentions technical documentation for a repository or module — even without naming the command.
---

# /docs — README and technical documentation

## What it does
Helps write or update a README applying the *Docs for Developers* process: first identifies who will read it and what they need, then completes the book's standard content template, and finally runs the draft through the 4 editing reviews before considering it done.

## Why ask about the reader before writing
A README written without a concrete reader in mind tends to mix audiences — it explains installation to someone who already did it, or omits the "why" for someone just arriving. The book calls this "the curse of knowledge" (Chapter 1): whoever writes already knows too much about the project to notice what's missing for someone who doesn't know it. Asking the goal (evaluate whether to use the project? install it for the first time? contribute code?) avoids that bias before anything gets written.

## Input
- Required: the code or project to document (or the existing README, if this is an update).
- Optional: who it's aimed at (end user, another team developer, external contributor) — if not evident from context, ask before writing.

## Process
1. Ask the README's goal and who will read it, if not evident from context.
2. Complete the book's standard template (Chapter 2, "Planning your documentation"): high-level summary of what the code does and why it exists, Installation, Examples, Troubleshooting, Changelog, Additional resources, License. Not all sections always apply — use the goal defined in step 1 to include only the relevant ones, not the full template by inertia.
3. When writing the Examples section, follow the sample code principles from Chapter 5: explained (not just pasted without context), concise, clear, usable/extensible as-is, and reliable (actually runs if someone copies it).
4. Write with skimming in mind (Chapter 3): most important information first, short paragraphs, descriptive headers, lists instead of dense prose where applicable.
5. Before delivering the draft, run through the 4 editing reviews from Chapter 4: technical accuracy (do the commands/examples work exactly as written?), completeness (is anything the target reader needs missing?), structure (does the order match what the reader expects to find first?), clarity and brevity (can the same thing be said with fewer words?).

## Output format
```
# [Project name]

[One or two paragraphs: what the code does at a high level and why it exists]

## Installation
1. ...

## Examples
...

## Troubleshooting
...

## Changelog
...

## Additional resources
...

## License
...
```

## Example
**Input:** "I need the README for figma-scrapper for a team member who will be running it locally for the first time."

**Output (excerpt):**
```
# figma-scrapper

figma-scrapper connects the Figma panel with the project's backend to
read design layers and generate the corresponding data model.

## Installation
1. `pnpm install`
2. Copy `.env.example` to `.env` and fill in `FIGMA_TOKEN`
3. `pnpm dev`

## Examples
...
```

## References
**Before continuing with the Process, read the full content of each of the following files — do not assume their content from the title.**

- `.claude/knowledge/buenas-practicas-ingenieria/docsForDevelopersAnEngineerSFieldGuideToTechnical.txt` — Bhatti, Corleissen, Lambourne, Nunez, Waterhouse. Chapter 1 (understanding the audience), Chapter 2 (README template, p. 27), Chapter 3 (writing for skimming), Chapter 4 (the 4 editing reviews), Chapter 5 (sample code principles).
