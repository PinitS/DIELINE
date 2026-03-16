import { Line } from "@react-three/drei";
import { Fragment, forwardRef } from "react";
import type { DielineCanvasHandle, TuckEndBoxDielineProps } from "../../types";
import {
  measureTuckEndBoxBounds,
  TUCK_END_BOX_DUST_RATIO,
  TUCK_END_BOX_GLUE_RATIO,
  TUCK_END_BOX_TUCK_RATIO,
} from "../../utils/measure";
import { BaseDielineCanvas } from "../BaseDielineCanvas";

type Point = { x: number; y: number };

const normalize = (value: number) => (Number.isFinite(value) && value > 0 ? value : 1);

const toScenePoints = (
  points: Point[],
  createScenePoint: (x: number, y: number, z?: number) => [number, number, number],
  z = 2,
) => points.map(({ x, y }) => createScenePoint(x, y, z));

export const StrickerTuckEndBoxDieline = forwardRef<DielineCanvasHandle, TuckEndBoxDielineProps>(
  function TuckEndBoxDieline({ attribute, onMeasure, ...canvasProps }, ref) {
    const length = normalize(attribute.length);
    const width = normalize(attribute.width);
    const height = normalize(attribute.height);
    const glueFlap = attribute.glueFlap ?? width * TUCK_END_BOX_GLUE_RATIO;
    const dustFlap = attribute.dustFlap ?? width * TUCK_END_BOX_DUST_RATIO;
    const topFlap = attribute.topFlap ?? width * TUCK_END_BOX_TUCK_RATIO;
    const bounds = measureTuckEndBoxBounds({ length, width, height, glueFlap, dustFlap, topFlap });

    return (
      <BaseDielineCanvas
        ref={ref}
        {...canvasProps}
        bounds={bounds}
        onMeasure={onMeasure}
        renderShape={(layout, shapeStrokeColor, createScenePoint) => {
          const scale = layout.shapeWidthPx / bounds.overallWidthMm;
          const pxX = (mm: number) => layout.leftX + mm * scale;
          const pxY = (mm: number) => layout.topY + mm * scale;

          const x0 = glueFlap;
          const x1 = x0 + length;
          const x2 = x1 + width;
          const x3 = x2 + length;
          const x4 = x3 + width;

          const y0 = topFlap;
          const y1 = y0 + dustFlap;
          const y2 = y1 + height;
          const y3 = y2 + dustFlap;
          const y4 = y3 + topFlap;

          const dustInset = Math.min(width * 0.22, dustFlap * 0.45);
          const glueInset = Math.min(glueFlap * 0.45, Math.max(glueFlap * 0.18, 1));
          const shoulderHalf = Math.max(length * 0.28, Math.min(length * 0.4, length / 2 - 1));
          const tipHalf = Math.max(length * 0.12, Math.min(length * 0.2, shoulderHalf - 1));
          const topCenter = x0 + length / 2;
          const bottomCenter = x2 + length / 2;

          const cutSegments: Point[][] = [
            [
              { x: pxX(0), y: pxY(y1 + glueInset) },
              { x: pxX(x0), y: pxY(y1) },
              { x: pxX(x0), y: pxY(y2) },
              { x: pxX(0), y: pxY(y2 - glueInset) },
              { x: pxX(0), y: pxY(y1 + glueInset) },
            ],
            [
              { x: pxX(x0), y: pxY(y1) },
              { x: pxX(x1), y: pxY(y1) },
              { x: pxX(x1), y: pxY(y0) },
              { x: pxX(topCenter + shoulderHalf), y: pxY(y0) },
              { x: pxX(topCenter + tipHalf), y: pxY(0) },
              { x: pxX(topCenter - tipHalf), y: pxY(0) },
              { x: pxX(topCenter - shoulderHalf), y: pxY(y0) },
              { x: pxX(x0), y: pxY(y0) },
              { x: pxX(x0), y: pxY(y1) },
            ],
            [
              { x: pxX(x1), y: pxY(y1) },
              { x: pxX(x2), y: pxY(y1) },
              { x: pxX(x2 - dustInset), y: pxY(y0) },
              { x: pxX(x1 + dustInset), y: pxY(y0) },
              { x: pxX(x1), y: pxY(y1) },
            ],
            [
              { x: pxX(x3), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y1) },
              { x: pxX(x4 - dustInset), y: pxY(y0) },
              { x: pxX(x3 + dustInset), y: pxY(y0) },
              { x: pxX(x3), y: pxY(y1) },
            ],
            [
              { x: pxX(x2), y: pxY(y2) },
              { x: pxX(x3), y: pxY(y2) },
              { x: pxX(x3), y: pxY(y3) },
              { x: pxX(bottomCenter + shoulderHalf), y: pxY(y3) },
              { x: pxX(bottomCenter + tipHalf), y: pxY(y4) },
              { x: pxX(bottomCenter - tipHalf), y: pxY(y4) },
              { x: pxX(bottomCenter - shoulderHalf), y: pxY(y3) },
              { x: pxX(x2), y: pxY(y3) },
              { x: pxX(x2), y: pxY(y2) },
            ],
            [
              { x: pxX(x1), y: pxY(y2) },
              { x: pxX(x2), y: pxY(y2) },
              { x: pxX(x2 - dustInset), y: pxY(y3) },
              { x: pxX(x1 + dustInset), y: pxY(y3) },
              { x: pxX(x1), y: pxY(y2) },
            ],
            [
              { x: pxX(x3), y: pxY(y2) },
              { x: pxX(x4), y: pxY(y2) },
              { x: pxX(x4 - dustInset), y: pxY(y3) },
              { x: pxX(x3 + dustInset), y: pxY(y3) },
              { x: pxX(x3), y: pxY(y2) },
            ],
            [
              { x: pxX(x2), y: pxY(y1) },
              { x: pxX(x3), y: pxY(y1) },
            ],
            [
              { x: pxX(x0), y: pxY(y2) },
              { x: pxX(x1), y: pxY(y2) },
            ],
            [
              { x: pxX(x4), y: pxY(y1) },
              { x: pxX(x4), y: pxY(y2) },
            ],
          ];

          const foldSegments: Point[][] = [
            [{ x: pxX(x0), y: pxY(y1) }, { x: pxX(x4), y: pxY(y1) }],
            [{ x: pxX(x0), y: pxY(y2) }, { x: pxX(x4), y: pxY(y2) }],
            [{ x: pxX(x0), y: pxY(y1) }, { x: pxX(x0), y: pxY(y2) }],
            [{ x: pxX(x1), y: pxY(y1) }, { x: pxX(x1), y: pxY(y2) }],
            [{ x: pxX(x2), y: pxY(y1) }, { x: pxX(x2), y: pxY(y2) }],
            [{ x: pxX(x3), y: pxY(y1) }, { x: pxX(x3), y: pxY(y2) }],
          ];

          return (
            <>
              {cutSegments.map((segment, index) => (
                <Line
                  key={`cut-${index}`}
                  points={toScenePoints(segment, createScenePoint)}
                  color={shapeStrokeColor}
                  lineWidth={2}
                />
              ))}
              {foldSegments.map((segment, index) => (
                <Line
                  key={`fold-${index}`}
                  points={toScenePoints(segment, createScenePoint, 1.5)}
                  color={shapeStrokeColor}
                  lineWidth={1.4}
                />
              ))}
            </>
          );
        }}
      />
    );
  },
);