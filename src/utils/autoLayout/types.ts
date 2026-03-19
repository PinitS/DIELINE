import type { DielineModelId } from "../../types";

// ---------- Input ----------

export type AutoLayoutPaper = {
  id: string;
  name: string;
  width: number;  // mm
  height: number; // mm
};

export type AutoLayoutModelEntry = {
  id: string; // unique entry id
  modelId: DielineModelId;
  attributes: Record<string, unknown>;
  quantity: number;
};

export type AutoLayoutConfig = {
  papers: AutoLayoutPaper[];
  models: AutoLayoutModelEntry[];
  layoutDistance: number;  // mm – gap between models (offset boundary)
  spacingLeft: number;    // mm
  spacingRight: number;   // mm
  griper: number;         // mm – bottom unusable zone
};

// ---------- Internal ----------

export type Point = { x: number; y: number };

export type ShapePolyline = {
  points: Point[];
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
};

export type PreparedModel = {
  entryId: string;
  modelId: DielineModelId;
  /** Original dieline SVG markup (no dimensions) */
  svgContent: string;
  /** Original SVG bounding box width in mm */
  widthMm: number;
  /** Original SVG bounding box height in mm */
  heightMm: number;
  /** Shape polylines from the SVG */
  shapePolylines: ShapePolyline[];
  /** Boundary polylines (offset outlines for visual display) */
  boundaryPolylines: ShapePolyline[];
};

export type Placement = {
  modelEntryId: string;
  modelId: DielineModelId;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  widthMm: number;
  heightMm: number;
  /** SVG content of this dieline */
  svgContent: string;
  /** Shape polylines positioned at (x, y), possibly rotated */
  shapePolylines: ShapePolyline[];
  /** Boundary polylines positioned at (x, y), possibly rotated */
  boundaryPolylines: ShapePolyline[];
};

// ---------- Output ----------

export type AutoLayoutCalculatorEntry = {
  modelEntryId: string;
  modelId: DielineModelId;
  countPerSheet: number;
};

export type AutoLayoutSurplusEntry = {
  modelEntryId: string;
  modelId: DielineModelId;
  excessCount: number;
};

export type AutoLayoutVariation = {
  placements: Placement[];
  summary: {
    paperLost: number; // percentage 0-100
    calculator: AutoLayoutCalculatorEntry[];
    totalSheets: number;
    surplus: AutoLayoutSurplusEntry[];
  };
  image: Blob;
};

export type AutoLayoutPaperResult = {
  paperId: string;
  paperName: string;
  paperWidth: number;
  paperHeight: number;
  totalSheets: number;
  surplus: AutoLayoutSurplusEntry[];
  variations: AutoLayoutVariation[];
};
