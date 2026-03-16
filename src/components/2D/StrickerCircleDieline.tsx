import { Line } from "@react-three/drei";
import { forwardRef } from "react";
import type { CircleDielineProps, DielineCanvasHandle } from "../../types";
import { measureCircleBounds } from "../../utils/measure";
import { BaseDielineCanvas } from "../BaseDielineCanvas";

export const StrickerCircleDieline = forwardRef<DielineCanvasHandle, CircleDielineProps>(
  function CircleDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const bounds = measureCircleBounds(attribute);

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        renderShape={(layout, shapeStrokeColor, createScenePoint) => {
          const radius = layout.shapeWidthPx / 2;
          const segments = 96;
          const points = Array.from({ length: segments + 1 }, (_, index) => {
            const angle = (index / segments) * Math.PI * 2;
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

