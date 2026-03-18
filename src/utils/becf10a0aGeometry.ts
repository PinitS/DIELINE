import type { Becf10a0aAttributes } from "../types";

export type Point = { x: number; y: number };

export const DEFAULT_BECF10A0A_ATTRIBUTES = {
  length: 135,
  width: 70,
  height: 140,
  closurePanel: 50,
  dustFlap: 48.75,
  glueWidth: 15,
  tuckFlap: 15,
  topClosurePanel: 70,
} as const;

export type ResolvedBecf10a0aAttributes = {
  length: number;
  width: number;
  height: number;
  closurePanel: number;
  dustFlap: number;
  glueWidth: number;
  tuckFlap: number;
  topClosurePanel: number;
};

const resolveDimension = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;

export const resolveBecf10a0aAttributes = (
  attribute: Becf10a0aAttributes = {},
): ResolvedBecf10a0aAttributes => ({
  length: resolveDimension(attribute.length, DEFAULT_BECF10A0A_ATTRIBUTES.length),
  width: resolveDimension(attribute.width, DEFAULT_BECF10A0A_ATTRIBUTES.width),
  height: resolveDimension(attribute.height, DEFAULT_BECF10A0A_ATTRIBUTES.height),
  closurePanel: resolveDimension(attribute.closurePanel, DEFAULT_BECF10A0A_ATTRIBUTES.closurePanel),
  dustFlap: resolveDimension(attribute.dustFlap, DEFAULT_BECF10A0A_ATTRIBUTES.dustFlap),
  glueWidth: resolveDimension(attribute.glueWidth, DEFAULT_BECF10A0A_ATTRIBUTES.glueWidth),
  tuckFlap: resolveDimension(attribute.tuckFlap, DEFAULT_BECF10A0A_ATTRIBUTES.tuckFlap),
  topClosurePanel: resolveDimension(attribute.topClosurePanel, DEFAULT_BECF10A0A_ATTRIBUTES.topClosurePanel),
});

type Becf10a0aPanels2d = {
  glueTab: Point[];
  front: Point[];
  sideRight: Point[];
  back: Point[];
  sideLeft: Point[];
  topClosure: Point[];
  topTuckFlap: Point[];
  bottomClosure: Point[];
  bottomTuckFlap: Point[];
  dustFlapTopSR: Point[];
  dustFlapTopSL: Point[];
  dustFlapBottomSR: Point[];
  dustFlapBottomSL: Point[];
};

export type Becf10a0aGeometry = {
  resolved: ResolvedBecf10a0aAttributes;
  bounds: { overallWidthMm: number; overallHeightMm: number };
  guides: {
    ox: number;
    oy: number;
    glueLeft: number;
    frontLeft: number;
    frontRight: number;
    sideRightRight: number;
    backRight: number;
    sideLeftRight: number;
    bodyTopY: number;
    bodyBottomY: number;
    topClosureTopY: number;
    topTuckTopY: number;
    bottomClosureBottomY: number;
    bottomDustBottomY: number;
  };
  panels2d: Becf10a0aPanels2d;
  cuts: Point[][];
  folds: Point[][];
};

const createQuadraticCurve = (
  start: Point,
  control: Point,
  end: Point,
  segments = 14,
) =>
  Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const inv = 1 - t;
    return {
      x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
      y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
    };
  });

const sampleArc = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  segments = 12,
): Point[] => {
  const startRad = (startDeg * Math.PI) / 180;
  const endRad = (endDeg * Math.PI) / 180;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const angle = startRad + t * (endRad - startRad);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
};

export const getBecf10a0aGeometry = (
  attribute: Becf10a0aAttributes = {},
): Becf10a0aGeometry => {
  const resolved = resolveBecf10a0aAttributes(attribute);
  const { length, width, height, glueWidth, closurePanel, tuckFlap, topClosurePanel, dustFlap } = resolved;

  // Offset so all coordinates are positive (original origin at FRONT_PANEL bottom-left)
  // Original bounding box: x ∈ [-15, 409.5], y ∈ [-50, 224]
  const ox = glueWidth; // shift x by glueWidth (15)
  const oy = closurePanel; // shift y by closurePanel (50)

  // Guide x-coordinates (after offset)
  const glueLeft = 0;
  const frontLeft = ox;
  const frontRight = ox + length;
  const sideRightRight = frontRight + width;
  const backRight = sideRightRight + length;
  const sideLeftRight = backRight + (width - 0.5); // SIDE_LEFT is 69.5mm

  // Guide y-coordinates (after offset)
  const bodyBottomY = oy;
  const bodyTopY = oy + height;
  const topClosureTopY = bodyTopY + topClosurePanel;
  const topTuckTopY = topClosureTopY + tuckFlap;
  const bottomClosureBottomY = 0;
  const bottomDustBottomY = oy - dustFlap;

  const overallWidthMm = sideLeftRight;
  const overallHeightMm = topTuckTopY;
  const bounds = { overallWidthMm, overallHeightMm };

  // Glue flap skew
  const glueSkew = Math.min(glueWidth * 0.268, 4.02);

  // --- Panels 2D ---
  const glueTab: Point[] = [
    { x: frontLeft, y: bodyBottomY + glueSkew },
    { x: glueLeft, y: bodyBottomY + glueSkew },
    { x: glueLeft, y: bodyTopY - glueSkew },
    { x: frontLeft, y: bodyTopY },
  ];

  const front: Point[] = [
    { x: frontLeft, y: bodyBottomY },
    { x: frontRight, y: bodyBottomY },
    { x: frontRight, y: bodyTopY },
    { x: frontLeft, y: bodyTopY },
  ];

  const sideRight: Point[] = [
    { x: frontRight, y: bodyBottomY },
    { x: sideRightRight, y: bodyBottomY },
    { x: sideRightRight, y: bodyTopY },
    { x: frontRight, y: bodyTopY },
  ];

  const back: Point[] = [
    { x: sideRightRight, y: bodyBottomY },
    { x: backRight, y: bodyBottomY },
    { x: backRight, y: bodyTopY },
    { x: sideRightRight, y: bodyTopY },
  ];

  const sideLeft: Point[] = [
    { x: backRight, y: bodyBottomY },
    { x: sideLeftRight, y: bodyBottomY },
    { x: sideLeftRight, y: bodyTopY },
    { x: backRight, y: bodyTopY },
  ];

  // Top closure (from REAR_PANEL)
  const topClosureNotchInset = 10; // 215-205=10 and 340-330=10
  const topClosureNotchDepth = 1; // 210-209=1
  const topClosure: Point[] = [
    { x: sideRightRight, y: bodyTopY },
    { x: sideRightRight, y: topClosureTopY },
    { x: sideRightRight + topClosureNotchInset, y: topClosureTopY },
    { x: sideRightRight + topClosureNotchInset, y: topClosureTopY - topClosureNotchDepth },
    { x: backRight - topClosureNotchInset, y: topClosureTopY - topClosureNotchDepth },
    { x: backRight - topClosureNotchInset, y: topClosureTopY },
    { x: backRight, y: topClosureTopY },
    { x: backRight, y: bodyTopY },
  ];

  // Top tuck flap (from TOP_CLOSURE) with rounded corners
  const tuckInset = 0.5; // 205.5-205=0.5
  const tuckCornerRadius = 5;
  const tuckHingeY = topClosureTopY - topClosureNotchDepth; // y=209 → oy+height+topClosurePanel-1
  const tuckOuterY = tuckHingeY + tuckFlap; // y=224
  const tuckLeft = sideRightRight + tuckInset;
  const tuckRight = backRight - tuckInset;
  const tuckCornerLeft = tuckLeft + tuckCornerRadius;
  const tuckCornerRight = tuckRight - tuckCornerRadius;
  const tuckCornerY = tuckOuterY - tuckCornerRadius;

  const topLeftArc = sampleArc(tuckCornerLeft, tuckCornerY, tuckCornerRadius, 90, 180);
  const topRightArc = sampleArc(tuckCornerRight, tuckCornerY, tuckCornerRadius, 0, 90);

  const topTuckFlap: Point[] = [
    { x: tuckLeft, y: tuckHingeY },
    ...topLeftArc.reverse(),
    { x: tuckCornerLeft, y: tuckOuterY },
    { x: tuckCornerRight, y: tuckOuterY },
    ...topRightArc.reverse(),
    { x: tuckRight, y: tuckHingeY },
  ];

  // Bottom closure (from FRONT_PANEL, y = -50 to 0 → shifted 0 to oy)
  // Has a lock tab notch: two side tabs with a recessed center
  const bcLeft = frontLeft;
  const bcRight = frontRight;
  const bcTop = bodyBottomY; // oy
  const bcBottom = 0; // oy - closurePanel = 0
  const bcNotchInsetX = 33.25 + ox; // 33.25 in local → +ox
  const bcNotchOutsetX = 101.75 + ox;
  const bcTabCornerX1 = 37.2692 + ox;
  const bcTabCornerX2 = 97.7308 + ox;
  const bcNotchY = oy - 35; // -35 + oy = 15
  const bottomClosure: Point[] = [
    { x: bcLeft, y: bcTop },
    { x: bcLeft, y: bcBottom },
    { x: bcTabCornerX1, y: bcBottom },
    { x: bcNotchInsetX, y: bcNotchY },
    { x: bcNotchOutsetX, y: bcNotchY },
    { x: bcTabCornerX2, y: bcBottom },
    { x: bcRight, y: bcBottom },
    { x: bcRight, y: bcTop },
  ];

  // Bottom tuck flap (from REAR_PANEL) with arcs at bottom corners
  const btLeft = sideRightRight; // 205 + ox
  const btRight = backRight; // 340 + ox
  const btTop = bodyBottomY; // oy
  const btAngleInsetL = 238.75 + ox - btLeft; // distance from left edge
  const btAngleInsetR = btRight - (306.25 + ox); // distance from right edge
  const btNotchY = oy - 35; // -35 + oy = 15
  const btArcRadius = 3;
  const btBottomY = oy - 47; // -47 + oy = 3
  const btFloorY = oy - 50; // 0
  const btArcCenterLeftX = 241.75 + ox;
  const btArcCenterRightX = 303.25 + ox;
  const btLeftArc = sampleArc(btArcCenterLeftX, btBottomY, btArcRadius, 180, 270);
  const btRightArc = sampleArc(btArcCenterRightX, btBottomY, btArcRadius, 270, 360);

  const bottomTuckFlap: Point[] = [
    { x: btLeft, y: btTop },
    { x: btLeft + btAngleInsetL, y: btNotchY },
    { x: btLeft + btAngleInsetL, y: btBottomY },
    ...btLeftArc,
    { x: btArcCenterLeftX, y: btFloorY },
    { x: btArcCenterRightX, y: btFloorY },
    ...btRightArc,
    { x: btRight - btAngleInsetR, y: btBottomY },
    { x: btRight - btAngleInsetR, y: btNotchY },
    { x: btRight, y: btTop },
  ];

  // Dust flaps (top)
  const dustFlapTopSR: Point[] = [
    { x: 135.0 + ox, y: 140 + oy },
    { x: 135.5 + ox, y: 140 + oy },
    { x: 135.5 + ox, y: 148 + oy },
    { x: 138.5 + ox, y: 151 + oy },
    { x: 146.2705 + ox, y: 180 + oy },
    { x: 200.0 + ox, y: 180 + oy },
    { x: 202.0 + ox, y: 143 + oy },
    { x: 205.0 + ox, y: 140 + oy },
  ];

  const dustFlapTopSL: Point[] = [
    { x: 340.0 + ox, y: 140 + oy },
    { x: 343.0 + ox, y: 143 + oy },
    { x: 345.0 + ox, y: 180 + oy },
    { x: 398.7295 + ox, y: 180 + oy },
    { x: 406.5 + ox, y: 151 + oy },
    { x: 409.5 + ox, y: 148 + oy },
    { x: 409.5 + ox, y: 140 + oy },
  ];

  // Dust flaps (bottom)
  const dustFlapBottomSR: Point[] = [
    { x: 135.0 + ox, y: 0 + oy },
    { x: 205.0 + ox, y: 0 + oy },
    { x: 205.0 + ox, y: -48.75 + oy },
    { x: 165.9808 + ox, y: -48.75 + oy },
    { x: 170.0 + ox, y: -33.75 + oy },
  ];

  const dustFlapBottomSL: Point[] = [
    { x: 340.0 + ox, y: 0 + oy },
    { x: 340.0 + ox, y: -48.75 + oy },
    { x: 379.0192 + ox, y: -48.75 + oy },
    { x: 375.0 + ox, y: -33.75 + oy },
    { x: 409.5 + ox, y: 0 + oy },
  ];

  const panels2d: Becf10a0aPanels2d = {
    glueTab, front, sideRight, back, sideLeft,
    topClosure, topTuckFlap, bottomClosure, bottomTuckFlap,
    dustFlapTopSR, dustFlapTopSL, dustFlapBottomSR, dustFlapBottomSL,
  };


  // --- Cut lines ---
  const cuts: Point[][] = [
    // Top edge of FRONT_PANEL
    [{ x: frontRight, y: bodyTopY }, { x: frontLeft, y: bodyTopY }],
    // Glue flap outline
    [{ x: frontLeft, y: bodyBottomY }, { x: glueLeft, y: bodyBottomY + glueSkew }],
    [{ x: glueLeft, y: bodyBottomY + glueSkew }, { x: glueLeft, y: bodyTopY - glueSkew }],
    [{ x: glueLeft, y: bodyTopY - glueSkew }, { x: frontLeft, y: bodyTopY }],
    // Right edge of SIDE_LEFT
    [{ x: sideLeftRight, y: bodyBottomY }, { x: sideLeftRight, y: bodyTopY }],
    // Top closure side cuts
    [{ x: sideRightRight, y: bodyTopY }, { x: sideRightRight, y: topClosureTopY }],
    [{ x: backRight, y: topClosureTopY }, { x: backRight, y: bodyTopY }],
    // Top closure notch outline
    [{ x: sideRightRight, y: topClosureTopY }, { x: sideRightRight + topClosureNotchInset, y: topClosureTopY }],
    [{ x: sideRightRight + topClosureNotchInset, y: topClosureTopY }, { x: sideRightRight + topClosureNotchInset, y: topClosureTopY - topClosureNotchDepth }],
    [{ x: backRight - topClosureNotchInset, y: topClosureTopY - topClosureNotchDepth }, { x: backRight - topClosureNotchInset, y: topClosureTopY }],
    [{ x: backRight - topClosureNotchInset, y: topClosureTopY }, { x: backRight, y: topClosureTopY }],
    // Top tuck flap outline (use the polygon edges as cuts)
    ...(() => {
      const segs: Point[][] = [];
      for (let i = 0; i < topTuckFlap.length - 1; i++) {
        segs.push([topTuckFlap[i], topTuckFlap[i + 1]]);
      }
      return segs;
    })(),
    // Bottom closure outline
    [{ x: bcLeft, y: bcBottom }, { x: bcLeft, y: bcTop }],
    [{ x: bcRight, y: bcTop }, { x: bcRight, y: bcBottom }],
    [{ x: bcLeft, y: bcBottom }, { x: bcTabCornerX1, y: bcBottom }],
    [{ x: bcTabCornerX1, y: bcBottom }, { x: bcNotchInsetX, y: bcNotchY }],
    [{ x: bcNotchInsetX, y: bcNotchY }, { x: bcNotchOutsetX, y: bcNotchY }],
    [{ x: bcNotchOutsetX, y: bcNotchY }, { x: bcTabCornerX2, y: bcBottom }],
    [{ x: bcTabCornerX2, y: bcBottom }, { x: bcRight, y: bcBottom }],
    // Bottom tuck flap outline
    ...(() => {
      const segs: Point[][] = [];
      for (let i = 0; i < bottomTuckFlap.length - 1; i++) {
        segs.push([bottomTuckFlap[i], bottomTuckFlap[i + 1]]);
      }
      return segs;
    })(),
    // Dust flap outlines (top SR)
    ...(() => {
      const segs: Point[][] = [];
      for (let i = 0; i < dustFlapTopSR.length - 1; i++) {
        segs.push([dustFlapTopSR[i], dustFlapTopSR[i + 1]]);
      }
      return segs;
    })(),
    // Dust flap outlines (top SL)
    ...(() => {
      const segs: Point[][] = [];
      for (let i = 0; i < dustFlapTopSL.length - 1; i++) {
        segs.push([dustFlapTopSL[i], dustFlapTopSL[i + 1]]);
      }
      return segs;
    })(),
    // Dust flap outlines (bottom SR)
    ...(() => {
      const segs: Point[][] = [];
      for (let i = 0; i < dustFlapBottomSR.length - 1; i++) {
        segs.push([dustFlapBottomSR[i], dustFlapBottomSR[i + 1]]);
      }
      return segs;
    })(),
    // Dust flap outlines (bottom SL)
    ...(() => {
      const segs: Point[][] = [];
      for (let i = 0; i < dustFlapBottomSL.length - 1; i++) {
        segs.push([dustFlapBottomSL[i], dustFlapBottomSL[i + 1]]);
      }
      return segs;
    })(),
  ];

  // --- Fold lines ---
  const folds: Point[][] = [
    // Vertical folds between body panels
    [{ x: frontLeft, y: bodyBottomY }, { x: frontLeft, y: bodyTopY }],
    [{ x: frontRight, y: bodyBottomY }, { x: frontRight, y: bodyTopY }],
    [{ x: sideRightRight, y: bodyBottomY }, { x: sideRightRight, y: bodyTopY }],
    [{ x: backRight, y: bodyBottomY }, { x: backRight, y: bodyTopY }],
    // Bottom folds from body panels
    [{ x: frontLeft, y: bodyBottomY }, { x: frontRight, y: bodyBottomY }],
    [{ x: frontRight, y: bodyBottomY }, { x: sideRightRight, y: bodyBottomY }],
    [{ x: sideRightRight, y: bodyBottomY }, { x: backRight, y: bodyBottomY }],
    [{ x: backRight, y: bodyBottomY }, { x: sideLeftRight, y: bodyBottomY }],
    // Top folds
    [{ x: frontRight, y: bodyTopY }, { x: sideRightRight, y: bodyTopY }],
    [{ x: backRight, y: bodyTopY }, { x: sideLeftRight, y: bodyTopY }],
    // Top closure fold near base (y=140.5 in original)
    [{ x: sideRightRight, y: bodyTopY + 0.5 }, { x: backRight, y: bodyTopY + 0.5 }],
    // Top tuck flap fold hinge
    [{ x: sideRightRight + topClosureNotchInset, y: tuckHingeY }, { x: backRight - topClosureNotchInset, y: tuckHingeY }],
    // Bottom closure fold
    [{ x: frontLeft, y: bodyBottomY }, { x: frontRight, y: bodyBottomY }],
    // Bottom tuck flap fold
    [{ x: sideRightRight, y: bodyBottomY }, { x: backRight, y: bodyBottomY }],
  ];

  return {
    resolved,
    bounds,
    guides: {
      ox, oy, glueLeft, frontLeft, frontRight,
      sideRightRight, backRight, sideLeftRight,
      bodyTopY, bodyBottomY, topClosureTopY, topTuckTopY,
      bottomClosureBottomY, bottomDustBottomY,
    },
    panels2d,
    cuts,
    folds,
  };
};