import type { Placement, PreparedModel, Point, ShapePolyline } from "./types";

type ShelfItem = {
  prepared: PreparedModel;
  rotated: boolean;
};

type Shelf = {
  y: number;
  height: number;
  usedWidth: number;
  items: Array<{ item: ShelfItem; x: number }>;
};

/**
 * Transform polylines: if rotated, rotate 90° CW, then translate to (x, y).
 */
const transformPolylines = (
  polylines: ShapePolyline[],
  x: number,
  y: number,
  rotated: boolean,
  originalWidth: number,
  originalHeight: number,
): ShapePolyline[] =>
  polylines.map((pl) => ({
    ...pl,
    points: pl.points.map((pt) => {
      let px: number;
      let py: number;
      if (rotated) {
        // 90° CW rotation: (px, py) → (originalHeight - py, px)
        // Then the bounding box becomes (originalHeight × originalWidth)
        px = originalHeight - pt.y;
        py = pt.x;
      } else {
        px = pt.x;
        py = pt.y;
      }
      return { x: px + x, y: py + y };
    }),
  }));

/**
 * Shelf-packing algorithm.
 *
 * Places items into horizontal shelves within the usable area.
 * Each item can optionally be rotated 90° to fit better.
 *
 * @param items        – prepared models to place (already in desired sort order)
 * @param usableWidth  – available width (mm)
 * @param usableHeight – available height (mm)
 * @param layoutDistance – gap between items (mm)
 * @returns array of placements that fit on one sheet
 */
export const shelfPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  const shelves: Shelf[] = [];
  const placements: Placement[] = [];

  const tryFitInShelf = (shelf: Shelf, prepared: PreparedModel): ShelfItem | null => {
    // Try normal orientation
    const normalW = prepared.widthMm;
    const normalH = prepared.heightMm;
    const gapX = shelf.usedWidth > 0 ? layoutDistance : 0;

    if (shelf.usedWidth + gapX + normalW <= usableWidth + 0.001 && normalH <= shelf.height + 0.001) {
      return { prepared, rotated: false };
    }

    // Try rotated 90°
    const rotW = prepared.heightMm;
    const rotH = prepared.widthMm;
    if (shelf.usedWidth + gapX + rotW <= usableWidth + 0.001 && rotH <= shelf.height + 0.001) {
      return { prepared, rotated: true };
    }

    return null;
  };

  for (const prepared of items) {
    let placed = false;

    // Try to fit in an existing shelf (best-fit: choose shelf with least remaining width)
    let bestShelfIdx = -1;
    let bestFit: ShelfItem | null = null;
    let bestRemaining = Infinity;

    for (let i = 0; i < shelves.length; i++) {
      const fit = tryFitInShelf(shelves[i], prepared);
      if (fit) {
        const itemW = fit.rotated ? prepared.heightMm : prepared.widthMm;
        const gapX = shelves[i].usedWidth > 0 ? layoutDistance : 0;
        const remaining = usableWidth - (shelves[i].usedWidth + gapX + itemW);
        if (remaining < bestRemaining) {
          bestRemaining = remaining;
          bestShelfIdx = i;
          bestFit = fit;
        }
      }
    }

    if (bestShelfIdx >= 0 && bestFit) {
      const shelf = shelves[bestShelfIdx];
      const gapX = shelf.usedWidth > 0 ? layoutDistance : 0;
      const x = shelf.usedWidth + gapX;
      shelf.items.push({ item: bestFit, x });
      const itemW = bestFit.rotated ? prepared.heightMm : prepared.widthMm;
      shelf.usedWidth = x + itemW;
      placed = true;

      const itemH = bestFit.rotated ? prepared.widthMm : prepared.heightMm;
      placements.push(createPlacement(bestFit, x, shelf.y, itemW, itemH, prepared));
    }

    if (!placed) {
      // Create a new shelf
      const normalH = prepared.heightMm;
      const normalW = prepared.widthMm;
      const rotH = prepared.widthMm;
      const rotW = prepared.heightMm;

      // Calculate y position for new shelf
      const shelfGap = shelves.length > 0 ? layoutDistance : 0;
      const lastShelfBottom = shelves.length > 0
        ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].height
        : 0;
      const newShelfY = lastShelfBottom + shelfGap;

      // Try normal first, then rotated
      let rotated = false;
      let itemW = normalW;
      let itemH = normalH;

      if (normalW <= usableWidth + 0.001 && newShelfY + normalH <= usableHeight + 0.001) {
        rotated = false;
        itemW = normalW;
        itemH = normalH;
      } else if (rotW <= usableWidth + 0.001 && newShelfY + rotH <= usableHeight + 0.001) {
        rotated = true;
        itemW = rotW;
        itemH = rotH;
      } else {
        // Doesn't fit at all – skip this item
        continue;
      }

      const shelf: Shelf = {
        y: newShelfY,
        height: itemH,
        usedWidth: itemW,
        items: [{ item: { prepared, rotated }, x: 0 }],
      };
      shelves.push(shelf);

      placements.push(createPlacement({ prepared, rotated }, 0, newShelfY, itemW, itemH, prepared));
    }
  }

  return placements;
};

const createPlacement = (
  fit: ShelfItem,
  x: number,
  y: number,
  itemW: number,
  itemH: number,
  prepared: PreparedModel,
): Placement => ({
  modelEntryId: prepared.entryId,
  modelId: prepared.modelId,
  x,
  y,
  rotated: fit.rotated,
  widthMm: itemW,
  heightMm: itemH,
  svgContent: prepared.svgContent,
  shapePolylines: transformPolylines(
    prepared.shapePolylines, x, y, fit.rotated,
    prepared.widthMm, prepared.heightMm,
  ),
  boundaryPolylines: transformPolylines(
    prepared.boundaryPolylines, x, y, fit.rotated,
    prepared.widthMm, prepared.heightMm,
  ),
});
