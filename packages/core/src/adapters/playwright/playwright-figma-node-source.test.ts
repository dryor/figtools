import { describe, it, expect } from "vitest";
import { shouldAttemptHiddenTextRead } from "./playwright-figma-node-source";

describe("get_figma_information: Decide when to attempt the hidden-TEXT-child drill-down", () => {
  it("doesn't attempt it when the node already has children from the normal mechanism", () => {
    expect(shouldAttemptHiddenTextRead({ childIds: ["2:6"], supportsHiddenTextChild: true })).toBe(false);
  });

  it("doesn't attempt it when the active reader never confirmed support for it (edit mode)", () => {
    expect(shouldAttemptHiddenTextRead({ childIds: [], supportsHiddenTextChild: false })).toBe(false);
  });

  it("attempts it when the node has no children found by the normal mechanism and the reader supports it", () => {
    expect(shouldAttemptHiddenTextRead({ childIds: [], supportsHiddenTextChild: true })).toBe(true);
  });
});
