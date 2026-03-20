import { convertDielineToSvg } from "../export/convertDielineToSvg";
import type { DielineExportData, DielineModelId } from "../../types";
import { offsetPolyline } from "./offsetPolyline";
import { shelfPack } from "./shelfPack";
import { nestPack } from "./nestPack";
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

// ---------- Packing helpers ----------

/**
 * Try all sorting strategies and return the packing with the most placements.
 */
const bestStrategyPack = (
  items: PreparedModel[],
  packWidth: number,
  packHeight: number,
  effectiveGap: number,
): ReturnType<typeof shelfPack> => {
  const strategies = [
    sortLargestFirst(items),
    sortSmallestFirst(items),
    sortAlternateModels(items),
    items,
  ];
  let best: ReturnType<typeof shelfPack> = [];
  for (const sorted of strategies) {
    const placements = shelfPack(sorted, packWidth, packHeight, effectiveGap);
    if (placements.length > best.length) {
      best = placements;
    }
  }
  return best;
};

/**
 * Try all sorting strategies using NFP-based nesting and return the best.
 */
const bestStrategyPackNest = (
  items: PreparedModel[],
  packWidth: number,
  packHeight: number,
  effectiveGap: number,
): ReturnType<typeof nestPack> => {
  const strategies = [
    sortLargestFirst(items),
    sortSmallestFirst(items),
    sortAlternateModels(items),
    items,
  ];
  let best: ReturnType<typeof nestPack> = [];
  for (const sorted of strategies) {
    const placements = nestPack(sorted, packWidth, packHeight, effectiveGap);
    if (placements.length > best.length) {
      best = placements;
    }
  }
  return best;
};

// ---------- Main ----------

export const calculateAutoLayout = async (
  config: AutoLayoutConfig,
): Promise<AutoLayoutPaperResult[]> => {
  const { papers, models, layoutDistance, spacingLeft, spacingRight, griper, strategy = 'shelf' } = config;

  // Prepare all model instances
  const preparedByEntry = new Map<string, PreparedModel>();
  for (const entry of models) {
    const prepared = prepareModel(entry.id, entry.modelId, entry.attributes, layoutDistance);
    preparedByEntry.set(entry.id, prepared);
  }

  const modelData = models.map((entry) => ({
    entry,
    prepared: preparedByEntry.get(entry.id)!,
  }));

  const results: AutoLayoutPaperResult[] = [];

  for (const paper of papers) {
    const usableWidth = paper.width - spacingLeft - spacingRight;
    const usableHeight = paper.height - griper;

    if (usableWidth <= 0 || usableHeight <= 0 || models.length === 0) {
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

    const svgPadding = modelData[0]?.prepared.svgPadding ?? 0;
    const effectiveGap = layoutDistance - 2 * svgPadding;
    const edgeMargin = Math.max(layoutDistance / 2 - svgPadding, 0);
    const packWidth = usableWidth - 2 * edgeMargin;
    const packHeight = usableHeight - 2 * edgeMargin;

    // Helper: build item list from per-sheet counts
    const buildItems = (counts: Map<string, number>): PreparedModel[] => {
      const items: PreparedModel[] = [];
      for (const { entry, prepared } of modelData) {
        const count = counts.get(entry.id) ?? 0;
        for (let i = 0; i < count; i++) {
          items.push(prepared);
        }
      }
      return items;
    };

    // Helper: pack items using best strategy
    const bestPack = (items: PreparedModel[]) =>
      strategy === 'nest'
        ? bestStrategyPackNest(items, packWidth, packHeight, effectiveGap)
        : bestStrategyPack(items, packWidth, packHeight, effectiveGap);

    // Step 1: Verify at least 1 of each model fits on the sheet
    const baseOneCounts = new Map(modelData.map((m) => [m.entry.id, 1] as const));
    const baseOnePlacements = bestPack(buildItems(baseOneCounts));
    if (baseOnePlacements.length < modelData.length) {
      // Paper too small to fit at least 1 of each model
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

    // Step 2: Binary search for minimum totalSheets (T)
    // For each candidate T, check if ceil(qty_i / T) of each model fits on one sheet.
    let lo = 1;
    let hi = Math.max(...models.map((m) => m.quantity));

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const counts = new Map<string, number>();
      let totalNeeded = 0;
      for (const { entry } of modelData) {
        const count = Math.max(Math.ceil(entry.quantity / mid), 1);
        counts.set(entry.id, count);
        totalNeeded += count;
      }
      const placements = bestPack(buildItems(counts));
      if (placements.length >= totalNeeded) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }

    let totalSheets = lo;

    // Step 3: Determine base per-sheet counts from minimum T
    const perSheetCounts = new Map<string, number>();
    for (const { entry } of modelData) {
      perSheetCounts.set(entry.id, Math.max(Math.ceil(entry.quantity / totalSheets), 1));
    }

    // Step 4: Fill remaining space — balanced round-robin
    // Prioritise the model with the lowest excess ratio so that
    // excess is distributed as evenly as possible across models.
    const exhausted = new Set<string>();
    let filling = true;
    while (filling) {
      filling = false;

      // Candidates sorted by excess ratio ascending (least excess first)
      const candidates = modelData
        .filter((m) => !exhausted.has(m.entry.id))
        .sort((a, b) => {
          const perA = perSheetCounts.get(a.entry.id)!;
          const perB = perSheetCounts.get(b.entry.id)!;
          const exA = (perA * totalSheets - a.entry.quantity) / a.entry.quantity;
          const exB = (perB * totalSheets - b.entry.quantity) / b.entry.quantity;
          return exA - exB;
        });

      for (const candidate of candidates) {
        const currentCount = perSheetCounts.get(candidate.entry.id)!;
        const tryCounts = new Map(perSheetCounts);
        tryCounts.set(candidate.entry.id, currentCount + 1);

        const items = buildItems(tryCounts);
        const totalNeeded = [...tryCounts.values()].reduce((s, v) => s + v, 0);
        const placements = bestPack(items);

        if (placements.length >= totalNeeded) {
          perSheetCounts.set(candidate.entry.id, currentCount + 1);
          filling = true;
          break; // restart with updated counts
        } else {
          exhausted.add(candidate.entry.id);
        }
      }
    }

    // Step 5: Recalculate totalSheets (may decrease after filling)
    totalSheets = 0;
    for (const { entry } of modelData) {
      const perSheet = perSheetCounts.get(entry.id) ?? 0;
      if (perSheet > 0) {
        totalSheets = Math.max(totalSheets, Math.ceil(entry.quantity / perSheet));
      }
    }

    // Step 6: Final pack for rendering
    const bestPlacements = bestPack(buildItems(perSheetCounts));

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

    // Paper utilization
    const totalPaperArea = paper.width * paper.height;
    const usedArea = bestPlacements.reduce((sum, pl) => sum + pl.widthMm * pl.heightMm, 0);
    const paperLost = Number(((1 - usedArea / totalPaperArea) * 100).toFixed(2));

    // Calculator with excess count
    const calculator: AutoLayoutCalculatorEntry[] = models.map((entry) => {
      const perSheet = perSheetCounts.get(entry.id) ?? 0;
      const totalProduced = perSheet * totalSheets;
      return {
        modelId: entry.modelId,
        quantity: entry.quantity,
        perSheet,
        totalProduced,
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
