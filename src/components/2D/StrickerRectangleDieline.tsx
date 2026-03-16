import { Line } from "@react-three/drei";
import { forwardRef } from "react";
import type { DielineCanvasHandle, RectangleDielineProps } from "../../types";
import { measureRectangleBounds } from "../../utils/measure";
import { BaseDielineCanvas } from "../BaseDielineCanvas";

export const StrickerRectangleDieline = forwardRef<DielineCanvasHandle, RectangleDielineProps>(
  function RectangleDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const bounds = measureRectangleBounds(attribute);

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        renderShape={(layout, shapeStrokeColor, createScenePoint) => (
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
        )}
      />
    );
  },
);

