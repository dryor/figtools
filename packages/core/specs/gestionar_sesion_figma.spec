# Gestionar la sesión de Figma

ADR: [ADR-figtools-core](../adr/ADR-figtools-core.md)

## Iniciar sesión de forma interactiva sin sesión previa
* El usuario no tiene una sesión válida
* El usuario completa el proceso de login interactivo
* El sistema deja disponible una sesión válida para solicitudes futuras

## Reutilizar una sesión existente
* El usuario ya tiene una sesión válida guardada
* El usuario solicita un nodo o un archivo
* El sistema reutiliza la sesión existente sin pedir login nuevamente

## Iniciar sesión de nuevo aunque la sesión actual siga siendo válida
* El usuario ya tiene una sesión válida
* El usuario inicia el proceso de login de todos modos
* El sistema completa el login y la nueva sesión reemplaza a la anterior

## La sesión expira durante una solicitud
* El usuario solicita un nodo o un archivo
* La sesión guardada ya expiró
* El sistema inicia el proceso de login interactivo en lugar de devolver un error
* Al completarse el login, el sistema devuelve el nodo o archivo que se había solicitado originalmente
