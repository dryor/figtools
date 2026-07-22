---
name: model
description: Helps decide and document the architecture and design approach for a feature already specified in a Gauge spec — asking what design pattern to use, how volatile each part is, and whether to model it by domain or by feature, saving the decision along with its relationships to other documents in an ADR. Use WHENEVER an acceptance spec exists and the architecture approach needs to be decided before implementing, or the user mentions ADR, design decisions, patterns to use, or how to model something — even without naming the command.
---

# /model — Architecture decisions

## What it does
After a Gauge spec exists (from `/bdd`), it helps decide the architecture approach by asking what design pattern to use, how volatile each part is, and whether to model by domain or by feature — following the volatility decomposition logic from *Righting Software* (Juval Löwy) as a reference, not just intuition. Saves the decision, its reasoning, and its relationships to other documents in an ADR.

## Why ask instead of decide alone
These decisions have consequences that last longer than the initial implementation. Asking forces making the reasoning behind the decision explicit, not just the conclusion — so the person can disagree with the reasoning and not just with the result.

## Input
The Gauge spec returned by `/bdd`.

## Process
1. Read the full spec.
2. Ask what design pattern fits — but offer "no GoF pattern, simple functions / a parameterized service method" as the first explicit option alongside any GoF pattern, not as something only accepted if the human asks for it. Don't assume Strategy/Factory by default for logic with few known variants (e.g., a filter + a sort): that's indirection without a concrete problem to solve. If it's not obvious, help reason through the options instead of assuming one — for example, for interchangeable variants of the same type of object that ALREADY exist and must be swappable at runtime, a Factory Method usually suffices; only escalate to Abstract Factory if a complete family of related objects that must remain consistent with each other is needed. Not every feature needs a GoF pattern — a timing technique like debounce is not a structural/creational design pattern, and "no pattern applies here" is a valid answer and should be accepted as such, without forcing the conversation toward a pattern that doesn't fit.
3. Ask which parts are volatile vs. stable, and whether to organize by domain or by feature. Don't assume "by feature" as default just because something is theoretically reusable — ask directly whether the human prefers domain cohesion (everything together in the domain module) even when today there is only one consumer.
4. If the stack has native primitives relevant to the problem (e.g., async state in React 19: `use()`, `Suspense`, `useDeferredValue`, promises as service return values instead of callbacks/manual state), explicitly ask whether it should be modeled using them instead of assuming a generic pattern (`setTimeout`, custom hooks with `{data, isLoading, error}`). Don't fix a mechanism like `setTimeout` for debounce upfront if the stack already has a more idiomatic native alternative — ask first.
5. Name the ADR after the feature: `ADR-[feature-name].md`.
6. Document the decision, the reasoning, and the DERIVES_FROM / RELATED_TO relationships to other existing documents.
7. Generate the resulting interfaces in two formats: Mermaid (diagram) and TypeScript.
8. Include a "Usage example" showing how the resulting interface is invoked in a concrete case — not just the type signature.

## Output format
```
# ADR-[feature-name]

## Context
[problem summary]

## Decision
- Pattern: [which one and why]
- Volatility: [what is volatile, what is stable]
- Relationships: DERIVES_FROM [source spec]

## Interfaces (mermaid + ts)
...
```

## References
If further depth is needed beyond intuition when deciding pattern or volatility, consult:

**Before continuing with the Process, read the full content of each of the following files — do not assume their content from the title.**

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
- `.claude/knowledge/arquitectura-de-software/ebenHewittSemanticSoftwareDesignANewTheoryAndPracticalGuide.txt` — Eben Hewitt - Semantic Software Design: A New Theory and Practical Guide for Modern Architects-O'Reilly Media (2019)
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

- `.claude/knowledge/papers/criteriaForModularization.txt` — Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules": the original paper on decomposition by volatility/information hiding.
- `.claude/knowledge/papers/applyingDesignByContract.txt` — Bertrand Meyer: preconditions/postconditions for specifying the behavior of an interface, useful when defining the contract of a service.
- `.claude/knowledge/lenguajes-programacion-js-ts/howToDesignProgramsAnIntroductionToProgrammingAnd.txt` — Felleisen et al.: design recipes for functions and data, useful at the interface/types design level, not just architecture.
- `.claude/knowledge/lenguajes-programacion-js-ts/multithreadedJavascriptConcurrencyBeyondTheEventLoop.txt` — Hunter & English: Web Workers, worker_threads and SharedArrayBuffer as native concurrency primitives — relevant in Process step 4, when deciding if a feature needs real parallelism instead of assuming a generic single-thread async pattern.

- `.claude/knowledge/entrevistas-tecnicas-system-design/acingTheSystemDesignInterview.txt` — Acing the System Design Interview (Zhiyong Tan)
- `.claude/knowledge/entrevistas-tecnicas-system-design/grokkingTheAdvancedSystemDesignInterviewEducativeIoZLibrary.txt` — Grokking the Advanced System Design Interview (educative.io) (Z-Library)
- `.claude/knowledge/entrevistas-tecnicas-system-design/grokkingTheSystemDesignInterviewEducativeIoZLibrary.txt` — Grokking the System Design Interview (Educative.io) (Z-Library)
- `.claude/knowledge/entrevistas-tecnicas-system-design/systemDesignInterviewAnInsiderSGuideVolume1.txt` — System Design Interview – An Insider's Guide: Volume 1 (Alex Xu)
- `.claude/knowledge/entrevistas-tecnicas-system-design/systemDesignInterviewAnInsiderSGuideVolume2.txt` — System Design Interview – An Insider's Guide: Volume 2 (Alex Xu, Sahn Lam)

## Example
**Input:** Gauge spec "Search Pokémon by name".

**Output:**
```
# ADR-pokemon-search

## Context
Need to search Pokémon by name with partial match support.

## Decision
- Pattern: 300ms debounce + client-side filtering over cached list
- Volatility: the data source (PokeAPI) is stable; the search logic
  is feature-oriented (reusable in other screens), not domain-oriented
- Relationships: DERIVES_FROM gauge/search-pokemon.spec
```
