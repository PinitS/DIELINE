import type { Becf11d01Attributes } from "../types";

export type Point = { x: number; y: number };

export const DEFAULT_BECF11D01_ATTRIBUTES = {
  length: 175,
  height: 230,
  width: 74,
  closurePanel: 74,
  dustFlap: 74,
  glueWidth: 15,
  flapInset: 2,
} as const;

export type ResolvedBecf11d01Attributes = {
  length: number;
  height: number;
  width: number;
  closurePanel: number;
  dustFlap: number;
  glueWidth: number;
  flapInset: number;
};

export type Becf11d01FoldAngles = {
  glueTab: number;
  sideRight: number;
  back: number;
  sideLeft: number;
  topDustRight: number;
  topDustLeft: number;
  bottomDustRight: number;
  bottomDustLeft: number;
  topMajorFront: number;
  topMajorBack: number;
  bottomMajorFront: number;
  bottomMajorBack: number;
};

export const BECF11D01_FOLD_FRAME_COUNT = 360;

export const BECF11D01_FOLD_SEQUENCE = [
  "Raise the body strip and glue tab.",
  "Fold the dust flaps inward.",
  "Close the major flaps.",
] as const;

export type Becf11d01Geometry = {
  resolved: ResolvedBecf11d01Attributes;
  bounds: { overallWidthMm: number; overallHeightMm: number };
  guides: {
    leftX: number;
    frontLeft: number;
    frontRight: number;
    sideRightRight: number;
    backRight: number;
    sideLeftRight: number;
    topY: number;
    bodyTopY: number;
    bodyBottomY: number;
    bottomY: number;
    frontMajorLeft: number;
    frontMajorRight: number;
    backMajorLeft: number;
    backMajorRight: number;
    closureFlapTopY: number;
    closureFlapBottomY: number;
  };
  panels2d: {
    glueTab: Point[];
    front: Point[];
    sideRight: Point[];
    back: Point[];
    sideLeft: Point[];
    topFront: Point[];
    topSideRight: Point[];
    topBack: Point[];
    topSideLeft: Point[];
    bottomFront: Point[];
    bottomSideRight: Point[];
    bottomBack: Point[];
    bottomSideLeft: Point[];
  };
  panels3d: {
    glueTab: Point[];
    front: Point[];
    sideRight: Point[];
    back: Point[];
    sideLeft: Point[];
    topFront: Point[];
    topSideRight: Point[];
    topBack: Point[];
    topSideLeft: Point[];
    bottomFront: Point[];
    bottomSideRight: Point[];
    bottomBack: Point[];
    bottomSideLeft: Point[];
  };
  cuts: Point[][];
  folds: Point[][];
};

const resolveDimension = (value: number | undefined, fallback: number): number => (
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback
);

const createRectangle = (left: number, top: number, right: number, bottom: number): Point[] => [
  { x: left, y: top },
  { x: right, y: top },
  { x: right, y: bottom },
  { x: left, y: bottom },
];

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const clampFrame = (frame: number) => Math.min(
  Math.max(Math.round(Number.isFinite(frame) ? frame : 0), 0),
  BECF11D01_FOLD_FRAME_COUNT - 1,
);

const stageProgress = (frame: number, start: number, end: number) => {
  if (frame <= start) return 0;
  if (frame >= end) return 1;
  return (frame - start) / Math.max(end - start, 1);
};

export const resolveBecf11d01Attributes = (
  attribute: Becf11d01Attributes = {},
): ResolvedBecf11d01Attributes => ({
  length: resolveDimension(attribute.length, DEFAULT_BECF11D01_ATTRIBUTES.length),
  height: resolveDimension(attribute.height, DEFAULT_BECF11D01_ATTRIBUTES.height),
  width: resolveDimension(attribute.width, DEFAULT_BECF11D01_ATTRIBUTES.width),
  closurePanel: resolveDimension(attribute.closurePanel, DEFAULT_BECF11D01_ATTRIBUTES.closurePanel),
  dustFlap: resolveDimension(attribute.dustFlap, DEFAULT_BECF11D01_ATTRIBUTES.dustFlap),
  glueWidth: resolveDimension(attribute.glueWidth, DEFAULT_BECF11D01_ATTRIBUTES.glueWidth),
  flapInset: resolveDimension(attribute.flapInset, DEFAULT_BECF11D01_ATTRIBUTES.flapInset),
});

export const getBecf11d01Geometry = (
  attribute: Becf11d01Attributes = {},
): Becf11d01Geometry => {
  const resolved = resolveBecf11d01Attributes(attribute);
  const {
    length,
    height,
    width,
    closurePanel,
    dustFlap,
    glueWidth,
    flapInset,
  } = resolved;

  // Calculate glueSkew from glueWidth (diagonal calculation)
  const glueSkew = Math.sqrt(glueWidth * glueWidth + (dustFlap / 2) * (dustFlap / 2)) - (dustFlap / 2);

  const leftX = 0;
  const frontLeft = glueWidth;
  const frontRight = frontLeft + length;
  const sideRightRight = frontRight + width;
  const backRight = sideRightRight + length;
  const sideLeftRight = backRight + width;
  const topY = 0;
  const bodyTopY = dustFlap;
  const bodyBottomY = dustFlap + height;
  const bottomY = bodyBottomY + dustFlap;
  const frontMajorLeft = frontLeft + flapInset;
  const frontMajorRight = frontRight - flapInset;
  const backMajorLeft = sideRightRight + flapInset;
  const backMajorRight = backRight - flapInset;
  const closureFlapTopY = bodyTopY - closurePanel;
  const closureFlapBottomY = bodyBottomY + closurePanel;

  const glueTab2d = [
    { x: leftX, y: bodyTopY + glueSkew },
    { x: frontLeft, y: bodyTopY },
    { x: frontLeft, y: bodyBottomY },
    { x: leftX, y: bodyBottomY - glueSkew },
  ];

  const panels2d = {
    glueTab: glueTab2d,
    front: createRectangle(frontLeft, bodyTopY, frontRight, bodyBottomY),
    sideRight: createRectangle(frontRight, bodyTopY, sideRightRight, bodyBottomY),
    back: createRectangle(sideRightRight, bodyTopY, backRight, bodyBottomY),
    sideLeft: createRectangle(backRight, bodyTopY, sideLeftRight, bodyBottomY),
    topFront: createRectangle(frontMajorLeft, closureFlapTopY, frontMajorRight, bodyTopY),
    topSideRight: createRectangle(frontRight, topY, sideRightRight, bodyTopY),
    topBack: createRectangle(backMajorLeft, closureFlapTopY, backMajorRight, bodyTopY),
    topSideLeft: createRectangle(backRight, topY, sideLeftRight, bodyTopY),
    bottomFront: createRectangle(frontMajorLeft, bodyBottomY, frontMajorRight, closureFlapBottomY),
    bottomSideRight: createRectangle(frontRight, bodyBottomY, sideRightRight, bottomY),
    bottomBack: createRectangle(backMajorLeft, bodyBottomY, backMajorRight, closureFlapBottomY),
    bottomSideLeft: createRectangle(backRight, bodyBottomY, sideLeftRight, bottomY),
  };

  const panels3d = {
    glueTab: [
      { x: 0, y: 0 },
      { x: -glueWidth, y: glueSkew },
      { x: -glueWidth, y: height - glueSkew },
      { x: 0, y: height },
    ],
    front: createRectangle(0, 0, length, height),
    sideRight: createRectangle(0, 0, width, height),
    back: createRectangle(0, 0, length, height),
    sideLeft: createRectangle(0, 0, width, height),
    topFront: createRectangle(flapInset, -closurePanel, length - flapInset, 0),
    topSideRight: createRectangle(0, -dustFlap, width, 0),
    topBack: createRectangle(flapInset, -closurePanel, length - flapInset, 0),
    topSideLeft: createRectangle(0, -dustFlap, width, 0),
    bottomFront: createRectangle(flapInset, 0, length - flapInset, closurePanel),
    bottomSideRight: createRectangle(0, 0, width, dustFlap),
    bottomBack: createRectangle(flapInset, 0, length - flapInset, closurePanel),
    bottomSideLeft: createRectangle(0, 0, width, dustFlap),
  };

  const cuts: Point[][] = [
    [{ x: leftX, y: bodyTopY + glueSkew }, { x: frontLeft, y: bodyTopY }],
    [{ x: leftX, y: bodyTopY + glueSkew }, { x: leftX, y: bodyBottomY - glueSkew }],
    [{ x: frontLeft, y: bodyBottomY }, { x: leftX, y: bodyBottomY - glueSkew }],
    [{ x: frontLeft, y: bodyTopY }, { x: frontMajorLeft, y: bodyTopY }],
    [{ x: frontMajorLeft, y: bodyTopY }, { x: frontMajorLeft, y: closureFlapTopY }, { x: frontMajorRight, y: closureFlapTopY }, { x: frontMajorRight, y: bodyTopY }],
    [{ x: frontMajorRight, y: bodyTopY }, { x: frontRight, y: bodyTopY }],
    [{ x: frontRight, y: bodyTopY }, { x: frontRight, y: topY }, { x: sideRightRight, y: topY }, { x: sideRightRight, y: bodyTopY }],
    [{ x: sideRightRight, y: bodyTopY }, { x: backMajorLeft, y: bodyTopY }],
    [{ x: backMajorLeft, y: bodyTopY }, { x: backMajorLeft, y: closureFlapTopY }, { x: backMajorRight, y: closureFlapTopY }, { x: backMajorRight, y: bodyTopY }],
    [{ x: backMajorRight, y: bodyTopY }, { x: backRight, y: bodyTopY }],
    [{ x: backRight, y: bodyTopY }, { x: backRight, y: topY }, { x: sideLeftRight, y: topY }, { x: sideLeftRight, y: bodyTopY }],
    [{ x: sideLeftRight, y: bodyTopY }, { x: sideLeftRight, y: bodyBottomY }],
    [{ x: backRight, y: bodyBottomY }, { x: backRight, y: bottomY }, { x: sideLeftRight, y: bottomY }, { x: sideLeftRight, y: bodyBottomY }],
    [{ x: backMajorRight, y: bodyBottomY }, { x: backRight, y: bodyBottomY }],
    [{ x: backMajorLeft, y: bodyBottomY }, { x: backMajorLeft, y: closureFlapBottomY }, { x: backMajorRight, y: closureFlapBottomY }, { x: backMajorRight, y: bodyBottomY }],
    [{ x: sideRightRight, y: bodyBottomY }, { x: backMajorLeft, y: bodyBottomY }],
    [{ x: frontRight, y: bodyBottomY }, { x: frontRight, y: bottomY }, { x: sideRightRight, y: bottomY }, { x: sideRightRight, y: bodyBottomY }],
    [{ x: frontMajorRight, y: bodyBottomY }, { x: frontRight, y: bodyBottomY }],
    [{ x: frontLeft, y: bodyBottomY }, { x: frontMajorLeft, y: bodyBottomY }],
    [{ x: frontMajorLeft, y: bodyBottomY }, { x: frontMajorLeft, y: closureFlapBottomY }, { x: frontMajorRight, y: closureFlapBottomY }, { x: frontMajorRight, y: bodyBottomY }],
  ];

  const folds: Point[][] = [
    [{ x: frontLeft, y: bodyTopY }, { x: frontLeft, y: bodyBottomY }],
    [{ x: frontRight, y: bodyTopY }, { x: frontRight, y: bodyBottomY }],
    [{ x: sideRightRight, y: bodyTopY }, { x: sideRightRight, y: bodyBottomY }],
    [{ x: backRight, y: bodyTopY }, { x: backRight, y: bodyBottomY }],
    [{ x: frontMajorLeft, y: bodyTopY }, { x: frontMajorRight, y: bodyTopY }],
    [{ x: frontRight, y: bodyTopY }, { x: sideRightRight, y: bodyTopY }],
    [{ x: backMajorLeft, y: bodyTopY }, { x: backMajorRight, y: bodyTopY }],
    [{ x: backRight, y: bodyTopY }, { x: sideLeftRight, y: bodyTopY }],
    [{ x: frontMajorLeft, y: bodyBottomY }, { x: frontMajorRight, y: bodyBottomY }],
    [{ x: frontRight, y: bodyBottomY }, { x: sideRightRight, y: bodyBottomY }],
    [{ x: backMajorLeft, y: bodyBottomY }, { x: backMajorRight, y: bodyBottomY }],
    [{ x: backRight, y: bodyBottomY }, { x: sideLeftRight, y: bodyBottomY }],
  ];

  return {
    resolved,
    bounds: { overallWidthMm: sideLeftRight, overallHeightMm: bottomY },
    guides: {
      leftX,
      frontLeft,
      frontRight,
      sideRightRight,
      backRight,
      sideLeftRight,
      topY,
      bodyTopY,
      bodyBottomY,
      bottomY,
      frontMajorLeft,
      frontMajorRight,
      backMajorLeft,
      backMajorRight,
      closureFlapTopY,
      closureFlapBottomY,
    },
    panels2d,
    panels3d,
    cuts,
    folds,
  };
};

export const getBecf11d01FoldAngles = (frame: number): Becf11d01FoldAngles => {
  const currentFrame = clampFrame(frame);

  return {
    glueTab: toRadians(90) * stageProgress(currentFrame, 0, 40),
    sideRight: -toRadians(90) * stageProgress(currentFrame, 0, 60),
    back: -toRadians(90) * stageProgress(currentFrame, 30, 90),
    sideLeft: -toRadians(90) * stageProgress(currentFrame, 60, 120),
    topDustRight: toRadians(90) * stageProgress(currentFrame, 120, 240),
    topDustLeft: toRadians(90) * stageProgress(currentFrame, 120, 240),
    bottomDustRight: -toRadians(90) * stageProgress(currentFrame, 120, 240),
    bottomDustLeft: -toRadians(90) * stageProgress(currentFrame, 120, 240),
    topMajorFront: toRadians(90) * stageProgress(currentFrame, 240, 300),
    bottomMajorFront: -toRadians(90) * stageProgress(currentFrame, 240, 300),

    topMajorBack: toRadians(90) * stageProgress(currentFrame, 300, 359),
    bottomMajorBack: -toRadians(90) * stageProgress(currentFrame, 300, 359),
  };
};