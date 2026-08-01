import type {
  FigmaSession,
  SessionStore,
  InteractiveLogin,
  FigmaNodeSource,
  FigmaFetchResult,
  FigmaFetchRequest,
} from "../ports";
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
  fetchNode?: (fileKey: string, nodeId: string, request: FigmaFetchRequest) => FigmaFetchResult<RawFigmaNode>;
  fetchDefaultPage?: (fileKey: string, request: FigmaFetchRequest) => FigmaFetchResult<RawFigmaNode>;
}): FigmaNodeSource {
  return {
    async fetchNode(fileKey, nodeId, request) {
      return responses.fetchNode
        ? responses.fetchNode(fileKey, nodeId, request)
        : { status: "not-found-or-no-access" };
    },
    async fetchDefaultPage(fileKey, request) {
      return responses.fetchDefaultPage
        ? responses.fetchDefaultPage(fileKey, request)
        : { status: "not-found-or-no-access" };
    },
  };
}
