import { describe, it, expect, vi } from "vitest";
import { createFigmaScraperCore } from "./core";
import type { FigmaNode, FigmaPage, RawFigmaNode } from "./model";
import { createFakeSessionStore, createFakeInteractiveLogin, createFakeGateway } from "./testing/fakes";

const VALID_SESSION = { credential: "cookie-jar-abc" };

function makeCore(overrides: Partial<{
  sessionStore: ReturnType<typeof createFakeSessionStore>;
  interactiveLogin: ReturnType<typeof createFakeInteractiveLogin>;
  gateway: ReturnType<typeof createFakeGateway>;
}> = {}) {
  const sessionStore = overrides.sessionStore ?? createFakeSessionStore(VALID_SESSION);
  const interactiveLogin = overrides.interactiveLogin ?? createFakeInteractiveLogin(VALID_SESSION);
  const gateway = overrides.gateway ?? createFakeGateway({});
  return { core: createFigmaScraperCore({ sessionStore, interactiveLogin, gateway }), sessionStore, interactiveLogin, gateway };
}

function rawElement(overrides: Partial<RawFigmaNode> = {}): RawFigmaNode {
  return {
    id: "1:23", name: "Button", type: "COMPONENT",
    position: { x: 10, y: 20 }, size: { width: 100, height: 40 },
    visible: true, styles: {}, image: null, children: [],
    ...overrides,
  };
}

function rawPage(overrides: Partial<RawFigmaNode> = {}): RawFigmaNode {
  return {
    id: "0:1", name: "Page 1", type: "CANVAS",
    position: { x: 0, y: 0 }, size: { width: 0, height: 0 },
    visible: true, styles: {}, image: null,
    children: [rawElement({ id: "1:10", name: "Frame", type: "FRAME" })],
    ...overrides,
  };
}

describe("get_figma_information: Get a specific node from a Figma design", () => {
  it("returns the node with type, position, size, styles, image, and children hierarchy", async () => {
    const raw = rawElement({ children: [rawElement({ id: "1:24", name: "Label", type: "TEXT" })] });
    const { core } = makeCore({
      gateway: createFakeGateway({ fetchNode: () => ({ status: "ok", value: raw }) }),
    });

    const result = await core.resolveUrl("https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23");

    expect(result.ok).toBe(true);
    const node = (result as { ok: true; value: FigmaNode }).value;
    expect(node.id).toBe("1:23");
    expect(node.type).toBe("COMPONENT");
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.size).toEqual({ width: 100, height: 40 });
    expect(node.children).toHaveLength(1);
    expect(node.children[0].id).toBe("1:24");
  });
});

describe("get_figma_information: Get the nodes of a page in a Figma design", () => {
  it("when node-id points to a CANVAS, returns a page with its top-level nodes", async () => {
    const raw = rawPage();
    const { core } = makeCore({
      gateway: createFakeGateway({ fetchNode: () => ({ status: "ok", value: raw }) }),
    });

    const result = await core.resolveUrl("https://www.figma.com/design/ABC123/Mi-Diseno?node-id=0-1");

    expect(result.ok).toBe(true);
    const page = (result as { ok: true; value: FigmaPage }).value;
    expect(page.id).toBe("0:1");
    expect(page.name).toBe("Page 1");
    expect(page.nodes).toHaveLength(1);
    expect(page.nodes[0].id).toBe("1:10");
  });
});

describe("get_figma_information: Get the nodes of the default page in a Figma design", () => {
  it("with no node-id in the URL, requests the default page from the gateway using the fileKey", async () => {
    const raw = rawPage();
    const fetchDefaultPage = vi.fn(() => ({ status: "ok" as const, value: raw }));
    const { core } = makeCore({
      gateway: createFakeGateway({ fetchDefaultPage }),
    });

    const result = await core.resolveUrl("https://www.figma.com/design/ABC123/Mi-Diseno");

    expect(fetchDefaultPage).toHaveBeenCalledWith("ABC123", {
      session: VALID_SESSION,
      image: { enabled: false, format: "PNG" },
      icons: { enabled: false },
    });
    expect(result.ok).toBe(true);
    const page = (result as { ok: true; value: FigmaPage }).value;
    expect(page.nodes).toHaveLength(1);
  });
});

describe("get_figma_information: Fetch options (image/svg capture)", () => {
  it("without overrides, uses DEFAULT_FETCH_OPTIONS (image and svg capture off)", async () => {
    const raw = rawElement();
    const fetchNode = vi.fn(() => ({ status: "ok" as const, value: raw }));
    const { core } = makeCore({ gateway: createFakeGateway({ fetchNode }) });

    await core.resolveUrl("https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23");

    expect(fetchNode).toHaveBeenCalledWith("ABC123", "1:23", {
      session: VALID_SESSION,
      image: { enabled: false, format: "PNG" },
      icons: { enabled: false },
    });
  });

  it("merges the given overrides onto DEFAULT_FETCH_OPTIONS and forwards them to the gateway", async () => {
    const raw = rawElement();
    const fetchNode = vi.fn(() => ({ status: "ok" as const, value: raw }));
    const { core } = makeCore({ gateway: createFakeGateway({ fetchNode }) });

    await core.resolveUrl("https://www.figma.com/design/ABC123/Mi-Diseno?node-id=1-23", {
      image: { enabled: true, format: "JPEG" },
      icons: { enabled: true },
    });

    expect(fetchNode).toHaveBeenCalledWith("ABC123", "1:23", {
      session: VALID_SESSION,
      image: { enabled: true, format: "JPEG" },
      icons: { enabled: true },
    });
  });
});

describe("get_figma_information: Nonexistent or inaccessible node or file", () => {
  it("devuelve un error sin datos parciales", async () => {
    const { core } = makeCore({
      gateway: createFakeGateway({ fetchNode: () => ({ status: "not-found-or-no-access" }) }),
    });

    const result = await core.resolveUrl("https://www.figma.com/design/DOESNOTEXIST?node-id=1-1");

    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND_OR_NO_ACCESS", message: expect.any(String) },
    });
  });
});

describe("get_figma_information: Reject an empty URL", () => {
  it("returns a validation error without calling the gateway", async () => {
    const fetchNode = vi.fn();
    const fetchDefaultPage = vi.fn();
    const { core } = makeCore({ gateway: createFakeGateway({ fetchNode, fetchDefaultPage }) });

    const result = await core.resolveUrl("");

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: { code: string } }).error.code).toBe("VALIDATION_EMPTY_URL");
    expect(fetchNode).not.toHaveBeenCalled();
    expect(fetchDefaultPage).not.toHaveBeenCalled();
  });
});

describe("get_figma_information: Reject a URL that isn't from Figma", () => {
  it("returns a validation error without calling the gateway", async () => {
    const { core } = makeCore();

    const result = await core.resolveUrl("https://www.google.com");

    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: { code: string } }).error.code).toBe("VALIDATION_NOT_FIGMA_URL");
  });
});
