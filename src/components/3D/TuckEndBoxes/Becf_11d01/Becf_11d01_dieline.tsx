import { Text } from "@react-three/drei";
import { forwardRef, useMemo } from "react";
import type { Becf11d01DielineProps, DielineCanvasHandle, DisplayUnit } from "../../../../types";
import { getBecf11d01Geometry } from "../../../../utils/becf11d01Geometry";
import { measureBecf11d01Bounds } from "../../../../utils/measure";
import { createDielinePrintController } from "../../../../utils/pdfExport";
import { formatDielineDisplayValue } from "../../../../utils/units";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../../../BaseDielineCanvas";
import { SceneLine } from "../../../ScenePrimitives";
import { Becf_11d01_folded3d } from "./Becf_11d01_folded3d";

type Point = { x: number; y: number };

const FOLD_LINE_COLOR = "#22c55e";
const DIMENSION_COLOR = "#111111";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const toScenePoints = (
  points: Point[],
  createScenePoint: (x: number, y: number, z?: number) => [number, number, number],
  z = 2,
) => points.map(({ x, y }) => createScenePoint(x, y, z));

const toLabelText = (valueMm: number, displayUnit: DisplayUnit) => formatDielineDisplayValue(valueMm, displayUnit);

export const Becf_11d01_dieline = forwardRef<DielineCanvasHandle, Becf11d01DielineProps>(
  function Becf11d01Dieline({ attribute, onMeasure, renderMode = "dieline", ...canvasProps }, ref) {
    const bounds = useMemo(() => measureBecf11d01Bounds(attribute), [attribute]);
    const geometry = useMemo(() => getBecf11d01Geometry(attribute), [attribute]);
    const exportPreviewLayout = useMemo(() => createDielinePrintController(
      { modelId: "becf11d01", attributes: attribute },
      { displayUnit: canvasProps.displayUnit, title: "Becf_11d01_dieline.pdf" },
    ), [attribute, canvasProps.displayUnit]);

    if (renderMode === "folded3d") {
      return (
        <Becf_11d01_folded3d
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
          const fontSize = clamp(
            Math.min(
              geometry.resolved.panelWidth,
              geometry.resolved.panelHeight,
              geometry.resolved.sideDepth,
            ) * scale * 0.12,
            12,
            28,
          );
          const subFontSize = clamp(fontSize * 0.76, 10, 22);
          const dashSize = clamp(scale * 4, 8, 18);
          const gapSize = clamp(scale * 2.5, 5, 12);
          const guides = geometry.guides;

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
              {showDimensions && (
                <>
                  <Text
                    position={[pxX((guides.frontLeft + guides.frontRight) / 2), -pxY((guides.bodyTopY + guides.bodyBottomY) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={fontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {toLabelText(geometry.resolved.panelWidth, displayUnit)}
                  </Text>
                  <Text
                    position={[pxX((guides.frontRight + guides.sideRightRight) / 2), -pxY((guides.bodyTopY + guides.bodyBottomY) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={subFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {toLabelText(geometry.resolved.sideDepth, displayUnit)}
                  </Text>
                  <Text
                    position={[pxX((guides.sideRightRight + guides.backRight) / 2), -pxY((guides.bodyTopY + guides.bodyBottomY) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={fontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {toLabelText(geometry.resolved.panelWidth, displayUnit)}
                  </Text>
                  <Text
                    position={[pxX((guides.backRight + guides.sideLeftRight) / 2), -pxY((guides.bodyTopY + guides.bodyBottomY) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={subFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                  >
                    {toLabelText(geometry.resolved.sideLeftWidth, displayUnit)}
                  </Text>
                  <Text
                    position={[pxX((guides.frontLeft + guides.frontRight) / 2), -pxY((guides.bodyTopY + guides.bodyBottomY) / 2), 3]}
                    color={DIMENSION_COLOR}
                    fontSize={subFontSize}
                    anchorX="center"
                    anchorY="middle"
                    textAlign="center"
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    {toLabelText(geometry.resolved.panelHeight, displayUnit)}
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