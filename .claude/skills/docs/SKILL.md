---
name: docs
description: Ayuda a escribir o actualizar el README de un proyecto o módulo, aplicando el framework de "Docs for Developers" (Bhatti, Corleissen, Lambourne, Nunez, Waterhouse) — entendiendo primero quién lo va a leer y para qué, completando la plantilla de contenido estándar del libro, y pasando el borrador por sus 4 revisiones de edición antes de darlo por terminado. Usar SIEMPRE que el usuario pida escribir, actualizar o revisar un README, o mencione documentación técnica de un repositorio o módulo — incluso sin nombrar el comando.
---

# /docs — README y documentación técnica

## Qué hace
Ayuda a escribir o actualizar un README aplicando el proceso de *Docs for Developers*: primero identifica quién lo va a leer y qué necesita, después completa la plantilla estándar de contenido del libro, y por último pasa el borrador por las 4 revisiones de edición antes de darlo por terminado.

## Por qué preguntar por el lector antes de escribir
Un README escrito sin un lector concreto en mente tiende a mezclar audiencias — explica instalación a alguien que ya la hizo, u omite el "por qué" para quien recién llega. El libro llama a esto "the curse of knowledge" (Capítulo 1): quien escribe ya sabe demasiado del proyecto para notar qué le falta a quien no lo conoce. Preguntar el objetivo (¿evaluar si usar el proyecto?, ¿instalarlo por primera vez?, ¿contribuir código?) evita ese sesgo antes de que quede escrito.

## Input
- Requerido: el código o proyecto a documentar (o el README existente, si se trata de una actualización).
- Opcional: a quién está dirigido (usuario final, otro desarrollador del equipo, contribuidor externo) — si no es evidente por el contexto, pregúntalo antes de escribir.

## Proceso
1. Pregunta el objetivo del README y quién lo va a leer, si no es evidente por el contexto.
2. Completa la plantilla estándar del libro (Capítulo 2, "Planning your documentation"): resumen de alto nivel de qué hace el código y por qué existe, Installation, Examples, Troubleshooting, Changelog, Additional resources, License. No todas las secciones aplican siempre — usa el objetivo definido en el paso 1 para incluir solo las relevantes, no la plantilla completa por inercia.
3. Al escribir la sección Examples, sigue los principios de código de muestra del Capítulo 5: explicado (no solo pegado sin contexto), conciso, claro, usable/extensible tal cual está, y confiable (que efectivamente corra si alguien lo copia).
4. Escribe pensando en skimming (Capítulo 3): la información más importante primero, párrafos cortos, headers descriptivos, listas en vez de prosa densa donde aplique.
5. Antes de entregar el borrador, pasa las 4 revisiones de edición del Capítulo 4: precisión técnica (¿los comandos/ejemplos funcionan tal cual están escritos?), completitud (¿falta algo que el lector objetivo necesita?), estructura (¿el orden sigue lo que el lector espera encontrar primero?), claridad y brevedad (¿se puede decir lo mismo con menos palabras?).

## Formato de salida
```
# [Nombre del proyecto]

[Uno o dos párrafos: qué hace el código a alto nivel y por qué existe]

## Installation
1. ...

## Examples
...

## Troubleshooting
...

## Changelog
...

## Additional resources
...

## License
...
```

## Ejemplo
**Input:** "Necesito el README de figma-scrapper para alguien del equipo que lo va a levantar localmente por primera vez."

**Output (fragmento):**
```
# figma-scrapper

figma-scrapper conecta el panel de Figma con el backend del proyecto para
leer capas de diseño y generar el modelo de datos correspondiente.

## Installation
1. `pnpm install`
2. Copiar `.env.example` a `.env` y completar `FIGMA_TOKEN`
3. `pnpm dev`

## Examples
...
```

## Referencias
- `.claude/knowledge/buenas-practicas-ingenieria/docsForDevelopersAnEngineerSFieldGuideToTechnical.txt` — Bhatti, Corleissen, Lambourne, Nunez, Waterhouse. Capítulo 1 (entender a la audiencia), Capítulo 2 (plantilla de README, p. 27), Capítulo 3 (redacción para skimming), Capítulo 4 (las 4 revisiones de edición), Capítulo 5 (principios de código de muestra).
