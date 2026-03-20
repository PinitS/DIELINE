import { convertDielineToSvg } from "../export/convertDielineToSvg";
import type { DielineExportData, DielineModelId } from "../../types";
import { offsetPolyline } from "./offsetPolyline";
import { shelfPack } from "./shelfPack";
import { renderLayoutSvg, svgToBlob } from "./renderLayoutSvg";
import type {
  AutoLayoutConfig,
  AutoLayoutPaperResult,
  AutoLayoutCalculatorEntry,
  PreparedModel,
  ShapePolyline,
  Point,
} from "./types";

// ---------- SVG parsing helpers ----------

const CUT_LINE_COLOR = "#ff2d2d";
const FOLD_LINE_COLOR = "#22c55e";

/**
 * Extract an attribute value from an SVG element string.
 */
const getAttr = (element: string, name: string): string | undefined => {
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(element);
  return match?.[1];
};

/**
 * Parse polyline elements from an SVG string and return ShapePolylines.
 */
const parseSvgPolylines = (svg: string): ShapePolyline[] => {
  const polylines: ShapePolyline[] = [];
  const tagRegex = /<polyline\s[^>]*\/>/g;

  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(svg)) !== null) {
    const el = tagMatch[0];
    const pointsStr = getAttr(el, "points");
    const stroke = getAttr(el, "stroke");
    const strokeWidthStr = getAttr(el, "stroke-width");
    const dashArray = getAttr(el, "stroke-dasharray");

    if (!pointsStr || !stroke || !strokeWidthStr) continue;

    const points: Point[] = pointsStr.trim().split(/\s+/).map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });

    polylines.push({ points, stroke, strokeWidth: parseFloat(strokeWidthStr), dashArray: dashArray || undefined });
  }

  return polylines;
};

/**
 * Extract the cut-line polylines (shape outline) from SVG.
 * These are polylines with the red cut-line stroke color.
 */
const extractShapePolylines = (svg: string): ShapePolyline[] =>
  parseSvgPolylines(svg).filter((pl) =>
    pl.stroke.toLowerCase() === CUT_LINE_COLOR.toLowerCase() ||
    pl.stroke.toLowerCase() === FOLD_LINE_COLOR.toLowerCase()
  );

/**
 * Extract only the cut-line (outline) polylines for offset boundary generation.
 */
const extractOutlinePolylines = (svg: string): ShapePolyline[] =>
  parseSvgPolylines(svg).filter((pl) =>
    pl.stroke.toLowerCase() === CUT_LINE_COLOR.toLowerCase()
  );

// ---------- Prepare models ----------

const prepareModel = (
  entryId: string,
  modelId: DielineModelId,
  attributes: Record<string, unknown>,
  layoutDistance: number,
): PreparedModel => {
  const exportData: DielineExportData = {
    modelId,
    attributes: attributes as DielineExportData["attributes"],
  };

  const svgDoc = convertDielineToSvg(exportData, { isShowDimension: false });

  // Parse polylines from the generated SVG
  const allPolylines = extractShapePolylines(svgDoc.svg);
  const outlinePolylines = extractOutlinePolylines(svgDoc.svg);

  const outlineBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const pl of outlinePolylines) {
    for (const pt of pl.points) {
      outlineBounds.minX = Math.min(outlineBounds.minX, pt.x);
      outlineBounds.minY = Math.min(outlineBounds.minY, pt.y);
      outlineBounds.maxX = Math.max(outlineBounds.maxX, pt.x);
      outlineBounds.maxY = Math.max(outlineBounds.maxY, pt.y);
    }
  }
  const svgPaddingX = (svgDoc.widthMm - (outlineBounds.maxX - outlineBounds.minX)) / 2;
  const svgPaddingY = (svgDoc.heightMm - (outlineBounds.maxY - outlineBounds.minY)) / 2;
  const svgPadding = Math.max(svgPaddingX, svgPaddingY, 0);

  let boundaryPolylines: ShapePolyline[] = [];
  if (layoutDistance > 0) {
    boundaryPolylines = outlinePolylines.map((pl) => {
      const closedPoints = pl.points.length > 2 ? pl.points : pl.points;
      const offsetPoints = offsetPolyline(closedPoints, layoutDistance / 2);
      return {
        points: offsetPoints,
        stroke: "#22c55e",
        strokeWidth: 0.2,
      };
    });
  }

  return {
    entryId,
    modelId,
    svgContent: svgDoc.svg,
    widthMm: svgDoc.widthMm,
    heightMm: svgDoc.heightMm,
    svgPadding,
    shapePolylines: allPolylines,
    boundaryPolylines,
  };
};

// ---------- Sort strategies ----------

const sortLargestFirst = (items: PreparedModel[]): PreparedModel[] =>
  [...items].sort((a, b) => (b.widthMm * b.heightMm) - (a.widthMm * a.heightMm));

const sortSmallestFirst = (items: PreparedModel[]): PreparedModel[] =>
  [...items].sort((a, b) => (a.widthMm * a.heightMm) - (b.widthMm * b.heightMm));

const sortAlternateModels = (items: PreparedModel[]): PreparedModel[] => {
  const groups = new Map<string, PreparedModel[]>();
  for (const item of items) {
    const list = groups.get(item.entryId) ?? [];
    list.push(item);
    groups.set(item.entryId, list);
  }
  const result: PreparedModel[] = [];
  const iterators = [...groups.values()].map((g) => ({ items: g, idx: 0 }));
  let remaining = items.length;
  while (remaining > 0) {
    for (const it of iterators) {
      if (it.idx < it.items.length) {
        result.push(it.items[it.idx++]);
        remaining--;
      }
    }
  }
  return result;
};

// ---------- Main ----------

const IMAGE_SCALE = 3; // px per mm for rendered image

export const calculateAutoLayout = async (
  config: AutoLayoutConfig,
): Promise<AutoLayoutPaperResult[]> => {
  const { papers, models, layoutDistance, spacingLeft, spacingRight, griper } = config;

  // Prepare all model instances
  const preparedByEntry = new Map<string, PreparedModel>();
  for (const entry of models) {
    const prepared = prepareModel(entry.id, entry.modelId, entry.attributes, layoutDistance);
    preparedByEntry.set(entry.id, prepared);
  }

  // Expand into item list (one PreparedModel per required piece)
  const allItems: PreparedModel[] = [];
  for (const entry of models) {
    const prepared = preparedByEntry.get(entry.id)!;
    for (let i = 0; i < entry.quantity; i++) {
      allItems.push(prepared);
    }
  }

  const results: AutoLayoutPaperResult[] = [];

  for (const paper of papers) {
    const usableWidth = paper.width - spacingLeft - spacingRight;
    const usableHeight = paper.height - griper;

    if (usableWidth <= 0 || usableHeight <= 0) {
      results.push({
        paperId: paper.id,
        paperName: paper.name,
        paperWidth: paper.width,
        paperHeight: paper.height,
        summary: { paperLost: 100, totalSheets: 0, calculator: [] },
        image: new Blob(),
      });
      continue;
    }

    // Try multiple sort strategies, pick the best
    const strategies = [
      { name: "largestFirst", items: sortLargestFirst(allItems) },
      { name: "smallestFirst", items: sortSmallestFirst(allItems) },
      { name: "alternate", items: sortAlternateModels(allItems) },
      { name: "original", items: allItems },
    ];

    const svgPadding = allItems[0]?.svgPadding ?? 0;
    const effectiveGap = layoutDistance - 2 * svgPadding;
    const edgeMargin = Math.max(layoutDistance / 2 - svgPadding, 0);
    const packWidth = usableWidth - 2 * edgeMargin;
    const packHeight = usableHeight - 2 * edgeMargin;

    let bestPlacements: ReturnType<typeof shelfPack> = [];

    for (const strategy of strategies) {
      const placements = shelfPack(strategy.items, packWidth, packHeight, effectiveGap);
      if (placements.length > bestPlacements.length) {
        bestPlacements = placements;
      }
    }

    // Offset placements by edge margin
    for (const p of bestPlacements) {
      p.x += edgeMargin;
      p.y += edgeMargin;
      for (const sp of p.shapePolylines) {
        for (const pt of sp.points) { pt.x += edgeMargin; pt.y += edgeMargin; }
      }
      for (const bp of p.boundaryPolylines) {
        for (const pt of bp.points) { pt.x += edgeMargin; pt.y += edgeMargin; }
      }
    }

    // Count per model entry per sheet
    const countMap = new Map<string, number>();
    for (const pl of bestPlacements) {
      countMap.set(pl.modelEntryId, (countMap.get(pl.modelEntryId) ?? 0) + 1);
    }

    // Paper utilization
    const totalPaperArea = paper.width * paper.height;
    const usedArea = bestPlacements.reduce((sum, pl) => sum + pl.widthMm * pl.heightMm, 0);
    const paperLost = Number(((1 - usedArea / totalPaperArea) * 100).toFixed(2));

    // Calculate total sheets needed
    let totalSheets = 0;
    for (const entry of models) {
      const perSheet = countMap.get(entry.id) ?? 0;
      if (perSheet > 0) {
        totalSheets = Math.max(totalSheets, Math.ceil(entry.quantity / perSheet));
      }
    }

    // Calculator with excess count
    const calculator: AutoLayoutCalculatorEntry[] = models.map((entry) => {
      const perSheet = countMap.get(entry.id) ?? 0;
      const totalProduced = perSheet * totalSheets;
      return {
        modelId: entry.modelId,
        excessCount: totalProduced - entry.quantity,
      };
    });

    // Render SVG
    const svgString = renderLayoutSvg({
      paperWidth: paper.width,
      paperHeight: paper.height,
      spacingLeft,
      spacingRight,
      griper,
      placements: bestPlacements,
    });

    // Convert to image blob
    const widthPx = Math.round(paper.width * IMAGE_SCALE);
    const heightPx = Math.round(paper.height * IMAGE_SCALE);
    const image = await svgToBlob(svgString, widthPx, heightPx);

    results.push({
      paperId: paper.id,
      paperName: paper.name,
      paperWidth: paper.width,
      paperHeight: paper.height,
      summary: { paperLost, totalSheets, calculator },
      image,
    });
  }

  return results;
};
