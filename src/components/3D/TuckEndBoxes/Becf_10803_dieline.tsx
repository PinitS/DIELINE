import { Line, Text } from "@react-three/drei";
import { forwardRef } from "react";
import type { DielineCanvasHandle, DisplayUnit, TuckEndBoxDielineProps } from "../../../types";
import { measureTuckEndBoxBounds } from "../../../utils/measure";
import { resolveTuckEndBoxAttributes } from "../../../utils/tuckEndBox";
import { formatDielineDisplayValue } from "../../../utils/units";
import { BaseDielineCanvas, createTextureBounds, TexturedPolygonMesh } from "../../BaseDielineCanvas";

type Point = { x: number; y: number };

const FOLD_LINE_COLOR = "#22c55e";
const DIMENSION_COLOR = "#111111";

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
  formatDielineDisplayValue(valueMm, displayUnit);

export const Becf_10803_dieline = forwardRef<DielineCanvasHandle, TuckEndBoxDielineProps>(
  function TuckEndBoxDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const displayUnit = canvasProps.displayUnit ?? "mm";
    const showDimensions = canvasProps.showDimensions ?? true;
    const {
      length,
      width,
      height,
      glueWidth,
      dustFlap,
      tuckFlap,
      closurePanel,
    } = resolveTuckEndBoxAttributes(attribute);
    const advancedDimensionsEnabled = showDimensions;
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
        renderTextureOverlay={(layout, textureImageUrl) => {
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

          const texturePolygons: Point[][] = [
            [
              { x: pxX(x0), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y2) },
              { x: pxX(x0), y: pxY(y2) },
            ],
            [
              { x: pxX(0), y: pxY(y1 + glueInset) },
              { x: pxX(x0), y: pxY(y1) },
              { x: pxX(x0), y: pxY(y2) },
              { x: pxX(0), y: pxY(y2 - glueInset) },
            ],
            topClosurePanel.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) })),
            [
              { x: pxX(x1), y: pxY(y1) },
              { x: pxX(x2), y: pxY(y1) },
              { x: pxX(x2), y: pxY(topDustY) },
              { x: pxX(x1 + dustInset), y: pxY(topDustY) },
            ],
            [
              { x: pxX(x3), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y1) },
              { x: pxX(x4 - dustInset), y: pxY(topDustY) },
              { x: pxX(x3), y: pxY(topDustY) },
            ],
            bottomClosurePanel.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) })),
            [
              { x: pxX(x1), y: pxY(y2) },
              { x: pxX(x2), y: pxY(y2) },
              { x: pxX(x2 - dustInset), y: pxY(bottomDustY) },
              { x: pxX(x1), y: pxY(bottomDustY) },
            ],
            [
              { x: pxX(x3), y: pxY(y2) },
              { x: pxX(x4), y: pxY(y2) },
              { x: pxX(x4), y: pxY(bottomDustY) },
              { x: pxX(x3 + dustInset), y: pxY(bottomDustY) },
            ],
          ];

          return (
            <>
              {texturePolygons.map((polygon, index) => (
                <TexturedPolygonMesh
                  key={`texture-${index}`}
                  imageUrl={textureImageUrl}
                  points={polygon}
                  textureBounds={createTextureBounds(layout)}
                />
              ))}
            </>
          );
        }}
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
          const advancedDimensionTick = Math.max(8, layout.tickSize * 0.52);
          const advancedLabelFontSize = Math.max(10, labelFontSize * 0.88);
          const verticalLabelOffset = Math.max(14, labelFontSize * 0.9);
          const advancedVerticalLabelOffset = Math.max(12, advancedLabelFontSize * 0.92);
          const verticalLabelPadding = Math.max(8, labelFontSize * 0.7);
          const advancedVerticalLabelPadding = Math.max(7, advancedLabelFontSize * 0.72);
          const internalDimensionOffsetMm = Math.max(12, Math.min(height * 0.18, 28));
          const dimensionY = pxY(y2 - internalDimensionOffsetMm);
          const dimensionTextY = dimensionY - Math.max(14, layout.widthFontSize * 0.55);
          const rightDimensionX = pxX(x3 + width * 0.68);
          const glueDimensionY = pxY((y1 + y2) / 2);
          const glueTextY = glueDimensionY - Math.max(12, advancedLabelFontSize * 1.05);
          const tuckDimensionX = pxX(x2 + length * 0.34);
          const closureDimensionX = pxX(x2 + length * 0.68);
          const dustDimensionX = pxX(x3 + width * 0.56);
          const heightLabelX = Math.max(pxX(x3) + verticalLabelPadding, rightDimensionX - verticalLabelOffset);
          const tuckLabelX = Math.max(pxX(x2) + advancedVerticalLabelPadding, tuckDimensionX - advancedVerticalLabelOffset);
          const closureLabelX = Math.max(pxX(x2) + advancedVerticalLabelPadding, closureDimensionX - advancedVerticalLabelOffset);
          const dustLabelX = Math.max(pxX(x3) + advancedVerticalLabelPadding, dustDimensionX - advancedVerticalLabelOffset);

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
              { x: pxX(x4), y: pxY(bottomDustY) },
              { x: pxX(x3 + dustInset), y: pxY(bottomDustY) },
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
            [{ x: pxX(x1), y: pxY(y2) }, { x: pxX(x1), y: dimensionY - dimensionTick * 0.4 }],
            [{ x: pxX(x2), y: pxY(y2) }, { x: pxX(x2), y: dimensionY - dimensionTick * 0.4 }],
            [{ x: pxX(x3), y: pxY(y2) }, { x: pxX(x3), y: dimensionY - dimensionTick * 0.4 }],
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
              {advancedDimensionsEnabled && (
                <>
                  {[
                    [pxX(0), glueDimensionY, pxX(x0), glueDimensionY],
                    [tuckDimensionX, pxY(0), tuckDimensionX, pxY(y0)],
                    [closureDimensionX, pxY(y0), closureDimensionX, pxY(y1)],
                    [dustDimensionX, pxY(topDustY), dustDimensionX, pxY(y1)],
                  ].map(([xStart, yStart, xEnd, yEnd], index) => (
                    <Line
                      key={`advanced-dimension-${index}`}
                      points={[
                        createScenePoint(xStart, yStart, 2.8),
                        createScenePoint(xEnd, yEnd, 2.8),
                      ]}
                      color={DIMENSION_COLOR}
                      lineWidth={1.3}
                    />
                  ))}
                  {[
                    [pxX(0), glueDimensionY - advancedDimensionTick / 2, pxX(0), glueDimensionY + advancedDimensionTick / 2],
                    [pxX(x0), glueDimensionY - advancedDimensionTick / 2, pxX(x0), glueDimensionY + advancedDimensionTick / 2],
                    [tuckDimensionX - advancedDimensionTick / 2, pxY(0), tuckDimensionX + advancedDimensionTick / 2, pxY(0)],
                    [tuckDimensionX - advancedDimensionTick / 2, pxY(y0), tuckDimensionX + advancedDimensionTick / 2, pxY(y0)],
                    [closureDimensionX - advancedDimensionTick / 2, pxY(y0), closureDimensionX + advancedDimensionTick / 2, pxY(y0)],
                    [closureDimensionX - advancedDimensionTick / 2, pxY(y1), closureDimensionX + advancedDimensionTick / 2, pxY(y1)],
                    [dustDimensionX - advancedDimensionTick / 2, pxY(topDustY), dustDimensionX + advancedDimensionTick / 2, pxY(topDustY)],
                    [dustDimensionX - advancedDimensionTick / 2, pxY(y1), dustDimensionX + advancedDimensionTick / 2, pxY(y1)],
                  ].map(([xStart, yStart, xEnd, yEnd], index) => (
                    <Line
                      key={`advanced-dimension-tick-${index}`}
                      points={[
                        createScenePoint(xStart, yStart, 2.8),
                        createScenePoint(xEnd, yEnd, 2.8),
                      ]}
                      color={DIMENSION_COLOR}
                      lineWidth={1.3}
                    />
                  ))}
                </>
              )}
              {showDimensions && (
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
              {advancedDimensionsEnabled && (
                <>
                  <Text
                    position={[pxX(x0 / 2), -glueTextY, 3]}
                    color={DIMENSION_COLOR}
                    fontSize={advancedLabelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {getDimensionText(glueWidth, displayUnit)}
                  </Text>
                  <Text
                    position={[tuckLabelX, -pxY(y0 / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={advancedLabelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    {getDimensionText(tuckFlap, displayUnit)}
                  </Text>
                  <Text
                    position={[closureLabelX, -pxY((y0 + y1) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={advancedLabelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    {getDimensionText(closurePanel, displayUnit)}
                  </Text>
                  <Text
                    position={[dustLabelX, -pxY((topDustY + y1) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={advancedLabelFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    {getDimensionText(dustFlap, displayUnit)}
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