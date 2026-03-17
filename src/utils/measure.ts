import type { CircleAttributes, DielineBounds, RectangleAttributes, TuckEndBoxAttributes } from "../types";
import { resolveTuckEndBoxAttributes } from "./tuckEndBox";

const DEFAULT_CIRCLE_SIZE_MM = 90;
const DEFAULT_RECTANGLE_WIDTH_MM = 120;
const DEFAULT_RECTANGLE_HEIGHT_MM = 80;

const normalize = (value: number | undefined, fallback = 1) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
};

export const measureCircleBounds = (
  attribute: CircleAttributes,
): DielineBounds => {
  const size = normalize(attribute.size, DEFAULT_CIRCLE_SIZE_MM);
  return { overallWidthMm: size, overallHeightMm: size };
};

export const measureRectangleBounds = (
  attribute: RectangleAttributes,
): DielineBounds => {
  return {
    overallWidthMm: normalize(attribute.width, DEFAULT_RECTANGLE_WIDTH_MM),
    overallHeightMm: normalize(attribute.height, DEFAULT_RECTANGLE_HEIGHT_MM),
  };
};

export const measureTuckEndBoxBounds = (
  attribute: TuckEndBoxAttributes,
): DielineBounds => {
  const {
    length,
    width,
    height,
    glueWidth,
    closurePanel,
    tuckFlap,
  } = resolveTuckEndBoxAttributes(attribute);
  const overallWidthMm = length + width + length + width + glueWidth;
  const overallHeightMm = tuckFlap + closurePanel + height + closurePanel + tuckFlap;
  return { overallWidthMm, overallHeightMm };
};
