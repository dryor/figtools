import { describe, it, expect } from "vitest";
import { PlaywrightLogin } from "./playwright-login";

// Real, interactive login: a human has to complete it by hand in the
// browser window that opens. Doesn't run in CI or by default — only when
// explicitly requested, with time to complete it.
const RUN = process.env.FIGMA_E2E_LOGIN === "1";

describe.skipIf(!RUN)("manage_figma_session: Log in interactively with no previous session (real browser)", () => {
  it("returns a session with a non-empty credential after completing the login by hand", async () => {
    const login = new PlaywrightLogin();

    const session = await login.authenticate();

    expect(typeof session.credential).toBe("string");
    expect(session.credential.length).toBeGreaterThan(0);
  }, 5 * 60 * 1000);
});
