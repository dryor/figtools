import { chromium } from "playwright";
import type { FigmaSession, InteractiveLogin } from "../../figma/ports";

export class PlaywrightLogin implements InteractiveLogin {
  async authenticate(): Promise<FigmaSession> {
    const browser = await chromium.launch({ headless: false });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("https://www.figma.com/login");

      // Login manual (incluye el hop por finish_google_sso si el usuario
      // entra con Google); sin timeout porque depende de una persona.
      await page.waitForURL(
        (url) => url.hostname === "www.figma.com" && url.pathname.startsWith("/files"),
        { timeout: 0 }
      );

      const cookies = await context.cookies();
      return { credential: JSON.stringify(cookies) };
    } finally {
      await browser.close();
    }
  }
}
