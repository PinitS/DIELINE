import type { DisplayUnit } from "../types";

const factors: Record<DisplayUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

export const convertDielineMillimeters = (
  valueMm: number,
  displayUnit: DisplayUnit,
) => valueMm / factors[displayUnit];

export const formatDielineDisplayValue = (
  valueMm: number,
  displayUnit: DisplayUnit,
) => `${convertDielineMillimeters(valueMm, displayUnit).toFixed(2)} ${displayUnit}`;

