import type { TuckEndBoxAttributes } from "../types";

export const DEFAULT_TUCK_END_BOX_ATTRIBUTES = {
  length: 100,
  width: 50,
  height: 150,
  closurePanel: 45,
  dustFlap: 32,
  glueWidth: 12,
  tuckFlap: 15,
} as const;

export type ResolvedTuckEndBoxAttributes = {
  length: number;
  width: number;
  height: number;
  closurePanel: number;
  dustFlap: number;
  glueWidth: number;
  tuckFlap: number;
};

const resolveDimension = (value: number | undefined, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
};

export const resolveTuckEndBoxAttributes = (
  attribute: TuckEndBoxAttributes = {},
): ResolvedTuckEndBoxAttributes => ({
  length: resolveDimension(attribute.length, DEFAULT_TUCK_END_BOX_ATTRIBUTES.length),
  width: resolveDimension(attribute.width, DEFAULT_TUCK_END_BOX_ATTRIBUTES.width),
  height: resolveDimension(attribute.height, DEFAULT_TUCK_END_BOX_ATTRIBUTES.height),
  closurePanel: resolveDimension(attribute.closurePanel, DEFAULT_TUCK_END_BOX_ATTRIBUTES.closurePanel),
  dustFlap: resolveDimension(attribute.dustFlap, DEFAULT_TUCK_END_BOX_ATTRIBUTES.dustFlap),
  glueWidth: resolveDimension(attribute.glueWidth, DEFAULT_TUCK_END_BOX_ATTRIBUTES.glueWidth),
  tuckFlap: resolveDimension(attribute.tuckFlap, DEFAULT_TUCK_END_BOX_ATTRIBUTES.tuckFlap),
});