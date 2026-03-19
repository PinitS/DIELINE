import type { Placement, Point, ShapePolyline } from "./types";

const PAPER_BORDER_COLOR = "#000000";
const PAPER_BORDER_WIDTH = 0.5;
const GRIPER_COLOR = "#22c55e";
const GRIPER_FILL = "rgba(34,197,94,0.08)";
const GRIPER_BORDER_WIDTH = 0.3;
const BOUNDARY_COLOR = "#22c55e";
const BOUNDARY_WIDTH = 0.2;
const BOUNDARY_DASH = "2 1.5";
const USABLE_AREA_DASH = "4 2";
const USABLE_AREA_COLOR = "#94a3b8";
const USABLE_AREA_WIDTH = 0.2;

const polylineToSvg = (pl: ShapePolyline): string => {
  const pts = pl.points.map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");
  const dash = pl.dashArray ? ` stroke-dasharray="${pl.dashArray}"` : "";
  return `<polyline points="${pts}" stroke="${pl.stroke}" stroke-width="${pl.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
};

const rectSvg = (x: number, y: number, w: number, h: number, stroke: string, strokeWidth: number, fill: string, dash?: string): string => {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"${d}/>`;
};

export type RenderLayoutSvgOptions = {
  paperWidth: number;
  paperHeight: number;
  spacingLeft: number;
  spacingRight: number;
  griper: number;
  placements: Placement[];
};

/**
 * Render the complete layout as an SVG string.
 * Placements are in the usable-area coordinate system, so we translate
 * them by spacingLeft from the left and 0 from the top (griper is at the bottom).
 */
export const renderLayoutSvg = (options: RenderLayoutSvgOptions): string => {
  const { paperWidth, paperHeight, spacingLeft, spacingRight, griper, placements } = options;
  const usableTop = 0;
  const usableLeft = spacingLeft;
  const usableWidth = paperWidth - spacingLeft - spacingRight;
  const usableHeight = paperHeight - griper;

  const parts: string[] = [];

  // Paper border
  parts.push(rectSvg(0, 0, paperWidth, paperHeight, PAPER_BORDER_COLOR, PAPER_BORDER_WIDTH, "white"));

  // Usable area outline (dashed)
  parts.push(rectSvg(usableLeft, usableTop, usableWidth, usableHeight, USABLE_AREA_COLOR, USABLE_AREA_WIDTH, "none", USABLE_AREA_DASH));

  // Griper zone
  if (griper > 0) {
    parts.push(rectSvg(0, paperHeight - griper, paperWidth, griper, GRIPER_COLOR, GRIPER_BORDER_WIDTH, GRIPER_FILL));
  }

  // Each placement
  for (const pl of placements) {
    // Boundary polylines (green offset shape)
    for (const bp of pl.boundaryPolylines) {
      parts.push(polylineToSvg({
        ...bp,
        stroke: BOUNDARY_COLOR,
        strokeWidth: BOUNDARY_WIDTH,
        dashArray: BOUNDARY_DASH,
        // Translate to paper coordinates
        points: bp.points.map((p) => ({ x: p.x + usableLeft, y: p.y + usableTop })),
      }));
    }

    // Shape polylines (red cut lines / green fold lines)
    for (const sp of pl.shapePolylines) {
      parts.push(polylineToSvg({
        ...sp,
        points: sp.points.map((p) => ({ x: p.x + usableLeft, y: p.y + usableTop })),
      }));
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${paperWidth}mm" height="${paperHeight}mm" viewBox="0 0 ${paperWidth} ${paperHeight}">`,
    `  ${parts.join("\n  ")}`,
    `</svg>`,
  ].join("\n");
};

/**
 * Convert an SVG string to a Blob image via an offscreen canvas.
 * Returns a PNG Blob.
 */
export const svgToBlob = (svgString: string, widthPx: number, heightPx: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas 2D context not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };

    img.src = url;
  });
