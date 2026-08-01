import type { RawFigmaNode } from "./model";

export interface FigmaSession {
  credential: string;
}

export interface SessionStore {
  getSession(): Promise<FigmaSession | null>;
  saveSession(session: FigmaSession): Promise<void>;
}

export interface InteractiveLogin {
  authenticate(): Promise<FigmaSession>;
}

// The gateway distinguishes "session expired" from "doesn't exist / no
// access": they're the same kind of HTTP failure in Figma, but the core
// needs to tell them apart to know whether to trigger a re-login on its
// own or return an error to the caller.
export type FigmaFetchResult<T> =
  | { status: "ok"; value: T }
  | { status: "not-found-or-no-access" }
  | { status: "session-expired" }
  // The node exists and is accessible, but Figma didn't show this session
  // any readable properties panel with its data (see
  // adr/ADR-panel-reader-bridge.md).
  | { status: "incomplete-node-data" };

// The real formats Figma's export panel offers for an image (confirmed in
// figma-asset-capturer.ts). Icons are a separate capture (icons.enabled
// below), not a value of this type, since Figma's SVG export doesn't go
// through the image slot in the panel.
export type ImageExportFormat = "PNG" | "JPEG" | "PDF";

// Every field required, nothing optional — the default lives in exactly
// one place (DEFAULT_FETCH_OPTIONS below), not re-derived at each call
// site. See adr/ADR-figtools-core.md for the reasoning (Object Design
// Style Guide §2.4/2.6: an optional field with a default re-checked deep
// in the implementation hides that default from the object's construction
// site). Grouped by asset — format only makes sense when image.enabled is
// true, so nesting it under image makes that dependency structural rather
// than incidental. `icons` (not `svg`): names what the caller is asking
// for, not the export format underneath it — the captured data is still
// SVG markup (RawFigmaNode.svgCode), and the capture mechanism
// (captureSvgCode, canExportAsSvg) still talks about SVG, since that's
// literally what it is.
export interface FigmaFetchOptions {
  image: { enabled: boolean; format: ImageExportFormat };
  icons: { enabled: boolean };
}

// Deliberately off by default: a library shouldn't pay for (or return)
// data the caller didn't ask for. Callers that want the previous
// always-capture behavior opt in explicitly.
export const DEFAULT_FETCH_OPTIONS: FigmaFetchOptions = {
  image: { enabled: false, format: "PNG" },
  icons: { enabled: false },
};

// Bundles the session together with the fetch options instead of keeping
// it a separate positional parameter, so that a future change to make
// session itself optional (a session-less fetch path) is a type edit here,
// not a signature change at every call site again.
export interface FigmaFetchRequest extends FigmaFetchOptions {
  session: FigmaSession;
}

export interface FigmaNodeSource {
  // node-id only makes sense within a file: fileKey is also needed to be
  // able to navigate to the node's real URL.
  fetchNode(fileKey: string, nodeId: string, request: FigmaFetchRequest): Promise<FigmaFetchResult<RawFigmaNode>>;
  fetchDefaultPage(fileKey: string, request: FigmaFetchRequest): Promise<FigmaFetchResult<RawFigmaNode>>;
}
