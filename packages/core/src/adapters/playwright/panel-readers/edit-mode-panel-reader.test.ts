import { describe, it, expect } from "vitest";
import { EditModePanelReader } from "./edit-mode-panel-reader";

describe("get_figma_information: EditModePanelReader doesn't support the hidden-TEXT-child drill-down", () => {
  it("denies support, since Enter/Escape was never verified in edit mode", () => {
    expect(new EditModePanelReader().supportsHiddenTextChild()).toBe(false);
  });
});
