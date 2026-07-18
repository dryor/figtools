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
**Antes de continuar con el Proceso, lee el contenido completo de cada uno de los siguientes archivos — no asumas su contenido a partir del título.**

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
