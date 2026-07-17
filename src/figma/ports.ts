import type { RawFigmaNode } from "./model";

export interface FigmaSession {
  credential: string;
}

export interface SessionStore {
  getSession(): Promise<FigmaSession | null>;
  saveSession(session: FigmaSession): Promise<void>;
}

export interface InteractiveLogin {
  authenticate(): Promise<FigmaSession>;
}

// El gateway distingue "sesión expirada" de "no existe / sin acceso": son la
// misma forma de fallo HTTP en Figma, pero el core necesita diferenciarlas
// para saber si debe disparar un re-login solo o devolver un error al caller.
export type FigmaFetchResult<T> =
  | { status: "ok"; value: T }
  | { status: "not-found-or-no-access" }
  | { status: "session-expired" };

export interface FigmaGateway {
  // El node-id solo tiene sentido dentro de un archivo: hace falta el
  // fileKey también para poder navegar a la URL real del nodo.
  fetchNode(fileKey: string, nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>>;
  fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>>;
}
