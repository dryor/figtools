import { describe, it, expect } from "vitest";
import { detectPanelMode } from "./detect-panel-mode";

// Tests only the decision logic (which mode is chosen given which
// selectors are present), not whether those selectors actually exist in
// Figma's DOM — only the e2e test against a real session confirms that.
function fakeDom(present: string[]) {
  return {
    async hasSelector(selector: string): Promise<boolean> {
      return present.includes(selector);
    },
  };
}

describe("get_figma_information: Detect the available panel mode", () => {
  it("chooses inspection when the inspection panel is present", async () => {
    const dom = fakeDom(["properties-inspection-panel"]);
    expect(await detectPanelMode(dom)).toBe("inspection");
  });

  it("chooses edit when the edit panel is present", async () => {
    const dom = fakeDom(["x-y-inputs-row"]);
    expect(await detectPanelMode(dom)).toBe("edit");
  });

  it("prioritizes inspection if both panels were present at the same time", async () => {
    const dom = fakeDom(["properties-inspection-panel", "x-y-inputs-row"]);
    expect(await detectPanelMode(dom)).toBe("inspection");
  });

  it("chooses none when no known panel is present", async () => {
    const dom = fakeDom([]);
    expect(await detectPanelMode(dom)).toBe("none");
  });
});
