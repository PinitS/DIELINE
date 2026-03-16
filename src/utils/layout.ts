import type { DielineBounds } from "../types";

export const VIEWBOX_WIDTH = 1000;
export const VIEWBOX_HEIGHT = 720;
const DEFAULT_MM_TO_PX = 3;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const createCanvasLayout = (bounds: DielineBounds) => {
  const leftPad = 240;
  const topPad = 150;
  const rightPad = 90;
  const bottomPad = 80;
  const drawWidth = VIEWBOX_WIDTH - leftPad - rightPad;
  const drawHeight = VIEWBOX_HEIGHT - topPad - bottomPad;
  const scale = DEFAULT_MM_TO_PX;

  const shapeWidthPx = bounds.overallWidthMm * scale;
  const shapeHeightPx = bounds.overallHeightMm * scale;
  const centerX = leftPad + drawWidth / 2;
  const centerY = topPad + drawHeight / 2;
  const leftX = centerX - shapeWidthPx / 2;
  const rightX = centerX + shapeWidthPx / 2;
  const topY = centerY - shapeHeightPx / 2;
  const bottomY = centerY + shapeHeightPx / 2;
  const base = Math.min(shapeWidthPx, shapeHeightPx);
  const topOffset = clamp(base * 0.16, 40, 72);
  const leftOffset = clamp(base * 0.16, 48, 84);
  const widthFontSize = clamp(shapeWidthPx * 0.05, 12, 26);
  const heightFontSize = clamp(shapeHeightPx * 0.05, 12, 26);
  const tickSize = clamp(base * 0.08, 12, 22);
  const arrowSize = clamp(base * 0.12, 14, 26);

  return {
    centerX,
    centerY,
    shapeWidthPx,
    shapeHeightPx,
    leftX,
    rightX,
    topY,
    bottomY,
    tickSize,
    arrowSize,
    widthFontSize,
    heightFontSize,
    topDimensionY: topY - topOffset,
    leftDimensionX: leftX - leftOffset,
    topLabelY: topY - topOffset - clamp(widthFontSize * 0.7, 14, 28),
    sideLabelX: leftX - leftOffset - clamp(heightFontSize * 0.7, 14, 28),
  };
};

