import { Text } from "@react-three/drei";
import { forwardRef, useMemo } from "react";
import type { Becf10a0aDielineProps, DielineCanvasHandle, DisplayUnit } from "../../../../types";
import { getBecf10a0aGeometry } from "../../../../utils/becf10a0aGeometry";
import { measureBecf10a0aBounds } from "../../../../utils/measure";
import { createDielinePrintController } from "../../../../utils/pdfExport";
import { formatDielineDisplayValue } from "../../../../utils/units";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../../../BaseDielineCanvas";
import { SceneLine } from "../../../ScenePrimitives";

type Point = { x: number; y: number };

const FOLD_LINE_COLOR = "#22c55e";
const DIMENSION_COLOR = "#111111";

const toScenePoints = (
  points: Point[],
  createScenePoint: (x: number, y: number, z?: number) => [number, number, number],
  z = 2,
) => points.map(({ x, y }) => createScenePoint(x, y, z));

const toLabelText = (valueMm: number, displayUnit: DisplayUnit) => formatDielineDisplayValue(valueMm, displayUnit);

export const Becf_10a0a_dieline = forwardRef<DielineCanvasHandle, Becf10a0aDielineProps>(
  function Becf10a0aDieline({ attribute, onMeasure, renderMode = "dieline", ...canvasProps }, ref) {
    const bounds = useMemo(() => measureBecf10a0aBounds(attribute), [attribute]);
    const geometry = useMemo(() => getBecf10a0aGeometry(attribute), [attribute]);
    const exportPreviewLayout = useMemo(() => createDielinePrintController(
      { modelId: "becf10a0a", attributes: attribute },
      { displayUnit: canvasProps.displayUnit, title: "Becf_10a0a_dieline.pdf" },
    ), [attribute, canvasProps.displayUnit]);

    const displayUnit = canvasProps.displayUnit ?? "mm";
    const showDimensions = canvasProps.showDimensions ?? true;

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
          const advancedLabelFontSize = Math.max(10, labelFontSize * 0.88);
          const verticalLabelOffset = Math.max(14, labelFontSize * 0.9);
          const verticalLabelPadding = Math.max(8, labelFontSize * 0.7);
          const advancedVerticalLabelPadding = Math.max(7, advancedLabelFontSize * 0.72);
          const advancedVerticalLabelOffset = Math.max(12, advancedLabelFontSize * 0.92);
          const advancedDimensionTick = Math.max(8, layout.tickSize * 0.52);
          const { resolved, guides } = geometry;
          const { length, width, height, glueWidth, closurePanel, topClosurePanel } = resolved;
          const {
            frontLeft, frontRight, sideRightRight, backRight, sideLeftRight,
            bodyTopY, bodyBottomY, topClosureTopY,
          } = guides;

          const internalDimensionOffsetMm = Math.max(12, Math.min(height * 0.18, 28));
          const dimensionY = pxY(bodyBottomY - internalDimensionOffsetMm);
          const dimensionTextY = dimensionY - Math.max(14, layout.widthFontSize * 0.55);
          const rightDimensionX = pxX(backRight + width * 0.68);
          const glueDimensionY = pxY((bodyTopY + bodyBottomY) / 2);
          const glueTextY = glueDimensionY - Math.max(12, advancedLabelFontSize * 1.05);
          const closureDimensionX = pxX(sideRightRight + length * 0.34);
          const heightLabelX = Math.max(pxX(backRight) + verticalLabelPadding, rightDimensionX - verticalLabelOffset);
          const closureLabelX = Math.max(pxX(sideRightRight) + advancedVerticalLabelPadding, closureDimensionX - advancedVerticalLabelOffset);

          const bottomDimensionGuides: Point[][] = [
            [{ x: pxX(frontLeft), y: pxY(bodyBottomY) }, { x: pxX(frontLeft), y: dimensionY - dimensionTick * 0.4 }],
            [{ x: pxX(frontRight), y: pxY(bodyBottomY) }, { x: pxX(frontRight), y: dimensionY - dimensionTick * 0.4 }],
            [{ x: pxX(sideRightRight), y: pxY(bodyBottomY) }, { x: pxX(sideRightRight), y: dimensionY - dimensionTick * 0.4 }],
            [{ x: pxX(backRight), y: pxY(bodyBottomY) }, { x: pxX(backRight), y: dimensionY - dimensionTick * 0.4 }],
          ];

          const heightDimensionGuides: Point[][] = [
            [{ x: rightDimensionX, y: pxY(bodyTopY) }, { x: pxX(sideLeftRight), y: pxY(bodyTopY) }],
            [{ x: rightDimensionX, y: pxY(bodyBottomY) }, { x: pxX(sideLeftRight), y: pxY(bodyBottomY) }],
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
                  lineWidth={1.3}
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
                  {/* Horizontal: length | width | length */}
                  <SceneLine points={[createScenePoint(pxX(frontLeft), dimensionY, 2.6), createScenePoint(pxX(frontRight), dimensionY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  <SceneLine points={[createScenePoint(pxX(frontRight), dimensionY, 2.6), createScenePoint(pxX(sideRightRight), dimensionY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  <SceneLine points={[createScenePoint(pxX(sideRightRight), dimensionY, 2.6), createScenePoint(pxX(backRight), dimensionY, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  {/* Vertical: height */}
                  <SceneLine points={[createScenePoint(rightDimensionX, pxY(bodyTopY), 2.6), createScenePoint(rightDimensionX, pxY(bodyBottomY), 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  {/* Ticks */}
                  {[
                    [pxX(frontLeft), dimensionY - dimensionTick / 2, pxX(frontLeft), dimensionY + dimensionTick / 2],
                    [pxX(frontRight), dimensionY - dimensionTick / 2, pxX(frontRight), dimensionY + dimensionTick / 2],
                    [pxX(sideRightRight), dimensionY - dimensionTick / 2, pxX(sideRightRight), dimensionY + dimensionTick / 2],
                    [pxX(backRight), dimensionY - dimensionTick / 2, pxX(backRight), dimensionY + dimensionTick / 2],
                    [rightDimensionX - dimensionTick / 2, pxY(bodyTopY), rightDimensionX + dimensionTick / 2, pxY(bodyTopY)],
                    [rightDimensionX - dimensionTick / 2, pxY(bodyBottomY), rightDimensionX + dimensionTick / 2, pxY(bodyBottomY)],
                  ].map(([xS, yS, xE, yE], i) => (
                    <SceneLine key={`dim-tick-${i}`} points={[createScenePoint(xS, yS, 2.6), createScenePoint(xE, yE, 2.6)]} color={DIMENSION_COLOR} lineWidth={1.4} />
                  ))}
                </>
              )}
              {showDimensions && (
                <>
                  {[
                    [pxX(0), glueDimensionY, pxX(frontLeft), glueDimensionY],
                    [closureDimensionX, pxY(topClosureTopY), closureDimensionX, pxY(bodyTopY)],
                  ].map(([xS, yS, xE, yE], i) => (
                    <SceneLine key={`adv-dim-${i}`} points={[createScenePoint(xS, yS, 2.8), createScenePoint(xE, yE, 2.8)]} color={DIMENSION_COLOR} lineWidth={1.3} />
                  ))}
                  {[
                    [pxX(0), glueDimensionY - advancedDimensionTick / 2, pxX(0), glueDimensionY + advancedDimensionTick / 2],
                    [pxX(frontLeft), glueDimensionY - advancedDimensionTick / 2, pxX(frontLeft), glueDimensionY + advancedDimensionTick / 2],
                    [closureDimensionX - advancedDimensionTick / 2, pxY(topClosureTopY), closureDimensionX + advancedDimensionTick / 2, pxY(topClosureTopY)],
                    [closureDimensionX - advancedDimensionTick / 2, pxY(bodyTopY), closureDimensionX + advancedDimensionTick / 2, pxY(bodyTopY)],
                  ].map(([xS, yS, xE, yE], i) => (
                    <SceneLine key={`adv-tick-${i}`} points={[createScenePoint(xS, yS, 2.8), createScenePoint(xE, yE, 2.8)]} color={DIMENSION_COLOR} lineWidth={1.3} />
                  ))}
                </>
              )}
              {showDimensions && (
                <>
                  <Text position={[pxX((frontLeft + frontRight) / 2), -dimensionTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle" textAlign="center">
                    {toLabelText(length, displayUnit)}
                  </Text>
                  <Text position={[pxX((frontRight + sideRightRight) / 2), -dimensionTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle" textAlign="center">
                    {toLabelText(width, displayUnit)}
                  </Text>
                  <Text position={[pxX((sideRightRight + backRight) / 2), -dimensionTextY, 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle" textAlign="center">
                    {toLabelText(length, displayUnit)}
                  </Text>
                  <Text position={[heightLabelX, -pxY((bodyTopY + bodyBottomY) / 2), 3]} color={DIMENSION_COLOR} fontSize={labelFontSize} anchorX="center" anchorY="middle" textAlign="center" rotation={[0, 0, Math.PI / 2]}>
                    {toLabelText(height, displayUnit)}
                  </Text>
                </>
              )}
              {showDimensions && (
                <>
                  <Text position={[pxX(frontLeft / 2), -glueTextY, 3]} color={DIMENSION_COLOR} fontSize={advancedLabelFontSize} anchorX="center" anchorY="middle" textAlign="center">
                    {toLabelText(glueWidth, displayUnit)}
                  </Text>
                  <Text position={[closureLabelX, -pxY((topClosureTopY + bodyTopY) / 2), 3]} color={DIMENSION_COLOR} fontSize={advancedLabelFontSize} anchorX="center" anchorY="middle" textAlign="center" rotation={[0, 0, Math.PI / 2]}>
                    {toLabelText(topClosurePanel, displayUnit)}
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
