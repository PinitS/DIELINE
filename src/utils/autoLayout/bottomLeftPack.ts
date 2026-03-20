import type { Placement, PreparedModel, ShapePolyline } from "./types";

type Rotation = 0 | 90 | 180 | 270;

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

// ---------------------------------------------------------------------------
// Helpers (mirrored from shelfPack.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AABB collision
// ---------------------------------------------------------------------------

type Rect = { x: number; y: number; w: number; h: number };

const rectsOverlap = (a: Rect, b: Rect): boolean =>
  !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);

// ---------------------------------------------------------------------------
// Bottom-Left Bin Packing
// ---------------------------------------------------------------------------

export const bottomLeftPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  // Sort by height descending, then width descending
  const sorted = [...items].sort((a, b) => {
    const hDiff = b.heightMm - a.heightMm;
    if (Math.abs(hDiff) > 0.001) return hDiff;
    return b.widthMm - a.widthMm;
  });

  const placements: Placement[] = [];
  const placed: Rect[] = [];

  for (const prepared of sorted) {
    let bestCandidate: { x: number; y: number; rotation: Rotation; inflatedW: number; inflatedH: number } | null = null;

    for (const rotation of ROTATIONS) {
      const { itemW, itemH } = rotatedDims(prepared, rotation);
      const inflatedW = itemW + layoutDistance;
      const inflatedH = itemH + layoutDistance;

      // Generate candidate positions
      const candidates: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];

      for (const rect of placed) {
        candidates.push(
          { x: rect.x + rect.w, y: 0 },
          { x: 0, y: rect.y + rect.h },
          { x: rect.x + rect.w, y: rect.y },
          { x: rect.x, y: rect.y + rect.h },
        );
      }

      // Sort by y ascending, then x ascending (bottom-left priority)
      candidates.sort((a, b) => {
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 0.001) return yDiff;
        return a.x - b.x;
      });

      for (const cand of candidates) {
        // Check bounds
        if (cand.x + inflatedW > usableWidth + 0.001) continue;
        if (cand.y + inflatedH > usableHeight + 0.001) continue;

        // Check overlap with all placed items
        const newRect: Rect = { x: cand.x, y: cand.y, w: inflatedW, h: inflatedH };
        let overlaps = false;
        for (const rect of placed) {
          if (rectsOverlap(newRect, rect)) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;

        // Valid candidate – check if it's better than the current best
        if (
          !bestCandidate ||
          cand.y < bestCandidate.y - 0.001 ||
          (Math.abs(cand.y - bestCandidate.y) <= 0.001 && cand.x < bestCandidate.x - 0.001)
        ) {
          bestCandidate = { x: cand.x, y: cand.y, rotation, inflatedW, inflatedH };
        }

        // First valid candidate for this rotation – no need to check more
        // candidates since they're sorted. But we still try other rotations.
        break;
      }
    }

    if (!bestCandidate) continue; // skip item – doesn't fit

    const { x, y, rotation, inflatedW, inflatedH } = bestCandidate;
    const { itemW, itemH } = rotatedDims(prepared, rotation);

    placed.push({ x, y, w: inflatedW, h: inflatedH });

    placements.push({
      modelEntryId: prepared.entryId,
      modelId: prepared.modelId,
      x,
      y,
      rotation,
      widthMm: itemW,
      heightMm: itemH,
      svgContent: prepared.svgContent,
      shapePolylines: transformPolylines(
        prepared.shapePolylines,
        x,
        y,
        rotation,
        prepared.widthMm,
        prepared.heightMm,
      ),
      boundaryPolylines: transformPolylines(
        prepared.boundaryPolylines,
        x,
        y,
        rotation,
        prepared.widthMm,
        prepared.heightMm,
      ),
    });
  }

  return placements;
};
