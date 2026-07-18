# Obtener información de Figma por línea de comandos

## Obtener la información de una única URL sin flags
* El usuario corre el CLI con una única URL de Figma, sin ningún flag adicional
* El sistema imprime en stdout la información de esa URL, en formato json

## Obtener la información de varias URLs en una sola invocación
* El usuario corre el CLI con varias URLs de Figma que resuelven correctamente
* El sistema imprime la información de cada una de esas URLs

## El fallo de una URL no impide obtener las demás
* El usuario corre el CLI con varias URLs de Figma, y una de ellas no existe o no es accesible
* El sistema imprime la información de las URLs que sí resolvieron

## El resumen final reporta cuáles URLs fallaron y por qué
* El usuario corre el CLI con varias URLs de Figma, y una de ellas no existe o no es accesible
* Al finalizar, el sistema imprime en stderr un resumen que indica esa URL como fallida, junto con el motivo

## Al menos una URL falla
* El usuario corre el CLI con varias URLs de Figma, y una de ellas no existe o no es accesible
* El proceso termina con exit code 1

## Todas las URLs resuelven correctamente
* El usuario corre el CLI con una o varias URLs de Figma, y todas resuelven correctamente
* El proceso termina con exit code 0

## Formato json sin --output imprime a stdout
* El usuario corre el CLI con --format json, sin --output
* El sistema imprime el resultado en stdout
* El sistema no escribe ningún archivo

## Formato markdown sin --output escribe en el directorio actual
* El usuario corre el CLI con --format markdown, sin --output
* El sistema escribe el árbol de archivos markdown en el directorio actual

## --output con extensión .json se interpreta como archivo destino
* El usuario corre el CLI con --format json y --output apuntando a una ruta que termina en .json, resolviendo una única URL
* El sistema escribe el resultado exactamente en esa ruta de archivo

## --output sin ninguna extensión se interpreta como directorio destino
* El usuario corre el CLI con --output apuntando a una ruta sin extensión
* El sistema crea ese directorio si no existe
* El sistema escribe dentro de ese directorio un archivo por URL resuelta, nombrado a partir de su fileKey y nodeId

## Rechazar una extensión de --output no soportada
* El usuario corre el CLI con --output apuntando a una ruta cuya extensión no es .json ni .md
* El sistema devuelve un error indicando que esa extensión no está soportada
* El sistema no intenta resolver ninguna URL
* El proceso termina con exit code 1

## --format markdown con --output siempre se interpreta como directorio
* El usuario corre el CLI con --format markdown y --output apuntando a una ruta con extensión .md
* El sistema trata esa ruta como directorio destino, no como el archivo único de salida

## Formato markdown genera un árbol de archivos navegable
* El usuario corre el CLI con --format markdown sobre una URL cuyo nodo tiene hijos
* El sistema genera un archivo markdown por cada nodo de la jerarquía, dentro de una subcarpeta nombrada según el fileKey de esa URL
* El nodo raíz de esa URL se guarda como index.md dentro de esa subcarpeta
* Cada nodo hijo se guarda como node-<nodeId>.md dentro de esa subcarpeta
* Cada archivo markdown de un nodo con hijos incluye enlaces a los archivos markdown de sus hijos

## Varias URLs con --format markdown no colisionan entre sí
* El usuario corre el CLI con --format markdown y varias URLs que pertenecen a archivos de Figma distintos
* El sistema escribe los archivos markdown de cada URL dentro de una subcarpeta distinta, nombrada según el fileKey de esa URL

## Escribir sobre una carpeta de salida con contenido previo
* El usuario corre el CLI apuntando --output a una carpeta que ya contiene archivos de una corrida anterior con los mismos nombres
* El sistema sobrescribe los archivos que coinciden en nombre, sin pedir confirmación

## Iniciar sesión de forma automática en el primer uso
* El usuario corre el CLI para resolver una URL, sin tener una sesión guardada
* El sistema inicia el proceso de login interactivo automáticamente, sin requerir un comando o flag adicional
* Al completarse el login, el sistema continúa resolviendo la URL solicitada originalmente

## Reutilizar la sesión guardada en usos posteriores
* El usuario corre el CLI para resolver una URL, con una sesión guardada válida
* El sistema resuelve la URL sin iniciar el proceso de login

## Forzar un nuevo login de forma explícita
* El usuario corre el subcomando login del CLI directamente, sin proporcionar ninguna URL
* El sistema inicia el proceso de login interactivo, sin importar si la sesión actual sigue siendo válida
* El sistema guarda la nueva sesión para usos posteriores

## Reducir la salida de progreso con --quiet
* El usuario corre el CLI con --quiet
* El sistema no imprime mensajes de progreso en stderr mientras procesa las URLs
* El sistema sigue imprimiendo el resultado final y el resumen de fallos, si los hay

## Rechazar la invocación sin ninguna URL
* El usuario corre el CLI sin proporcionar ninguna URL
* El sistema devuelve un error de validación indicando que se requiere al menos una URL
* El sistema no inicia ningún proceso de login ni de resolución
* El proceso termina con exit code 1

## Reportar un error de validación de una URL específica
* El usuario corre el CLI con una URL vacía o que no pertenece a Figma, entre los argumentos
* El sistema reporta el error de validación de esa URL específica en el resumen final de stderr
* El sistema continúa procesando el resto de las URLs proporcionadas
