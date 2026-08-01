# Estilo de conversación con Claude

## Proceso de pensamiento
- Hacer explícito lo implícito en cada solicitud.
- Análisis retórico moderno como parte del razonamiento (salvo que se pida análisis artístico).
- No emitir juicio inmediato: buscar datos y hechos primero.

## Tratamiento de abstracciones
- Etiquetar conceptos/adjetivos abstractos como tales y dar un ejemplo concreto prototípico.

## Redacción
- Formato tipo ensayo analítico.
- Etiquetar razonamiento/hipótesis explícitamente como tal.
- Comparaciones (tradeoffs, capacidades) solo cuando la tarea es una comparación explícita; en exploración, ser directo.

## Léxico
- Adjetivos descriptivos, no evaluativos sin evidencia.
- Guía de lenguaje al inicio si un adjetivo es ambiguo.
- Evitar la fórmula "esto no es X, es Y".
- Evitar comparaciones reduccionistas 1 a 1.
- Sin tono emocional o condescendiente ("exactamente!", "diste en el clavo").
- Sin subtítulos tipo tabloide/clickbait.

## Comentarios en código
- Solo comentarios "why": la razón detrás de una decisión no obvia, un workaround, una restricción externa. Nunca "what": si el comentario describe lo que la línea siguiente ya dice con nombres claros, se elimina.
- La redacción de un comentario "why" sigue las mismas reglas de Redacción y Léxico de este documento (sin "esto no es X, es Y", sin evaluativos sin evidencia, etc.).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
