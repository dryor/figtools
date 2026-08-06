import { describe, it, expect } from "vitest";
import { PlaywrightLogin } from "./playwright-login";

// Always runs under test:e2e. Unlike the other e2e suites, there's no prior
// session to reuse via CookieSessionStore — this test IS the flow that
// creates one, so a human has to complete the login by hand in the browser
// window that opens.
describe("manage_figma_session: Log in interactively with no previous session (real browser)", () => {
  it("returns a session with a non-empty credential after completing the login by hand", async () => {
    const login = new PlaywrightLogin();

    const session = await login.authenticate();

    expect(typeof session.credential).toBe("string");
    expect(session.credential.length).toBeGreaterThan(0);
  }, 5 * 60 * 1000);
});
