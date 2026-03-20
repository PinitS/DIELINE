import type { Placement, PreparedModel, ShapePolyline } from "./types";

type Rotation = 0 | 90 | 180 | 270;

type ShelfItem = {
  prepared: PreparedModel;
  rotation: Rotation;
};

type Shelf = {
  y: number;
  height: number;
  usedWidth: number;
};

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

/**
 * Best rotation for an item: choose the rotation that yields the
 * smallest bounding-box height (used for FFDH sorting).
 */
const bestRotationHeight = (prepared: PreparedModel): number => {
  let minH = Infinity;
  for (const rotation of ROTATIONS) {
    const { itemH } = rotatedDims(prepared, rotation);
    if (itemH < minH) minH = itemH;
  }
  return minH;
};

/**
 * Standard First Fit Decreasing Height (FFDH) shelf packing.
 *
 * Items are sorted by height descending (considering best rotation),
 * then placed into the FIRST shelf where they fit. If no shelf fits,
 * a new shelf is opened below the last one.
 */
export const shelfStandardPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
): Placement[] => {
  // Sort by descending height (best rotation height)
  const sorted = [...items].sort(
    (a, b) => bestRotationHeight(b) - bestRotationHeight(a),
  );

  const shelves: Shelf[] = [];
  const placements: Placement[] = [];

  for (const prepared of sorted) {
    let placed = false;

    // First Fit: scan all existing shelves in order
    for (let i = 0; i < shelves.length; i++) {
      const shelf = shelves[i];
      const gapX = shelf.usedWidth > 0 ? layoutDistance : 0;

      for (const rotation of ROTATIONS) {
        const { itemW, itemH } = rotatedDims(prepared, rotation);
        if (
          shelf.usedWidth + gapX + itemW <= usableWidth + 0.001 &&
          itemH <= shelf.height + 0.001
        ) {
          // Place in this shelf
          const x = shelf.usedWidth + gapX;
          shelf.usedWidth = x + itemW;

          placements.push(
            createPlacement(
              { prepared, rotation },
              x,
              shelf.y,
              itemW,
              itemH,
              prepared,
            ),
          );
          placed = true;
          break;
        }
      }

      if (placed) break;
    }

    if (placed) continue;

    // Open a new shelf
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
      // Item doesn't fit in any rotation — skip
      continue;
    }

    shelves.push({
      y: newShelfY,
      height: itemH,
      usedWidth: itemW,
    });

    placements.push(
      createPlacement(
        { prepared, rotation: chosenRotation },
        0,
        newShelfY,
        itemW,
        itemH,
        prepared,
      ),
    );
  }

  return placements;
};
