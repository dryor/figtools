import { describe, it, expect } from "vitest";
import { shouldAttemptHiddenTextRead, shouldCaptureImage, shouldCaptureSvg } from "./playwright-figma-node-source";
import type { FigmaFetchRequest } from "../../figma/ports";

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

function fetchRequest(overrides: Partial<Pick<FigmaFetchRequest, "image" | "icons">> = {}): FigmaFetchRequest {
  return {
    session: { credential: "cookie-jar" },
    image: { enabled: false, format: "PNG" },
    icons: { enabled: false },
    ...overrides,
  };
}

describe("get_figma_information: Decide whether to capture a node's image", () => {
  it("doesn't capture when image.enabled is false", () => {
    expect(shouldCaptureImage(fetchRequest({ image: { enabled: false, format: "PNG" } }))).toBe(false);
  });

  it("captures when image.enabled is true", () => {
    expect(shouldCaptureImage(fetchRequest({ image: { enabled: true, format: "JPEG" } }))).toBe(true);
  });
});

describe("get_figma_information: Decide whether to capture a node's SVG code", () => {
  it("doesn't capture when icons.enabled is false, even for an exportable type", () => {
    expect(shouldCaptureSvg("VECTOR", fetchRequest({ icons: { enabled: false } }))).toBe(false);
  });

  it("captures when icons.enabled is true and the type is exportable", () => {
    expect(shouldCaptureSvg("VECTOR", fetchRequest({ icons: { enabled: true } }))).toBe(true);
  });

  it("never captures for a non-exportable type, regardless of icons.enabled", () => {
    expect(shouldCaptureSvg("FRAME", fetchRequest({ icons: { enabled: true } }))).toBe(false);
  });
});
