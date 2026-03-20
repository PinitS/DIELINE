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

  // For each model, determine optimal rotation and column width
  type ColumnPlan = {
    prepared: PreparedModel;
    count: number;
    rotation: Rotation;
    columnWidth: number;
  };

  const ROTATIONS_TO_TRY: Rotation[] = [0, 90];

  // First pass: determine column widths for each rotation option
  // We need to check if all columns fit within usableWidth
  const buildColumnPlans = (rotationChoices: Rotation[]): ColumnPlan[] | null => {
    const plans: ColumnPlan[] = [];
    let totalWidth = 0;

    for (let i = 0; i < modelGroups.length; i++) {
      const { prepared, count } = modelGroups[i];
      const rotation = rotationChoices[i];
      const { w } = rotatedDims(prepared, rotation);
      const columnWidth = w;
      totalWidth += columnWidth;
      plans.push({ prepared, count, rotation, columnWidth });
    }

    if (totalWidth > usableWidth + 0.001) return null;
    return plans;
  };

  // Try all rotation combinations (2^N for N models, max practical)
  // For large N, limit to just 0° and 90° per model independently
  const numModels = modelGroups.length;
  let bestPlans: ColumnPlan[] | null = null;
  let bestTotalPlaced = 0;

  // Generate rotation combinations (max 2^N, capped at 2^8=256)
  const maxCombinations = Math.min(1 << numModels, 256);

  for (let mask = 0; mask < maxCombinations; mask++) {
    const rotationChoices: Rotation[] = [];
    for (let i = 0; i < numModels; i++) {
      rotationChoices.push((mask & (1 << i)) ? 90 : 0);
    }

    const plans = buildColumnPlans(rotationChoices);
    if (!plans) continue;

    // Calculate total width used and distribute remaining space
    const totalColumnsWidth = plans.reduce((s, p) => s + p.columnWidth, 0);
    const remainingWidth = usableWidth - totalColumnsWidth;

    // Quick estimate: how many items can we fit?
    let totalPlaced = 0;
    for (const plan of plans) {
      const { h } = rotatedDims(plan.prepared, plan.rotation);
      // Simple estimate: items stacked vertically (conservative)
      const rowsFit = Math.floor(usableHeight / h);
      totalPlaced += Math.min(rowsFit, plan.count);
    }

    // Also consider if remaining space can fit another column
    if (remainingWidth > 0 && plans.length > 0) {
      // Find the narrowest model that could fit in remaining space
      for (const plan of plans) {
        const { w, h } = rotatedDims(plan.prepared, plan.rotation);
        if (w <= remainingWidth + 0.001) {
          const extraRows = Math.floor(usableHeight / h);
          totalPlaced += extraRows;
          break;
        }
      }
    }

    if (totalPlaced > bestTotalPlaced) {
      bestTotalPlaced = totalPlaced;
      bestPlans = plans;
    }
  }

  if (!bestPlans) return [];

  // Lay out columns left to right using NFP nesting
  const allPlacements: Placement[] = [];
  let columnX = 0;

  // Calculate total fixed column width
  const totalFixedWidth = bestPlans.reduce((s, p) => s + p.columnWidth, 0);
  const remainingWidth = usableWidth - totalFixedWidth;

  for (let i = 0; i < bestPlans.length; i++) {
    const plan = bestPlans[i];

    // Give extra width to the last column (or distribute evenly)
    let effectiveColumnWidth = plan.columnWidth;
    if (i === bestPlans.length - 1 && remainingWidth > 0) {
      effectiveColumnWidth += remainingWidth;
    }

    // Nest items within this column
    const columnPlacements = nestColumn(
      plan.prepared,
      plan.count,
      effectiveColumnWidth,
      usableHeight,
      plan.rotation,
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

    columnX += plan.columnWidth;
  }

  // If there's remaining width after all columns, try to fill with more items
  // by adding extra columns for models that still have unfulfilled counts
  if (remainingWidth > 0 && bestPlans.length > 0) {
    // Count how many of each model were placed
    const placedCounts = new Map<string, number>();
    for (const p of allPlacements) {
      placedCounts.set(p.modelEntryId, (placedCounts.get(p.modelEntryId) ?? 0) + 1);
    }

    // Try to add more columns for models with remaining items
    let extraX = totalFixedWidth;
    for (const plan of bestPlans) {
      const placed = placedCounts.get(plan.prepared.entryId) ?? 0;
      const remaining = plan.count - placed;
      if (remaining <= 0) continue;

      const { w } = rotatedDims(plan.prepared, plan.rotation);
      if (w > usableWidth - extraX + 0.001) continue;

      const extraColumnWidth = Math.min(w, usableWidth - extraX);
      const extraPlacements = nestColumn(
        plan.prepared,
        remaining,
        extraColumnWidth,
        usableHeight,
        plan.rotation,
      );

      for (const p of extraPlacements) {
        p.x += extraX;
        for (const sp of p.shapePolylines) {
          for (const pt of sp.points) pt.x += extraX;
        }
        for (const bp of p.boundaryPolylines) {
          for (const pt of bp.points) pt.x += extraX;
        }
        allPlacements.push(p);
      }

      if (extraPlacements.length > 0) {
        extraX += w;
      }
    }
  }

  return allPlacements;
};
