import { Text } from "@react-three/drei";
import { forwardRef, useMemo } from "react";
import type { DielineCanvasHandle, DisplayUnit, TuckEndBoxDielineProps } from "../../../../types";
import { createDielinePrintController } from "../../../../utils/pdfExport";
import { getTuckEndBoxGeometry } from "../../../../utils/becf10803Geometry";
import { formatDielineDisplayValue } from "../../../../utils/units";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../../../BaseDielineCanvas";
import { SceneLine } from "../../../ScenePrimitives";
import { Becf_10803_folded3d } from "./Becf_10803_folded3d";

type Point = { x: number; y: number };

const FOLD_LINE_COLOR = "#22c55e";
const DIMENSION_COLOR = "#111111";

const toScenePoints = (
  points: Point[],
  createScenePoint: (x: number, y: number, z?: number) => [number, number, number],
  z = 2,
) => points.map(({ x, y }) => createScenePoint(x, y, z));

const getDimensionText = (valueMm: number, displayUnit: DisplayUnit) =>
  formatDielineDisplayValue(valueMm, displayUnit);

export const Becf_10803_dieline = forwardRef<DielineCanvasHandle, TuckEndBoxDielineProps>(
  function TuckEndBoxDieline({ attribute, onMeasure, renderMode = "dieline", ...canvasProps }, ref) {
    const geometry = useMemo(() => getTuckEndBoxGeometry(attribute), [attribute]);
    const bounds = geometry.bounds;
    const exportPreviewLayout = useMemo(() => createDielinePrintController(
      { modelId: "tuckEndBox", attributes: attribute },
      { displayUnit: canvasProps.displayUnit, title: "Becf_10803_dieline.pdf", },
    ), [attribute, canvasProps.displayUnit]);

    if (renderMode === "folded3d") {
      return (
        <Becf_10803_folded3d
          ref={ref}
          attribute={attribute}
          onMeasure={onMeasure}
          renderMode={renderMode}
          {...canvasProps}
        />
      );
    }

    const displayUnit = canvasProps.displayUnit ?? "mm";
    const showDimensions = canvasProps.showDimensions ?? true;
    const { resolved, guides } = geometry;
    const { length, width, height, glueWidth, dustFlap, tuckFlap, closurePanel } = resolved;
    const { x0, x1, x2, x3, x4, y0, y1, y2, topDustY } = guides;

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        exportPreviewLayout={exportPreviewLayout}
        renderTextureOverlay={(layout, textureImageUrl, textureBounds) => {
          const scale = layout.shapeWidthPx / bounds.overallWidthMm;
          const pxX = (mm: number) => layout.leftX + mm * scale;
          const pxY = (mm: number) => layout.topY + mm * scale;

          return (
            <>
              {Object.values(geometry.panels2d).map((polygon, index) => (
                <TexturedPolygonMesh
                  key={`texture-${index}`}
                  imageUrl={textureImageUrl}
                  points={polygon.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) }))}
                  textureBounds={textureBounds}
                />
              ))}
            </>
          );
        }}
        renderShape={(layout, shapeStrokeColor, createScenePoint, showShapeLines) => {
          const scale = layout.shapeWidthPx / bounds.overallWidthMm;
          const pxX = (mm: number) => layout.leftX + mm * scale;
          const pxY = (mm: number) => layout.topY + mm * scale;
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
              {showShapeLines && geometry.cuts.map((segment, index) => (
                <SceneLine
                  key={`cut-${index}`}
                  points={toScenePoints(segment.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) })), createScenePoint)}
                  color={shapeStrokeColor}
                  lineWidth={2}
                />
              ))}
              {showShapeLines && geometry.folds.map((segment, index) => (
                <SceneLine
                  key={`fold-${index}`}
                  points={toScenePoints(segment.map(({ x, y }) => ({ x: pxX(x), y: pxY(y) })), createScenePoint, 1.5)}
                  color={FOLD_LINE_COLOR}
                  lineWidth={1.35}
                  dashed
                  dashScale={1}
                  dashSize={dashSize}
                  gapSize={gapSize}
                />
              ))}
              {showDimensions && [...bottomDimensionGuides, ...heightDimensionGuides].map((segment, index) => (
                <SceneLine
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
                  <SceneLine
                    points={[
                      createScenePoint(pxX(x1), dimensionY, 2.6),
                      createScenePoint(pxX(x2), dimensionY, 2.6),
                    ]}
                    color={DIMENSION_COLOR}
                    lineWidth={1.4}
                  />
                  <SceneLine
                    points={[
                      createScenePoint(pxX(x2), dimensionY, 2.6),
                      createScenePoint(pxX(x3), dimensionY, 2.6),
                    ]}
                    color={DIMENSION_COLOR}
                    lineWidth={1.4}
                  />
                  <SceneLine
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
                    <SceneLine
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
              {showDimensions && (
                <>
                  {[
                    [pxX(0), glueDimensionY, pxX(x0), glueDimensionY],
                    [tuckDimensionX, pxY(0), tuckDimensionX, pxY(y0)],
                    [closureDimensionX, pxY(y0), closureDimensionX, pxY(y1)],
                    [dustDimensionX, pxY(topDustY), dustDimensionX, pxY(y1)],
                  ].map(([xStart, yStart, xEnd, yEnd], index) => (
                    <SceneLine
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
                    <SceneLine
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
              {showDimensions && (
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