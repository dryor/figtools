export { createFigmaScraperCore } from "./figma/core";
export type { FigmaScraperCore, FigmaScraperCoreDeps } from "./figma/core";

export type {
  FigmaSession,
  SessionStore,
  InteractiveLogin,
  FigmaFetchResult,
  FigmaNodeSource,
  ImageExportFormat,
  FigmaFetchOptions,
  FigmaFetchRequest,
} from "./figma/ports";
export { DEFAULT_FETCH_OPTIONS } from "./figma/ports";

export type {
  FigmaColor,
  FigmaPaint,
  FigmaEffect,
  CommonStyles,
  TypographyStyles,
  FigmaNode,
  FigmaPage,
  FigmaScrapeResult,
  RawFigmaNode,
} from "./figma/model";

export type {
  FigmaScraperErrorCode,
  FigmaScraperError,
  Result,
} from "./figma/errors";

export { CookieSessionStore } from "./adapters/cookie-session-store";
export { PlaywrightFigmaNodeSource } from "./adapters/playwright/playwright-figma-node-source";
export { PlaywrightLogin } from "./adapters/playwright/playwright-login";
