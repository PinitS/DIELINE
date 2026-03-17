import type { TuckEndBoxAttributes } from "../types";
import {
  resolveTuckEndBoxAttributes,
  type ResolvedTuckEndBoxAttributes,
} from "./tuckEndBox";

export type Point = { x: number; y: number };

export type TuckEndBoxFoldAngles = {
  sideRight: number;
  back: number;
  sideLeft: number;
  glueTab: number;
  topDustLeft: number;
  topDustRight: number;
  bottomDustLeft: number;
  bottomDustRight: number;
  topClosure: number;
  topTuck: number;
  bottomClosure: number;
  bottomTuck: number;
};

export const TUCK_END_BOX_FOLD_FRAME_COUNT = 360;

export const TUCK_END_BOX_FOLD_SEQUENCE = [
  "Raise the body strip into a tube.",
  "Fold the glue tab inward.",
  "Fold the top and bottom dust flaps.",
  "Close the top lid and tuck flap.",
  "Close the bottom lid and tuck flap.",
] as const;

export type TuckEndBoxGeometry = {
  resolved: ResolvedTuckEndBoxAttributes;
  guides: {
    x0: number;
    x1: number;
    x2: number;
    x3: number;
    x4: number;
    y0: number;
    y1: number;
    y2: number;
    y3: number;
    y4: number;
    topDustY: number;
    bottomDustY: number;
    dustInset: number;
    glueInset: number;
    closureCornerRadius: number;
  };
  panels: {
    bodyStrip: Point[];
    glueTab: Point[];
    front: Point[];
    sideRight: Point[];
    back: Point[];
    sideLeft: Point[];
    topClosureOutline: Point[];
    bottomClosureOutline: Point[];
    topClosure: Point[];
    topTuck: Point[];
    bottomClosure: Point[];
    bottomTuck: Point[];
    topDustLeft: Point[];
    topDustRight: Point[];
    bottomDustLeft: Point[];
    bottomDustRight: Point[];
  };
};

const createQuadraticCurve = (
  start: Point,
  control: Point,
  end: Point,
  segments = 14,
) => Array.from({ length: segments + 1 }, (_, index) => {
  const t = index / segments;
  const inv = 1 - t;
  return {
    x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
    y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
  };
});

const createRectangle = (left: number, top: number, right: number, bottom: number): Point[] => [
  { x: left, y: top },
  { x: right, y: top },
  { x: right, y: bottom },
  { x: left, y: bottom },
];

const createRoundedTopTuckFlap = (
  left: number,
  right: number,
  hingeY: number,
  outerY: number,
  cornerRadius: number,
) => {
  const leftCurveStart = { x: left, y: outerY + cornerRadius };
  const topLeftCorner = { x: left + cornerRadius, y: outerY };
  const topRightCorner = { x: right - cornerRadius, y: outerY };
  const rightCurveEnd = { x: right, y: outerY + cornerRadius };
  const leftCurve = createQuadraticCurve(leftCurveStart, { x: left, y: outerY }, topLeftCorner);
  const rightCurve = createQuadraticCurve(topRightCorner, { x: right, y: outerY }, rightCurveEnd);

  return [
    { x: left, y: hingeY },
    leftCurveStart,
    ...leftCurve.slice(1),
    topRightCorner,
    ...rightCurve.slice(1),
    { x: right, y: hingeY },
  ];
};

const createRoundedBottomTuckFlap = (
  left: number,
  right: number,
  hingeY: number,
  outerY: number,
  cornerRadius: number,
) => {
  const leftCurveStart = { x: left, y: outerY - cornerRadius };
  const bottomLeftCorner = { x: left + cornerRadius, y: outerY };
  const bottomRightCorner = { x: right - cornerRadius, y: outerY };
  const rightCurveEnd = { x: right, y: outerY - cornerRadius };
  const leftCurve = createQuadraticCurve(leftCurveStart, { x: left, y: outerY }, bottomLeftCorner);
  const rightCurve = createQuadraticCurve(bottomRightCorner, { x: right, y: outerY }, rightCurveEnd);

  return [
    { x: left, y: hingeY },
    leftCurveStart,
    ...leftCurve.slice(1),
    bottomRightCorner,
    ...rightCurve.slice(1),
    { x: right, y: hingeY },
  ];
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const clampFrame = (frame: number) =>
  Math.min(
    Math.max(Math.round(Number.isFinite(frame) ? frame : 0), 0),
    TUCK_END_BOX_FOLD_FRAME_COUNT - 1,
  );

const stageProgress = (frame: number, start: number, end: number) => {
  if (frame <= start) return 0;
  if (frame >= end) return 1;
  return (frame - start) / Math.max(end - start, 1);
};

export const getTuckEndBoxGeometry = (
  attribute: TuckEndBoxAttributes = {},
): TuckEndBoxGeometry => {
  const resolved = resolveTuckEndBoxAttributes(attribute);
  const { length, width, height, glueWidth, dustFlap, tuckFlap, closurePanel } = resolved;
  const x0 = glueWidth;
  const x1 = x0 + length;
  const x2 = x1 + width;
  const x3 = x2 + length;
  const x4 = x3 + width;
  const y0 = tuckFlap;
  const y1 = y0 + closurePanel;
  const y2 = y1 + height;
  const y3 = y2 + closurePanel;
  const y4 = y3 + tuckFlap;
  const topDustY = y1 - dustFlap;
  const bottomDustY = y2 + dustFlap;
  const dustInset = Math.min(width * 0.22, dustFlap * 0.45);
  const glueInset = Math.min(glueWidth * 0.45, Math.max(glueWidth * 0.18, 1));
  const closureCornerRadius = Math.max(3, Math.min(closurePanel * 0.34, length * 0.08, 6));
  const topTuck = createRoundedTopTuckFlap(x2, x3, y0, 0, closureCornerRadius);
  const bottomTuck = createRoundedBottomTuckFlap(x0, x1, y3, y4, closureCornerRadius);

  return {
    resolved,
    guides: {
      x0,
      x1,
      x2,
      x3,
      x4,
      y0,
      y1,
      y2,
      y3,
      y4,
      topDustY,
      bottomDustY,
      dustInset,
      glueInset,
      closureCornerRadius,
    },
    panels: {
      bodyStrip: createRectangle(x0, y1, x4, y2),
      glueTab: [
        { x: 0, y: y1 + glueInset },
        { x: x0, y: y1 },
        { x: x0, y: y2 },
        { x: 0, y: y2 - glueInset },
      ],
      front: createRectangle(x0, y1, x1, y2),
      sideRight: createRectangle(x1, y1, x2, y2),
      back: createRectangle(x2, y1, x3, y2),
      sideLeft: createRectangle(x3, y1, x4, y2),
      topClosureOutline: [{ x: x2, y: y1 }, { x: x2, y: y0 }, ...topTuck.slice(1, -1), { x: x3, y: y0 }, { x: x3, y: y1 }],
      bottomClosureOutline: [{ x: x0, y: y2 }, { x: x0, y: y3 }, ...bottomTuck.slice(1, -1), { x: x1, y: y3 }, { x: x1, y: y2 }],
      topClosure: createRectangle(x2, y0, x3, y1),
      topTuck,
      bottomClosure: createRectangle(x0, y2, x1, y3),
      bottomTuck,
      topDustLeft: [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: topDustY },
        { x: x1 + dustInset, y: topDustY },
      ],
      topDustRight: [
        { x: x3, y: y1 },
        { x: x4, y: y1 },
        { x: x4 - dustInset, y: topDustY },
        { x: x3, y: topDustY },
      ],
      bottomDustLeft: [
        { x: x1, y: y2 },
        { x: x2, y: y2 },
        { x: x2 - dustInset, y: bottomDustY },
        { x: x1, y: bottomDustY },
      ],
      bottomDustRight: [
        { x: x3, y: y2 },
        { x: x4, y: y2 },
        { x: x4, y: bottomDustY },
        { x: x3 + dustInset, y: bottomDustY },
      ],
    },
  };
};

export const getTuckEndBoxFoldAngles = (frame: number): TuckEndBoxFoldAngles => {
  const currentFrame = clampFrame(frame);

  return {
    // 1. GLUE Area พับมาที่ 90 องศา (frame 0-30)
    glueTab: toRadians(90) * stageProgress(currentFrame, 0, 30),
    // 2. REAR PANEL พับเข้ามาหา SIDE PANEL (frame 30-60)
    back: -toRadians(90) * stageProgress(currentFrame, 30, 60),
    // 3. SIDE PANEL ขวาพับเข้ามาหา FRONT PANEL (frame 60-90)
    sideRight: -toRadians(90) * stageProgress(currentFrame, 60, 90),
    // 4. SIDE PANEL ซ้ายพับเข้ามาหา FRONT PANEL (frame 90-120)
    sideLeft: -toRadians(90) * stageProgress(currentFrame, 90, 120),
    // 5. DUST FLAP พับเข้ามาในกล่อง (frame 120-150)
    // Top dust flaps: ซ้ายหมุนไปขวา, ขวาหมุนไปซ้าย
    topDustLeft: toRadians(90) * stageProgress(currentFrame, 120, 150),
    topDustRight: toRadians(90) * stageProgress(currentFrame, 120, 150),
    // Bottom dust flaps: ซ้ายหมุนไปขวา, ขวาหมุนไปซ้าย
    bottomDustLeft: -toRadians(90) * stageProgress(currentFrame, 120, 150),
    bottomDustRight: -toRadians(90) * stageProgress(currentFrame, 120, 150),
    // 6. TOP TUCK (frame 150-180)
    topTuck: toRadians(90) * stageProgress(currentFrame, 150, 180),
    // 6.1 TOP CLOSURE (frame 180-210)
    topClosure: toRadians(90) * stageProgress(currentFrame, 180, 210),
    // 7. BOTTOM TUCK (frame 210-300)
    bottomTuck: -toRadians(90) * stageProgress(currentFrame, 210, 300),
    // 7.1 BOTTOM CLOSURE (frame 300-360) - เริ่มที่ 0 แล้วค่อยไป -90
    bottomClosure: -toRadians(90) * stageProgress(currentFrame, 300, 359),
  };
};