export { createFigmaScraperCore } from "./figma/core";
export type { FigmaScraperCore, FigmaScraperCoreDeps } from "./figma/core";

export type {
  FigmaSession,
  SessionStore,
  InteractiveLogin,
  FigmaFetchResult,
  FigmaGateway,
} from "./figma/ports";

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
export { PlaywrightFigmaGateway } from "./adapters/playwright/playwright-figma-gateway";
export { PlaywrightLogin } from "./adapters/playwright/playwright-login";
