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

function fetchRequest(overrides: Partial<Pick<FigmaFetchRequest, "image" | "svg">> = {}): FigmaFetchRequest {
  return {
    session: { credential: "cookie-jar" },
    image: { enabled: false, format: "PNG" },
    svg: { enabled: false },
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
  it("doesn't capture when svg.enabled is false, even for an exportable type", () => {
    expect(shouldCaptureSvg("VECTOR", fetchRequest({ svg: { enabled: false } }))).toBe(false);
  });

  it("captures when svg.enabled is true and the type is exportable", () => {
    expect(shouldCaptureSvg("VECTOR", fetchRequest({ svg: { enabled: true } }))).toBe(true);
  });

  it("never captures for a non-exportable type, regardless of svg.enabled", () => {
    expect(shouldCaptureSvg("FRAME", fetchRequest({ svg: { enabled: true } }))).toBe(false);
  });
});
