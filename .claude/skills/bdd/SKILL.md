---
name: bdd
description: Ayuda a crear y refinar criterios de aceptación en formato Gauge, a partir de una User Story o de un borrador ya escrito en Gherkin — convirtiéndolo y completando escenarios faltantes mediante preguntas al usuario. Usar SIEMPRE que el usuario pida crear criterios de aceptación, especificar el comportamiento de una funcionalidad antes de implementarla, escriba o pegue un feature en Gherkin, o mencione BDD, Gauge, historias de usuario, o escenarios de aceptación — incluso si no lo pide explícitamente por el nombre del comando.
---

# /bdd — Criterios de aceptación

## Qué hace
Ayuda a convertir una User Story (o un borrador ya escrito en Gherkin) en criterios de aceptación en formato Gauge, y usa preguntas dirigidas al humano para completar escenarios que falten — casos vacíos, casos de error, y comportamiento no especificado explícitamente.

## Por qué preguntar en vez de asumir
Una User Story casi siempre deja implícitas varias decisiones de comportamiento: qué pasa si el input está vacío, si hay un error, si la acción se repite. Convertir esas decisiones implícitas en preguntas explícitas evita que terminen resueltas por accidente, en el código, sin que nadie las haya decidido a propósito. Este es el propósito central del skill — no es un formateador, es una entrevista.

## Input
- **Requerido:** una User Story, o un borrador de escenarios ya escrito en Gherkin (`Feature:` / `Scenario:` / `Given-When-Then`).
- **Opcional:** una referencia visual (Figma, captura de pantalla, o página web). Úsala solo si la User Story llega incompleta, para inferir comportamiento esperado con el mejor esfuerzo posible. No la pidas si no hace falta — es un apoyo, no un requisito.

## Proceso
1. Si el input ya es un borrador en Gherkin, tradúcelo a formato Gauge conservando el significado exacto de cada escenario — no reinterpretes el comportamiento, solo cambia la sintaxis.
2. Identifica qué categorías de casos borde probablemente faltan: input vacío, input inválido, mensajes de error, y — cuando la naturaleza de la operación lo amerite (por ejemplo, operaciones que se puedan repetir con el mismo input) — determinismo/idempotencia.
3. Pregunta al humano por cada hueco detectado en vez de inventar la respuesta. Una pregunta directa vale más que un escenario adivinado.
4. Con las respuestas, escribe o completa el spec en Gauge.

## Referencias
**Antes de continuar con el Proceso, lee el contenido completo de cada uno de los siguientes archivos — no asumas su contenido a partir del título.**

- `.claude/knowledge/bdd/bddInAction2ndEditionMeapV13.txt` — Smart & Molak, *BDD in Action* (2nd ed.). Cap. 5-6 (describir e ilustrar features con ejemplos concretos) y cap. 7 (de ejemplos a especificaciones ejecutables) son el proceso que sigue esta skill al convertir una User Story en escenarios Gauge.

## Formato de salida
Usa siempre esta estructura:
```
# [Nombre del feature]

## [Escenario en frase corta, presente]
* [paso]
* [paso]

## [Siguiente escenario]
* [paso]
```

## Ejemplo

**Input:** User Story: "Como usuario quiero buscar un pokémon por su nombre para ver su información rápidamente."

**Output:**
```
# Buscar pokémon por nombre

## Búsqueda exacta encuentra el pokémon
* El usuario busca "pikachu"
* El sistema muestra la tarjeta de Pikachu

## Búsqueda sin resultados
* El usuario busca "xyz123"
* El sistema muestra "No se encontraron resultados"
```
