import type { FigmaScraperCore, FigmaScrapeResult, FigmaScraperError, Result } from "@figtools/core";

export interface UrlResolution {
  url: string;
  result: Result<FigmaScrapeResult, FigmaScraperError>;
}

export async function resolveAll(
  core: FigmaScraperCore,
  urls: string[],
): Promise<UrlResolution[]> {
  const sessionResult = await core.ensureSession();

  if (!sessionResult.ok) {
    return urls.map((url) => ({ url, result: sessionResult }));
  }

  const settled = await Promise.allSettled(urls.map((url) => core.resolveUrl(url)));

  return urls.map((url, i) => {
    const outcome = settled[i];
    if (outcome.status === "fulfilled") {
      return { url, result: outcome.value };
    }
    return {
      url,
      result: {
        ok: false,
        error: { code: "AUTHENTICATION_FAILED" as const, message: "Unexpected error while resolving the URL" },
      },
    };
  });
}
