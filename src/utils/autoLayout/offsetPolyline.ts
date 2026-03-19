import type { Point } from "./types";

/**
 * Offset a closed polyline outward by `distance` mm.
 * Uses the Minkowski-sum-style approach: for each edge, compute a parallel
 * line shifted outward by `distance`, then intersect consecutive parallel
 * lines to find the new corner positions.
 *
 * The input polygon is assumed to be wound counter-clockwise when viewed in
 * screen coordinates (Y increases downward). If the winding is clockwise the
 * offset will shrink the polygon instead—callers should ensure CCW winding.
 *
 * For circle-approximated shapes the result is still a polygon (no arcs).
 */
export const offsetPolyline = (points: Point[], distance: number): Point[] => {
  if (points.length < 3) return points;

  // Remove closing duplicate if present
  const pts = (
    points[0].x === points[points.length - 1].x &&
    points[0].y === points[points.length - 1].y
  ) ? points.slice(0, -1) : [...points];

  const n = pts.length;
  if (n < 3) return points;

  // Determine winding order (signed area). Positive = CCW in screen coords.
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    signedArea += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y);
  }
  // If CW, flip distance so offset goes outward.
  const d = signedArea > 0 ? distance : -distance;

  // For each edge compute the unit outward normal
  type Edge = { nx: number; ny: number; px: number; py: number };
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = pts[j].x - pts[i].x;
    const dy = pts[j].y - pts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-9) {
      // Degenerate edge – reuse previous or identity
      edges.push(edges.length > 0 ? edges[edges.length - 1] : { nx: 0, ny: -1, px: pts[i].x, py: pts[i].y - d });
      continue;
    }
    // Outward normal (left-hand side of edge direction)
    const nx = -dy / len;
    const ny = dx / len;
    // A point on the offset edge
    edges.push({ nx, ny, px: pts[i].x + nx * d, py: pts[i].y + ny * d });
  }

  // Intersect consecutive offset edges to find new vertices
  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    const e1 = edges[i];
    const e2 = edges[(i + 1) % n];
    // Edge 1 direction
    const d1x = pts[(i + 1) % n].x - pts[i].x;
    const d1y = pts[(i + 1) % n].y - pts[i].y;
    // Edge 2 direction
    const ni = (i + 1) % n;
    const nj = (ni + 1) % n;
    const d2x = pts[nj].x - pts[ni].x;
    const d2y = pts[nj].y - pts[ni].y;

    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-9) {
      // Parallel edges – just use the offset point
      result.push({ x: e2.px, y: e2.py });
      continue;
    }

    // Parametric intersection: e1.p + t * d1 = e2.p + s * d2
    const t = ((e2.px - e1.px) * d2y - (e2.py - e1.py) * d2x) / cross;
    result.push({
      x: e1.px + t * d1x,
      y: e1.py + t * d1y,
    });
  }

  // Close the polyline
  if (result.length > 0) {
    result.push({ ...result[0] });
  }

  return result;
};
