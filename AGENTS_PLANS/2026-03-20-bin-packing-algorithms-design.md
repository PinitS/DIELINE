# 2D Bin Packing Algorithms — Design Doc

## Goal

Implement all popular 2D bin packing algorithms as standard implementations, keep existing custom ones untouched, and provide UI for individual execution + side-by-side comparison.

## Algorithms (8 total)

### Existing (no changes)
1. **Shelf (Custom)** — `shelfPack.ts` — best-fit shelf with 4 rotations
2. **Nest (Custom)** — `nestPack.ts` — NFP-based with convex hull + Minkowski sum

### New Standard Implementations
3. **Shelf FFDH** — `shelfStandardPack.ts` — First Fit Decreasing Height, sort by height desc, try all existing shelves before opening new one. Bounding box.
4. **NFP Standard** — `nfpStandardPack.ts` — Standard bottom-left NFP with convex hull. No custom sorting strategies — pure algorithm.
5. **Guillotine** — `guillotinePack.ts` — Split free rectangles with full guillotine cuts. Best Area Fit heuristic. Bounding box.
6. **MaxRects (BSSF)** — `maxRectsPack.ts` — Maintain list of free rectangles, Best Short Side Fit selection. Bounding box.
7. **Skyline (BL)** — `skylinePack.ts` — Track top skyline contour, place items in lowest gap. Bottom-Left variant. Bounding box.
8. **Bottom-Left (BL)** — `bottomLeftPack.ts` — Classic bottom-left placement: find lowest then leftmost valid position. Bounding box.

## Shared Interface

All packers conform to the same signature:

```typescript
type PackFn = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
) => Placement[];
```

## Strategy Registry

```typescript
export type AutoLayoutStrategy =
  | 'shelf' | 'nest'
  | 'shelf-standard' | 'nfp-standard'
  | 'guillotine' | 'maxrects' | 'skyline' | 'bottom-left';

const STRATEGY_LABELS: Record<AutoLayoutStrategy, string> = {
  'shelf': 'Shelf (Custom)',
  'nest': 'Nest (Custom)',
  'shelf-standard': 'Shelf (FFDH)',
  'nfp-standard': 'NFP (Standard)',
  'guillotine': 'Guillotine',
  'maxrects': 'MaxRects (BSSF)',
  'skyline': 'Skyline (BL)',
  'bottom-left': 'Bottom-Left',
};
```

`calculateAutoLayout.ts` uses a lookup map to select the pack function by strategy key.

## UI Design

### Controls Section
```
┌─────────────────────────────────────┐
│ [Dropdown: เลือก algorithm ▼]       │
│ [Calculate]  [Compare All]          │
├─────────────────────────────────────┤
│ Individual buttons (grid 2x4):      │
│ [Shelf Custom] [Nest Custom]        │
│ [Shelf FFDH]   [NFP Standard]       │
│ [Guillotine]   [MaxRects]           │
│ [Skyline]      [Bottom-Left]        │
└─────────────────────────────────────┘
```

### Single Algorithm Result
Shows per paper:
- Paper Lost %
- Total sheets needed
- Per-model breakdown (perSheet, totalProduced, excess)
- **Computation time (ms)**
- Layout image

### Compare All Result
Runs all 8 algorithms, shows per paper:
- Ranked list sorted by Paper Lost % (ascending)
- Each entry: rank, algorithm name, Paper Lost %, sheets, computation time
- Layout image for each
- Best algorithm highlighted

## Metrics Displayed
1. **Paper Lost %** — `(1 - usedArea / totalArea) * 100`
2. **Total sheets** — minimum sheets to produce all quantities
3. **Pieces per sheet** — per-model breakdown
4. **Computation time (ms)** — `performance.now()` delta

## File Structure

```
src/utils/autoLayout/
├── types.ts                  (update AutoLayoutStrategy type)
├── calculateAutoLayout.ts    (add strategy registry + timing)
├── shelfPack.ts              (existing, untouched)
├── nestPack.ts               (existing, untouched)
├── nfp.ts                    (existing, untouched)
├── shelfStandardPack.ts      (new)
├── nfpStandardPack.ts        (new)
├── guillotinePack.ts         (new)
├── maxRectsPack.ts           (new)
├── skylinePack.ts            (new)
├── bottomLeftPack.ts         (new)
└── ...

src/demo/
└── AutoLayoutApp.tsx          (update UI)
```

## Algorithm Details

### Shelf FFDH
1. Sort items by height descending
2. For each item, try 4 rotations (0/90/180/270)
3. First Fit: scan all existing shelves, place in first shelf that fits
4. If no shelf fits, open new shelf with item's height
5. Gap = layoutDistance between items and shelves

### Guillotine
1. Start with one free rectangle = entire usable area
2. Sort items by area descending
3. For each item (try 4 rotations), find free rect with Best Area Fit
4. Place item, split remaining space with guillotine cut (shorter leftover axis)
5. Gap handled by inflating item dimensions by layoutDistance

### MaxRects (BSSF)
1. Start with one free rectangle = entire usable area
2. Sort items by area descending
3. For each item (try 4 rotations), find free rect with Best Short Side Fit
4. Place item, generate new free rects by splitting all overlapping free rects
5. Remove redundant (fully contained) free rects
6. Gap handled by inflating item dimensions by layoutDistance

### Skyline (BL)
1. Initialize skyline as single segment at y=0, full width
2. Sort items by height descending
3. For each item (try 4 rotations), find skyline position with minimum y (then leftmost)
4. Place item, update skyline segments
5. Gap = layoutDistance between items

### Bottom-Left
1. Sort items by height descending, then width descending
2. For each item (try 4 rotations), scan from bottom to top, left to right
3. Place at first valid position (no overlap with placed items, within bounds)
4. Gap = layoutDistance between items
5. Uses placed items list for collision detection

### NFP Standard
1. Sort items by area descending
2. Use convex hull of shape polylines
3. For each item (try 4 rotations):
   - Compute IFP with container
   - Compute NFP with all placed items
   - Find valid candidates (inside IFP, outside all NFPs)
   - Choose bottom-left position
4. Pure standard algorithm, no multi-strategy attempts
