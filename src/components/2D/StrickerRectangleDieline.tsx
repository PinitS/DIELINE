import { forwardRef, useMemo } from "react";
import type { DielineCanvasHandle, RectangleDielineProps } from "../../types";
import { measureRectangleBounds } from "../../utils/measure";
import { createDielineExportPreviewLayoutController } from "../../utils/export/exportPreviewLayout";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../BaseDielineCanvas";
import { SceneLine } from "../ScenePrimitives";

export const StrickerRectangleDieline = forwardRef<DielineCanvasHandle, RectangleDielineProps>(
  function RectangleDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const bounds = measureRectangleBounds(attribute);
    const exportPreviewLayout = useMemo(() => createDielineExportPreviewLayoutController(
      { modelId: "rectangle", attributes: attribute },
      { displayUnit: canvasProps.displayUnit, title: "StrickerRectangleDieline.pdf" },
    ), [attribute, canvasProps.displayUnit]);

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        exportPreviewLayout={exportPreviewLayout}
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
            <SceneLine
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

