# Obtener información de nodos y archivos de Figma

ADR: [ADR-figma-scraper-core](../adr/ADR-figma-scraper-core.md)

* El usuario tiene una sesión válida

## Obtener un nodo específico dado su URL con node-id
* El usuario proporciona una URL de Figma con node-id
* El sistema devuelve el nodo correspondiente, incluyendo su tipo, posición, tamaño, estilos, una imagen representativa y la jerarquía completa de sus hijos

## Obtener un archivo completo dado su URL sin node-id
* El usuario proporciona una URL de Figma sin node-id
* El sistema devuelve todas las páginas del archivo
* Cada página incluye sus nodos padre de nivel superior, cada uno con su jerarquía completa de hijos

## Los nodos compartidos entre varios padres no se duplican
* El usuario solicita un archivo que tiene un nodo usado como hijo de dos o más nodos padre distintos
* El sistema devuelve ese nodo una sola vez
* Cada padre que lo usa lo referencia sin repetir su información completa

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
