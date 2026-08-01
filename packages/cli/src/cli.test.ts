import { describe, it, expect } from "vitest";
import { parseArgs, decideOutputTarget } from "./cli";

describe("parseArgs", () => {
  it("parses a single URL with no flags using the default format (json)", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.urls).toEqual(["https://www.figma.com/design/ABC123"]);
      expect(result.value.format).toBe("json");
      expect(result.value.outputPath).toBeUndefined();
    }
  });

  it("parsea varias URLs como argumentos posicionales", () => {
    const urls = [
      "https://www.figma.com/design/AAA",
      "https://www.figma.com/design/BBB",
      "https://www.figma.com/design/CCC",
    ];

    const result = parseArgs(urls);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.urls).toEqual(urls);
    }
  });

  it("parsea --format markdown", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--format", "markdown"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe("markdown");
    }
  });

  it("parsea --output con su valor", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--output", "./design"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outputPath).toBe("./design");
    }
  });

  it("parsea --quiet", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--quiet"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.quiet).toBe(true);
    }
  });

  it("quiet es false por defecto", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.quiet).toBe(false);
    }
  });

  it("reconoce el subcomando login sin requerir ninguna URL", () => {
    const result = parseArgs(["login"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.command).toBe("login");
      expect(result.value.urls).toEqual([]);
    }
  });

  it("rejects the invocation with no URL and no login subcommand", () => {
    const result = parseArgs([]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_NO_URLS");
    }
  });

  it("--help returns generated help text instead of an error", () => {
    const result = parseArgs(["--help"]);

    expect(result.ok).toBe(false);
    if (!result.ok && "info" in result) {
      expect(result.info.code).toBe("HELP_DISPLAYED");
      expect(result.info.output).toContain("Usage: figtools");
    } else {
      expect.fail("expected an info result with HELP_DISPLAYED");
    }
  });

  it("rejects an invalid --format value instead of silently defaulting to json", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--format", "xml"]);

    expect(result.ok).toBe(false);
    if (!result.ok && "error" in result) {
      expect(result.error.code).toBe("COMMANDER_ERROR");
      expect(result.error.message).toContain("json, markdown");
    } else {
      expect.fail("expected an error result for an invalid --format value");
    }
  });

  it("rejects an unknown flag instead of silently ignoring it", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--unknown-flag"]);

    expect(result.ok).toBe(false);
    if (!result.ok && "error" in result) {
      expect(result.error.code).toBe("COMMANDER_ERROR");
    } else {
      expect.fail("expected an error result for an unknown flag");
    }
  });

  it("--image-format png sets imageFormat to png", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--image-format", "png"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imageFormat).toBe("png");
    }
  });

  it("imageFormat defaults to png when --image-format is omitted", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imageFormat).toBe("png");
    }
  });

  it("rejects an invalid --image-format value", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--image-format", "gif"]);

    expect(result.ok).toBe(false);
    if (!result.ok && "error" in result) {
      expect(result.error.code).toBe("COMMANDER_ERROR");
      expect(result.error.message).toContain("png, jpg, pdf");
    } else {
      expect.fail("expected an error result for an invalid --image-format value");
    }
  });

  it("images defaults to false when --images is omitted", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.images).toBe(false);
    }
  });

  it("--images sets images to true", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--images"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.images).toBe(true);
    }
  });

  it("svg defaults to false when --svg is omitted", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.svg).toBe(false);
    }
  });

  it("--svg sets svg to true", () => {
    const result = parseArgs(["https://www.figma.com/design/ABC123", "--svg"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.svg).toBe(true);
    }
  });
});

describe("decideOutputTarget", () => {
  it("sin outputPath y formato json, el destino es stdout", () => {
    const target = decideOutputTarget(undefined, "json");
    expect(target).toEqual({ kind: "stdout" });
  });

  it("sin outputPath y formato markdown, el destino es el directorio actual", () => {
    const target = decideOutputTarget(undefined, "markdown");
    expect(target).toEqual({ kind: "directory", path: "." });
  });

  it("con formato json y una ruta terminada en .json, el destino es un archivo", () => {
    const target = decideOutputTarget("resultado.json", "json");
    expect(target).toEqual({ kind: "file", path: "resultado.json" });
  });

  it("with json format and a path with no extension, the destination is a directory", () => {
    const target = decideOutputTarget("./design", "json");
    expect(target).toEqual({ kind: "directory", path: "./design" });
  });

  it("with markdown format, a path with a .md extension is still interpreted as a directory", () => {
    const target = decideOutputTarget("./design.md", "markdown");
    expect(target).toEqual({ kind: "directory", path: "./design.md" });
  });

  it("with markdown format, a path with no extension is interpreted as a directory", () => {
    const target = decideOutputTarget("./design", "markdown");
    expect(target).toEqual({ kind: "directory", path: "./design" });
  });

  it("rejects an unsupported extension in --output", () => {
    const target = decideOutputTarget("resultado.yaml", "json");
    expect(target.kind).toBe("unsupported-extension");
  });
});
