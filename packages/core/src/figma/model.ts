export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  // Name of the applied color style (e.g. "Grayscale/Medium"), when the
  // file uses a named style instead of a loose color. null if it's a
  // direct color with no style.
  styleName: string | null;
  color: FigmaColor;
}

// Only "Drop shadow" was confirmed against a real session — the panel's
// "Shadows and blurs" section groups by an effect name/type label (seen:
// "Drop shadow") followed by X/Y/Blur/Spread rows and a color+opacity
// pair. Inner shadow / layer blur / background blur weren't found in any
// node explored, so their exact type string isn't confirmed; `type` is
// left as whatever label text the panel actually shows instead of a
// closed union, to avoid asserting a spelling that hasn't been observed.
export interface FigmaEffect {
  type: string;
  x: number | null;
  y: number | null;
  blur: number | null;
  spread: number | null;
  color: FigmaColor | null;
}

export interface CommonStyles {
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: FigmaEffect[];
  opacity?: number;
  blendMode?: string;
  // Auto-layout padding, one field per side. Flat instead of a nested
  // `padding: {...}` object so the markdown writer's generic
  // `Object.entries(styles)` serialization (which doesn't recurse into
  // nested objects) picks them up without any changes on that side.
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  // Spacing between children of an auto-layout container ("Gap" in the
  // inspection panel).
  itemSpacing?: number;
}

export interface TypographyStyles {
  // Name of the applied text style (e.g. "Body/Caption"), when the file
  // uses a named style. Figma's UI doesn't expose fontFamily or
  // fontWeight as separate fields for a text with a style applied — only
  // the style's name and a combined size/line-height.
  styleName: string | null;
  fontFamily: string | null;
  fontWeight: number | null;
  fontSize: number | null;
  lineHeightPx: number | null;
  // The font's named variant (e.g. "Bold", "Regular") — distinct from
  // fontWeight (the numeric value, e.g. 700): a family can expose a named
  // variant whose weight isn't obvious from the number alone.
  style?: string;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: number;
  lineHeightPercent?: number;
  textCase?: string;
  textDecoration?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  // null when the field doesn't exist for this node type/state (e.g. a
  // size input that doesn't render in auto-layout "Fill"/"Hug"), as
  // opposed to a real value of 0.
  position: { x: number | null; y: number | null };
  size: { width: number | null; height: number | null };
  // false if the layer is hidden in Figma (visibility icon off). The node
  // is still included in the tree either way — the consumer decides
  // whether to filter it out.
  visible: boolean;
  styles: CommonStyles & { typography?: TypographyStyles };
  image: File | null;
  // A TEXT node's literal content, read from the panel's own "Content"
  // section — distinct from `name`, the layer's editable label, which can
  // diverge from what the text actually says. null for non-TEXT nodes.
  //
  // Some TEXT nodes never appear in the layers panel tree at all
  // (confirmed in a real session) and are only reachable via a keyboard
  // drill-down while their parent is selected (see
  // PlaywrightFigmaGateway.readHiddenTextChild) — those are still added
  // as a real node under `children`, with their own id/size/styles/
  // characters read in full while the drill-down has them selected, not
  // folded into the parent's own fields.
  characters: string | null;
  children: FigmaNode[];
}

export interface FigmaPage {
  id: string;
  name: string;
  nodes: FigmaNode[];
}

export type FigmaScrapeResult = FigmaNode | FigmaPage;

export interface RawFigmaNode {
  id: string;
  name: string;
  type: string;
  position: { x: number | null; y: number | null };
  size: { width: number | null; height: number | null };
  visible: boolean;
  styles: CommonStyles & { typography?: TypographyStyles };
  image: File | null;
  characters: string | null;
  children: RawFigmaNode[];
}
