import { Line } from "@react-three/drei";
import { forwardRef } from "react";
import type { CircleDielineProps, DielineCanvasHandle } from "../../types";
import { measureCircleBounds } from "../../utils/measure";
import { BaseDielineCanvas, createTextureBounds, TexturedPolygonMesh } from "../BaseDielineCanvas";

const CIRCLE_SEGMENTS = 96;

export const StrickerCircleDieline = forwardRef<DielineCanvasHandle, CircleDielineProps>(
  function CircleDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const bounds = measureCircleBounds(attribute);

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        renderTextureOverlay={(layout, textureImageUrl) => {
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
              textureBounds={createTextureBounds(layout)}
            />
          );
        }}
        renderShape={(layout, shapeStrokeColor, createScenePoint) => {
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

