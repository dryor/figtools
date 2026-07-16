---
name: create-tests
description: Crea tests con Storybook + Playwright + Vitest a partir de los criterios de aceptación de un spec de Gauge. Usar SIEMPRE que exista un spec de aceptación y haga falta generar pruebas automatizadas, o el usuario mencione tests, pruebas, Storybook, Playwright, o Vitest — incluso sin nombrar el comando.
---

# /create-tests — Tests basados en criterios de aceptación

## Qué hace
Crea los tests a partir de los criterios de aceptación de `/bdd`, usando Storybook + Playwright + Vitest (vía sus plugins de integración con Storybook).

## Input
El spec de Gauge de `/bdd` — no el componente aislado (esas stories ya las crea `/view-implementation`).

## Selectores — accesibilidad primero, siempre
Los tests deben depender del spec (comportamiento observable por el usuario), no de la implementación. Sigue esta jerarquía de prioridad — la misma que recomiendan Testing Library y Playwright — de principio a fin, sin saltarte pasos:

1. `getByRole` (con `name`) — primera opción siempre
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`
5. `getByDisplayValue`
6. `getByAltText`
7. `getByTitle`
8. `getByTestId` — último recurso, solo cuando el elemento genuinamente no tiene rol o nombre accesible

Nunca uses `data-testid` (ni atributos custom similares) como default o para leer contenido/orden de una lista — usa roles (`getByRole('list', { name })`, `getByRole('heading', { name })`, etc.). Si un selector por rol/label no encuentra el elemento, es una señal de que el componente necesita un fix de accesibilidad (label, rol, nombre accesible), no que haga falta agregar un `data-testid`.

## Interacciones con estado async (debounce, Suspense, promesas)
Si el componente usa primitivos async de React (`useDeferredValue`, `startTransition`, `use()` + `Suspense`, o cualquier estado que se resuelva en un microtask fuera del evento síncrono), envuelve la interacción del usuario (`userEvent.type`, `userEvent.click`) en `await act(async () => { ... })` (importado de `react`) para que esa actualización diferida se resuelva dentro del mismo acto — de lo contrario las aserciones pueden leer un DOM en estado intermedio de forma intermitente. Usa `waitFor` como red adicional para aserciones que dependen de un side-effect async (ej. verificar cuántas veces se llamó un mock).

## Ejemplo
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

const meta: Meta = { title: 'Routes/Pokedex/BuscarPokemon', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj<typeof meta>;

export const BuscaPokemonPorNombreExacto: Story = {
  render: () => <RouterProvider router={createStoryRouter(makeService(ALL_POKEMONS))} />,
  play: async ({ canvas, userEvent }) => {
    // getByRole primero — no getByTestId. El input es un searchbox con nombre accesible.
    const input = canvas.getByRole('searchbox', { name: 'Buscar pokémon por nombre' });
    await userEvent.type(input, 'pikachu');
    await expect(await canvas.findByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
  },
};
```
