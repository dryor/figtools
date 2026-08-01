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

// The gateway distinguishes "session expired" from "doesn't exist / no
// access": they're the same kind of HTTP failure in Figma, but the core
// needs to tell them apart to know whether to trigger a re-login on its
// own or return an error to the caller.
export type FigmaFetchResult<T> =
  | { status: "ok"; value: T }
  | { status: "not-found-or-no-access" }
  | { status: "session-expired" }
  // The node exists and is accessible, but Figma didn't show this session
  // any readable properties panel with its data (see
  // adr/ADR-panel-reader-bridge.md).
  | { status: "incomplete-node-data" };

export interface FigmaNodeSource {
  // node-id only makes sense within a file: fileKey is also needed to be
  // able to navigate to the node's real URL.
  fetchNode(fileKey: string, nodeId: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>>;
  fetchDefaultPage(fileKey: string, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>>;
}
