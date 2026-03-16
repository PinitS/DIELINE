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

export const TUCK_END_BOX_GLUE_RATIO = 0.25;
export const TUCK_END_BOX_DUST_RATIO = 0.5;
export const TUCK_END_BOX_TUCK_RATIO = 0.84;

export const measureTuckEndBoxBounds = (
  attribute: TuckEndBoxAttributes,
): DielineBounds => {
  const length = normalize(attribute.length);
  const width = normalize(attribute.width);
  const height = normalize(attribute.height);
  const glueFlap = attribute.glueFlap ?? width * TUCK_END_BOX_GLUE_RATIO;
  const dustFlap = attribute.dustFlap ?? width * TUCK_END_BOX_DUST_RATIO;
  const topFlap = attribute.topFlap ?? width * TUCK_END_BOX_TUCK_RATIO;
  const overallWidthMm = length + width + length + width + glueFlap;
  const overallHeightMm = topFlap + dustFlap + height + dustFlap + topFlap;
  return { overallWidthMm, overallHeightMm };
};
