import type { CSSProperties } from "react";

export type DisplayUnit = "mm" | "cm" | "in";

export type DielineModelDimension = "2D" | "3D";
export type DielineModelId = "circle" | "rectangle" | "tuckEndBox";

export type DielineModelAttributeMetadata = {
  name: string;
  type: "number";
  description: string;
  defaultValue?: number;
};

export type DielineModelMetadata = {
  id: DielineModelId;
  name: string;
  exportName: string;
  componentPath: string;
  dimensionType: DielineModelDimension;
  attributes: readonly DielineModelAttributeMetadata[];
};

export type CircleAttributes = { size?: number };
export type RectangleAttributes = { width?: number; height?: number };
export type TuckEndBoxAttributes = {
  length?: number;
  width?: number;
  height?: number;
  closurePanel?: number;
  dustFlap?: number;
  glueWidth?: number;
  tuckFlap?: number;
};

export type TuckEndBoxRenderMode = "dieline" | "folded3d";

export type DielineBounds = {
  overallWidthMm: number;
  overallHeightMm: number;
};

export type DielineMeasureCallback = (bounds: DielineBounds) => void;

export type TexturePlacement = {
  hasTexture: boolean;
  imageWidth: number;
  imageHeight: number;
  offsetXRatio: number;
  offsetYRatio: number;
  scale: number;
};

export type DielineCanvasHandle = {
  getOverallWidth: () => number;
  getOverallHeight: () => number;
  getOverall: () => DielineBounds;
  resetView: () => void;
  printController: DielinePrintController;
};

export type DielineSvgDocument = {
  svg: string;
  widthMm: number;
  heightMm: number;
};

export type DielinePrintOptions = {
  title?: string;
  displayUnit?: DisplayUnit;
  autoPrint?: boolean;
  closeAfterPrint?: boolean;
  marginMm?: number;
};

export type DielinePrintSvgOptions = Pick<DielinePrintOptions, "displayUnit">;
export type DielinePrintPdfOptions = Omit<DielinePrintOptions, "autoPrint">;

export type DielinePrintController = {
  createPrintSvg: (options?: DielinePrintSvgOptions) => DielineSvgDocument;
  openPrintPreview: (options?: DielinePrintOptions) => Window;
  printToPdf: (options?: DielinePrintPdfOptions) => void;
};

export type SharedCanvasProps = {
  width?: number | string;
  height?: number | string;
  displayUnit?: DisplayUnit;
  backgroundColor?: string;
  textureImageUrl?: string;
  texturePlacement?: TexturePlacement;
  onTexturePlacementChange?: (placement: TexturePlacement) => void;
  allowTextureTransform?: boolean;
  shapeStrokeColor?: string;
  dimensionColor?: string;
  labelColor?: string;
  widthLabel?: string;
  heightLabel?: string;
  showDimensions?: boolean;
  showShapeLines?: boolean;
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
  renderMode?: TuckEndBoxRenderMode;
  frame?: number;
};
