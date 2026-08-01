import type { FigmaScrapeResult, RawFigmaNode } from "./model";
import type { Result, FigmaScraperError } from "./errors";
import type { FigmaSession, SessionStore, InteractiveLogin, FigmaNodeSource, FigmaFetchResult } from "./ports";
import { resolve } from "./build-tree";

export interface FigmaScraperCoreDeps {
  sessionStore: SessionStore;
  interactiveLogin: InteractiveLogin;
  gateway: FigmaNodeSource;
}

export interface FigmaScraperCore {
  resolveUrl(url: string): Promise<Result<FigmaScrapeResult, FigmaScraperError>>;
  reauthenticate(): Promise<Result<FigmaSession, FigmaScraperError>>;
  // Triggers login only if there's no saved session. Unlike
  // reauthenticate(), it doesn't force a new login if the current session
  // is valid.
  ensureSession(): Promise<Result<FigmaSession, FigmaScraperError>>;
}

interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
}

// The URL's node-id uses hyphens ("1-23"); Figma represents it internally
// with ":" ("1:23").
function parseFigmaUrl(url: string): Result<ParsedFigmaUrl, FigmaScraperError> {
  if (url.trim() === "") {
    return { ok: false, error: { code: "VALIDATION_EMPTY_URL", message: "The URL can't be empty" } };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: { code: "VALIDATION_NOT_FIGMA_URL", message: "The URL isn't valid" } };
  }

  if (!parsed.hostname.endsWith("figma.com")) {
    return { ok: false, error: { code: "VALIDATION_NOT_FIGMA_URL", message: "The URL doesn't belong to Figma" } };
  }

  const fileKeyMatch = parsed.pathname.match(/\/(?:file|design|proto|board)\/([^/]+)/);
  const fileKey = fileKeyMatch ? fileKeyMatch[1] : "";
  const rawNodeId = parsed.searchParams.get("node-id");
  const nodeId = rawNodeId ? rawNodeId.replace("-", ":") : null;

  return { ok: true, value: { fileKey, nodeId } };
}

export function createFigmaScraperCore(deps: FigmaScraperCoreDeps): FigmaScraperCore {
  async function login(): Promise<FigmaSession> {
    const session = await deps.interactiveLogin.authenticate();
    await deps.sessionStore.saveSession(session);
    return session;
  }

  async function loadOrLogin(): Promise<FigmaSession> {
    const existing = await deps.sessionStore.getSession();
    return existing ?? login();
  }

  function fetchRaw(parsed: ParsedFigmaUrl, session: FigmaSession): Promise<FigmaFetchResult<RawFigmaNode>> {
    return parsed.nodeId
      ? deps.gateway.fetchNode(parsed.fileKey, parsed.nodeId, session)
      : deps.gateway.fetchDefaultPage(parsed.fileKey, session);
  }

  return {
    async resolveUrl(url) {
      const parsedResult = parseFigmaUrl(url);
      if (!parsedResult.ok) return parsedResult;
      const parsed = parsedResult.value;

      const session = await loadOrLogin();
      let fetchResult = await fetchRaw(parsed, session);

      if (fetchResult.status === "session-expired") {
        let renewed: FigmaSession;
        try {
          renewed = await login();
        } catch {
          return { ok: false, error: { code: "AUTHENTICATION_FAILED", message: "Couldn't log in" } };
        }
        fetchResult = await fetchRaw(parsed, renewed);
      }

      if (fetchResult.status === "not-found-or-no-access") {
        return {
          ok: false,
          error: { code: "NOT_FOUND_OR_NO_ACCESS", message: "The node or file doesn't exist or isn't accessible" },
        };
      }
      if (fetchResult.status === "session-expired") {
        return {
          ok: false,
          error: { code: "AUTHENTICATION_FAILED", message: "The session is still expired after reauthenticating" },
        };
      }
      if (fetchResult.status === "incomplete-node-data") {
        return {
          ok: false,
          error: { code: "INCOMPLETE_NODE_DATA", message: "Couldn't read the node's complete data" },
        };
      }

      return { ok: true, value: resolve(fetchResult.value) };
    },

    async reauthenticate() {
      try {
        const session = await login();
        return { ok: true, value: session };
      } catch {
        return { ok: false, error: { code: "AUTHENTICATION_FAILED", message: "Couldn't complete the login" } };
      }
    },

    async ensureSession() {
      try {
        const session = await loadOrLogin();
        return { ok: true, value: session };
      } catch {
        return { ok: false, error: { code: "AUTHENTICATION_FAILED", message: "Couldn't log in" } };
      }
    },
  };
}
