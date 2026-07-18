# Decisiones pendientes — packages/cli

Este documento registra decisiones de arquitectura que todavía no se
tomaron para `@figtools/cli`, a diferencia de
[`ADR-figtools-cli.md`](./ADR-figtools-cli.md), que documenta lo ya decidido
e implementado. Cada entrada describe el estado actual, las opciones
evaluadas, y la pregunta abierta que falta responder antes de decidir.

## 1. Parseo de argumentos: ¿mantener el parseo manual o adoptar una librería (commander)?

### Estado actual

`parseArgs` (`src/cli.ts:38-69`) es un loop escrito a mano sobre `argv`.
Estos son los hechos relevantes sobre lo que soporta hoy, verificados
leyendo el código, no una evaluación de calidad:

- No existe ninguna flag `--help`/`-h` ni `--version`. Si alguien corre
  `figtools --help`, el loop no reconoce `--help` como flag conocida (no
  entra en ninguna de las ramas de `--format`/`--output`/`--quiet`) y
  tampoco la agrega como URL porque empieza con `--` — la flag se descarta
  en silencio, `urls` queda vacío, y el comando termina con
  `Error: Se requiere al menos una URL de Figma` (`src/cli.ts:64`). Pedir
  ayuda produce un error de validación que no menciona la ayuda pedida.
- El subcomando `login` es un caso especial (`argv[0] === "login"`,
  `src/cli.ts:39`), no un sistema general de subcomandos. Agregar un
  segundo subcomando implicaría otro `if` al principio de la función.
- Una flag desconocida como `--foo` se ignora en silencio (no entra en
  ninguna rama), pero el siguiente argumento posicional (`bar` en
  `--foo bar`) sí se interpreta como URL porque no empieza con `--`. Un
  typo en una flag no produce ningún error de "flag desconocida": produce
  una URL inválida que recién falla más adelante, en la resolución, con un
  mensaje que no menciona el typo original.
- `--format` no valida contra los valores permitidos:
  `format = argv[++i] as OutputFormat` (`src/cli.ts:51`) es un cast de
  TypeScript, no una validación en tiempo de ejecución. `--format xml` no
  lanza ningún error — `format` queda con el string `"xml"`, y como
  `"xml" !== "markdown"` en el chequeo de `main` (`src/cli.ts:138`), el CLI
  simplemente escribe como si el formato pedido fuera `json`, sin avisar
  que el valor no era válido.

Ninguno de estos puntos es hipotético: es el comportamiento reproducible de
`parseArgs` y `decideOutputTarget` tal como están hoy.

### Opción A — seguir con parseo manual

- A favor: cero dependencias nuevas; `parseArgs` y `decideOutputTarget` son
  funciones puras hoy, testeadas pasando arrays de strings sin mockear
  nada (los 44 tests de CLI actuales dependen de esto); control total
  sobre el texto exacto de cada mensaje de error en español.
- En contra: cada capacidad que una librería de parseo da de manera
  automática (texto de `--help` generado a partir de la definición de
  flags, `--version`, subcomandos anidados, validación de choices,
  sugerencias tipo "quisiste decir --format" ante un typo) hay que
  escribirla a mano, y hoy no está escrita.

### Opción B — adoptar una librería (commander, o equivalentes como yargs/cac/clipanion)

- A favor: `--help` y `--version` se generan automáticamente a partir de la
  definición declarativa de comandos y opciones; subcomandos de primera
  clase (commander los modela como objetos `Command` anidados) en vez del
  `if` especial actual para `login`; validación de tipos y de choices
  (`.choices(["json", "markdown"])` para `--format`) sin código adicional;
  mensajes de error consistentes para flags desconocidas.
- En contra: `parseArgs` dejaría de ser una función pura que recibe
  `string[]` y devuelve un `Result` — pasaría a construir o invocar un
  objeto `Command` de la librería. Falta confirmar si commander permite
  parsear hacia un objeto plano sin ejecutar sus propios efectos (por
  ejemplo, commander llama a `process.exit()` internamente cuando procesa
  `--help`); si no lo permite, se pierde la testeabilidad que
  `ADR-figtools-cli.md` fijó como decisión explícita para `parseArgs` (ver
  ahí la sección "Parseo de argumentos y decisión de destino — funciones
  puras, separadas del entrypoint").

### Pregunta abierta

La respuesta depende de quién use este CLI en la práctica: si son personas
que lo descubren de forma interactiva en una terminal, la ausencia de
`--help` es un problema de usabilidad concreto — acá "usabilidad" se
refiere puntualmente a que alguien pueda correr `figtools --help` y
aprender qué flags existen sin leer el código fuente. Si el uso principal
es programático (otro proceso invocando `figtools` con argumentos ya
conocidos de antemano), `--help` no cambia ningún flujo real y el parseo
manual actual ya cubre el caso de uso. Esta es la misma distinción que
`ADR-figtools-cli.md` ya aplica al formato de salida (sección de
volatilidad, citando *Righting Software* cap. 2, sobre soluciones
disfrazadas de requerimientos): sin saber cuál es el requerimiento real
detrás de "que el CLI sea fácil de usar", no se puede evaluar si el costo
de la Opción B se justifica.

### Riesgo de no decidir

Cada flag nueva (`--verbose`, `--config`, un segundo subcomando) se seguiría
agregando a mano dentro de `parseArgs`, sin que quede registrado en ningún
lugar que se evaluó reemplazar ese enfoque — el costo de mantenimiento de
la Opción A crece con cada flag nueva, de forma incremental y silenciosa.

---

## Cómo agregar una decisión nueva a este documento

Cada entrada nueva debería tener esta forma: estado actual (hechos
verificables, con referencia a archivo y línea), opciones evaluadas con sus
tradeoffs, la pregunta abierta que falta responder, y qué pasa si la
decisión sigue sin tomarse.
