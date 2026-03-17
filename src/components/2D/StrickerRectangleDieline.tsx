import { Line } from "@react-three/drei";
import { forwardRef } from "react";
import type { DielineCanvasHandle, RectangleDielineProps } from "../../types";
import { measureRectangleBounds } from "../../utils/measure";
import { BaseDielineCanvas, TexturedPolygonMesh } from "../BaseDielineCanvas";

export const StrickerRectangleDieline = forwardRef<DielineCanvasHandle, RectangleDielineProps>(
  function RectangleDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const bounds = measureRectangleBounds(attribute);

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

