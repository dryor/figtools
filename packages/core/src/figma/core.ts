import type { FigmaScrapeResult, RawFigmaNode } from "./model";
import type { Result, FigmaScraperError } from "./errors";
import type { FigmaSession, SessionStore, InteractiveLogin, FigmaGateway, FigmaFetchResult } from "./ports";
import { resolve } from "./build-tree";

export interface FigmaScraperCoreDeps {
  sessionStore: SessionStore;
  interactiveLogin: InteractiveLogin;
  gateway: FigmaGateway;
}

export interface FigmaScraperCore {
  resolveUrl(url: string): Promise<Result<FigmaScrapeResult, FigmaScraperError>>;
  reauthenticate(): Promise<Result<FigmaSession, FigmaScraperError>>;
}

interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string | null;
}

// El node-id de la URL usa guiones ("1-23"); Figma lo representa con ":"
// internamente ("1:23").
function parseFigmaUrl(url: string): Result<ParsedFigmaUrl, FigmaScraperError> {
  if (url.trim() === "") {
    return { ok: false, error: { code: "VALIDATION_EMPTY_URL", message: "La URL no puede estar vacía" } };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: { code: "VALIDATION_NOT_FIGMA_URL", message: "La URL no es válida" } };
  }

  if (!parsed.hostname.endsWith("figma.com")) {
    return { ok: false, error: { code: "VALIDATION_NOT_FIGMA_URL", message: "La URL no pertenece a Figma" } };
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

  async function ensureSession(): Promise<FigmaSession> {
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

      const session = await ensureSession();
      let fetchResult = await fetchRaw(parsed, session);

      if (fetchResult.status === "session-expired") {
        let renewed: FigmaSession;
        try {
          renewed = await login();
        } catch {
          return { ok: false, error: { code: "AUTHENTICATION_FAILED", message: "No se pudo iniciar sesión" } };
        }
        fetchResult = await fetchRaw(parsed, renewed);
      }

      if (fetchResult.status === "not-found-or-no-access") {
        return {
          ok: false,
          error: { code: "NOT_FOUND_OR_NO_ACCESS", message: "El nodo o archivo no existe o no es accesible" },
        };
      }
      if (fetchResult.status === "session-expired") {
        return {
          ok: false,
          error: { code: "AUTHENTICATION_FAILED", message: "La sesión sigue expirada después de reautenticar" },
        };
      }
      if (fetchResult.status === "incomplete-node-data") {
        return {
          ok: false,
          error: { code: "INCOMPLETE_NODE_DATA", message: "No se pudo leer los datos completos del nodo" },
        };
      }

      return { ok: true, value: resolve(fetchResult.value) };
    },

    async reauthenticate() {
      try {
        const session = await login();
        return { ok: true, value: session };
      } catch {
        return { ok: false, error: { code: "AUTHENTICATION_FAILED", message: "No se pudo completar el login" } };
      }
    },
  };
}
