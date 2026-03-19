import { Text } from "@react-three/drei";
import { forwardRef, useMemo } from "react";
import type {
  DielineBounds,
  DielineCanvasHandle,
  DielineMeasureCallback,
  DielineExportPreviewLayoutController,
  DisplayUnit,
  SharedCanvasProps,
} from "../../types";
import { formatDielineDisplayValue } from "../../utils/units";
import { BaseDielineCanvas } from "../BaseDielineCanvas";
import { SceneLine } from "../ScenePrimitives";

/* ── Attribute type ────────────────────────────────────────────── */

export type FlatLayoutAttributes = {
  wingWidth?: number;
  wingHeight?: number;
  slotWidth?: number;
  barHeight?: number;
  tabWidth?: number;
  tabHeight?: number;
};

export const DEFAULT_FLAT_LAYOUT_ATTRIBUTES: Required<FlatLayoutAttributes> = {
  wingWidth: 100,
  wingHeight: 80,
  slotWidth: 70,
  barHeight: 15,
  tabWidth: 45,
  tabHeight: 55,
};

export type FlatLayoutDielineProps = SharedCanvasProps & {
  attribute: FlatLayoutAttributes;
  onMeasure?: DielineMeasureCallback;
};

/* ── Helpers ───────────────────────────────────────────────────── */

type Point = { x: number; y: number };

const FOLD_LINE_COLOR = "#22c55e";
const DIMENSION_COLOR = "#111111";

const toScenePoints = (
  points: Point[],
  createScenePoint: (x: number, y: number, z?: number) => [number, number, number],
  z = 2,
) => points.map(({ x, y }) => createScenePoint(x, y, z));

const resolve = (attr: FlatLayoutAttributes): Required<FlatLayoutAttributes> => ({
  ...DEFAULT_FLAT_LAYOUT_ATTRIBUTES,
  ...attr,
});

const measureBounds = (attr: FlatLayoutAttributes): DielineBounds => {
  const r = resolve(attr);
  return {
    overallWidthMm: r.wingWidth * 2 + r.slotWidth,
    overallHeightMm: r.wingHeight + r.barHeight + r.tabHeight,
  };
};

/** Compute the 12-point outline of the cross shape (clockwise from top-left). */
const getOutlinePoints = (r: Required<FlatLayoutAttributes>): Point[] => {
  const totalWidth = r.wingWidth * 2 + r.slotWidth;
  const tabStartX = r.wingWidth + (r.slotWidth - r.tabWidth) / 2;
  const tabEndX = r.wingWidth + (r.slotWidth + r.tabWidth) / 2;
  const barBottom = r.wingHeight + r.barHeight;
  const totalHeight = barBottom + r.tabHeight;

  return [
    { x: 0, y: 0 },
    { x: r.wingWidth, y: 0 },
    { x: r.wingWidth, y: r.wingHeight },
    { x: r.wingWidth + r.slotWidth, y: r.wingHeight },
    { x: r.wingWidth + r.slotWidth, y: 0 },
    { x: totalWidth, y: 0 },
    { x: totalWidth, y: barBottom },
    { x: tabEndX, y: barBottom },
    { x: tabEndX, y: totalHeight },
    { x: tabStartX, y: totalHeight },
    { x: tabStartX, y: barBottom },
    { x: 0, y: barBottom },
  ];
};

/** No-op export controller – this model is demo-only. */
const NOOP_EXPORT_CONTROLLER: DielineExportPreviewLayoutController = {
  convertToSvg: () => ({ svg: "", widthMm: 0, heightMm: 0 }),
  openPreview: () => { throw new Error("FlatLayoutDieline does not support export preview."); },
  exportToPdf: () => { throw new Error("FlatLayoutDieline does not support PDF export."); },
};

/* ── Component ─────────────────────────────────────────────────── */

export const FlatLayoutDieline = forwardRef<DielineCanvasHandle, FlatLayoutDielineProps>(
  function FlatLayoutDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const r = useMemo(() => resolve(attribute), [attribute]);
    const bounds = useMemo(() => measureBounds(attribute), [attribute]);
    const outline = useMemo(() => getOutlinePoints(r), [r]);

    const displayUnit: DisplayUnit = canvasProps.displayUnit ?? "mm";
    const showDimensions = canvasProps.showDimensions ?? true;

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        exportPreviewLayout={NOOP_EXPORT_CONTROLLER}
        renderShape={(layout, shapeStrokeColor, createScenePoint, showShapeLines) => {
          const scale = layout.shapeWidthPx / bounds.overallWidthMm;
          const pxX = (mm: number) => layout.leftX + mm * scale;
          const pxY = (mm: number) => layout.topY + mm * scale;
          const dashSize = Math.max(6, layout.tickSize * 0.55);
          const gapSize = Math.max(4, layout.tickSize * 0.45);
          const labelFontSize = Math.max(11, Math.min(layout.widthFontSize * 0.78, 18));
          const dimensionTick = Math.max(10, layout.tickSize * 0.7);

          /* Outline (cut line) – close the loop */
          const outlinePx = [...outline, outline[0]].map(({ x, y }) => ({ x: pxX(x), y: pxY(y) }));

          /* Fold lines */
          const barBottom = r.wingHeight + r.barHeight;
          const tabStartX = r.wingWidth + (r.slotWidth - r.tabWidth) / 2;
          const tabEndX = r.wingWidth + (r.slotWidth + r.tabWidth) / 2;
          const totalWidth = r.wingWidth * 2 + r.slotWidth;

          const foldLines: [Point, Point][] = [
            [{ x: 0, y: r.wingHeight }, { x: r.wingWidth, y: r.wingHeight }],
            [{ x: r.wingWidth + r.slotWidth, y: r.wingHeight }, { x: totalWidth, y: r.wingHeight }],
            [{ x: tabStartX, y: barBottom }, { x: tabEndX, y: barBottom }],
          ];

          /* ── Dimension guides & labels ──────────────────────────── */
          const dimOffsetMm = Math.max(10, Math.min(r.wingHeight * 0.14, 24));

          // Horizontal: wingWidth | slotWidth | wingWidth  (along the top)
          const hDimY = pxY(-dimOffsetMm);
          const hTextY = hDimY - Math.max(14, labelFontSize * 0.7);

          // Vertical: wingHeight (left side)
          const vDimX = pxX(-dimOffsetMm);

          // Tab width (bottom)
          const tabDimY = pxY(barBottom + r.tabHeight + dimOffsetMm);
          const tabTextY = tabDimY + Math.max(14, labelFontSize * 0.7);

          // Tab height (right side of tab)
          const tabHeightDimX = pxX(tabEndX + dimOffsetMm);

          // Bar height label position
          const barLabelX = pxX(totalWidth + dimOffsetMm);

          return (
            <>
              {/* Cut outline */}
              {showShapeLines && (
                <SceneLine
                  points={toScenePoints(outlinePx, createScenePoint)}
                  color={shapeStrokeColor}
                  lineWidth={2}
                />
              )}

              {/* Fold lines */}
              {showShapeLines && foldLines.map(([a, b], i) => (
                <SceneLine
                  key={`fold-${i}`}
                  points={toScenePoints(
                    [{ x: pxX(a.x), y: pxY(a.y) }, { x: pxX(b.x), y: pxY(b.y) }],
                    createScenePoint,
                    1.5,
                  )}
                  color={FOLD_LINE_COLOR}
                  lineWidth={1.3}
                  dashed
                  dashScale={1}
                  dashSize={dashSize}
                  gapSize={gapSize}
                />
              ))}


              {/* ── Dimensions ─────────────────────────────────── */}
              {showDimensions && (
                <>
                  {/* Top horizontal: wingWidth | slotWidth | wingWidth */}
                  <SceneLine points={[createScenePoint(pxX(0), hDimY, 2.6), createScenePoint(pxX(r.wingWidth), hDimY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  <SceneLine points={[createScenePoint(pxX(r.wingWidth), hDimY, 2.6), createScenePoint(pxX(r.wingWidth + r.slotWidth), hDimY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  <SceneLine points={[createScenePoint(pxX(r.wingWidth + r.slotWidth), hDimY, 2.6), createScenePoint(pxX(totalWidth), hDimY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  {/* Ticks */}
                  {[0, r.wingWidth, r.wingWidth + r.slotWidth, totalWidth].map((xMm, i) => (
                    <SceneLine key={`htick-${i}`} points={[createScenePoint(pxX(xMm), hDimY - dimensionTick / 2, 2.6), createScenePoint(pxX(xMm), hDimY + dimensionTick / 2, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  ))}
                  {/* Labels */}
                  <Text position={[pxX(r.wingWidth / 2), -hTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle">{formatDielineDisplayValue(r.wingWidth, displayUnit)}</Text>
                  <Text position={[pxX(r.wingWidth + r.slotWidth / 2), -hTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle">{formatDielineDisplayValue(r.slotWidth, displayUnit)}</Text>
                  <Text position={[pxX(r.wingWidth + r.slotWidth + r.wingWidth / 2), -hTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle">{formatDielineDisplayValue(r.wingWidth, displayUnit)}</Text>

                  {/* Left vertical: wingHeight + barHeight */}
                  <SceneLine points={[createScenePoint(vDimX, pxY(0), 2.6), createScenePoint(vDimX, pxY(r.wingHeight), 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  <SceneLine points={[createScenePoint(vDimX, pxY(r.wingHeight), 2.6), createScenePoint(vDimX, pxY(barBottom), 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  {[0, r.wingHeight, barBottom].map((yMm, i) => (
                    <SceneLine key={`vtick-${i}`} points={[createScenePoint(vDimX - dimensionTick / 2, pxY(yMm), 2.6), createScenePoint(vDimX + dimensionTick / 2, pxY(yMm), 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  ))}
                  <Text position={[vDimX - Math.max(14, labelFontSize * 0.9), -pxY(r.wingHeight / 2), 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle" rotation={[0, 0, Math.PI / 2]}>{formatDielineDisplayValue(r.wingHeight, displayUnit)}</Text>
                  <Text position={[vDimX - Math.max(14, labelFontSize * 0.9), -pxY(r.wingHeight + r.barHeight / 2), 3]} color={DIMENSION_COLOR} fontSize={labelFontSize * 0.85} anchorX="center" anchorY="middle" rotation={[0, 0, Math.PI / 2]}>{formatDielineDisplayValue(r.barHeight, displayUnit)}</Text>

                  {/* Bottom horizontal: tabWidth */}
                  <SceneLine points={[createScenePoint(pxX(tabStartX), tabDimY, 2.6), createScenePoint(pxX(tabEndX), tabDimY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  {[tabStartX, tabEndX].map((xMm, i) => (
                    <SceneLine key={`tabtick-${i}`} points={[createScenePoint(pxX(xMm), tabDimY - dimensionTick / 2, 2.6), createScenePoint(pxX(xMm), tabDimY + dimensionTick / 2, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  ))}
                  <Text position={[pxX(r.wingWidth + r.slotWidth / 2), -tabTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle">{formatDielineDisplayValue(r.tabWidth, displayUnit)}</Text>

                  {/* Right vertical of tab: tabHeight */}
                  <SceneLine points={[createScenePoint(tabHeightDimX, pxY(barBottom), 2.6), createScenePoint(tabHeightDimX, pxY(barBottom + r.tabHeight), 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  {[barBottom, barBottom + r.tabHeight].map((yMm, i) => (
                    <SceneLine key={`tabtickv-${i}`} points={[createScenePoint(tabHeightDimX - dimensionTick / 2, pxY(yMm), 2.6), createScenePoint(tabHeightDimX + dimensionTick / 2, pxY(yMm), 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  ))}
                  <Text position={[tabHeightDimX + Math.max(14, labelFontSize * 0.9), -pxY(barBottom + r.tabHeight / 2), 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle" rotation={[0, 0, Math.PI / 2]}>{formatDielineDisplayValue(r.tabHeight, displayUnit)}</Text>

                  {/* Guide lines from shape to dimension lines */}
                  {[
                    [{ x: pxX(0), y: pxY(0) }, { x: pxX(0), y: hDimY }],
                    [{ x: pxX(r.wingWidth), y: pxY(0) }, { x: pxX(r.wingWidth), y: hDimY }],
                    [{ x: pxX(r.wingWidth + r.slotWidth), y: pxY(0) }, { x: pxX(r.wingWidth + r.slotWidth), y: hDimY }],
                    [{ x: pxX(totalWidth), y: pxY(0) }, { x: pxX(totalWidth), y: hDimY }],
                  ].map((seg, i) => (
                    <SceneLine key={`guide-${i}`} points={toScenePoints(seg, createScenePoint, 1.7)} color={FOLD_LINE_COLOR} lineWidth={1.15} dashed dashScale={1} dashSize={dashSize} gapSize={gapSize} />
                  ))}
                </>
              )}
            </>
          );
        }}
      />
    );
  },
);
