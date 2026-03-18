import type {
  Becf10a0aAttributes,
  Becf11d01Attributes,
  CircleAttributes,
  DielineModelId,
  DielinePrintController,
  DielinePrintOptions,
  DielinePrintPdfOptions,
  DielinePrintSvgOptions,
  DielineSvgDocument,
  DisplayUnit,
  RectangleAttributes,
  TuckEndBoxAttributes,
} from "../types";
import { getBecf10a0aGeometry } from "./becf10a0aGeometry";
import { getBecf11d01Geometry } from "./becf11d01Geometry";
import { getTuckEndBoxGeometry } from "./becf10803Geometry";
import { measureBecf10a0aBounds, measureBecf11d01Bounds, measureCircleBounds, measureRectangleBounds } from "./measure";
import { formatDielineDisplayValue } from "./units";

const PDF_MARGIN_MM = 10;
const SVG_PADDING_MM = 2;
const CUT_LINE_COLOR = "#000000";
const CUT_LINE_WIDTH_MM = 0.3;
const FOLD_LINE_COLOR = "#22c55e";
const FOLD_LINE_WIDTH_MM = 0.25;
const FOLD_DASH_ARRAY = "3 2";
const DIMENSION_COLOR = "#111111";
const DIMENSION_LINE_WIDTH_MM = 0.25;
const CIRCLE_SEGMENTS = 96;

type Point = { x: number; y: number };
type Polyline = { points: Point[]; stroke: string; strokeWidth: number; dashArray?: string };
type Label = { x: number; y: number; text: string; fontSize: number; rotate?: boolean };
type ExportGeometry = { polylines: Polyline[]; labels: Label[] };
type ExportBounds = { left: number; top: number; right: number; bottom: number };

export type DielinePrintData = {
  modelId: DielineModelId;
  attributes: CircleAttributes | RectangleAttributes | TuckEndBoxAttributes | Becf11d01Attributes | Becf10a0aAttributes;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const estimateTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.55;

const includePoint = (bounds: ExportBounds, point: Point): ExportBounds => ({
  left: Math.min(bounds.left, point.x),
  top: Math.min(bounds.top, point.y),
  right: Math.max(bounds.right, point.x),
  bottom: Math.max(bounds.bottom, point.y),
});

const includeLabel = (bounds: ExportBounds, label: Label): ExportBounds => {
  const textWidth = estimateTextWidth(label.text, label.fontSize);
  const halfWidth = label.rotate ? label.fontSize * 0.6 : textWidth / 2;
  const halfHeight = label.rotate ? textWidth / 2 : label.fontSize * 0.8;

  return {
    left: Math.min(bounds.left, label.x - halfWidth),
    top: Math.min(bounds.top, label.y - halfHeight),
    right: Math.max(bounds.right, label.x + halfWidth),
    bottom: Math.max(bounds.bottom, label.y + halfHeight),
  };
};

const buildBounds = ({ polylines, labels }: ExportGeometry): ExportBounds => {
  let bounds: ExportBounds = {
    left: Number.POSITIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
  };

  polylines.forEach((polyline) => {
    polyline.points.forEach((point) => {
      bounds = includePoint(bounds, point);
    });
  });

  labels.forEach((label) => {
    bounds = includeLabel(bounds, label);
  });

  return {
    left: bounds.left - SVG_PADDING_MM,
    top: bounds.top - SVG_PADDING_MM,
    right: bounds.right + SVG_PADDING_MM,
    bottom: bounds.bottom + SVG_PADDING_MM,
  };
};

const toPolylineSvg = (polyline: Polyline, offsetX: number, offsetY: number) => {
  const points = polyline.points
    .map(({ x, y }) => `${(x + offsetX).toFixed(3)},${(y + offsetY).toFixed(3)}`)
    .join(" ");
  const dashArray = polyline.dashArray ? ` stroke-dasharray="${polyline.dashArray}"` : "";

  return `<polyline points="${points}" stroke="${polyline.stroke}" stroke-width="${polyline.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dashArray}/>`;
};

const toTextSvg = (label: Label, offsetX: number, offsetY: number) => {
  const x = label.x + offsetX;
  const y = label.y + offsetY;
  const transform = label.rotate ? ` transform="rotate(-90 ${x.toFixed(3)} ${y.toFixed(3)})"` : "";

  return `<text x="${x.toFixed(3)}" y="${y.toFixed(3)}" font-size="${label.fontSize}" fill="${DIMENSION_COLOR}" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif"${transform}>${escapeHtml(label.text)}</text>`;
};

const createOverallDimensions = (width: number, height: number, displayUnit: DisplayUnit): ExportGeometry => {
  const minDimension = Math.min(width, height);
  const widthFontSize = clamp(width * 0.15, 4, 8.7);
  const heightFontSize = clamp(height * 0.15, 4, 8.7);
  const topOffset = clamp(minDimension * 0.16, 13.4, 24);
  const leftOffset = clamp(minDimension * 0.16, 16, 28);
  const tickSize = clamp(minDimension * 0.08, 4, 7.4);
  const topDimensionY = -topOffset;
  const leftDimensionX = -leftOffset;
  const topLabelY = topDimensionY - Math.max(widthFontSize * 1.1, 6);
  const sideLabelX = leftDimensionX - Math.max(heightFontSize * 1.1, 6);

  return {
    polylines: [
      { points: [{ x: 0, y: topDimensionY }, { x: width, y: topDimensionY }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: 0, y: topDimensionY }, { x: 0, y: -tickSize }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: width, y: topDimensionY }, { x: width, y: -tickSize }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: leftDimensionX, y: 0 }, { x: leftDimensionX, y: height }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: leftDimensionX, y: 0 }, { x: -tickSize, y: 0 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: leftDimensionX, y: height }, { x: -tickSize, y: height }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: 0, y: topDimensionY - tickSize / 2 }, { x: 0, y: topDimensionY + tickSize / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: width, y: topDimensionY - tickSize / 2 }, { x: width, y: topDimensionY + tickSize / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: leftDimensionX - tickSize / 2, y: 0 }, { x: leftDimensionX + tickSize / 2, y: 0 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: leftDimensionX - tickSize / 2, y: height }, { x: leftDimensionX + tickSize / 2, y: height }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
    ],
    labels: [
      { x: width / 2, y: topLabelY, text: `Overall Width : ${formatDielineDisplayValue(width, displayUnit)}`, fontSize: widthFontSize },
      { x: sideLabelX, y: height / 2, text: `Overall Height : ${formatDielineDisplayValue(height, displayUnit)}`, fontSize: heightFontSize, rotate: true },
    ],
  };
};

const createCircleGeometry = (attributes: CircleAttributes, displayUnit: DisplayUnit): ExportGeometry => {
  const { overallWidthMm: size } = measureCircleBounds(attributes);
  const radius = size / 2;
  const circlePoints = Array.from({ length: CIRCLE_SEGMENTS + 1 }, (_, index) => {
    const angle = (index / CIRCLE_SEGMENTS) * Math.PI * 2;
    return { x: radius + Math.cos(angle) * radius, y: radius + Math.sin(angle) * radius };
  });
  const dimensions = createOverallDimensions(size, size, displayUnit);

  return {
    polylines: [{ points: circlePoints, stroke: CUT_LINE_COLOR, strokeWidth: CUT_LINE_WIDTH_MM }, ...dimensions.polylines],
    labels: dimensions.labels,
  };
};

const createRectangleGeometry = (attributes: RectangleAttributes, displayUnit: DisplayUnit): ExportGeometry => {
  const bounds = measureRectangleBounds(attributes);
  const dimensions = createOverallDimensions(bounds.overallWidthMm, bounds.overallHeightMm, displayUnit);

  return {
    polylines: [
      {
        points: [
          { x: 0, y: 0 },
          { x: bounds.overallWidthMm, y: 0 },
          { x: bounds.overallWidthMm, y: bounds.overallHeightMm },
          { x: 0, y: bounds.overallHeightMm },
          { x: 0, y: 0 },
        ],
        stroke: CUT_LINE_COLOR,
        strokeWidth: CUT_LINE_WIDTH_MM,
      },
      ...dimensions.polylines,
    ],
    labels: dimensions.labels,
  };
};

const createTuckEndBoxGeometry = (attributes: TuckEndBoxAttributes, displayUnit: DisplayUnit): ExportGeometry => {
  const geometry = getTuckEndBoxGeometry(attributes);
  const { bounds, guides, resolved } = geometry;
  const { length, width, height, glueWidth, dustFlap, tuckFlap, closurePanel } = resolved;
  const { x0, x1, x2, x3, x4, y0, y1, y2, y4, topDustY } = guides;
  const minDimension = Math.min(length, width, height, closurePanel, dustFlap, tuckFlap, glueWidth);
  const labelFontSize = clamp(minDimension * 0.08, 4, 10);
  const advancedLabelFontSize = Math.max(3, labelFontSize * 0.75);
  const dimensionTick = Math.max(4, labelFontSize * 0.7);
  const advancedDimensionTick = Math.max(3, advancedLabelFontSize * 0.78);
  const internalDimensionOffsetMm = Math.max(12, Math.min(height * 0.18, 28));
  const dimensionY = y2 - internalDimensionOffsetMm;
  const dimensionTextY = dimensionY - Math.max(6, labelFontSize * 1.1);
  const rightDimensionX = x3 + width * 0.68;
  const glueDimensionY = (y1 + y2) / 2;
  const glueTextY = glueDimensionY - Math.max(5, advancedLabelFontSize * 1.05);
  const tuckDimensionX = x2 + length * 0.34;
  const closureDimensionX = x2 + length * 0.68;
  const dustDimensionX = x3 + width * 0.56;
  const heightLabelX = Math.max(x3 + Math.max(4, labelFontSize * 0.7), rightDimensionX - Math.max(6, labelFontSize * 0.9));
  const tuckLabelX = Math.max(x2 + Math.max(3.5, advancedLabelFontSize * 0.72), tuckDimensionX - Math.max(5, advancedLabelFontSize * 0.92));
  const closureLabelX = Math.max(x2 + Math.max(3.5, advancedLabelFontSize * 0.72), closureDimensionX - Math.max(5, advancedLabelFontSize * 0.92));
  const dustLabelX = Math.max(x3 + Math.max(3.5, advancedLabelFontSize * 0.72), dustDimensionX - Math.max(5, advancedLabelFontSize * 0.92));

  return {
    polylines: [
      ...geometry.cuts.map((points) => ({ points, stroke: CUT_LINE_COLOR, strokeWidth: CUT_LINE_WIDTH_MM })),
      ...geometry.folds.map((points) => ({ points, stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY })),
      { points: [{ x: x1, y: y2 }, { x: x1, y: dimensionY - dimensionTick * 0.4 }], stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY },
      { points: [{ x: x2, y: y2 }, { x: x2, y: dimensionY - dimensionTick * 0.4 }], stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY },
      { points: [{ x: x3, y: y2 }, { x: x3, y: dimensionY - dimensionTick * 0.4 }], stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY },
      { points: [{ x: rightDimensionX, y: y1 }, { x: x4, y: y1 }], stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY },
      { points: [{ x: rightDimensionX, y: y2 }, { x: x4, y: y2 }], stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY },
      { points: [{ x: x1, y: dimensionY }, { x: x2, y: dimensionY }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: x2, y: dimensionY }, { x: x3, y: dimensionY }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: rightDimensionX, y: y1 }, { x: rightDimensionX, y: y2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: x1, y: dimensionY - dimensionTick / 2 }, { x: x1, y: dimensionY + dimensionTick / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: x2, y: dimensionY - dimensionTick / 2 }, { x: x2, y: dimensionY + dimensionTick / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: x3, y: dimensionY - dimensionTick / 2 }, { x: x3, y: dimensionY + dimensionTick / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: rightDimensionX - dimensionTick / 2, y: y1 }, { x: rightDimensionX + dimensionTick / 2, y: y1 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: rightDimensionX - dimensionTick / 2, y: y2 }, { x: rightDimensionX + dimensionTick / 2, y: y2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: 0, y: glueDimensionY }, { x: x0, y: glueDimensionY }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: tuckDimensionX, y: 0 }, { x: tuckDimensionX, y: y0 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: closureDimensionX, y: y0 }, { x: closureDimensionX, y: y1 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: dustDimensionX, y: topDustY }, { x: dustDimensionX, y: y1 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: 0, y: glueDimensionY - advancedDimensionTick / 2 }, { x: 0, y: glueDimensionY + advancedDimensionTick / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: x0, y: glueDimensionY - advancedDimensionTick / 2 }, { x: x0, y: glueDimensionY + advancedDimensionTick / 2 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: tuckDimensionX - advancedDimensionTick / 2, y: 0 }, { x: tuckDimensionX + advancedDimensionTick / 2, y: 0 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: tuckDimensionX - advancedDimensionTick / 2, y: y0 }, { x: tuckDimensionX + advancedDimensionTick / 2, y: y0 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: closureDimensionX - advancedDimensionTick / 2, y: y0 }, { x: closureDimensionX + advancedDimensionTick / 2, y: y0 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: closureDimensionX - advancedDimensionTick / 2, y: y1 }, { x: closureDimensionX + advancedDimensionTick / 2, y: y1 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: dustDimensionX - advancedDimensionTick / 2, y: topDustY }, { x: dustDimensionX + advancedDimensionTick / 2, y: topDustY }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
      { points: [{ x: dustDimensionX - advancedDimensionTick / 2, y: y1 }, { x: dustDimensionX + advancedDimensionTick / 2, y: y1 }], stroke: DIMENSION_COLOR, strokeWidth: DIMENSION_LINE_WIDTH_MM },
    ],
    labels: [
      { x: (x1 + x2) / 2, y: dimensionTextY, text: formatDielineDisplayValue(width, displayUnit), fontSize: labelFontSize },
      { x: (x2 + x3) / 2, y: dimensionTextY, text: formatDielineDisplayValue(length, displayUnit), fontSize: labelFontSize },
      { x: heightLabelX, y: (y1 + y2) / 2, text: formatDielineDisplayValue(height, displayUnit), fontSize: labelFontSize, rotate: true },
      { x: x0 / 2, y: glueTextY, text: formatDielineDisplayValue(glueWidth, displayUnit), fontSize: advancedLabelFontSize },
      { x: tuckLabelX, y: y0 / 2, text: formatDielineDisplayValue(tuckFlap, displayUnit), fontSize: advancedLabelFontSize, rotate: true },
      { x: closureLabelX, y: (y0 + y1) / 2, text: formatDielineDisplayValue(closurePanel, displayUnit), fontSize: advancedLabelFontSize, rotate: true },
      { x: dustLabelX, y: (topDustY + y1) / 2, text: formatDielineDisplayValue(dustFlap, displayUnit), fontSize: advancedLabelFontSize, rotate: true },
      { x: bounds.overallWidthMm / 2, y: y4 + Math.max(advancedLabelFontSize * 1.6, 6), text: `Overall Width : ${formatDielineDisplayValue(bounds.overallWidthMm, displayUnit)}`, fontSize: advancedLabelFontSize },
      { x: rightDimensionX + Math.max(advancedLabelFontSize * 1.5, 6), y: bounds.overallHeightMm / 2, text: `Overall Height : ${formatDielineDisplayValue(bounds.overallHeightMm, displayUnit)}`, fontSize: advancedLabelFontSize, rotate: true },
    ],
  };
};

const createBecf11d01Geometry = (attributes: Becf11d01Attributes, displayUnit: DisplayUnit): ExportGeometry => {
  const geometry = getBecf11d01Geometry(attributes);
  const bounds = measureBecf11d01Bounds(attributes);
  const { resolved, guides } = geometry;
  const dimensions = createOverallDimensions(bounds.overallWidthMm, bounds.overallHeightMm, displayUnit);
  const labelFontSize = clamp(Math.min(resolved.length, resolved.height, resolved.width) * 0.08, 4, 10);
  const secondaryFontSize = Math.max(3.4, labelFontSize * 0.78);

  return {
    polylines: [
      ...geometry.cuts.map((points) => ({ points, stroke: CUT_LINE_COLOR, strokeWidth: CUT_LINE_WIDTH_MM })),
      ...geometry.folds.map((points) => ({ points, stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY })),
      ...dimensions.polylines,
    ],
    labels: [
      {
        x: (guides.frontLeft + guides.frontRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.length, displayUnit),
        fontSize: labelFontSize,
      },
      {
        x: (guides.frontRight + guides.sideRightRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.width, displayUnit),
        fontSize: secondaryFontSize,
      },
      {
        x: (guides.sideRightRight + guides.backRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.length, displayUnit),
        fontSize: labelFontSize,
      },
      {
        x: (guides.backRight + guides.sideLeftRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.width, displayUnit),
        fontSize: secondaryFontSize,
      },
      {
        x: guides.frontLeft + resolved.length * 0.26,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.height, displayUnit),
        fontSize: secondaryFontSize,
        rotate: true,
      },
      ...dimensions.labels,
    ],
  };
};

const createBecf10a0aGeometry = (attributes: Becf10a0aAttributes, displayUnit: DisplayUnit): ExportGeometry => {
  const geometry = getBecf10a0aGeometry(attributes);
  const bounds = measureBecf10a0aBounds(attributes);
  const { resolved, guides } = geometry;
  const dimensions = createOverallDimensions(bounds.overallWidthMm, bounds.overallHeightMm, displayUnit);
  const labelFontSize = clamp(Math.min(resolved.length, resolved.height, resolved.width) * 0.08, 4, 10);
  const secondaryFontSize = Math.max(3.4, labelFontSize * 0.78);

  return {
    polylines: [
      ...geometry.cuts.map((points) => ({ points, stroke: CUT_LINE_COLOR, strokeWidth: CUT_LINE_WIDTH_MM })),
      ...geometry.folds.map((points) => ({ points, stroke: FOLD_LINE_COLOR, strokeWidth: FOLD_LINE_WIDTH_MM, dashArray: FOLD_DASH_ARRAY })),
      ...dimensions.polylines,
    ],
    labels: [
      {
        x: (guides.frontLeft + guides.frontRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.length, displayUnit),
        fontSize: labelFontSize,
      },
      {
        x: (guides.frontRight + guides.sideRightRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.width, displayUnit),
        fontSize: secondaryFontSize,
      },
      {
        x: (guides.sideRightRight + guides.backRight) / 2,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.length, displayUnit),
        fontSize: labelFontSize,
      },
      {
        x: guides.frontLeft + resolved.length * 0.26,
        y: (guides.bodyTopY + guides.bodyBottomY) / 2,
        text: formatDielineDisplayValue(resolved.height, displayUnit),
        fontSize: secondaryFontSize,
        rotate: true,
      },
      ...dimensions.labels,
    ],
  };
};

const createGeometry = (data: DielinePrintData, displayUnit: DisplayUnit): ExportGeometry => {
  switch (data.modelId) {
    case "circle":
      return createCircleGeometry(data.attributes as CircleAttributes, displayUnit);
    case "rectangle":
      return createRectangleGeometry(data.attributes as RectangleAttributes, displayUnit);
    case "tuckEndBox":
      return createTuckEndBoxGeometry(data.attributes as TuckEndBoxAttributes, displayUnit);
    case "becf11d01":
      return createBecf11d01Geometry(data.attributes as Becf11d01Attributes, displayUnit);
    case "becf10a0a":
      return createBecf10a0aGeometry(data.attributes as Becf10a0aAttributes, displayUnit);
    default:
      throw new Error(`Unsupported model: ${data.modelId}`);
  }
};

export const createDielinePrintSvg = (
  data: DielinePrintData,
  options: DielinePrintSvgOptions = {},
): DielineSvgDocument => {
  const geometry = createGeometry(data, options.displayUnit ?? "mm");
  const bounds = buildBounds(geometry);
  const widthMm = Number((bounds.right - bounds.left).toFixed(3));
  const heightMm = Number((bounds.bottom - bounds.top).toFixed(3));
  const offsetX = -bounds.left;
  const offsetY = -bounds.top;
  const content = [
    ...geometry.polylines.map((polyline) => toPolylineSvg(polyline, offsetX, offsetY)),
    ...geometry.labels.map((label) => toTextSvg(label, offsetX, offsetY)),
  ].join("\n  ");

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">\n  ${content}\n</svg>`,
    widthMm,
    heightMm,
  };
};

const createPrintHtml = (
  documentTitle: string,
  svgDocument: DielineSvgDocument,
  options: Required<Pick<DielinePrintOptions, "autoPrint" | "closeAfterPrint" | "marginMm">>,
) => {
  const pageWidthMm = svgDocument.widthMm + options.marginMm * 2;
  const pageHeightMm = svgDocument.heightMm + options.marginMm * 2;
  const printScript = options.autoPrint
    ? `<script>window.addEventListener("load",()=>window.setTimeout(()=>window.print(),150));${options.closeAfterPrint ? "window.addEventListener(\"afterprint\",()=>window.close());" : ""}</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>
      @page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: #f3f4f6; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet {
        box-sizing: border-box;
        width: ${pageWidthMm}mm;
        min-height: ${pageHeightMm}mm;
        padding: ${options.marginMm}mm;
        background: #ffffff;
        margin: 16px auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      }
      .sheet svg { display: block; }
      @media print {
        html, body { background: #ffffff; }
        .sheet { margin: 0; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">${svgDocument.svg}</div>
    ${printScript}
  </body>
</html>`;
};

export const openDielinePrintPreview = (data: DielinePrintData, options: DielinePrintOptions = {}) => {
  if (typeof window === "undefined") {
    throw new Error("Dieline print preview is only available in the browser.");
  }

  const svgDocument = createDielinePrintSvg(data, { displayUnit: options.displayUnit });
  const printWindow = window.open("", "_blank", "width=1100,height=800");

  if (!printWindow) {
    throw new Error("Unable to open print window. Please allow pop-ups and try again.");
  }

  const title = options.title ?? `${data.modelId}-print-test.pdf`;
  const html = createPrintHtml(title, svgDocument, {
    autoPrint: options.autoPrint ?? false,
    closeAfterPrint: options.closeAfterPrint ?? true,
    marginMm: options.marginMm ?? PDF_MARGIN_MM,
  });
  const blob = new Blob([html], { type: "text/html" });
  const objectUrl = URL.createObjectURL(blob);

  printWindow.location.replace(objectUrl);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);

  return printWindow;
};

export const printDielineToPdf = (data: DielinePrintData, options: Omit<DielinePrintOptions, "autoPrint"> = {}) => {
  openDielinePrintPreview(data, { ...options, autoPrint: true });
};

export const createDielinePrintController = (
  data: DielinePrintData,
  defaults: Partial<DielinePrintOptions> = {},
): DielinePrintController => ({
  createPrintSvg: (options = {}) => createDielinePrintSvg(data, {
    displayUnit: options.displayUnit ?? defaults.displayUnit,
  }),
  openPrintPreview: (options = {}) => openDielinePrintPreview(data, {
    ...defaults,
    ...options,
    displayUnit: options.displayUnit ?? defaults.displayUnit,
  }),
  printToPdf: (options: DielinePrintPdfOptions = {}) => printDielineToPdf(data, {
    ...defaults,
    ...options,
    displayUnit: options.displayUnit ?? defaults.displayUnit,
  }),
});

export const printCircleDielineToPdf = (
  attributes: CircleAttributes,
  options?: Omit<DielinePrintOptions, "autoPrint">,
) => {
  printDielineToPdf({ modelId: "circle", attributes }, options);
};

export const printRectangleDielineToPdf = (
  attributes: RectangleAttributes,
  options?: Omit<DielinePrintOptions, "autoPrint">,
) => {
  printDielineToPdf({ modelId: "rectangle", attributes }, options);
};

export const printTuckEndBoxDielineToPdf = (
  attributes: TuckEndBoxAttributes,
  options?: Omit<DielinePrintOptions, "autoPrint">,
) => {
  printDielineToPdf({ modelId: "tuckEndBox", attributes }, options);
};

export const printBecf11d01DielineToPdf = (
  attributes: Becf11d01Attributes,
  options?: Omit<DielinePrintOptions, "autoPrint">,
) => {
  printDielineToPdf({ modelId: "becf11d01", attributes }, options);
};

export const printBecf10a0aDielineToPdf = (
  attributes: Becf10a0aAttributes,
  options?: Omit<DielinePrintOptions, "autoPrint">,
) => {
  printDielineToPdf({ modelId: "becf10a0a", attributes }, options);
};