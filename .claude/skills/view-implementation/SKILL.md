---
name: view-implementation
description: Creates the view implementation of a feature, from a Figma file, a reference page, or photos, respecting the approach defined in the feature's ADR. Detects and reuses already existing components from the catalog before creating new ones, and generates an isolated Storybook story for the component. Use WHENEVER a reference design exists and UI components need to be built, or the user mentions Figma, mockup, wireframe, or view — even without naming the command.
---

# /view-implementation — View implementation

## What it does
Creates the view implementation of a feature. Takes as input Figma, a reference web page, or photos — whatever is available — and does its best with what it receives. Also reads the feature's `ADR.md`, because that's where the approach the view must respect lives (for example, a debounce strategy).

## Why check the catalog before creating
Creating a new component when an equivalent one already exists duplicates work and fragments the design system. Checking first avoids that — and when a new one does need to be created, its isolated story is documented so the next case finds it.

## Input
- Required: Figma, reference page, or photos.
- Required: the feature's `ADR.md`.

## Process
0. If the feature's `ADR.md` doesn't exist yet, stop and say so explicitly instead of improvising the view approach without that foundation — suggest running `/model` first.
1. Review the component catalog / existing source code before creating anything new.
2. If the component doesn't exist, create it, respecting the ADR approach.
3. Create an isolated Storybook story for that presentational component — this story is this skill's responsibility, not `/create-tests` (those are based on the `/bdd` spec, not on the isolated component).
4. Leave the component in use within the real page.

## References
**Before continuing with the Process, read the full content of each of the following files — do not assume their content from the title.**

- `.claude/knowledge/design-systems/adaptiveWebDesignCraftingRichExperiencesWith.txt` — Adaptive Web Design: Crafting Rich Experiences with (Aaron Gustafson)
- `.claude/knowledge/design-systems/buildingDesignSystemsUnifyUserExperiencesThroughA.txt` — Building Design Systems : Unify User Experiences Through a (Sarrah Vesselov, Taurie Davis)
- `.claude/knowledge/design-systems/designSystemsForDevelopersLearnHowToCodeDesign.txt` — Design systems for developers: Learn how to code design (Michael Mangialardi)
- `.claude/knowledge/design-systems/designSystemsHandbook.txt` — Design Systems Handbook (Marco Suarez, Jina Anne, Katie Sylor-Miller, Diana Mounter,)
- `.claude/knowledge/design-systems/frontendArchitectureForDesignSystemsAModern.txt` — Frontend Architecture for Design Systems : A Modern (Godbolt, Micah)
- `.claude/knowledge/design-systems/layingTheFoundationsABookAboutDesignSystems.txt` — Laying the Foundations: A book about design systems (Andrew Couldwell, Meagan Fisher Couldwell (editor))
- `.claude/knowledge/design-systems/ulDesignSystemsMastery.txt` — Ul Design Systems Mastery (Budarina M.)

- `.claude/knowledge/lenguajes-programacion-js-ts/advancedReactDeepDivesInvestigationsPerformance.txt` — Advanced React: deep dives, investigations, performance (Nadia Makarevich)
- `.claude/knowledge/lenguajes-programacion-js-ts/effectiveTypescript83SpecificWaysToImproveYour.txt` — Effective Typescript : 83 Specific Ways to Improve Your (Dan Vanderkam;)

## Example
**Output — component:**
```tsx
// PokemonSearchBar.tsx
import { useState, useEffect } from 'react';
import type { PokemonSearchService, Pokemon } from './PokemonSearchService';

interface Props {
  searchService: PokemonSearchService;
  onResults: (pokemons: Pokemon[]) => void;
}

export function PokemonSearchBar({ searchService, onResults }: Props) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    // Approach defined in ADR-pokemon-search: 300ms debounce
    const timeout = setTimeout(() => {
      if (query.trim()) searchService.search(query).then(onResults);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, searchService, onResults]);
  return <input aria-label="Search Pokémon by name" value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

**Output — isolated story:**
```tsx
// PokemonSearchBar.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PokemonSearchBar } from './PokemonSearchBar';

const meta: Meta<typeof PokemonSearchBar> = { title: 'Components/PokemonSearchBar', component: PokemonSearchBar };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { searchService: { search: async () => [] }, onResults: () => {} } };
```
