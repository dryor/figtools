---
name: create-tests
description: Creates tests with Storybook + Playwright + Vitest from the acceptance criteria of a Gauge spec. Use WHENEVER an acceptance spec exists and automated tests need to be generated, or the user mentions tests, Storybook, Playwright, or Vitest — even without naming the command.
---

# /create-tests — Tests based on acceptance criteria

## What it does
Creates tests from the acceptance criteria of `/bdd`, using Storybook + Playwright + Vitest (via their Storybook integration plugins).

## Input
The Gauge spec from `/bdd` — not the isolated component (those stories are already created by `/view-implementation`).

## Selectors — accessibility first, always
Tests must depend on the spec (behavior observable by the user), not on the implementation. Follow this priority hierarchy — the same one recommended by Testing Library and Playwright — from start to finish, without skipping steps:

1. `getByRole` (with `name`) — always the first option
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`
5. `getByDisplayValue`
6. `getByAltText`
7. `getByTitle`
8. `getByTestId` — last resort, only when the element genuinely has no accessible role or name

Never use `data-testid` (or similar custom attributes) as the default or to read content/order of a list — use roles (`getByRole('list', { name })`, `getByRole('heading', { name })`, etc.). If a role/label selector doesn't find the element, it's a signal that the component needs an accessibility fix (label, role, accessible name), not that a `data-testid` needs to be added.

## Interactions with async state (debounce, Suspense, promises)
If the component uses React async primitives (`useDeferredValue`, `startTransition`, `use()` + `Suspense`, or any state that resolves in a microtask outside the synchronous event), wrap the user interaction (`userEvent.type`, `userEvent.click`) in `await act(async () => { ... })` (imported from `react`) so that deferred update resolves within the same act — otherwise assertions may intermittently read a DOM in an intermediate state. Use `waitFor` as an additional net for assertions that depend on an async side-effect (e.g., verifying how many times a mock was called).

## References
No book in the library specifically covers Storybook, Playwright, Vitest, or Testing Library — these 3 are general unit testing/TDD principles, not the exact tooling this skill requires.

**Before continuing with the Process, read the full content of each of the following files — do not assume their content from the title.**

- `.claude/knowledge/buenas-practicas-ingenieria/theArtOfUnitTestingThirdEdition.txt` — Osherove & Khorikov: unit test structure, use of test doubles (mocks/stubs), general principles applicable even though the book doesn't use Testing Library.
- `.claude/knowledge/buenas-practicas-ingenieria/testDrivenDevelopmentByExample.txt` — Kent Beck: red-green-refactor cycle, useful as a principle even though this skill generates tests from an existing spec (not following strict TDD).
- `.claude/knowledge/buenas-practicas-ingenieria/introductionToSoftwareTesting.txt` — Ammann & Offutt: general coverage criteria and test case design.

## Example
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { Component } from '.';
import type { Pokemon, PokemonSearchService } from './PokemonSearchService';

const ALL_POKEMONS: Pokemon[] = [{ name: 'pikachu', type: 'electric', number: 25 }];

function makeService(pokemons: Pokemon[]): PokemonSearchService {
  return { search: async (q) => pokemons.filter(p => p.name.includes(q.toLowerCase())) };
}

function createStoryRouter(service: PokemonSearchService) {
  return createMemoryRouter([{ path: '/', loader: () => ({ service }), Component }], { initialEntries: ['/'] });
}

const meta: Meta = { title: 'Routes/Pokedex/SearchPokemon', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;

export const SearchPokemonByExactName: Story = {
  render: () => <RouterProvider router={createStoryRouter(makeService(ALL_POKEMONS))} />,
  play: async ({ canvas, userEvent }) => {
    // getByRole first — not getByTestId. The input is a searchbox with an accessible name.
    const input = canvas.getByRole('searchbox', { name: 'Search Pokémon by name' });
    await userEvent.type(input, 'pikachu');
    await expect(await canvas.findByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
  },
};
```
