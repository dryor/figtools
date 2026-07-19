# Manage the Figma session

ADR: [ADR-figtools-core](../adr/ADR-figtools-core.md)

## Log in interactively with no previous session
* The user has no valid session
* The user completes the interactive login process
* The system leaves a valid session available for future requests

## Reuse an existing session
* The user already has a valid saved session
* The user requests a node or a file
* The system reuses the existing session without asking to log in again

## Log in again even though the current session is still valid
* The user already has a valid session
* The user starts the login process anyway
* The system completes the login and the new session replaces the previous one

## The session expires during a request
* The user requests a node or a file
* The saved session has already expired
* The system starts the interactive login process instead of returning an error
* Once the login completes, the system returns the node or file that was originally requested
