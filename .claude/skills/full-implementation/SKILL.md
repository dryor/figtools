---
name: full-implementation
description: Crea en un solo paso tanto la implementación de la vista como la interfaz de servicio con su stub en memoria — el equivalente combinado de /view-implementation + /placeholder-implementation. Usar cuando una sola persona (o un solo agente) vaya a encargarse de ambas partes sin necesidad de correrlas por separado.
---

# /full-implementation — Vista + servicio en un solo paso

## Qué hace
Es el equivalente combinado de `/view-implementation` + `/placeholder-implementation` en un solo punto de entrada — para cuando no hace falta que dos personas o dos agentes trabajen en paralelo en vista y servicio por separado. No tiene lógica propia distinta a la de esos dos comandos; produce la unión de ambos outputs.

## Referencias
Mismas referencias que `/view-implementation` y `/placeholder-implementation` — ver esos `SKILL.md`.

## Cuándo preferir este sobre los dos comandos separados
Si el trabajo lo va a hacer una sola persona/agente de punta a punta, este comando evita el overhead de invocar dos skills por separado. Si en cambio dos personas van a trabajar la vista y el servicio en paralelo, es mejor usar `/view-implementation` y `/placeholder-implementation` por separado.

## Ejemplo
Produce ambos archivos del ejemplo de `/view-implementation` y `/placeholder-implementation` juntos: el componente + su story aislada, y la interfaz de servicio + su stub en memoria.
