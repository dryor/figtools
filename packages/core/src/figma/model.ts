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

export interface CommonStyles {
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: unknown[];
  opacity?: number;
  blendMode?: string;
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
  children: RawFigmaNode[];
}
