import type {
  CircleAttributes,
  RectangleAttributes,
} from "./types";
export { DEFAULT_BECF11D01_ATTRIBUTES } from "./utils/becf11d01Geometry";
export { DEFAULT_TUCK_END_BOX_ATTRIBUTES } from "./utils/becf10803Geometry";

export const DEFAULT_CIRCLE_ATTRIBUTES: CircleAttributes = {
  size: 90,
};

export const DEFAULT_RECTANGLE_ATTRIBUTES: RectangleAttributes = {
  width: 120,
  height: 80,
};

export const DEFAULT_DISPLAY_UNIT = "mm" as const;
