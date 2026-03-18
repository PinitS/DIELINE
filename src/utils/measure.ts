import type {
  Becf10a0aAttributes,
  Becf11d01Attributes,
  CircleAttributes,
  DielineBounds,
  RectangleAttributes,
  TuckEndBoxAttributes,
} from "../types";
import { getBecf10a0aGeometry } from "./becf10a0aGeometry";
import { resolveBecf11d01Attributes } from "./becf11d01Geometry";
import { getTuckEndBoxGeometry } from "./becf10803Geometry";

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
): DielineBounds => getTuckEndBoxGeometry(attribute).bounds;

export const measureBecf11d01Bounds = (
  attribute: Becf11d01Attributes,
): DielineBounds => {
  const {
    length,
    height,
    width,
    dustFlap,
    glueWidth,
  } = resolveBecf11d01Attributes(attribute);

  return {
    overallWidthMm: glueWidth + length + width + length + width,
    overallHeightMm: dustFlap + height + dustFlap,
  };
};

export const measureBecf10a0aBounds = (
  attribute: Becf10a0aAttributes,
): DielineBounds => getBecf10a0aGeometry(attribute).bounds;
