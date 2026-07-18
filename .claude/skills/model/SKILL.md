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

- `.claude/knowledge/arquitectura-de-software/aPhilosophyOfSoftwareDesign2ndEdition.txt` — A Philosophy of Software Design, 2nd Edition (John K. Ousterhout)
- `.claude/knowledge/arquitectura-de-software/accelerateTheScienceOfLeanSoftwareAndDevops.txt` — Accelerate : The Science of Lean Software and DevOps: (Forsgren  PhD, Nicole, Humble, Jez, Kim, Gene)
- `.claude/knowledge/arquitectura-de-software/advancedWebApplicationArchitecture.txt` — Advanced Web Application Architecture (Matthias Noback)
- `.claude/knowledge/arquitectura-de-software/buildingApplicationsWithAiAgentsDesigningAnd.txt` — Building Applications with AI Agents: Designing and (Michael Albada)
- `.claude/knowledge/arquitectura-de-software/buildingEvolutionaryArchitecturesAutomatedSoftware.txt` — Building evolutionary architectures : automated software (Neal Ford, Rebecca Parsons, Patrick Kua, and Pramod Sadalage)
- `.claude/knowledge/arquitectura-de-software/buildingSecureAndReliableSystems.txt` — building:secure:and:reliable:systems
- `.claude/knowledge/arquitectura-de-software/chaosEngineeringSystemResiliencyInPractice.txt` — Chaos Engineering : System Resiliency in Practice (Casey Rosenthal, Nora Jones)
- `.claude/knowledge/arquitectura-de-software/databaseInternalsADeepDiveIntoHowDistributedData.txt` — Database Internals : A Deep Dive Into How Distributed Data (Alex Petrov)
- `.claude/knowledge/arquitectura-de-software/decoupledApplicationsAndComposableWebArchitecturesCompress.txt` — decoupled-applications-and-composable-web-architectures:compress
- `.claude/knowledge/arquitectura-de-software/designAndBuildGreatWebApis.txt` — Design and Build Great Web APIs (Mike Amundsen)
- `.claude/knowledge/arquitectura-de-software/designingDataIntensiveApplications2ndEditionMartinKleppmann.txt` — Designing Data-Intensive Applications, 2nd Edition (Martin Kleppmann, Chris Riccomini) (z-library.sk, 1lib.sk, z-lib.sk)
- `.claude/knowledge/arquitectura-de-software/designingDistributedSystemsPatternsAndParadigmsFor.txt` — Designing Distributed Systems: Patterns and Paradigms for (Brendan Burns)
- `.claude/knowledge/arquitectura-de-software/designingEventDrivenSystems.txt` — Designing-Event-Driven-Systems
- `.claude/knowledge/arquitectura-de-software/ebenHewittSemanticSoftwareDesignANewTheoryAndPracticalGuide.txt` — Eben Hewitt - Semantic Software Design: A New Theory and Practical Guide for Modern Architects-O’Reilly Media (2019)
- `.claude/knowledge/arquitectura-de-software/edgeComputingSimplifiedExploreAllAspectsOfEdgePerryLea2024.txt` — Edge-Computing-Simplified:-Explore-all-aspects-of-edge-Perry-Lea-2024-Packt-Publishing-Pvt-Ltd-97818
- `.claude/knowledge/arquitectura-de-software/functionalDesignAndArchitectureMeapV10.txt` — Functional Design and Architecture (MEAP V10) (Alexander Granin)
- `.claude/knowledge/arquitectura-de-software/fundamentalsOfSoftwareArchitecture2ndEditionAModern.txt` — Fundamentals of Software Architecture, 2nd Edition: A Modern (Mark Richards, Neal Ford)
- `.claude/knowledge/arquitectura-de-software/hackingApisBreakingWebApplicationProgramming.txt` — Hacking APIs: Breaking Web Application Programming (Corey J. Ball)
- `.claude/knowledge/arquitectura-de-software/headFirstSoftwareArchitectureALearnerSGuideTo.txt` — Head First Software Architecture: A Learner's Guide to (Raju Gandhi, Mark Richards, Neal Ford)
- `.claude/knowledge/arquitectura-de-software/howLinuxWorks3rdEditionWhatEverySuperuserShould.txt` — How Linux Works, 3rd Edition: What Every Superuser Should (Ward, Brian)
- `.claude/knowledge/arquitectura-de-software/http2InAction.txt` — HTTP:2 in Action (Barry Pollard)
- `.claude/knowledge/arquitectura-de-software/irresistibleApisDesigningWebApisThatDevelopersWill.txt` — Irresistible APIs : Designing Web APIs That Developers Will (Kirsten Hunter; Safari, an O'Reilly Media Company)
- `.claude/knowledge/arquitectura-de-software/learningSystemsThinkingEssentialNonLinearSkillsAnd.txt` — Learning Systems Thinking: Essential Non-Linear Skills and (DIANA. MONTALION)
- `.claude/knowledge/arquitectura-de-software/mezzaliraLucaBuildingMicroFrontendsDistributedSystemsForThe.txt` — Mezzalira, Luca - Building Micro-Frontends: Distributed Systems for the Frontend (2025, O'Reilly Media) - libgen.li
- `.claude/knowledge/arquitectura-de-software/microFrontendsInAction.txt` — Micro Frontends in Action (Michael Geers)
- `.claude/knowledge/arquitectura-de-software/oauth20SimplifiedAGuideToBuildingOauth20Servers.txt` — OAuth 2:0 simplified : a guide to building OAuth 2:0 servers (Parecki, Aaron)
- `.claude/knowledge/arquitectura-de-software/oauth2InAction.txt` — OAuth 2 in Action (Justin Richer, Antonio Sanso)
- `.claude/knowledge/arquitectura-de-software/practicalModuleFederation20.txt` — Practical Module Federation 2:0 (Unknown)
- `.claude/knowledge/arquitectura-de-software/rightingSoftwareAMethodForSystemAndProjectDesign.txt` — Righting software : a method for system and project design (Juval, Löwy)
- `.claude/knowledge/arquitectura-de-software/softwareArchitectureInPracticeSeiSeriesInSoftware.txt` — Software Architecture in Practice (SEI Series in Software (Len Bass, Paul Clements, Rick Kazman)
- `.claude/knowledge/arquitectura-de-software/softwareDesignByExampleAToolBasedIntroductionWith.txt` — Software Design by Example: A Tool-Based Introduction with (Greg Wilson)
- `.claude/knowledge/arquitectura-de-software/softwareEngineeringAtGoogleLessonsLearnedFrom.txt` — Software Engineering at Google : Lessons Learned From (Titus Winters; Tom Manshreck; Hyrum Wright; Safari, an)
- `.claude/knowledge/arquitectura-de-software/softwarePioneersContributionsToSoftwareEngineering.txt` — Software Pioneers : Contributions to Software Engineering (Manfred Broy (auth.), Prof. Dr. Manfred Broy, Prof. Dr.)
- `.claude/knowledge/arquitectura-de-software/swebokV4.txt` — swebok-v4
- `.claude/knowledge/arquitectura-de-software/systemsEngineeringDemystifiedApplyModernModelBased.txt` — Systems Engineering Demystified: Apply modern, model-based (Jon Holt)
- `.claude/knowledge/arquitectura-de-software/systemsPerformanceEnterpriseAndTheCloud2ndEdition202012.txt` — Systems.Performance.Enterprise.and.the.Cloud.2nd.Edition.2020.12
- `.claude/knowledge/arquitectura-de-software/theArtOfMicroFrontendsBuildHighlyScalable.txt` — The Art of Micro Frontends: Build Highly Scalable, (Florian Rappl, Lothar Schöttner)
- `.claude/knowledge/arquitectura-de-software/theC4ModelForVisualisingSoftwareArchitecture.txt` — The C4 model for visualising software architecture (Simon Brown)
- `.claude/knowledge/arquitectura-de-software/theDesignOfEverydayThingsRevisedAndExpandedEdition.txt` — The Design of Everyday Things - Revised and Expanded Edition (Norman, Donald A.)
- `.claude/knowledge/arquitectura-de-software/theDesignOfWebApisSecondEdition.txt` — The Design of Web APIs, Second Edition (Arnaud Lauret)
- `.claude/knowledge/arquitectura-de-software/webPerformanceInActionBuildingFasterWebPagesJeremyWagnerZ.txt` — Web Performance in Action Building Faster Web Pages (Jeremy Wagner) (Z-Library)

- `.claude/knowledge/papers/criteriaForModularization.txt` — Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules": el paper original sobre decomposición por volatilidad/information hiding.
- `.claude/knowledge/papers/applyingDesignByContract.txt` — Bertrand Meyer: precondiciones/postcondiciones para especificar el comportamiento de una interfaz, útil al definir el contrato de un servicio.
- `.claude/knowledge/lenguajes-programacion-js-ts/howToDesignProgramsAnIntroductionToProgrammingAnd.txt` — Felleisen et al.: recetas de diseño para funciones y datos, útil al nivel de diseño de interfaces/tipos, no solo de arquitectura.
- `.claude/knowledge/lenguajes-programacion-js-ts/multithreadedJavascriptConcurrencyBeyondTheEventLoop.txt` — Hunter & English: Web Workers, worker_threads y SharedArrayBuffer como primitivos nativos de concurrencia — relevante en el paso 4 del Proceso, al decidir si una feature necesita paralelismo real en vez de asumir un patrón async genérico de un solo hilo.

- `.claude/knowledge/entrevistas-tecnicas-system-design/acingTheSystemDesignInterview.txt` — Acing the System Design Interview (Zhiyong Tan)
- `.claude/knowledge/entrevistas-tecnicas-system-design/grokkingTheAdvancedSystemDesignInterviewEducativeIoZLibrary.txt` — Grokking the Advanced System Design Interview (educative.io) (Z-Library)
- `.claude/knowledge/entrevistas-tecnicas-system-design/grokkingTheSystemDesignInterviewEducativeIoZLibrary.txt` — Grokking the System Design Interview (Educative.io) (Z-Library)
- `.claude/knowledge/entrevistas-tecnicas-system-design/systemDesignInterviewAnInsiderSGuideVolume1.txt` — System Design Interview – An Insider's Guide: Volume 1 (Alex Xu)
- `.claude/knowledge/entrevistas-tecnicas-system-design/systemDesignInterviewAnInsiderSGuideVolume2.txt` — System Design Interview – An Insider's Guide: Volume 2 (Alex Xu, Sahn Lam)

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
