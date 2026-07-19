import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FigmaScrapeResult } from "@figtools/core";
import { writeAsJson } from "./json-writer";

const fakeResult: FigmaScrapeResult = {
  id: "1:23",
  name: "Home Screen",
  type: "Frame",
  position: { x: 0, y: 0 },
  size: { width: 800, height: 600 },
  visible: true,
  styles: {},
  image: null,
  children: [],
};

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "figtools-cli-json-writer-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("writeAsJson", () => {
  it("imprime el resultado en stdout cuando no se indica ninguna ruta de salida", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await writeAsJson("ABC123", fakeResult, {});

    expect(logSpy).toHaveBeenCalled();
    const printed = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(printed).toContain("Home Screen");

    logSpy.mockRestore();
  });

  it("doesn't write any file when no output path is given", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await writeAsJson("ABC123", fakeResult, {});

    const entries = await readdir(tmpDir);
    expect(entries).toHaveLength(0);

    logSpy.mockRestore();
  });

  it("escribe el resultado exactamente en la ruta de archivo indicada", async () => {
    const outputPath = join(tmpDir, "resultado.json");

    await writeAsJson("ABC123", fakeResult, { outputPath });

    const contents = await readFile(outputPath, "utf8");
    const parsed = JSON.parse(contents);
    expect(parsed.name).toBe("Home Screen");
  });

  it("crea el directorio indicado si no existe, cuando outputPath es una carpeta", async () => {
    const outputDir = join(tmpDir, "design");

    await writeAsJson("ABC123", fakeResult, { outputPath: outputDir });

    const entries = await readdir(outputDir);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("nombra el archivo dentro del directorio a partir del fileKey y el nodeId", async () => {
    const outputDir = join(tmpDir, "design");

    await writeAsJson("ABC123", fakeResult, { outputPath: outputDir });

    const entries = await readdir(outputDir);
    const match = entries.find((entry) => entry.includes("ABC123") && entry.includes("1-23"));
    expect(match).toBeDefined();
  });

  it("overwrites an existing file with the same name without asking for confirmation", async () => {
    const outputPath = join(tmpDir, "resultado.json");
    await writeAsJson("ABC123", fakeResult, { outputPath });

    const updatedResult: FigmaScrapeResult = { ...fakeResult, name: "Updated Screen" };
    await writeAsJson("ABC123", updatedResult, { outputPath });

    const contents = await readFile(outputPath, "utf8");
    const parsed = JSON.parse(contents);
    expect(parsed.name).toBe("Updated Screen");
  });
});
