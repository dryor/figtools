import { describe, it, expect } from "vitest";
import { parseArgs, decideOutputTarget } from "./cli";

describe("parseArgs", () => {
  it("parsea una única URL sin flags con el formato por defecto (json)", () => {
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

  it("rechaza la invocación sin ninguna URL ni subcomando login", () => {
    const result = parseArgs([]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_NO_URLS");
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

  it("con formato json y una ruta sin extensión, el destino es un directorio", () => {
    const target = decideOutputTarget("./design", "json");
    expect(target).toEqual({ kind: "directory", path: "./design" });
  });

  it("con formato markdown, una ruta con extensión .md se interpreta igual como directorio", () => {
    const target = decideOutputTarget("./design.md", "markdown");
    expect(target).toEqual({ kind: "directory", path: "./design.md" });
  });

  it("con formato markdown, una ruta sin extensión se interpreta como directorio", () => {
    const target = decideOutputTarget("./design", "markdown");
    expect(target).toEqual({ kind: "directory", path: "./design" });
  });

  it("rechaza una extensión no soportada en --output", () => {
    const target = decideOutputTarget("resultado.yaml", "json");
    expect(target.kind).toBe("unsupported-extension");
  });
});
