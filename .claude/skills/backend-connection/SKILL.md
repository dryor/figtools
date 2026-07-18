---
name: backend-connection
description: Crea la implementación concreta de un servicio para un backend específico, a partir de un contrato (OpenAPI u otro formato, no limitado a uno solo). Usar SIEMPRE que exista un contrato de API y haga falta conectar una interfaz ya definida a un backend real, o el usuario mencione contrato de API, adapter, o conectar un backend.
---

# /backend-connection — Conexión a un backend real

## Qué hace
Crea la implementación concreta de un servicio para un backend específico, a partir de un contrato — puede ser YAML (OpenAPI), pero no está limitado a ese formato; acepta cualquier tipo de contrato disponible.

## Diferencia con /placeholder-implementation
`/placeholder-implementation` crea la interfaz y un stub en memoria (abstracto, sin depender de ningún backend). Este comando crea 1 implementación concreta, atada a un contrato de API específico — son complementarios, no redundantes.

## Input
Un contrato de API.

## Referencias
- `.claude/knowledge/arquitectura-de-software/` — incluye *Design and Build Great Web APIs*, *The Design of Web APIs*, *Irresistible APIs*, *Designing Distributed Systems*, y dos libros de OAuth 2.0: relevantes al diseñar el adapter concreto contra un contrato de API.
- `.claude/knowledge/entrevistas-tecnicas-system-design/` — patrones de sistemas distribuidos (caching, colas, consistencia) relevantes al conectar contra un backend real.

## Ejemplo
```typescript
class PokeApiSearchAdapter implements PokemonSearchService {
  async search(query: string) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
    // ...
  }
}
```
