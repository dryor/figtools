---
name: full-implementation
description: Creates in a single step both the view implementation and the service interface with its in-memory stub — the combined equivalent of /view-implementation + /placeholder-implementation. Use when a single person (or a single agent) will handle both parts without needing to run them separately.
---

# /full-implementation — View + service in one step

## What it does
It is the combined equivalent of `/view-implementation` + `/placeholder-implementation` in a single entry point — for when there's no need for two people or two agents to work on view and service separately in parallel. It has no logic of its own beyond those two commands; it produces the union of both outputs.

## References
Same references as `/view-implementation` and `/placeholder-implementation` — see those `SKILL.md` files.

## When to prefer this over the two separate commands
If the work is going to be done by a single person/agent end-to-end, this command avoids the overhead of invoking two skills separately. If instead two people are going to work on the view and the service in parallel, it's better to use `/view-implementation` and `/placeholder-implementation` separately.

## Example
Produces both files from the `/view-implementation` and `/placeholder-implementation` examples together: the component + its isolated story, and the service interface + its in-memory stub.
