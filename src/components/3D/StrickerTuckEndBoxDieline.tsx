import { Line, Text } from "@react-three/drei";
import { forwardRef } from "react";
import type { DielineCanvasHandle, DisplayUnit, TuckEndBoxDielineProps } from "../../types";
import { measureTuckEndBoxBounds } from "../../utils/measure";
import { formatDielineDisplayValue } from "../../utils/units";
import { BaseDielineCanvas } from "../BaseDielineCanvas";

type Point = { x: number; y: number };

const FOLD_LINE_COLOR = "#22c55e";
const DIMENSION_COLOR = "#111111";
const DEFAULT_CLOSURE_PANEL_MM = 45;
const DEFAULT_DUST_FLAP_MM = 32;
const DEFAULT_GLUE_WIDTH_MM = 12;
const DEFAULT_TUCK_FLAP_MM = 15;

const normalize = (value: number) => (Number.isFinite(value) && value > 0 ? value : 1);

const toScenePoints = (
  points: Point[],
  createScenePoint: (x: number, y: number, z?: number) => [number, number, number],
  z = 2,
) => points.map(({ x, y }) => createScenePoint(x, y, z));

const createQuadraticCurve = (
  start: Point,
  control: Point,
  end: Point,
  segments = 14,
) => Array.from({ length: segments + 1 }, (_, index) => {
  const t = index / segments;
  const inv = 1 - t;
  return {
    x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
    y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
  };
});

const createRoundedTopClosurePanel = (
  left: number,
  right: number,
  foldY: number,
  tuckFoldY: number,
  outerY: number,
  cornerRadius: number,
) => {
  const leftCurveStart = { x: left, y: outerY + cornerRadius };
  const topLeftCorner = { x: left + cornerRadius, y: outerY };
  const topRightCorner = { x: right - cornerRadius, y: outerY };
  const rightCurveEnd = { x: right, y: outerY + cornerRadius };

  const leftCurve = createQuadraticCurve(
    leftCurveStart,
    { x: left, y: outerY },
    topLeftCorner,
  );
  const rightCurve = createQuadraticCurve(
    topRightCorner,
    { x: right, y: outerY },
    rightCurveEnd,
  );

  return [
    { x: left, y: foldY },
    { x: left, y: tuckFoldY },
    leftCurveStart,
    ...leftCurve.slice(1),
    topRightCorner,
    ...rightCurve.slice(1),
    { x: right, y: tuckFoldY },
    { x: right, y: foldY },
  ];
};

const createRoundedBottomClosurePanel = (
  left: number,
  right: number,
  foldY: number,
  tuckFoldY: number,
  outerY: number,
  cornerRadius: number,
) => {
  const leftCurveStart = { x: left, y: outerY - cornerRadius };
  const bottomLeftCorner = { x: left + cornerRadius, y: outerY };
  const bottomRightCorner = { x: right - cornerRadius, y: outerY };
  const rightCurveEnd = { x: right, y: outerY - cornerRadius };

  const leftCurve = createQuadraticCurve(
    leftCurveStart,
    { x: left, y: outerY },
    bottomLeftCorner,
  );
  const rightCurve = createQuadraticCurve(
    bottomRightCorner,
    { x: right, y: outerY },
    rightCurveEnd,
  );

  return [
    { x: left, y: foldY },
    { x: left, y: tuckFoldY },
    leftCurveStart,
    ...leftCurve.slice(1),
    bottomRightCorner,
    ...rightCurve.slice(1),
    { x: right, y: tuckFoldY },
    { x: right, y: foldY },
  ];
};

const getDimensionText = (valueMm: number, displayUnit: DisplayUnit) =>
  formatDielineDisplayValue(valueMm, displayUnit).replace(" ", "");

export const StrickerTuckEndBoxDieline = forwardRef<DielineCanvasHandle, TuckEndBoxDielineProps>(
  function TuckEndBoxDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const displayUnit = canvasProps.displayUnit ?? "mm";
    const showDimensions = canvasProps.showDimensions ?? true;
    const showLabels = canvasProps.showLabels ?? true;
    const length = normalize(attribute.length);
    const width = normalize(attribute.width);
    const height = normalize(attribute.height);
    const glueWidth = attribute.glueWidth ?? DEFAULT_GLUE_WIDTH_MM;
    const dustFlap = attribute.dustFlap ?? DEFAULT_DUST_FLAP_MM;
    const tuckFlap = attribute.tuckFlap ?? DEFAULT_TUCK_FLAP_MM;
    const closurePanel = attribute.closurePanel ?? DEFAULT_CLOSURE_PANEL_MM;
    const bounds = measureTuckEndBoxBounds({
      length,
      width,
      height,
      glueWidth,
      dustFlap,
      tuckFlap,
      closurePanel,
    });

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        renderShape={(layout, shapeStrokeColor, createScenePoint) => {
          const scale = layout.shapeWidthPx / bounds.overallWidthMm;
          const pxX = (mm: number) => layout.leftX + mm * scale;
          const pxY = (mm: number) => layout.topY + mm * scale;

          const x0 = glueWidth;
          const x1 = x0 + length;
          const x2 = x1 + width;
          const x3 = x2 + length;
          const x4 = x3 + width;

          const y0 = tuckFlap;
          const y1 = y0 + closurePanel;
          const y2 = y1 + height;
          const y3 = y2 + closurePanel;
          const y4 = y3 + tuckFlap;
          const topDustY = y1 - dustFlap;
          const bottomDustY = y2 + dustFlap;

          const dustInset = Math.min(width * 0.22, dustFlap * 0.45);
          const glueInset = Math.min(glueWidth * 0.45, Math.max(glueWidth * 0.18, 1));
          const closureCornerRadius = Math.max(3, Math.min(closurePanel * 0.34, length * 0.08, 6));
          const dashSize = Math.max(6, layout.tickSize * 0.55);
          const gapSize = Math.max(4, layout.tickSize * 0.45);
          const labelFontSize = Math.max(11, Math.min(layout.widthFontSize * 0.78, 18));
          const dimensionTick = Math.max(10, layout.tickSize * 0.7);
          const dimensionY = pxY(y2 + closurePanel * 0.46);
          const dimensionTextY = dimensionY - Math.max(14, layout.widthFontSize * 0.55);
          const rightDimensionX = pxX(x4 - width * 0.24);
          const heightLabelX = rightDimensionX + Math.max(14, layout.heightFontSize * 0.85);

          const topClosurePanel = createRoundedTopClosurePanel(
            x2,
            x3,
            y1,
            y0,
            0,
            closureCornerRadius,
          );
          const bottomClosurePanel = createRoundedBottomClosurePanel(
            x0,
            x1,
            y2,
            y3,
            y4,
            closureCornerRadius,
          );

          const cutSegments: Point[][] = [
            [
              { x: pxX(0), y: pxY(y1 + glueInset) },
              { x: pxX(x0), y: pxY(y1) },
              { x: pxX(x0), y: pxY(y2) },
              { x: pxX(0), y: pxY(y2 - glueInset) },
              { x: pxX(0), y: pxY(y1 + glueInset) },
            ],
            topClosurePanel.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) })),
            [
              { x: pxX(x1), y: pxY(y1) },
              { x: pxX(x2), y: pxY(y1) },
              { x: pxX(x2), y: pxY(topDustY) },
              { x: pxX(x1 + dustInset), y: pxY(topDustY) },
              { x: pxX(x1), y: pxY(y1) },
            ],
            [
              { x: pxX(x3), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y1) },
              { x: pxX(x4 - dustInset), y: pxY(topDustY) },
              { x: pxX(x3), y: pxY(topDustY) },
              { x: pxX(x3), y: pxY(y1) },
            ],
            bottomClosurePanel.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) })),
            [
              { x: pxX(x1), y: pxY(y2) },
              { x: pxX(x2), y: pxY(y2) },
              { x: pxX(x2 - dustInset), y: pxY(bottomDustY) },
              { x: pxX(x1), y: pxY(bottomDustY) },
              { x: pxX(x1), y: pxY(y2) },
            ],
            [
              { x: pxX(x3), y: pxY(y2) },
              { x: pxX(x4), y: pxY(y2) },
              { x: pxX(x4 - dustInset), y: pxY(bottomDustY) },
              { x: pxX(x3), y: pxY(bottomDustY) },
              { x: pxX(x3), y: pxY(y2) },
            ],
            [
              { x: pxX(x0), y: pxY(y1) },
              { x: pxX(x1), y: pxY(y1) },
            ],
            [
              { x: pxX(x2), y: pxY(y2) },
              { x: pxX(x3), y: pxY(y2) },
            ],
            [
              { x: pxX(x4), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y2) },
            ],
          ];

          const foldSegments: Point[][] = [
            [{ x: pxX(x0), y: pxY(y1) }, { x: pxX(x4), y: pxY(y1) }],
            [{ x: pxX(x0), y: pxY(y2) }, { x: pxX(x4), y: pxY(y2) }],
            [{ x: pxX(x0), y: pxY(y1) }, { x: pxX(x0), y: pxY(y2) }],
            [{ x: pxX(x1), y: pxY(y1) }, { x: pxX(x1), y: pxY(y2) }],
            [{ x: pxX(x2), y: pxY(y1) }, { x: pxX(x2), y: pxY(y2) }],
            [{ x: pxX(x3), y: pxY(y1) }, { x: pxX(x3), y: pxY(y2) }],
            [{ x: pxX(x2), y: pxY(y0) }, { x: pxX(x3), y: pxY(y0) }],
            [{ x: pxX(x0), y: pxY(y3) }, { x: pxX(x1), y: pxY(y3) }],
          ];

          const bottomDimensionGuides: Point[][] = [
            [{ x: pxX(x1), y: pxY(y2) }, { x: pxX(x1), y: dimensionY + dimensionTick * 0.4 }],
            [{ x: pxX(x2), y: pxY(y2) }, { x: pxX(x2), y: dimensionY + dimensionTick * 0.4 }],
            [{ x: pxX(x3), y: pxY(y2) }, { x: pxX(x3), y: dimensionY + dimensionTick * 0.4 }],
          ];

          const heightDimensionGuides: Point[][] = [
            [{ x: rightDimensionX, y: pxY(y1) }, { x: pxX(x4), y: pxY(y1) }],
            [{ x: rightDimensionX, y: pxY(y2) }, { x: pxX(x4), y: pxY(y2) }],
          ];

          return (
            <>
              {cutSegments.map((segment, index) => (
                <Line
                  key={`cut-${index}`}
                  points={toScenePoints(segment, createScenePoint)}
                  color={shapeStrokeColor}
                  lineWidth={2}
                />
              ))}
              {foldSegments.map((segment, index) => (
                <Line
                  key={`fold-${index}`}
                  points={toScenePoints(segment, createScenePoint, 1.5)}
                  color={FOLD_LINE_COLOR}
                  lineWidth={1.35}
                  dashed
                  dashScale={1}
                  dashSize={dashSize}
                  gapSize={gapSize}
                />
              ))}
              {showDimensions && [...bottomDimensionGuides, ...heightDimensionGuides].map((segment, index) => (
                <Line
                  key={`guide-${index}`}
                  points={toScenePoints(segment, createScenePoint, 1.7)}
                  color={FOLD_LINE_COLOR}
                  lineWidth={1.15}
                  dashed
                  dashScale={1}
                  dashSize={dashSize}
                  gapSize={gapSize}
                />
              ))}
              {showDimensions && (
                <>
                  <Line
                    points={[
                      createScenePoint(pxX(x1), dimensionY, 2.6),
                      createScenePoint(pxX(x2), dimensionY, 2.6),
                    ]}
                    color={DIMENSION_COLOR}
                    lineWidth={1.4}
                  />
                  <Line
                    points={[
                      createScenePoint(pxX(x2), dimensionY, 2.6),
                      createScenePoint(pxX(x3), dimensionY, 2.6),
                    ]}
                    color={DIMENSION_COLOR}
                    lineWidth={1.4}
                  />
                  <Line
                    points={[
                      createScenePoint(rightDimensionX, pxY(y1), 2.6),
                      createScenePoint(rightDimensionX, pxY(y2), 2.6),
                    ]}
                    color={DIMENSION_COLOR}
                    lineWidth={1.4}
                  />
                  {[
                    [pxX(x1), dimensionY - dimensionTick / 2, pxX(x1), dimensionY + dimensionTick / 2],
                    [pxX(x2), dimensionY - dimensionTick / 2, pxX(x2), dimensionY + dimensionTick / 2],
                    [pxX(x3), dimensionY - dimensionTick / 2, pxX(x3), dimensionY + dimensionTick / 2],
                    [rightDimensionX - dimensionTick / 2, pxY(y1), rightDimensionX + dimensionTick / 2, pxY(y1)],
                    [rightDimensionX - dimensionTick / 2, pxY(y2), rightDimensionX + dimensionTick / 2, pxY(y2)],
                  ].map(([xStart, yStart, xEnd, yEnd], index) => (
                    <Line
                      key={`dimension-tick-${index}`}
                      points={[
                        createScenePoint(xStart, yStart, 2.6),
                        createScenePoint(xEnd, yEnd, 2.6),
                      ]}
                      color={DIMENSION_COLOR}
                      lineWidth={1.4}
                    />
                  ))}
                </>
              )}
              {showDimensions && showLabels && (
                <>
                  <Text
                    position={[pxX((x1 + x2) / 2), -dimensionTextY, 3]}
                    color={DIMENSION_COLOR}
                    fontSize={labelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {getDimensionText(width, displayUnit)}
                  </Text>
                  <Text
                    position={[pxX((x2 + x3) / 2), -dimensionTextY, 3]}
                    color={DIMENSION_COLOR}
                    fontSize={labelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {getDimensionText(length, displayUnit)}
                  </Text>
                  <Text
                    position={[heightLabelX, -pxY((y1 + y2) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={labelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    {getDimensionText(height, displayUnit)}
                  </Text>
                </>
              )}
            </>
          );
        }}
      />
    );
  },
);