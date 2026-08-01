import { realpathSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Command, CommanderError, InvalidArgumentError } from "commander";
import {
  createFigmaScraperCore,
  CookieSessionStore,
  PlaywrightFigmaNodeSource,
  PlaywrightLogin,
  type ImageExportFormat,
} from "@figtools/core";
import { resolveAll } from "./resolve-all";
import { writeAsJson } from "./output/json-writer";
import { writeAsMarkdownTree } from "./output/markdown-writer";
import packageJson from "../package.json" with { type: "json" };

export type OutputFormat = "json" | "markdown";

// 1:1 with what Figma's export panel actually offers (PNG, JPEG, PDF —
// confirmed in @figtools/core's figma-asset-capturer.ts). "webp" was
// dropped: it isn't a real Figma export option, so it used to silently
// write PNG bytes under a .webp extension.
export type ImageFormat = "png" | "jpg" | "pdf";

const IMAGE_EXPORT_FORMATS: Record<ImageFormat, ImageExportFormat> = { png: "PNG", jpg: "JPEG", pdf: "PDF" };

export interface ParsedArgs {
  urls: string[];
  format: OutputFormat;
  outputPath?: string;
  imageFormat: ImageFormat;
  // Off by default, matching @figtools/core's DEFAULT_FETCH_OPTIONS — a
  // deliberate choice, not an oversight (see ADR-figtools-cli.md).
  images: boolean;
  // Maps to core's FigmaFetchOptions.svg.enabled — named "icons" at the
  // CLI boundary since that's what a user asks for; "svg" is the accurate
  // name for the underlying Figma export mechanism, kept as-is in core.
  icons: boolean;
  quiet: boolean;
  command?: "login";
}

type ParseArgsError = {
  code: "VALIDATION_NO_URLS" | "VALIDATION_UNSUPPORTED_EXTENSION" | "COMMANDER_ERROR";
  message: string;
};

// help/version end parsing without being a validation error: commander
// already generated the text (help or version number) and expects the
// caller to print it and exit with code 0, instead of treating it as a
// failure.
type ParseArgsInfo = { code: "HELP_DISPLAYED" | "VERSION_DISPLAYED"; output: string };

export type ParseArgsResult =
  | { ok: true; value: ParsedArgs }
  | { ok: false; error: ParseArgsError }
  | { ok: false; info: ParseArgsInfo };

export type OutputTarget =
  | { kind: "stdout" }
  | { kind: "file"; path: string }
  | { kind: "directory"; path: string }
  | { kind: "unsupported-extension"; extension: string };

interface ResolveOpts {
  format: OutputFormat;
  output?: string;
  imageFormat: ImageFormat;
  images: boolean;
  icons: boolean;
  quiet: boolean;
}

// login is the only named subcommand; resolve is marked as the
// "default command" (isDefault: true) so `figtools <urls...>` keeps
// working without having to write `figtools resolve <urls...>` —
// commander dispatches to resolve automatically whenever the first
// argument doesn't match a known subcommand name (see command.js:
// _defaultCommandName).
function createProgram(): { program: Command; getParsed: () => ParsedArgs | undefined; getOutput: () => string } {
  let output = "";
  let parsed: ParsedArgs | undefined;

  const program = new Command()
    .name("figtools")
    .description(packageJson.description)
    .version(packageJson.version, "-v, --version")
    .exitOverride()
    .configureOutput({
      writeOut: (str) => {
        output += str;
      },
      writeErr: (str) => {
        output += str;
      },
    });

  const resolveCommand = program
    .command("resolve", { isDefault: true })
    .description("Resolve one or more Figma URLs and write the result")
    .argument("<urls...>", "One or more Figma URLs to resolve")
    .option("--format <format>", "Output format (json or markdown)", parseFormat, "json")
    .option("--image-format <format>", "Image format for node previews (png, jpg, pdf)", parseImageFormat, "png")
    .option("--images", "Capture a preview image for each node (off by default)", false)
    .option("--icons", "Capture SVG code for exportable nodes (off by default)", false)
    .option("--output <path>", "File or directory to write the result to")
    .option("--quiet", "Suppress progress messages on stderr", false)
    .action((urls: string[], opts: ResolveOpts) => {
      parsed = {
        urls,
        format: opts.format,
        outputPath: opts.output,
        imageFormat: opts.imageFormat,
        images: opts.images,
        icons: opts.icons,
        quiet: opts.quiet,
      };
    });
  resolveCommand.exitOverride();

  const loginCommand = program
    .command("login")
    .description("Force a new interactive login, discarding any saved session")
    .action(() => {
      parsed = { command: "login", urls: [], format: "json", imageFormat: "png", images: false, icons: false, quiet: false };
    });
  loginCommand.exitOverride();

  return { program, getParsed: () => parsed, getOutput: () => output };
}

function parseFormat(value: string): OutputFormat {
  if (value !== "json" && value !== "markdown") {
    throw new InvalidArgumentError("Allowed choices are json, markdown.");
  }
  return value;
}

function parseImageFormat(value: string): ImageFormat {
  if (value !== "png" && value !== "jpg" && value !== "pdf") {
    throw new InvalidArgumentError("Allowed choices are png, jpg, pdf.");
  }
  return value;
}

export function parseArgs(argv: string[]): ParseArgsResult {
  const { program, getParsed, getOutput } = createProgram();

  try {
    program.parse(argv, { from: "user" });
  } catch (err) {
    if (err instanceof CommanderError) {
      if (err.code === "commander.helpDisplayed") {
        return { ok: false, info: { code: "HELP_DISPLAYED", output: getOutput() } };
      }
      if (err.code === "commander.version") {
        return { ok: false, info: { code: "VERSION_DISPLAYED", output: getOutput() } };
      }
      if (err.code === "commander.missingArgument") {
        return {
          ok: false,
          error: { code: "VALIDATION_NO_URLS", message: "At least one Figma URL is required" },
        };
      }
      return { ok: false, error: { code: "COMMANDER_ERROR", message: getOutput() || err.message } };
    }
    throw err;
  }

  const value = getParsed();
  if (!value) {
    // Shouldn't be reachable in normal use: if parsing didn't fail and no
    // action() ran, it means no argument at all was passed.
    return {
      ok: false,
      error: { code: "VALIDATION_NO_URLS", message: "At least one Figma URL is required" },
    };
  }

  return { ok: true, value };
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
  if (!parsed.ok && "info" in parsed) {
    process.stdout.write(parsed.info.output);
    process.exit(0);
  }
  if (!parsed.ok) {
    process.stderr.write(`Error: ${parsed.error.message}\n`);
    process.exit(1);
  }

  const { command, urls, format, outputPath, imageFormat, images, icons, quiet } = parsed.value;

  const core = createFigmaScraperCore({
    sessionStore: new CookieSessionStore(),
    interactiveLogin: new PlaywrightLogin(),
    gateway: new PlaywrightFigmaNodeSource(),
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

  const resolutions = await resolveAll(core, urls, {
    image: { enabled: images, format: IMAGE_EXPORT_FORMATS[imageFormat] },
    svg: { enabled: icons },
  });

  let hadFailure = false;
  for (const { url, result } of resolutions) {
    if (!result.ok) {
      hadFailure = true;
      continue;
    }

    const fileKey = extractFileKey(url);

    if (format === "markdown") {
      const dir = outputTarget.kind === "directory" ? outputTarget.path : ".";
      await writeAsMarkdownTree(fileKey, result.value, { outputDir: dir, imageFormat });
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

// process.argv[1] and import.meta.url can point at the same file through
// different paths — a package manager (pnpm always, npm/yarn for global
// installs) resolves the bin to a symlink, while import.meta.url reports
// the real path Node loaded the module from. Comparing realpaths on both
// sides keeps the guard true when this file runs as the CLI entry point,
// whether invoked directly or through a symlinked bin.
function isMainModule(): boolean {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main(process.argv.slice(2));
}
