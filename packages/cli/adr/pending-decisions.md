# Pending decisions — packages/cli

This document records architecture decisions that haven't been made yet
for `@figtools/cli`, unlike [`ADR-figtools-cli.md`](./ADR-figtools-cli.md),
which documents what's already been decided and implemented. Each entry
describes the current state, the options evaluated, and the open question
that still needs answering before deciding.

There are no open entries right now. The argument-parsing question that
used to be entry 1 here (manual parsing vs. adopting a library) was
resolved by adopting `commander` — see the "Argument parsing library —
commander, wrapped to stay pure" section in
[`ADR-figtools-cli.md`](./ADR-figtools-cli.md).

## How to add a new decision to this document

Every new entry should have this shape: current state (verifiable facts,
with file and line references), options evaluated with their tradeoffs,
the open question still needing an answer, and what happens if the
decision keeps not being made.
