import type { Placement, PreparedModel, ShapePolyline } from "./types";

type Rotation = 0 | 90 | 180 | 270;

type SkylineSegment = {
  x: number;
  y: number;
  width: number;
};

// --------------- helpers (same as shelfPack) ---------------

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

// --------------- Skyline Bottom-Left packing ---------------

export const skylinePack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  const ROTATIONS: Rotation[] = [0, 90, 180, 270];
  const placements: Placement[] = [];

  // Initialise skyline as one segment spanning full width at y = 0
  let skyline: SkylineSegment[] = [{ x: 0, y: 0, width: usableWidth }];

  // Sort items by height descending (use max of width/height as proxy)
  const sorted = [...items].sort((a, b) => {
    const hA = Math.max(a.heightMm, a.widthMm);
    const hB = Math.max(b.heightMm, b.widthMm);
    return hB - hA;
  });

  for (const prepared of sorted) {
    let bestScore = Infinity;
    let bestX = 0;
    let bestY = 0;
    let bestRotation: Rotation | null = null;
    let bestInflatedW = 0;
    let bestInflatedH = 0;
    let bestItemW = 0;
    let bestItemH = 0;

    for (const rotation of ROTATIONS) {
      const { itemW, itemH } = rotatedDims(prepared, rotation);
      const inflatedW = itemW + layoutDistance;
      const inflatedH = itemH + layoutDistance;

      // Try placing at each skyline segment's x position
      for (let i = 0; i < skyline.length; i++) {
        const startX = skyline[i].x;

        // Check if item fits horizontally
        if (startX + inflatedW > usableWidth + 0.001) continue;

        // Compute the maximum y across all spanned skyline segments
        let maxY = 0;
        let spanEnd = startX + inflatedW;
        let valid = true;

        for (let j = 0; j < skyline.length; j++) {
          const seg = skyline[j];
          const segRight = seg.x + seg.width;

          // Check if this segment overlaps horizontally with the placement
          if (seg.x >= spanEnd - 0.001 || segRight <= startX + 0.001) continue;

          // This segment is spanned
          if (seg.y > maxY) maxY = seg.y;
        }

        // Check if item fits vertically
        if (maxY + inflatedH > usableHeight + 0.001) {
          valid = false;
        }

        if (!valid) continue;

        const score = maxY * 1e6 + startX;
        if (score < bestScore) {
          bestScore = score;
          bestX = startX;
          bestY = maxY;
          bestRotation = rotation;
          bestInflatedW = inflatedW;
          bestInflatedH = inflatedH;
          bestItemW = itemW;
          bestItemH = itemH;
        }
      }
    }

    // Skip item if no valid placement found
    if (bestRotation === null) continue;

    // Create placement (position uses un-inflated dimensions for the actual item)
    placements.push({
      modelEntryId: prepared.entryId,
      modelId: prepared.modelId,
      x: bestX,
      y: bestY,
      rotation: bestRotation,
      widthMm: bestItemW,
      heightMm: bestItemH,
      svgContent: prepared.svgContent,
      shapePolylines: transformPolylines(
        prepared.shapePolylines,
        bestX,
        bestY,
        bestRotation,
        prepared.widthMm,
        prepared.heightMm,
      ),
      boundaryPolylines: transformPolylines(
        prepared.boundaryPolylines,
        bestX,
        bestY,
        bestRotation,
        prepared.widthMm,
        prepared.heightMm,
      ),
    });

    // Update skyline: replace spanned segments with new raised segment
    const placeLeft = bestX;
    const placeRight = bestX + bestInflatedW;
    const newTopY = bestY + bestInflatedH;

    const newSkyline: SkylineSegment[] = [];

    for (const seg of skyline) {
      const segRight = seg.x + seg.width;

      // Segment is entirely to the left of placement
      if (segRight <= placeLeft + 0.001) {
        newSkyline.push(seg);
        continue;
      }

      // Segment is entirely to the right of placement
      if (seg.x >= placeRight - 0.001) {
        newSkyline.push(seg);
        continue;
      }

      // Segment partially overlaps — split as needed

      // Left remainder
      if (seg.x < placeLeft - 0.001) {
        newSkyline.push({
          x: seg.x,
          y: seg.y,
          width: placeLeft - seg.x,
        });
      }

      // Right remainder
      if (segRight > placeRight + 0.001) {
        newSkyline.push({
          x: placeRight,
          y: seg.y,
          width: segRight - placeRight,
        });
      }
    }

    // Insert the new raised segment
    newSkyline.push({ x: placeLeft, y: newTopY, width: bestInflatedW });

    // Sort by x
    newSkyline.sort((a, b) => a.x - b.x);

    // Merge adjacent segments with same y
    const merged: SkylineSegment[] = [newSkyline[0]];
    for (let i = 1; i < newSkyline.length; i++) {
      const last = merged[merged.length - 1];
      const cur = newSkyline[i];
      if (
        Math.abs(last.y - cur.y) < 0.001 &&
        Math.abs(last.x + last.width - cur.x) < 0.001
      ) {
        last.width += cur.width;
      } else {
        merged.push(cur);
      }
    }

    skyline = merged;
  }

  return placements;
};
