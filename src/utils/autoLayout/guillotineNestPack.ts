/**
 * Guillotine Nesting algorithm for auto layout.
 *
 * Combines guillotine cutting (full-width vertical cuts dividing paper into
 * columns, one per model type) with NFP-based nesting (placing items as close
 * as possible following actual contour shapes).
 *
 * Single model  → entire usable area is one column, NFP nest fills the space.
 * Multi model   → each model type gets its own column; column width is fit to
 *                 the model. Each column is nested independently.
 *
 * For each column, both 0° and 90° rotations are tested and the one that
 * fits more items is selected.
 */
import type { Placement, PreparedModel, Point, ShapePolyline } from "./types";
import {
  convexHull,
  computeNFP,
  computeIFP,
  pointInPolygon,
  segmentIntersection,
} from "./nfp";

type Rotation = 0 | 90 | 180 | 270;

const CUT_LINE_COLOR = "#ff2d2d";

// ---------- Geometry helpers (shared with nestPack) ----------

const getShapePolygon = (prepared: PreparedModel): Point[] => {
  const polylines =
    prepared.boundaryPolylines.length > 0
      ? prepared.boundaryPolylines
      : prepared.shapePolylines.filter(
          (pl) => pl.stroke.toLowerCase() === CUT_LINE_COLOR,
        );

  const allPoints: Point[] = [];
  for (const pl of polylines) {
    for (const pt of pl.points) {
      allPoints.push({ x: pt.x, y: pt.y });
    }
  }

  if (allPoints.length < 3) return [];
  return convexHull(allPoints);
};

const rotatePolygon = (
  polygon: Point[],
  rotation: Rotation,
  originalWidth: number,
  originalHeight: number,
): Point[] =>
  polygon.map((pt) => {
    if (rotation === 90) return { x: originalHeight - pt.y, y: pt.x };
    if (rotation === 180)
      return { x: originalWidth - pt.x, y: originalHeight - pt.y };
    if (rotation === 270) return { x: pt.y, y: originalWidth - pt.x };
    return { x: pt.x, y: pt.y };
  });

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
): { w: number; h: number } => {
  if (rotation === 90 || rotation === 270) {
    return { w: prepared.heightMm, h: prepared.widthMm };
  }
  return { w: prepared.widthMm, h: prepared.heightMm };
};

// ---------- NFP nesting within a single column ----------

/**
 * Nest identical items within a column using NFP.
 * Returns placements with coordinates relative to the column origin.
 */
const nestColumn = (
  prepared: PreparedModel,
  count: number,
  columnWidth: number,
  columnHeight: number,
  rotation: Rotation,
): Placement[] => {
  const placements: Placement[] = [];
  const placedPolygons: Point[][] = [];

  const basePolygon = getShapePolygon(prepared);
  if (basePolygon.length < 3) return [];

  const rotPoly = rotatePolygon(
    basePolygon,
    rotation,
    prepared.widthMm,
    prepared.heightMm,
  );

  const ifp = computeIFP(columnWidth, columnHeight, rotPoly);
  if (ifp.length === 0) return [];

  const { w, h } = rotatedDims(prepared, rotation);

  for (let i = 0; i < count; i++) {
    let bestPos: { x: number; y: number } | null = null;
    let bestScore = Infinity;

    if (placedPolygons.length === 0) {
      // First item: place at top-left of IFP
      bestPos = { x: ifp[0].x, y: ifp[0].y };
    } else {
      // Compute NFPs with all placed polygons
      const nfps: Point[][] = [];
      for (const placed of placedPolygons) {
        const nfp = computeNFP(placed, rotPoly);
        if (nfp.length >= 3) nfps.push(nfp);
      }

      // Collect candidate positions
      const candidates: Point[] = [];

      // NFP vertices
      for (const nfp of nfps) {
        for (const p of nfp) candidates.push(p);
      }

      // IFP vertices
      for (const p of ifp) candidates.push(p);

      // NFP–IFP edge intersections
      for (const nfp of nfps) {
        const nn = nfp.length;
        for (let ni = 0; ni < nn; ni++) {
          for (let j = 0; j < 4; j++) {
            const inter = segmentIntersection(
              nfp[ni],
              nfp[(ni + 1) % nn],
              ifp[j],
              ifp[(j + 1) % 4],
            );
            if (inter) candidates.push(inter);
          }
        }
      }

      // NFP–NFP edge intersections
      for (let a = 0; a < nfps.length; a++) {
        for (let b = a + 1; b < nfps.length; b++) {
          const na = nfps[a].length;
          const nb = nfps[b].length;
          for (let ni = 0; ni < na; ni++) {
            for (let nj = 0; nj < nb; nj++) {
              const inter = segmentIntersection(
                nfps[a][ni],
                nfps[a][(ni + 1) % na],
                nfps[b][nj],
                nfps[b][(nj + 1) % nb],
              );
              if (inter) candidates.push(inter);
            }
          }
        }
      }

      // Filter & score candidates
      const ifpLeft = ifp[0].x;
      const ifpRight = ifp[1].x;
      const ifpTop = ifp[0].y;
      const ifpBottom = ifp[2].y;

      for (const c of candidates) {
        if (
          c.x < ifpLeft - 0.01 ||
          c.x > ifpRight + 0.01 ||
          c.y < ifpTop - 0.01 ||
          c.y > ifpBottom + 0.01
        )
          continue;

        let valid = true;
        for (const nfp of nfps) {
          if (pointInPolygon(c, nfp)) {
            valid = false;
            break;
          }
        }
        if (!valid) continue;

        // Bottom-left heuristic: minimise y first, then x
        const score = c.y * 1e6 + c.x;
        if (score < bestScore) {
          bestScore = score;
          bestPos = { x: c.x, y: c.y };
        }
      }
    }

    if (!bestPos) break; // No more room

    const { x, y } = bestPos;

    // Track placed polygon
    placedPolygons.push(rotPoly.map((p) => ({ x: p.x + x, y: p.y + y })));

    placements.push({
      modelEntryId: prepared.entryId,
      modelId: prepared.modelId,
      x,
      y,
      rotation,
      widthMm: w,
      heightMm: h,
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

// ---------- Main entry point ----------

type ColumnDef = {
  prepared: PreparedModel;
  count: number;
  rotation: Rotation;
  columnWidth: number;
};

/**
 * For a given rotation per model, compute how many columns of each model
 * fit across the usable width, then return the column layout.
 *
 * Strategy: each model gets at least 1 column. Remaining width is filled
 * by adding more columns round-robin (model with most remaining items first).
 */
const buildColumns = (
  modelGroups: { prepared: PreparedModel; count: number }[],
  rotationChoices: Rotation[],
  usableWidth: number,
  usableHeight: number,
): ColumnDef[] | null => {
  // Determine column width for each model at chosen rotation
  const modelInfos = modelGroups.map((g, i) => {
    const rotation = rotationChoices[i];
    const { w, h } = rotatedDims(g.prepared, rotation);
    return { ...g, rotation, colW: w, colH: h };
  });

  // Check that at least 1 column of each model fits
  const minWidth = modelInfos.reduce((s, m) => s + m.colW, 0);
  if (minWidth > usableWidth + 0.001) return null;

  // Start with 1 column per model
  const columnCounts = modelInfos.map(() => 1);
  let usedWidth = minWidth;

  // Greedily add more columns — prioritise model with most remaining items
  let changed = true;
  while (changed) {
    changed = false;
    // Find model with most items still needing columns
    let bestIdx = -1;
    let bestNeed = 0;
    for (let i = 0; i < modelInfos.length; i++) {
      const m = modelInfos[i];
      // Rough estimate of items per column
      const perCol = Math.max(Math.floor(usableHeight / m.colH), 1);
      const totalCapacity = columnCounts[i] * perCol;
      const need = m.count - totalCapacity;
      if (need > bestNeed && m.colW <= usableWidth - usedWidth + 0.001) {
        bestNeed = need;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      columnCounts[bestIdx]++;
      usedWidth += modelInfos[bestIdx].colW;
      changed = true;
    }
  }

  // Build the column list
  const columns: ColumnDef[] = [];
  for (let i = 0; i < modelInfos.length; i++) {
    const m = modelInfos[i];
    const numCols = columnCounts[i];
    // Distribute items evenly across columns for this model
    const perCol = Math.ceil(m.count / numCols);
    let remaining = m.count;
    for (let c = 0; c < numCols; c++) {
      const count = Math.min(perCol, remaining);
      remaining -= count;
      columns.push({
        prepared: m.prepared,
        count,
        rotation: m.rotation,
        columnWidth: m.colW,
      });
    }
  }

  return columns;
};

export const guillotineNestPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  _layoutDistance: number,
): Placement[] => {
  if (items.length === 0) return [];

  // Group items by entryId (each group = one model type)
  const groups = new Map<string, { prepared: PreparedModel; count: number }>();
  for (const item of items) {
    const existing = groups.get(item.entryId);
    if (existing) {
      existing.count++;
    } else {
      groups.set(item.entryId, { prepared: item, count: 1 });
    }
  }

  const modelGroups = [...groups.values()];
  const numModels = modelGroups.length;

  // Try all rotation combinations (0° and 90° per model, max 2^8=256)
  let bestColumns: ColumnDef[] | null = null;
  let bestTotalPlaced = 0;
  const maxCombinations = Math.min(1 << numModels, 256);

  for (let mask = 0; mask < maxCombinations; mask++) {
    const rotationChoices: Rotation[] = [];
    for (let i = 0; i < numModels; i++) {
      rotationChoices.push((mask & (1 << i)) ? 90 : 0);
    }

    const columns = buildColumns(modelGroups, rotationChoices, usableWidth, usableHeight);
    if (!columns) continue;

    // Estimate total items placed
    let totalPlaced = 0;
    for (const col of columns) {
      const { h } = rotatedDims(col.prepared, col.rotation);
      const rowsFit = Math.max(Math.floor(usableHeight / h), 1);
      totalPlaced += Math.min(rowsFit, col.count);
    }

    if (totalPlaced > bestTotalPlaced) {
      bestTotalPlaced = totalPlaced;
      bestColumns = columns;
    }
  }

  if (!bestColumns) return [];

  // Lay out columns left to right, each using NFP nesting
  const allPlacements: Placement[] = [];
  let columnX = 0;

  for (const col of bestColumns) {
    const columnPlacements = nestColumn(
      col.prepared,
      col.count,
      col.columnWidth,
      usableHeight,
      col.rotation,
    );

    // Offset placements by column X position
    for (const p of columnPlacements) {
      p.x += columnX;
      for (const sp of p.shapePolylines) {
        for (const pt of sp.points) pt.x += columnX;
      }
      for (const bp of p.boundaryPolylines) {
        for (const pt of bp.points) pt.x += columnX;
      }
      allPlacements.push(p);
    }

    columnX += col.columnWidth;
  }

  return allPlacements;
};
