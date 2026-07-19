import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFigmaScraperCore,
  CookieSessionStore,
  PlaywrightFigmaGateway,
  PlaywrightLogin,
} from "@figtools/core";
import { resolveAll } from "./resolve-all";
import { writeAsJson } from "./output/json-writer";
import { writeAsMarkdownTree } from "./output/markdown-writer";

export type OutputFormat = "json" | "markdown";

export interface ParsedArgs {
  urls: string[];
  format: OutputFormat;
  outputPath?: string;
  quiet: boolean;
  command?: "login";
}

type ParseArgsError = {
  code: "VALIDATION_NO_URLS" | "VALIDATION_UNSUPPORTED_EXTENSION";
  message: string;
};

export type ParseArgsResult =
  | { ok: true; value: ParsedArgs }
  | { ok: false; error: ParseArgsError };

export type OutputTarget =
  | { kind: "stdout" }
  | { kind: "file"; path: string }
  | { kind: "directory"; path: string }
  | { kind: "unsupported-extension"; extension: string };

export function parseArgs(argv: string[]): ParseArgsResult {
  if (argv[0] === "login") {
    return { ok: true, value: { command: "login", urls: [], format: "json", quiet: false } };
  }

  let format: OutputFormat = "json";
  let outputPath: string | undefined;
  let quiet = false;
  const urls: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--format") {
      format = argv[++i] as OutputFormat;
    } else if (arg === "--output") {
      outputPath = argv[++i];
    } else if (arg === "--quiet") {
      quiet = true;
    } else if (!arg.startsWith("--")) {
      urls.push(arg);
    }
  }

  if (urls.length === 0) {
    return {
      ok: false,
      error: { code: "VALIDATION_NO_URLS", message: "At least one Figma URL is required" },
    };
  }

  return { ok: true, value: { urls, format, outputPath, quiet } };
}

export function decideOutputTarget(
  outputPath: string | undefined,
  format: OutputFormat,
): OutputTarget {
  if (!outputPath) {
    return format === "markdown" ? { kind: "directory", path: "." } : { kind: "stdout" };
  }

  if (format === "markdown") {
    return { kind: "directory", path: outputPath };
  }

  const ext = extname(outputPath);
  if (!ext) return { kind: "directory", path: outputPath };
  if (ext === ".json") return { kind: "file", path: outputPath };
  return { kind: "unsupported-extension", extension: ext };
}

function extractFileKey(url: string): string {
  const match = url.match(/\/(?:file|design|proto|board)\/([^/?]+)/);
  return match ? match[1] : url;
}

async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    process.stderr.write(`Error: ${parsed.error.message}\n`);
    process.exit(1);
  }

  const { command, urls, format, outputPath, quiet } = parsed.value;

  const core = createFigmaScraperCore({
    sessionStore: new CookieSessionStore(),
    interactiveLogin: new PlaywrightLogin(),
    gateway: new PlaywrightFigmaGateway(),
  });

  if (command === "login") {
    const result = await core.reauthenticate();
    if (!result.ok) {
      process.stderr.write(`Authentication error: ${result.error.message}\n`);
      process.exit(1);
    }
    process.stderr.write("Logged in successfully.\n");
    process.exit(0);
  }

  const outputTarget = decideOutputTarget(outputPath, format);
  if (outputTarget.kind === "unsupported-extension") {
    process.stderr.write(`Error: unsupported extension "${outputTarget.extension}"\n`);
    process.exit(1);
  }

  if (!quiet) process.stderr.write(`Resolving ${urls.length} URL(s)...\n`);

  const resolutions = await resolveAll(core, urls);

  let hadFailure = false;
  for (const { url, result } of resolutions) {
    if (!result.ok) {
      hadFailure = true;
      continue;
    }

    const fileKey = extractFileKey(url);

    if (format === "markdown") {
      const dir = outputTarget.kind === "directory" ? outputTarget.path : ".";
      await writeAsMarkdownTree(fileKey, result.value, { outputDir: dir });
    } else {
      const writePath =
        outputTarget.kind === "file"
          ? outputTarget.path
          : outputTarget.kind === "directory"
            ? outputTarget.path
            : undefined;
      await writeAsJson(fileKey, result.value, { outputPath: writePath });
    }
  }

  const failures = resolutions.filter((r) => !r.result.ok);
  if (failures.length > 0) {
    process.stderr.write("\nURLs with errors:\n");
    for (const { url, result } of failures) {
      if (!result.ok) {
        process.stderr.write(`  ${url}: ${result.error.code} — ${result.error.message}\n`);
      }
    }
  }

  process.exit(hadFailure ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
