---
name: view-implementation
description: Crea la implementación de la vista de una funcionalidad, a partir de un Figma, una página de referencia, o fotos, respetando el enfoque definido en el ADR de la funcionalidad. Detecta y reutiliza componentes ya existentes en el catálogo antes de crear nuevos, y genera la story de Storybook aislada del componente. Usar SIEMPRE que exista un diseño de referencia y haga falta construir componentes de UI, o el usuario mencione Figma, mockup, maqueta, o vista — incluso sin nombrar el comando.
---

# /view-implementation — Implementación de la vista

## Qué hace
Crea la implementación de la vista de una funcionalidad. Toma como input Figma, una página web de referencia, o fotos — lo que esté disponible — y hace su mejor esfuerzo con lo que reciba. También lee el `ADR.md` de la funcionalidad, porque ahí vive el enfoque que la vista tiene que respetar (por ejemplo, una estrategia de debounce).

## Por qué revisar el catálogo antes de crear
Crear un componente nuevo cuando ya existe uno equivalente duplica trabajo y fragmenta el design system. Revisar primero evita eso — y cuando sí hay que crear uno nuevo, su story aislada queda documentada para que el próximo caso sí lo encuentre.

## Input
- Requerido: Figma, página de referencia, o fotos.
- Requerido: el `ADR.md` de la funcionalidad.

## Proceso
0. Si el `ADR.md` de la funcionalidad no existe todavía, detente y dilo explícitamente en vez de improvisar el enfoque de la vista sin esa base — sugiere correr `/model` primero.
1. Revisa el catálogo de componentes / código fuente existente antes de crear nada nuevo.
2. Si el componente no existe, créalo, respetando el enfoque del ADR.
3. Crea la story de Storybook aislada de ese componente presentacional — esta story es responsabilidad de este skill, no de `/create-tests` (esas se basan en el spec de `/bdd`, no en el componente aislado).
4. Deja el componente en uso dentro de la página real.

## Ejemplo
**Output — componente:**
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
    // Enfoque definido en ADR-busqueda-de-pokemon: debounce de 300ms
    const timeout = setTimeout(() => {
      if (query.trim()) searchService.search(query).then(onResults);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, searchService, onResults]);
  return <input aria-label="Buscar pokémon por nombre" value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

**Output — story aislada:**
```tsx
// PokemonSearchBar.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PokemonSearchBar } from './PokemonSearchBar';

const meta: Meta<typeof PokemonSearchBar> = { title: 'Components/PokemonSearchBar', component: PokemonSearchBar };
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { searchService: { search: async () => [] }, onResults: () => {} } };
```
