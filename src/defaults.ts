import type { CircleAttributes, RectangleAttributes, TuckEndBoxAttributes } from "./types";

export const DEFAULT_CIRCLE_ATTRIBUTES: CircleAttributes = {
  size: 90,
};

export const DEFAULT_RECTANGLE_ATTRIBUTES: RectangleAttributes = {
  width: 120,
  height: 80,
};

export const DEFAULT_TUCK_END_BOX_ATTRIBUTES: TuckEndBoxAttributes = {
  length: 100,
  width: 50,
  height: 150,
  closurePanel: 50,
  dustFlap: 32,
  glueWidth: 12,
  tuckFlap: 15,
};

export const DEFAULT_DISPLAY_UNIT = "mm" as const;
