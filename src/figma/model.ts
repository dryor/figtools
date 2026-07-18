export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaPaint {
  // Nombre del estilo de color aplicado (ej. "Grayscale/Medium"), cuando el
  // archivo usa un estilo con nombre en vez de un color suelto. null si es
  // un color directo sin estilo.
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
  // Nombre del estilo de texto aplicado (ej. "Body/Caption"), cuando el
  // archivo usa un estilo con nombre. La UI de Figma no expone fontFamily ni
  // fontWeight como campos separados para un texto con estilo aplicado —
  // solo el nombre del estilo y el tamaño/line-height combinados.
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
  // null cuando el campo no existe para este tipo de nodo/estado (ej. un
  // input de tamaño que no se renderiza en auto-layout "Fill"/"Hug"), a
  // diferencia de un valor real de 0.
  position: { x: number | null; y: number | null };
  size: { width: number | null; height: number | null };
  // false si la capa está oculta en Figma (ícono de visibilidad apagado).
  // El nodo se sigue incluyendo en el árbol igual — el consumidor decide si
  // lo filtra.
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
