import type { FigmaSession, SessionStore, InteractiveLogin, FigmaGateway, FigmaFetchResult } from "../ports";
import type { RawFigmaNode, RawFigmaFile } from "../model";

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
  fetchNode?: (nodeId: string) => FigmaFetchResult<RawFigmaNode>;
  fetchFile?: (fileKey: string) => FigmaFetchResult<RawFigmaFile>;
}): FigmaGateway {
  return {
    async fetchNode(nodeId) {
      return responses.fetchNode ? responses.fetchNode(nodeId) : { status: "not-found-or-no-access" };
    },
    async fetchFile(fileKey) {
      return responses.fetchFile ? responses.fetchFile(fileKey) : { status: "not-found-or-no-access" };
    },
  };
}
