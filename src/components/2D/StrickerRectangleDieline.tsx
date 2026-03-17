import { Line } from "@react-three/drei";
import { forwardRef, useEffect, useMemo } from "react";
import type { DielineCanvasHandle, RectangleDielineProps } from "../../types";
import { measureRectangleBounds } from "../../utils/measure";
import { createDielinePrintController } from "../../utils/pdfExport";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../BaseDielineCanvas";

export const StrickerRectangleDieline = forwardRef<DielineCanvasHandle, RectangleDielineProps>(
  function RectangleDieline({ attribute, onMeasure, onPrintExportReady, ...canvasProps }, ref) {
    const bounds = measureRectangleBounds(attribute);
    const printExportController = useMemo(() => createDielinePrintController(
      { modelId: "rectangle", attributes: attribute },
      { displayUnit: canvasProps.displayUnit, title: "StrickerRectangleDieline.pdf" },
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
        renderTextureOverlay={(layout, textureImageUrl, textureBounds) => (
          <TexturedPolygonMesh
            imageUrl={textureImageUrl}
            points={[
              { x: layout.leftX, y: layout.topY },
              { x: layout.rightX, y: layout.topY },
              { x: layout.rightX, y: layout.bottomY },
              { x: layout.leftX, y: layout.bottomY },
            ]}
            textureBounds={textureBounds}
          />
        )}
        renderShape={(layout, shapeStrokeColor, createScenePoint, showShapeLines) => {
          if (!showShapeLines) return null;

          return (
            <Line
              points={[
                createScenePoint(layout.leftX, layout.topY, 2),
                createScenePoint(layout.rightX, layout.topY, 2),
                createScenePoint(layout.rightX, layout.bottomY, 2),
                createScenePoint(layout.leftX, layout.bottomY, 2),
                createScenePoint(layout.leftX, layout.topY, 2),
              ]}
              color={shapeStrokeColor}
              lineWidth={2}
            />
          );
        }}
      />
    );
  },
);

