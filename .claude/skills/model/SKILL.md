---
name: model
description: Ayuda a decidir y documentar el enfoque de arquitectura y diseño de una funcionalidad ya especificada en un spec de Gauge — preguntando qué patrón de diseño usar, qué tan volátil es cada parte, y si conviene modelarla por dominio o por feature, y guardando la decisión junto con sus relaciones hacia otros documentos en un ADR. Usar SIEMPRE que exista un spec de aceptación y haga falta decidir el enfoque de arquitectura antes de implementar, o el usuario mencione ADR, decisiones de diseño, patrones a usar, o cómo modelar algo — incluso sin nombrar el comando.
---

# /model — Decisiones de arquitectura

## Qué hace
Después de que existe un spec de Gauge (de `/bdd`), ayuda a decidir el enfoque de arquitectura preguntando qué patrón de diseño usar, qué tan volátil es cada parte, y si conviene modelar por dominio o por feature — siguiendo la lógica de descomposición por volatilidad de *Righting Software* (Juval Löwy) como referencia, no solo la intuición. Guarda la decisión, su razonamiento, y sus relaciones hacia otros documentos en un ADR.

## Por qué preguntar en vez de decidir solo
Estas decisiones tienen consecuencias que duran más que la implementación inicial. Preguntar fuerza a hacer explícito el razonamiento detrás de la decisión, no solo la conclusión — así la persona puede estar en desacuerdo con el razonamiento y no solo con el resultado.

## Input
El spec de Gauge que devuelve `/bdd`.

## Proceso
1. Lee el spec completo.
2. Pregunta qué patrón de diseño encaja — pero ofrece "ningún patrón GoF, funciones simples / un método de servicio parametrizado" como primera opción explícita junto a cualquier patrón GoF, no como algo que solo se acepta si el humano lo pide. No asumas Strategy/Factory por defecto para lógica con pocas variantes conocidas (ej. un filtro + un orden): eso es indirección sin problema concreto que resolver. Si no es obvio, ayuda a razonar entre opciones en vez de asumir una — por ejemplo, para variantes intercambiables de un mismo tipo de objeto que YA existen y deben poder swapearse en runtime, un Factory Method suele bastar; solo sube a Abstract Factory si hace falta una familia completa de objetos relacionados que deban mantenerse consistentes entre sí. No todas las features necesitan un patrón GoF — una técnica de temporización como debounce no es un patrón de diseño estructural/creacional, y "ningún patrón aplica aquí" es una respuesta válida y debe aceptarse como tal, sin forzar la conversación hacia un patrón que no corresponde.
3. Pregunta qué partes son volátiles vs. estables, y si conviene organizar por dominio o por feature. No asumas "por feature" como default solo porque algo es teóricamente reusable — pregunta directamente si el humano prefiere cohesión de dominio (todo junto en el módulo del dominio) incluso cuando hoy solo hay un consumidor.
4. Si el stack tiene primitivos nativos relevantes para el problema (ej. estado async en React 19: `use()`, `Suspense`, `useDeferredValue`, promesas como retorno de servicio en vez de callbacks/estado manual), pregunta explícitamente si se debe modelar apoyándose en ellos en vez de asumir un patrón genérico (`setTimeout`, hooks custom con `{data, isLoading, error}`). No fijes de entrada un mecanismo como `setTimeout` para debounce si el stack ya tiene una alternativa nativa más idiomática — pregunta primero.
5. Nombra el ADR según el feature: `ADR-[nombre-del-feature].md`.
6. Documenta la decisión, el razonamiento, y las relaciones DERIVES_FROM / RELATED_TO hacia otros documentos existentes.
7. Genera las interfaces resultantes en dos formatos: Mermaid (diagrama) y TypeScript.
8. Incluye un "Usage example" mostrando cómo se invoca la interfaz resultante en un caso concreto — no solo la firma de tipos.

## Formato de salida
```
# ADR-[nombre-del-feature]

## Contexto
[resumen del problema]

## Decisión
- Patrón: [cuál y por qué]
- Volatilidad: [qué es volátil, qué es estable]
- Relaciones: DERIVES_FROM [spec de origen]

## Interfaces (mermaid + ts)
...
```

## Referencias
Si hace falta profundizar más allá de la intuición al decidir patrón o volatilidad, consulta:
- `.claude/knowledge/patrones-de-diseno/` — GoF, Fowler (*Patterns of Enterprise Application Architecture*, *Refactoring*), *Domain-Driven Design* (Khononov), UML Distilled.
- `.claude/knowledge/arquitectura-de-software/` — incluye *Righting software...* (Juval Löwy), la referencia que este skill sigue explícitamente para descomposición por volatilidad.
- `.claude/knowledge/papers/criteria_for_modularization.txt` — Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules": el paper original sobre decomposición por volatilidad/information hiding.
- `.claude/knowledge/papers/Applying Design by Contract...txt` — Bertrand Meyer: precondiciones/postcondiciones para especificar el comportamiento de una interfaz, útil al definir el contrato de un servicio.
- `.claude/knowledge/lenguajes-programacion-js-ts/How to Design Programs...txt` — Felleisen et al.: recetas de diseño para funciones y datos, útil al nivel de diseño de interfaces/tipos, no solo de arquitectura.
- `.claude/knowledge/entrevistas-tecnicas-system-design/` — *Acing the System Design Interview*, *Grokking (Advanced) System Design Interview*, *System Design Interview* Vol. 1 y 2 (Alex Xu): patrones de sistemas distribuidos (caching, sharding, colas, consistencia) aplicables a decisiones de arquitectura, más allá del empaquetado "de entrevista".

## Ejemplo
**Input:** spec de Gauge "Buscar pokémon por nombre".

**Output:**
```
# ADR-busqueda-de-pokemon

## Contexto
Se necesita buscar pokémon por nombre con soporte de coincidencia parcial.

## Decisión
- Patrón: debounce de 300ms + filtrado client-side sobre lista cacheada
- Volatilidad: la fuente de datos (PokeAPI) es estable; la lógica de búsqueda
  es feature-oriented (reusable en otras pantallas), no domain-oriented
- Relaciones: DERIVES_FROM gauge/buscar-pokemon.spec
```
