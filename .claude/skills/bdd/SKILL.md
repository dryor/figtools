---
name: bdd
description: Helps create and refine acceptance criteria in Gauge format, starting from a User Story or a draft already written in Gherkin — converting it and completing missing scenarios through questions to the user. Use WHENEVER the user asks to create acceptance criteria, specify the behavior of a feature before implementing it, writes or pastes a Gherkin feature, or mentions BDD, Gauge, user stories, or acceptance scenarios — even if not explicitly requested by the command name.
---

# /bdd — Acceptance criteria

## What it does
Helps convert a User Story (or a draft already written in Gherkin) into acceptance criteria in Gauge format, and uses directed questions to the human to complete missing scenarios — empty cases, error cases, and behavior not explicitly specified.

## Why ask instead of assume
A User Story almost always leaves several behavioral decisions implicit: what happens if the input is empty, if there's an error, if the action is repeated. Converting those implicit decisions into explicit questions prevents them from being resolved by accident, in the code, without anyone having deliberately decided them. This is the core purpose of the skill — it's not a formatter, it's an interview.

## Input
- **Required:** a User Story, or a draft of scenarios already written in Gherkin (`Feature:` / `Scenario:` / `Given-When-Then`).
- **Optional:** a visual reference (Figma, screenshot, or web page). Use it only if the User Story arrives incomplete, to infer expected behavior with best effort. Don't ask for it if not needed — it's a support, not a requirement.

## Process
1. If the input is already a Gherkin draft, translate it to Gauge format preserving the exact meaning of each scenario — do not reinterpret the behavior, only change the syntax.
2. Identify which categories of edge cases are likely missing: empty input, invalid input, error messages, and — when the nature of the operation warrants it (e.g., operations that can be repeated with the same input) — determinism/idempotence.
3. Ask the human about each detected gap instead of inventing the answer. A direct question is worth more than a guessed scenario.
4. With the answers, write or complete the spec in Gauge.

## References
**Before continuing with the Process, read the full content of each of the following files — do not assume their content from the title.**

- `.claude/knowledge/bdd/bddInAction2ndEditionMeapV13.txt` — Smart & Molak, *BDD in Action* (2nd ed.). Chapters 5-6 (describing and illustrating features with concrete examples) and chapter 7 (from examples to executable specifications) are the process this skill follows when converting a User Story into Gauge scenarios.

## Output format
Always use this structure:
```
# [Feature name]

## [Scenario in short phrase, present tense]
* [step]
* [step]

## [Next scenario]
* [step]
```

## Example

**Input:** User Story: "As a user I want to search for a Pokémon by name to see its information quickly."

**Output:**
```
# Search Pokémon by name

## Exact search finds the Pokémon
* The user searches for "pikachu"
* The system shows Pikachu's card

## Search with no results
* The user searches for "xyz123"
* The system shows "No results found"
```
