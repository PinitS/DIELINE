import type { Placement, PreparedModel, ShapePolyline } from "./types";

type Rotation = 0 | 90 | 180 | 270;

type FreeRect = { x: number; y: number; w: number; h: number };

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

// --------------- helpers (copied from shelfPack.ts) ---------------

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

// --------------- MaxRects BSSF ---------------

const overlaps = (a: FreeRect, b: FreeRect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const contains = (outer: FreeRect, inner: FreeRect): boolean =>
  outer.x <= inner.x &&
  outer.y <= inner.y &&
  outer.x + outer.w >= inner.x + inner.w &&
  outer.y + outer.h >= inner.y + inner.h;

export const maxRectsPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  const freeRects: FreeRect[] = [{ x: 0, y: 0, w: usableWidth, h: usableHeight }];
  const placements: Placement[] = [];

  // Sort items by area descending
  const sorted = [...items].sort(
    (a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm,
  );

  for (const prepared of sorted) {
    let bestScore = Infinity;
    let bestRotation: Rotation | null = null;
    let bestRectIdx = -1;
    let bestInflatedW = 0;
    let bestInflatedH = 0;

    for (const rotation of ROTATIONS) {
      const { itemW, itemH } = rotatedDims(prepared, rotation);
      const inflatedW = itemW + layoutDistance;
      const inflatedH = itemH + layoutDistance;

      for (let i = 0; i < freeRects.length; i++) {
        const fr = freeRects[i];
        if (inflatedW <= fr.w + 0.001 && inflatedH <= fr.h + 0.001) {
          const shortSide = Math.min(fr.w - inflatedW, fr.h - inflatedH);
          if (shortSide < bestScore) {
            bestScore = shortSide;
            bestRotation = rotation;
            bestRectIdx = i;
            bestInflatedW = inflatedW;
            bestInflatedH = inflatedH;
          }
        }
      }
    }

    if (bestRotation === null || bestRectIdx < 0) {
      // Item doesn't fit — skip
      continue;
    }

    const chosenRect = freeRects[bestRectIdx];
    const placeX = chosenRect.x;
    const placeY = chosenRect.y;
    const { itemW, itemH } = rotatedDims(prepared, bestRotation);

    const placedRect: FreeRect = {
      x: placeX,
      y: placeY,
      w: bestInflatedW,
      h: bestInflatedH,
    };

    // Split every free rect that overlaps with the placed rect
    const newFreeRects: FreeRect[] = [];
    const len = freeRects.length;
    for (let i = 0; i < len; i++) {
      const fr = freeRects[i];
      if (!overlaps(fr, placedRect)) {
        newFreeRects.push(fr);
        continue;
      }

      // Left
      const leftW = placedRect.x - fr.x;
      if (leftW > 0) {
        newFreeRects.push({ x: fr.x, y: fr.y, w: leftW, h: fr.h });
      }

      // Right
      const rightX = placedRect.x + placedRect.w;
      const rightW = fr.x + fr.w - rightX;
      if (rightW > 0) {
        newFreeRects.push({ x: rightX, y: fr.y, w: rightW, h: fr.h });
      }

      // Top
      const topH = placedRect.y - fr.y;
      if (topH > 0) {
        newFreeRects.push({ x: fr.x, y: fr.y, w: fr.w, h: topH });
      }

      // Bottom
      const bottomY = placedRect.y + placedRect.h;
      const bottomH = fr.y + fr.h - bottomY;
      if (bottomH > 0) {
        newFreeRects.push({ x: fr.x, y: bottomY, w: fr.w, h: bottomH });
      }
    }

    // Prune: remove any rect fully contained by another
    freeRects.length = 0;
    for (let i = 0; i < newFreeRects.length; i++) {
      let dominated = false;
      for (let j = 0; j < newFreeRects.length; j++) {
        if (i !== j && contains(newFreeRects[j], newFreeRects[i])) {
          dominated = true;
          break;
        }
      }
      if (!dominated) {
        freeRects.push(newFreeRects[i]);
      }
    }

    // Create placement
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
  }

  return placements;
};
