import type { Placement, PreparedModel, Point, ShapePolyline } from "./types";

type Rotation = 0 | 90 | 180 | 270;

type ShelfItem = {
  prepared: PreparedModel;
  rotation: Rotation;
};

type Shelf = {
  y: number;
  height: number;
  usedWidth: number;
  items: Array<{ item: ShelfItem; x: number }>;
};

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

export const shelfPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  const shelves: Shelf[] = [];
  const placements: Placement[] = [];

  const ROTATIONS: Rotation[] = [0, 90, 180, 270];

  const tryFitInShelf = (shelf: Shelf, prepared: PreparedModel): ShelfItem | null => {
    const gapX = shelf.usedWidth > 0 ? layoutDistance : 0;
    for (const rotation of ROTATIONS) {
      const { itemW, itemH } = rotatedDims(prepared, rotation);
      if (
        shelf.usedWidth + gapX + itemW <= usableWidth + 0.001 &&
        itemH <= shelf.height + 0.001
      ) {
        return { prepared, rotation };
      }
    }
    return null;
  };

  for (const prepared of items) {
    let placed = false;

    let bestShelfIdx = -1;
    let bestFit: ShelfItem | null = null;
    let bestRemaining = Infinity;

    for (let i = 0; i < shelves.length; i++) {
      const fit = tryFitInShelf(shelves[i], prepared);
      if (fit) {
        const { itemW } = rotatedDims(prepared, fit.rotation);
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
      const { itemW, itemH } = rotatedDims(prepared, bestFit.rotation);
      shelf.usedWidth = x + itemW;
      placed = true;

      placements.push(createPlacement(bestFit, x, shelf.y, itemW, itemH, prepared));
    }

    if (!placed) {
      const shelfGap = shelves.length > 0 ? layoutDistance : 0;
      const lastShelfBottom =
        shelves.length > 0
          ? shelves[shelves.length - 1].y + shelves[shelves.length - 1].height
          : 0;
      const newShelfY = lastShelfBottom + shelfGap;

      let chosenRotation: Rotation | null = null;
      let itemW = 0;
      let itemH = 0;

      for (const rotation of ROTATIONS) {
        const dims = rotatedDims(prepared, rotation);
        if (
          dims.itemW <= usableWidth + 0.001 &&
          newShelfY + dims.itemH <= usableHeight + 0.001
        ) {
          chosenRotation = rotation;
          itemW = dims.itemW;
          itemH = dims.itemH;
          break;
        }
      }

      if (chosenRotation === null) {
        continue;
      }

      const shelf: Shelf = {
        y: newShelfY,
        height: itemH,
        usedWidth: itemW,
        items: [{ item: { prepared, rotation: chosenRotation }, x: 0 }],
      };
      shelves.push(shelf);

      placements.push(
        createPlacement({ prepared, rotation: chosenRotation }, 0, newShelfY, itemW, itemH, prepared),
      );
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
  rotation: fit.rotation,
  widthMm: itemW,
  heightMm: itemH,
  svgContent: prepared.svgContent,
  shapePolylines: transformPolylines(
    prepared.shapePolylines,
    x,
    y,
    fit.rotation,
    prepared.widthMm,
    prepared.heightMm,
  ),
  boundaryPolylines: transformPolylines(
    prepared.boundaryPolylines,
    x,
    y,
    fit.rotation,
    prepared.widthMm,
    prepared.heightMm,
  ),
});
