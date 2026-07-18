export type FigmaScraperErrorCode =
  | "VALIDATION_EMPTY_URL"
  | "VALIDATION_NOT_FIGMA_URL"
  | "NOT_FOUND_OR_NO_ACCESS"
  | "AUTHENTICATION_FAILED"
  // El nodo existe y es accesible; el gateway lo confirma pero no encuentra
  // ningún panel de Figma legible con los datos del nodo, según el permiso
  // de la sesión sobre el archivo (ver
  // adr/ADR-panel-reader-bridge.md).
  | "INCOMPLETE_NODE_DATA";

export interface FigmaScraperError {
  code: FigmaScraperErrorCode;
  message: string;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
