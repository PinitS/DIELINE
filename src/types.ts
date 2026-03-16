import type { CSSProperties } from "react";

export type DisplayUnit = "mm" | "cm" | "in";

export type CircleAttributes = { size: number };
export type RectangleAttributes = { width: number; height: number };
export type TuckEndBoxAttributes = {
  length: number;
  width: number;
  height: number;
  glueFlap?: number;
  topFlap?: number;
  dustFlap?: number;
};

export type DielineBounds = {
  overallWidthMm: number;
  overallHeightMm: number;
};

export type DielineMeasureCallback = (bounds: DielineBounds) => void;

export type DielineCanvasHandle = {
  getOverallWidth: () => number;
  getOverallHeight: () => number;
  resetView: () => void;
};

export type SharedCanvasProps = {
  width?: number | string;
  height?: number | string;
  displayUnit?: DisplayUnit;
  backgroundColor?: string;
  shapeStrokeColor?: string;
  dimensionColor?: string;
  labelColor?: string;
  widthLabel?: string;
  heightLabel?: string;
  showDimensions?: boolean;
  showLabels?: boolean;
  className?: string;
  style?: CSSProperties;
};

export type CircleDielineProps = SharedCanvasProps & {
  attribute: CircleAttributes;
  onMeasure?: DielineMeasureCallback;
};

export type RectangleDielineProps = SharedCanvasProps & {
  attribute: RectangleAttributes;
  onMeasure?: DielineMeasureCallback;
};

export type TuckEndBoxDielineProps = SharedCanvasProps & {
  attribute: TuckEndBoxAttributes;
  onMeasure?: DielineMeasureCallback;
};
