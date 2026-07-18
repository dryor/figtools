import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { FigmaScrapeResult } from "@figtools/core";

export interface JsonWriterOptions {
  outputPath?: string;
}

export async function writeAsJson(
  fileKey: string,
  result: FigmaScrapeResult,
  options: JsonWriterOptions,
): Promise<void> {
  const json = JSON.stringify(result, null, 2);

  if (!options.outputPath) {
    console.log(json);
    return;
  }

  const { outputPath } = options;

  if (extname(outputPath) === ".json") {
    await writeFile(outputPath, json, "utf8");
    return;
  }

  await mkdir(outputPath, { recursive: true });
  const nodeId = result.id.replace(/:/g, "-");
  await writeFile(join(outputPath, `${fileKey}-${nodeId}.json`), json, "utf8");
}
