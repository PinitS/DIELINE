import type { Placement, PreparedModel, ShapePolyline } from "./types";

type Rotation = 0 | 90 | 180 | 270;

type FreeRect = { x: number; y: number; w: number; h: number };

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

const transformPolylines = (
  polylines: ShapePolyline[],
  x: number,
  y: number,
  rotation: Rotation,
  originalWidth: number,
  originalHeight: number,
): ShapePolyline[] =>
  polylines.map((pl) => ({
    ...pl,
    points: pl.points.map((pt) => {
      let px: number;
      let py: number;
      if (rotation === 90) {
        px = originalHeight - pt.y;
        py = pt.x;
      } else if (rotation === 180) {
        px = originalWidth - pt.x;
        py = originalHeight - pt.y;
      } else if (rotation === 270) {
        px = pt.y;
        py = originalWidth - pt.x;
      } else {
        px = pt.x;
        py = pt.y;
      }
      return { x: px + x, y: py + y };
    }),
  }));

const rotatedDims = (
  prepared: PreparedModel,
  rotation: Rotation,
): { itemW: number; itemH: number } => {
  if (rotation === 90 || rotation === 270) {
    return { itemW: prepared.heightMm, itemH: prepared.widthMm };
  }
  return { itemW: prepared.widthMm, itemH: prepared.heightMm };
};

export const guillotinePack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  const placements: Placement[] = [];

  // Sort items by area descending
  const sorted = [...items].sort(
    (a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm,
  );

  // Start with one free rectangle covering the entire usable area
  const freeRects: FreeRect[] = [
    { x: 0, y: 0, w: usableWidth, h: usableHeight },
  ];

  for (const prepared of sorted) {
    let bestRectIdx = -1;
    let bestRotation: Rotation = 0;
    let bestWaste = Infinity;
    let bestInflW = 0;
    let bestInflH = 0;

    for (const rotation of ROTATIONS) {
      const { itemW, itemH } = rotatedDims(prepared, rotation);
      const inflatedW = itemW + layoutDistance;
      const inflatedH = itemH + layoutDistance;

      for (let i = 0; i < freeRects.length; i++) {
        const rect = freeRects[i];
        if (inflatedW <= rect.w + 0.001 && inflatedH <= rect.h + 0.001) {
          const waste = rect.w * rect.h - inflatedW * inflatedH;
          if (waste < bestWaste) {
            bestWaste = waste;
            bestRectIdx = i;
            bestRotation = rotation;
            bestInflW = inflatedW;
            bestInflH = inflatedH;
          }
        }
      }
    }

    // Item doesn't fit anywhere — skip
    if (bestRectIdx < 0) {
      continue;
    }

    const freeRect = freeRects[bestRectIdx];
    const placeX = freeRect.x;
    const placeY = freeRect.y;

    const { itemW, itemH } = rotatedDims(prepared, bestRotation);

    placements.push({
      modelEntryId: prepared.entryId,
      modelId: prepared.modelId,
      x: placeX,
      y: placeY,
      rotation: bestRotation,
      widthMm: itemW,
      heightMm: itemH,
      svgContent: prepared.svgContent,
      shapePolylines: transformPolylines(
        prepared.shapePolylines,
        placeX,
        placeY,
        bestRotation,
        prepared.widthMm,
        prepared.heightMm,
      ),
      boundaryPolylines: transformPolylines(
        prepared.boundaryPolylines,
        placeX,
        placeY,
        bestRotation,
        prepared.widthMm,
        prepared.heightMm,
      ),
    });

    // Guillotine split
    const freeW = freeRect.w;
    const freeH = freeRect.h;
    const freeX = freeRect.x;
    const freeY = freeRect.y;

    // Remove the used free rect
    freeRects.splice(bestRectIdx, 1);

    if (freeW - bestInflW < freeH - bestInflH) {
      // Split horizontally first
      const rightW = freeW - bestInflW;
      const rightH = bestInflH;
      if (rightW > 0 && rightH > 0) {
        freeRects.push({
          x: freeX + bestInflW,
          y: freeY,
          w: rightW,
          h: rightH,
        });
      }

      const bottomW = freeW;
      const bottomH = freeH - bestInflH;
      if (bottomW > 0 && bottomH > 0) {
        freeRects.push({
          x: freeX,
          y: freeY + bestInflH,
          w: bottomW,
          h: bottomH,
        });
      }
    } else {
      // Split vertically first
      const bottomW = bestInflW;
      const bottomH = freeH - bestInflH;
      if (bottomW > 0 && bottomH > 0) {
        freeRects.push({
          x: freeX,
          y: freeY + bestInflH,
          w: bottomW,
          h: bottomH,
        });
      }

      const rightW = freeW - bestInflW;
      const rightH = freeH;
      if (rightW > 0 && rightH > 0) {
        freeRects.push({
          x: freeX + bestInflW,
          y: freeY,
          w: rightW,
          h: rightH,
        });
      }
    }
  }

  return placements;
};
