import type { CircleAttributes, DielineBounds, RectangleAttributes, TuckEndBoxAttributes } from "../types";

const normalize = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
};

export const measureCircleBounds = (
  attribute: CircleAttributes,
): DielineBounds => {
  const size = normalize(attribute.size);
  return { overallWidthMm: size, overallHeightMm: size };
};

export const measureRectangleBounds = (
  attribute: RectangleAttributes,
): DielineBounds => {
  return {
    overallWidthMm: normalize(attribute.width),
    overallHeightMm: normalize(attribute.height),
  };
};

export const measureTuckEndBoxBounds = (
  attribute: TuckEndBoxAttributes,
): DielineBounds => {
  const length = normalize(attribute.length);
  const width = normalize(attribute.width);
  const height = normalize(attribute.height);
  const glueWidth = normalize(attribute.glueWidth ?? 1);
  const closurePanel = normalize(attribute.closurePanel ?? 1);
  const tuckFlap = normalize(attribute.tuckFlap ?? 1);
  const overallWidthMm = length + width + length + width + glueWidth;
  const overallHeightMm = tuckFlap + closurePanel + height + closurePanel + tuckFlap;
  return { overallWidthMm, overallHeightMm };
};
