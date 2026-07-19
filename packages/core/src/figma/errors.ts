export type FigmaScraperErrorCode =
  | "VALIDATION_EMPTY_URL"
  | "VALIDATION_NOT_FIGMA_URL"
  | "NOT_FOUND_OR_NO_ACCESS"
  | "AUTHENTICATION_FAILED"
  // The node exists and is accessible; the gateway confirms it but can't
  // find any readable Figma panel with the node's data, depending on the
  // session's permission on the file (see
  // adr/ADR-panel-reader-bridge.md).
  | "INCOMPLETE_NODE_DATA";

export interface FigmaScraperError {
  code: FigmaScraperErrorCode;
  message: string;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
