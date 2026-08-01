import type { FigmaSession, SessionStore, InteractiveLogin, FigmaNodeSource, FigmaFetchResult } from "../ports";
import type { RawFigmaNode } from "../model";

export function createFakeSessionStore(initial: FigmaSession | null = null) {
  const store = {
    current: initial,
    async getSession(): Promise<FigmaSession | null> {
      return store.current;
    },
    async saveSession(session: FigmaSession): Promise<void> {
      store.current = session;
    },
  };
  return store;
}

export function createFakeInteractiveLogin(session: FigmaSession) {
  const login = {
    calls: 0,
    async authenticate(): Promise<FigmaSession> {
      login.calls++;
      return session;
    },
  };
  return login;
}

export function createFakeGateway(responses: {
  fetchNode?: (fileKey: string, nodeId: string) => FigmaFetchResult<RawFigmaNode>;
  fetchDefaultPage?: (fileKey: string) => FigmaFetchResult<RawFigmaNode>;
}): FigmaNodeSource {
  return {
    async fetchNode(fileKey, nodeId) {
      return responses.fetchNode ? responses.fetchNode(fileKey, nodeId) : { status: "not-found-or-no-access" };
    },
    async fetchDefaultPage(fileKey) {
      return responses.fetchDefaultPage ? responses.fetchDefaultPage(fileKey) : { status: "not-found-or-no-access" };
    },
  };
}
