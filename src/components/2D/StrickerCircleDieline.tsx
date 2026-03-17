import { Line } from "@react-three/drei";
import { forwardRef, useEffect, useMemo } from "react";
import type { CircleDielineProps, DielineCanvasHandle } from "../../types";
import { measureCircleBounds } from "../../utils/measure";
import { createDielinePrintController } from "../../utils/pdfExport";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../BaseDielineCanvas";

const CIRCLE_SEGMENTS = 96;

export const StrickerCircleDieline = forwardRef<DielineCanvasHandle, CircleDielineProps>(
  function CircleDieline({ attribute, onMeasure, onPrintExportReady, ...canvasProps }, ref) {
    const bounds = measureCircleBounds(attribute);
    const printExportController = useMemo(() => createDielinePrintController(
      { modelId: "circle", attributes: attribute },
      { displayUnit: canvasProps.displayUnit, title: "StrickerCircleDieline.pdf" },
    ), [attribute, canvasProps.displayUnit]);

    useEffect(() => {
      onPrintExportReady?.(printExportController);
      return () => onPrintExportReady?.(null);
    }, [onPrintExportReady, printExportController]);

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        renderTextureOverlay={(layout, textureImageUrl, textureBounds) => {
          const radius = layout.shapeWidthPx / 2;
          const points = Array.from({ length: CIRCLE_SEGMENTS }, (_, index) => {
            const angle = (index / CIRCLE_SEGMENTS) * Math.PI * 2;
            return {
              x: layout.centerX + Math.cos(angle) * radius,
              y: layout.centerY + Math.sin(angle) * radius,
            };
          });

          return (
            <TexturedPolygonMesh
              imageUrl={textureImageUrl}
              points={points}
              textureBounds={textureBounds}
            />
          );
        }}
        renderShape={(layout, shapeStrokeColor, createScenePoint, showShapeLines) => {
          if (!showShapeLines) return null;

          const radius = layout.shapeWidthPx / 2;
          const points = Array.from({ length: CIRCLE_SEGMENTS + 1 }, (_, index) => {
            const angle = (index / CIRCLE_SEGMENTS) * Math.PI * 2;
            return createScenePoint(
              layout.centerX + Math.cos(angle) * radius,
              layout.centerY + Math.sin(angle) * radius,
              2,
            );
          });

          return <Line points={points} color={shapeStrokeColor} lineWidth={2} />;
        }}
      />
    );
  },
);

