/**
 * NFP-based nesting algorithm for auto layout.
 *
 * Uses No-Fit Polygons (Minkowski difference) to place items
 * using their actual convex hull shape instead of bounding boxes.
 * This can save ~20% paper compared to shelf packing for irregular shapes.
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

/**
 * Extract a convex-hull polygon representing the shape for NFP computation.
 * Prefers boundary polylines (include layoutDistance offset) when available;
 * falls back to cut-line polylines.
 */
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

/** Rotate polygon vertices by the given angle, matching shelfPack transform convention. */
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

/** Transform polylines to placement position (same logic as shelfPack). */
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

/**
 * NFP-based nesting packer.
 *
 * For each item (trying 4 rotations):
 * 1. Compute IFP (inner-fit polygon) with the container.
 * 2. Compute NFP with every already-placed item.
 * 3. Collect candidate positions from NFP/IFP vertices and edge intersections.
 * 4. Filter: must be inside IFP and outside all NFP interiors.
 * 5. Choose the position that minimises (y, then x) — bottom-left heuristic.
 */
export const nestPack = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  _layoutDistance: number,
): Placement[] => {
  const placements: Placement[] = [];
  /** Placed polygons in container coordinates (for NFP computation). */
  const placedPolygons: Point[][] = [];

  const ROTATIONS: Rotation[] = [0, 90, 180, 270];

  for (const prepared of items) {
    const basePolygon = getShapePolygon(prepared);
    if (basePolygon.length < 3) continue;

    let bestPos: { x: number; y: number; rotation: Rotation } | null = null;
    let bestScore = Infinity;

    for (const rotation of ROTATIONS) {
      const { w, h } = rotatedDims(prepared, rotation);

      // Quick bounding-box check
      if (w > usableWidth + 0.001 || h > usableHeight + 0.001) continue;

      const rotPoly = rotatePolygon(
        basePolygon,
        rotation,
        prepared.widthMm,
        prepared.heightMm,
      );

      // Inner-fit polygon: valid positions for this shape inside container
      const ifp = computeIFP(usableWidth, usableHeight, rotPoly);
      if (ifp.length === 0) continue;

      // --- First item: place at top-left corner of IFP ---
      if (placedPolygons.length === 0) {
        const pos = ifp[0]; // top-left
        const score = pos.y * 1e6 + pos.x;
        if (score < bestScore) {
          bestScore = score;
          bestPos = { x: pos.x, y: pos.y, rotation };
        }
        continue;
      }

      // --- Compute NFPs with all placed polygons ---
      const nfps: Point[][] = [];
      for (const placed of placedPolygons) {
        const nfp = computeNFP(placed, rotPoly);
        if (nfp.length >= 3) nfps.push(nfp);
      }

      // --- Collect candidate positions ---
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
        for (let i = 0; i < nn; i++) {
          for (let j = 0; j < 4; j++) {
            const inter = segmentIntersection(
              nfp[i],
              nfp[(i + 1) % nn],
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
          for (let i = 0; i < na; i++) {
            for (let j = 0; j < nb; j++) {
              const inter = segmentIntersection(
                nfps[a][i],
                nfps[a][(i + 1) % na],
                nfps[b][j],
                nfps[b][(j + 1) % nb],
              );
              if (inter) candidates.push(inter);
            }
          }
        }
      }

      // --- Filter & score candidates ---
      const ifpLeft = ifp[0].x;
      const ifpRight = ifp[1].x;
      const ifpTop = ifp[0].y;
      const ifpBottom = ifp[2].y;

      for (const c of candidates) {
        // Must be inside IFP rectangle
        if (
          c.x < ifpLeft - 0.01 ||
          c.x > ifpRight + 0.01 ||
          c.y < ifpTop - 0.01 ||
          c.y > ifpBottom + 0.01
        )
          continue;

        // Must be outside all NFP interiors (on boundary is OK — touching allowed)
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
          bestPos = { x: c.x, y: c.y, rotation };
        }
      }
    }

    // --- Record placement ---
    if (bestPos) {
      const { x, y, rotation } = bestPos;
      const { w, h } = rotatedDims(prepared, rotation);

      // Track the placed polygon in container coordinates
      const rotPoly = rotatePolygon(
        basePolygon,
        rotation,
        prepared.widthMm,
        prepared.heightMm,
      );
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
  }

  return placements;
};
