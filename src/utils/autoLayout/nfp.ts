/**
 * No-Fit Polygon (NFP) computation utilities for nesting algorithm.
 *
 * NFP(A, B) = Minkowski sum of A and (-B).
 * It defines the boundary of positions where B's reference point
 * would cause B to overlap with A.
 */
import type { Point } from "./types";

const EPS = 1e-9;

/** Cross product of vectors OA × OB */
const cross2 = (O: Point, A: Point, B: Point): number =>
  (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);

/**
 * Convex hull using Andrew's monotone chain algorithm.
 * Returns vertices in CCW order.
 */
export const convexHull = (points: Point[]): Point[] => {
  if (points.length <= 2) return [...points];

  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const n = pts.length;

  // Lower hull
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }

  // Upper hull
  const upper: Point[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0)
      upper.pop();
    upper.push(pts[i]);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
};

/** Ensure polygon vertices are in counter-clockwise order */
export const ensureCCW = (polygon: Point[]): Point[] => {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  return area >= 0 ? [...polygon] : [...polygon].reverse();
};

/**
 * Minkowski sum of two convex polygons (both assumed CCW).
 * Uses the rotating-calipers / edge-merging approach.
 */
export const minkowskiSum = (P: Point[], Q: Point[]): Point[] => {
  const A = ensureCCW(P);
  const B = ensureCCW(Q);
  const an = A.length;
  const bn = B.length;
  if (an === 0 || bn === 0) return [];

  /** Find the index of the bottom-most (then left-most) vertex */
  const findBottom = (poly: Point[]): number => {
    let idx = 0;
    for (let i = 1; i < poly.length; i++) {
      if (poly[i].y < poly[idx].y || (poly[i].y === poly[idx].y && poly[i].x < poly[idx].x))
        idx = i;
    }
    return idx;
  };

  const aStart = findBottom(A);
  const bStart = findBottom(B);

  const result: Point[] = [];
  let i = 0;
  let j = 0;

  while (i < an || j < bn) {
    const ai = (aStart + i) % an;
    const bi = (bStart + j) % bn;

    result.push({ x: A[ai].x + B[bi].x, y: A[ai].y + B[bi].y });

    if (i >= an) {
      j++;
      continue;
    }
    if (j >= bn) {
      i++;
      continue;
    }

    const aNext = (aStart + i + 1) % an;
    const bNext = (bStart + j + 1) % bn;

    // Edge vectors
    const ae = { x: A[aNext].x - A[ai].x, y: A[aNext].y - A[ai].y };
    const be = { x: B[bNext].x - B[bi].x, y: B[bNext].y - B[bi].y };

    // Cross product determines which edge has smaller angle
    const c = ae.x * be.y - ae.y * be.x;

    if (c > EPS) i++;
    else if (c < -EPS) j++;
    else {
      i++;
      j++;
    }
  }

  return result;
};

/**
 * Compute No-Fit Polygon: NFP(stationary, orbiting).
 * The result is the locus of orbiting's reference point (origin)
 * where orbiting touches or overlaps stationary.
 *
 * Placing orbiting's origin OUTSIDE all NFPs avoids overlap.
 */
export const computeNFP = (stationary: Point[], orbiting: Point[]): Point[] => {
  // NFP = Minkowski sum of stationary and (-orbiting)
  const negOrbiting = ensureCCW(orbiting.map((p) => ({ x: -p.x, y: -p.y })));
  return minkowskiSum(ensureCCW(stationary), negOrbiting);
};

/**
 * Compute Inner-Fit Polygon: the rectangular region where orbiting's
 * reference point can be placed so that the entire polygon stays
 * within the container [0, width] × [0, height].
 *
 * Returns 4 vertices (CCW) of the valid rectangle, or [] if it doesn't fit.
 */
export const computeIFP = (
  width: number,
  height: number,
  polygon: Point[],
): Point[] => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const left = -minX;
  const top = -minY;
  const right = width - maxX;
  const bottom = height - maxY;

  if (left > right + EPS || top > bottom + EPS) return [];

  // CCW rectangle
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
};

/**
 * Point-in-polygon test using ray casting.
 * Returns true if the point is strictly inside (not on boundary).
 */
export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  const n = polygon.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
};

/**
 * Find the intersection point of two line segments, or null if they don't intersect.
 */
export const segmentIntersection = (
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Point | null => {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;

  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < EPS) return null;

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom;

  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;

  return { x: a1.x + t * d1x, y: a1.y + t * d1y };
};
