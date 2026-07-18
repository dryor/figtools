---
name: placeholder-implementation
description: Crea las interfaces de servicio de una funcionalidad a partir de su ADR, junto con un stub/mock en memoria de esa interfaz para poder probarla de inmediato. Usar SIEMPRE que exista un ADR y haga falta la interfaz de un servicio antes de conectar un backend real, o el usuario mencione interfaz, servicio, mock o stub — incluso sin nombrar el comando.
---

# /placeholder-implementation — Interfaces de servicio

## Qué hace
Crea las interfaces de los servicios necesarios para una funcionalidad, consumiendo el `ADR.md`, y genera además un stub/mock en memoria de esa interfaz — para que el resto del sistema pueda desarrollarse y probarse sin depender todavía de un backend real.

## Por qué un stub en memoria y no solo la interfaz
Una interfaz sin implementación bloquea a cualquiera que dependa de ella hasta que exista el backend real. El stub en memoria permite avanzar en paralelo — vista, tests — sin esperar a `/backend-connection`.

## Input
El `ADR.md` de la funcionalidad.

## Referencias
- `.claude/knowledge/arquitectura-de-software/` — mismos libros de diseño de APIs que `/backend-connection`, útiles al definir la interfaz antes de tener el backend real.
- `.claude/knowledge/papers/applyingDesignByContract.txt` — Bertrand Meyer: para especificar precondiciones/postcondiciones de la interfaz antes de crear el stub.

## Ejemplo
```typescript
interface PokemonSearchService {
  search(query: string): Promise<Pokemon[]>;
}

class InMemoryPokemonSearchService implements PokemonSearchService {
  private cache: Pokemon[] = [/* datos de prueba */];
  async search(query: string) {
    return this.cache.filter(p => p.name.includes(query));
  }
}
```
