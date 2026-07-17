# Obtener información de nodos y archivos de Figma

ADR: [ADR-figma-scraper-core](../adr/ADR-figma-scraper-core.md)

* El usuario tiene una sesión válida

## Obtener un nodo puntual de un diseño de Figma
* El usuario proporciona la URL de un nodo puntual de un archivo de Figma
* El sistema devuelve ese nodo, incluyendo su tipo, posición, tamaño, estilos, una imagen representativa y la jerarquía completa de sus hijos

## Obtener los nodos de una página de un diseño de Figma
* El usuario proporciona la URL de una página de un archivo de Figma
* El sistema devuelve los nodos de nivel superior de esa página, cada uno con su jerarquía completa de hijos

## Obtener los nodos de la página por defecto de un diseño de Figma
* El usuario proporciona una URL de Figma que no señala ningún nodo en particular
* El sistema devuelve los nodos de nivel superior de la página por defecto del archivo, cada uno con su jerarquía completa de hijos

## Nodo o archivo inexistente o sin acceso
* El usuario proporciona la URL de un nodo o archivo que no existe o al que no tiene acceso
* El sistema devuelve un error indicando que el nodo o archivo no existe o no es accesible
* El sistema no devuelve información parcial

## Rechazar una URL vacía
* El usuario proporciona una URL vacía
* El sistema devuelve un error de validación indicando que la URL no puede estar vacía
* El sistema no intenta obtener ningún dato

## Rechazar una URL que no es de Figma
* El usuario proporciona una URL que no pertenece a Figma
* El sistema devuelve un error de validación indicando que la URL no es de Figma
* El sistema no intenta obtener ningún dato
