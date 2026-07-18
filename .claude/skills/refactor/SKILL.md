---
name: refactor
description: Ayuda a documentar, en forma de ADR, qué salió mal en una implementación ya hecha — o, cuando no hubo ningún bug, a documentar un cambio deliberado de patrón/enfoque como actualización del ADR original. Usar SIEMPRE que el usuario quiera hacer un postmortem de una implementación, mencione qué salió mal, bugs encontrados después de implementar, pida ayuda para refactorizar un feature específico, o quiera cambiar el patrón/enfoque de una implementación ya hecha sin que haya un bug de por medio.
---

# /refactor — Postmortem o actualización de la implementación

## Qué hace
Ayuda a documentar por qué cambia una implementación ya hecha. Hay dos casos, y el primer paso siempre es distinguir cuál aplica — no asumirlo:

1. **Postmortem (algo salió mal).** El humano cuenta qué falló, y este skill ayuda a estructurarlo haciendo las preguntas correctas — no adivina el problema por su cuenta. Output: un ADR de postmortem nuevo (`ADR-[feature]-postmortem.md`).
2. **Actualización de decisión (nada salió mal, cambia la preferencia).** El humano quiere cambiar de patrón/enfoque sin que haya habido un bug — por ejemplo, pasar de `useMemo` a `useState` por preferencia de que un valor async sea estado explícito, no porque `useMemo` fallara. Output: NO se crea un ADR de postmortem — se agrega una sección "Actualización" al ADR original de la funcionalidad (el que generó `/model`), documentando el cambio, que no corrige un bug, y el razonamiento nuevo.

**Cómo distinguir:** pregunta directamente — "¿esto corrige un problema real que observaste, o es un cambio de preferencia sin que algo estuviera roto?" — antes de elegir el formato de salida. No fuerces un postmortem cuando no hay nada que haya salido mal; forzarlo produce un documento que inventa fallas que no ocurrieron.

## Alcance — qué NO cubre
Este comando produce documentación únicamente sobre la implementación (el código). No cubre vista, interfaces de servicio, ni el combo de ambas — esos artefactos ya tienen sus propios comandos (`/view-implementation`, `/placeholder-implementation`, `/full-implementation`) con sus propios outputs.

## Referencias
**Antes de continuar con el Proceso, lee el contenido completo de cada uno de los siguientes archivos — no asumas su contenido a partir del título.**

- `.claude/knowledge/patrones-de-diseno/designPatternsElementsOfReusableObjectOriented.txt` — Design Patterns: Elements of Reusable Object-Oriented (Erich Gamma; Richard Helm, (Computer scientist); Ralph E)
- `.claude/knowledge/patrones-de-diseno/diveIntoDesignPatterns.txt` — Dive Into Design Patterns (Alexander Shvets)
- `.claude/knowledge/patrones-de-diseno/diveIntoRefactoring.txt` — Dive Into Refactoring (Alexander Shvets)
- `.claude/knowledge/patrones-de-diseno/headFirstDesignPatternsBuildingExtensibleAnd.txt` — Head First Design Patterns: Building Extensible and (Eric Freeman, Elisabeth Robson, Eric Freeman, Elisabeth)
- `.claude/knowledge/patrones-de-diseno/kentBeckTidyFirstAPersonalExerciseInEmpiricalSoftwareDesignO.txt` — Kent Beck - Tidy First:: A Personal Exercise in Empirical Software Design-O'Reilly Media (2023)
- `.claude/knowledge/patrones-de-diseno/learningDomainDrivenDesignAligningSoftware.txt` — Learning Domain-Driven Design: Aligning Software (Vladik Khononov)
- `.claude/knowledge/patrones-de-diseno/learningJavascriptDesignPatternsAJavascriptAndReact.txt` — LEARNING JAVASCRIPT DESIGN PATTERNS : a javascript and react (Addy Osmani)
- `.claude/knowledge/patrones-de-diseno/objectDesignStyleGuidePowerfulTechniquesForCreating.txt` — Object Design Style Guide: Powerful techniques for creating (Matthias Noback)
- `.claude/knowledge/patrones-de-diseno/patternOrientedSoftwareArchitectureVolume2Patterns.txt` — Pattern-oriented software architecture: Volume 2, Patterns (Douglas C Schmidt; Frank Buschmann; Kevlin Henney; et al)
- `.claude/knowledge/patrones-de-diseno/patternsForEffectiveUseCasesTheAgileSoftware.txt` — Patterns for Effective Use Cases (The Agile Software (Paul Becker; Steve Adolph; Paul Bramble; Alistair Cockburn;)
- `.claude/knowledge/patrones-de-diseno/patternsOfEnterpriseApplicationArchitecture.txt` — Patterns of Enterprise Application Architecture (Martin Fowler)
- `.claude/knowledge/patrones-de-diseno/recipesForDecoupling.txt` — Recipes for Decoupling (Matthias Noback)
- `.claude/knowledge/patrones-de-diseno/refactoringImprovingTheDesignOfExistingCode.txt` — Refactoring: Improving the Design of Existing Code (Martin Fowler, Kent Beck)
- `.claude/knowledge/patrones-de-diseno/typescript5DesignPatternsAndBestPractices2nd.txt` — TypeScript 5 Design Patterns and Best Practices, 2nd (Theofanis Despoudis)
- `.claude/knowledge/patrones-de-diseno/umlDistilledABriefGuideToTheStandardObjectModeling.txt` — UML Distilled: A Brief Guide to the Standard Object Modeling (Fowler, Martin)
- `.claude/knowledge/patrones-de-diseno/writingEffectiveUseCasesCrystalSeriesForSoftware.txt` — Writing Effective Use Cases (Crystal Series for Software (Cockburn, Alistair Cockburn)

- `.claude/knowledge/buenas-practicas-ingenieria/yourCodeAsACrimeSceneSecondEditionUseForensic.txt` — técnicas de análisis forense de código, afines a estructurar un postmortem.

## Ejemplo — postmortem (caso 1)
```
# ADR-busqueda-de-pokemon-postmortem

## Qué se planeó
(resumen de ADR-busqueda-de-pokemon)

## Qué salió mal
- El debounce de 300ms causaba parpadeo visual en resultados
- No se manejó el caso de red lenta / timeout

## Qué se corrigió
- Debounce a 400ms + estado de carga
- Manejo de timeout con reintento
```

## Ejemplo — actualización de decisión, sin bug (caso 2)
Se agrega directo al ADR original, no a un documento nuevo:
```
## Actualización — la promesa vive en useState, no en useMemo
No corrige un bug — useMemo funcionaba correctamente. Es preferencia de
patrón: modelar el estado async explícitamente en useState en vez de
derivarlo con useMemo, para que quede claro que es la fuente de verdad
que el componente hijo lee vía use().
```
