import type { Becf11d01Attributes } from "../types";

export type Point = { x: number; y: number };

export const DEFAULT_BECF11D01_ATTRIBUTES = {
  panelWidth: 175,
  panelHeight: 230,
  sideDepth: 74,
  sideLeftWidth: 73.5,
  flapHeight: 74,
  glueWidth: 15,
  flapInset: 2,
  glueSkew: 4.019,
} as const;

export type ResolvedBecf11d01Attributes = {
  panelWidth: number;
  panelHeight: number;
  sideDepth: number;
  sideLeftWidth: number;
  flapHeight: number;
  glueWidth: number;
  flapInset: number;
  glueSkew: number;
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
  panelWidth: resolveDimension(attribute.panelWidth, DEFAULT_BECF11D01_ATTRIBUTES.panelWidth),
  panelHeight: resolveDimension(attribute.panelHeight, DEFAULT_BECF11D01_ATTRIBUTES.panelHeight),
  sideDepth: resolveDimension(attribute.sideDepth, DEFAULT_BECF11D01_ATTRIBUTES.sideDepth),
  sideLeftWidth: resolveDimension(attribute.sideLeftWidth, DEFAULT_BECF11D01_ATTRIBUTES.sideLeftWidth),
  flapHeight: resolveDimension(attribute.flapHeight, DEFAULT_BECF11D01_ATTRIBUTES.flapHeight),
  glueWidth: resolveDimension(attribute.glueWidth, DEFAULT_BECF11D01_ATTRIBUTES.glueWidth),
  flapInset: resolveDimension(attribute.flapInset, DEFAULT_BECF11D01_ATTRIBUTES.flapInset),
  glueSkew: resolveDimension(attribute.glueSkew, DEFAULT_BECF11D01_ATTRIBUTES.glueSkew),
});

export const getBecf11d01Geometry = (
  attribute: Becf11d01Attributes = {},
): Becf11d01Geometry => {
  const resolved = resolveBecf11d01Attributes(attribute);
  const {
    panelWidth,
    panelHeight,
    sideDepth,
    sideLeftWidth,
    flapHeight,
    glueWidth,
    flapInset,
    glueSkew,
  } = resolved;

  const leftX = 0;
  const frontLeft = glueWidth;
  const frontRight = frontLeft + panelWidth;
  const sideRightRight = frontRight + sideDepth;
  const backRight = sideRightRight + panelWidth;
  const sideLeftRight = backRight + sideLeftWidth;
  const topY = 0;
  const bodyTopY = flapHeight;
  const bodyBottomY = flapHeight + panelHeight;
  const bottomY = bodyBottomY + flapHeight;
  const frontMajorLeft = frontLeft + flapInset;
  const frontMajorRight = frontRight - flapInset;
  const backMajorLeft = sideRightRight + flapInset;
  const backMajorRight = backRight - flapInset;

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
    topFront: createRectangle(frontMajorLeft, topY, frontMajorRight, bodyTopY),
    topSideRight: createRectangle(frontRight, topY, sideRightRight, bodyTopY),
    topBack: createRectangle(backMajorLeft, topY, backMajorRight, bodyTopY),
    topSideLeft: createRectangle(backRight, topY, sideLeftRight, bodyTopY),
    bottomFront: createRectangle(frontMajorLeft, bodyBottomY, frontMajorRight, bottomY),
    bottomSideRight: createRectangle(frontRight, bodyBottomY, sideRightRight, bottomY),
    bottomBack: createRectangle(backMajorLeft, bodyBottomY, backMajorRight, bottomY),
    bottomSideLeft: createRectangle(backRight, bodyBottomY, sideLeftRight, bottomY),
  };

  const panels3d = {
    glueTab: [
      { x: 0, y: 0 },
      { x: -glueWidth, y: glueSkew },
      { x: -glueWidth, y: panelHeight - glueSkew },
      { x: 0, y: panelHeight },
    ],
    front: createRectangle(0, 0, panelWidth, panelHeight),
    sideRight: createRectangle(0, 0, sideDepth, panelHeight),
    back: createRectangle(0, 0, panelWidth, panelHeight),
    sideLeft: createRectangle(0, 0, sideDepth, panelHeight),
    topFront: createRectangle(flapInset, -flapHeight, panelWidth - flapInset, 0),
    topSideRight: createRectangle(0, -flapHeight, sideDepth, 0),
    topBack: createRectangle(flapInset, -flapHeight, panelWidth - flapInset, 0),
    topSideLeft: createRectangle(0, -flapHeight, sideDepth, 0),
    bottomFront: createRectangle(flapInset, 0, panelWidth - flapInset, flapHeight),
    bottomSideRight: createRectangle(0, 0, sideDepth, flapHeight),
    bottomBack: createRectangle(flapInset, 0, panelWidth - flapInset, flapHeight),
    bottomSideLeft: createRectangle(0, 0, sideDepth, flapHeight),
  };

  const cuts: Point[][] = [
    [{ x: leftX, y: bodyTopY + glueSkew }, { x: frontLeft, y: bodyTopY }],
    [{ x: leftX, y: bodyTopY + glueSkew }, { x: leftX, y: bodyBottomY - glueSkew }],
    [{ x: frontLeft, y: bodyBottomY }, { x: leftX, y: bodyBottomY - glueSkew }],
    [{ x: frontLeft, y: bodyTopY }, { x: frontMajorLeft, y: bodyTopY }],
    [{ x: frontMajorLeft, y: bodyTopY }, { x: frontMajorLeft, y: topY }, { x: frontMajorRight, y: topY }, { x: frontMajorRight, y: bodyTopY }],
    [{ x: frontMajorRight, y: bodyTopY }, { x: frontRight, y: bodyTopY }],
    [{ x: frontRight, y: bodyTopY }, { x: frontRight, y: topY }, { x: sideRightRight, y: topY }, { x: sideRightRight, y: bodyTopY }],
    [{ x: sideRightRight, y: bodyTopY }, { x: backMajorLeft, y: bodyTopY }],
    [{ x: backMajorLeft, y: bodyTopY }, { x: backMajorLeft, y: topY }, { x: backMajorRight, y: topY }, { x: backMajorRight, y: bodyTopY }],
    [{ x: backMajorRight, y: bodyTopY }, { x: backRight, y: bodyTopY }],
    [{ x: backRight, y: bodyTopY }, { x: backRight, y: topY }, { x: sideLeftRight, y: topY }, { x: sideLeftRight, y: bodyTopY }],
    [{ x: sideLeftRight, y: bodyTopY }, { x: sideLeftRight, y: bodyBottomY }],
    [{ x: backRight, y: bodyBottomY }, { x: backRight, y: bottomY }, { x: sideLeftRight, y: bottomY }, { x: sideLeftRight, y: bodyBottomY }],
    [{ x: backMajorRight, y: bodyBottomY }, { x: backRight, y: bodyBottomY }],
    [{ x: backMajorLeft, y: bodyBottomY }, { x: backMajorLeft, y: bottomY }, { x: backMajorRight, y: bottomY }, { x: backMajorRight, y: bodyBottomY }],
    [{ x: sideRightRight, y: bodyBottomY }, { x: backMajorLeft, y: bodyBottomY }],
    [{ x: frontRight, y: bodyBottomY }, { x: frontRight, y: bottomY }, { x: sideRightRight, y: bottomY }, { x: sideRightRight, y: bodyBottomY }],
    [{ x: frontMajorRight, y: bodyBottomY }, { x: frontRight, y: bodyBottomY }],
    [{ x: frontLeft, y: bodyBottomY }, { x: frontMajorLeft, y: bodyBottomY }],
    [{ x: frontMajorLeft, y: bodyBottomY }, { x: frontMajorLeft, y: bottomY }, { x: frontMajorRight, y: bottomY }, { x: frontMajorRight, y: bodyBottomY }],
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
    topMajorFront: toRadians(90) * stageProgress(currentFrame, 240, 359),
    topMajorBack: toRadians(90) * stageProgress(currentFrame, 240, 359),
    bottomMajorFront: -toRadians(90) * stageProgress(currentFrame, 240, 359),
    bottomMajorBack: -toRadians(90) * stageProgress(currentFrame, 240, 359),
  };
};