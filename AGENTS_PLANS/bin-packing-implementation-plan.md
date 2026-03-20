# 2D Bin Packing Algorithms — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 standard bin packing algorithms alongside existing 2 custom ones, with individual buttons + Compare All UI for benchmarking.

**Architecture:** Each algorithm is a standalone `*Pack.ts` file exporting a single function with shared `PackFn` signature. A strategy registry in `calculateAutoLayout.ts` maps strategy keys to pack functions. The UI uses a dropdown + individual buttons + Compare All mode. `calculateAutoLayout` returns timing info via `performance.now()`.

**Tech Stack:** TypeScript, React, existing `PreparedModel`/`Placement` types, `performance.now()` for timing.

---

### Task 1: Update types — add new strategies

**Files:**
- Modify: `src/utils/autoLayout/types.ts`

**Step 1: Add new strategy types and timing to types**

In `types.ts`, expand `AutoLayoutStrategy` and add `computeTimeMs` to result:

```typescript
export type AutoLayoutStrategy =
  | 'shelf' | 'nest'
  | 'shelf-standard' | 'nfp-standard'
  | 'guillotine' | 'maxrects' | 'skyline' | 'bottom-left';

export const STRATEGY_LABELS: Record<AutoLayoutStrategy, string> = {
  'shelf': 'Shelf (Custom)',
  'nest': 'Nest (Custom)',
  'shelf-standard': 'Shelf (FFDH)',
  'nfp-standard': 'NFP (Standard)',
  'guillotine': 'Guillotine',
  'maxrects': 'MaxRects (BSSF)',
  'skyline': 'Skyline (BL)',
  'bottom-left': 'Bottom-Left',
};

export const ALL_STRATEGIES: AutoLayoutStrategy[] = [
  'shelf', 'nest', 'shelf-standard', 'nfp-standard',
  'guillotine', 'maxrects', 'skyline', 'bottom-left',
];
```

Add `computeTimeMs` to `AutoLayoutPaperResult.summary`:

```typescript
export type AutoLayoutPaperResult = {
  paperId: string;
  paperWidth: number;
  paperHeight: number;
  paperName: string;
  strategy: AutoLayoutStrategy;
  summary: {
    paperLost: number;
    totalSheets: number;
    calculator: AutoLayoutCalculatorEntry[];
    computeTimeMs: number;  // NEW
  };
  image: Blob;
};
```

**Step 2: Commit**

```
feat: add new bin packing strategy types and timing metric
```

---

### Task 2: Implement Shelf FFDH (standard)

**Files:**
- Create: `src/utils/autoLayout/shelfStandardPack.ts`

**Step 1: Implement FFDH algorithm**

Standard First Fit Decreasing Height shelf packing:
- Sort items by height descending
- For each item, try 4 rotations
- First Fit: scan all existing shelves, place in first that fits width-wise and height ≤ shelf height
- If no shelf fits, open new shelf
- layoutDistance used as gap between items and between shelves
- Reuse `transformPolylines` and `rotatedDims` helpers (copy from shelfPack.ts pattern)

**Step 2: Commit**

```
feat: add standard Shelf FFDH packing algorithm
```

---

### Task 3: Implement Guillotine packing

**Files:**
- Create: `src/utils/autoLayout/guillotinePack.ts`

**Step 1: Implement Guillotine algorithm**

Standard guillotine packing with Best Area Fit:
- Maintain list of free rectangles, start with `[{x:0, y:0, w:usableWidth, h:usableHeight}]`
- Sort items by area descending
- For each item (try 4 rotations), inflate dimensions by `layoutDistance`
- Find free rect where item fits with smallest area waste (Best Area Fit)
- Place item at free rect's (x, y)
- Split remaining space: guillotine cut along shorter leftover axis
  - If `(freeW - itemW) < (freeH - itemH)`: horizontal split first
  - Else: vertical split first
- Remove used free rect, add 2 new free rects from split

**Step 2: Commit**

```
feat: add standard Guillotine packing algorithm
```

---

### Task 4: Implement MaxRects (BSSF)

**Files:**
- Create: `src/utils/autoLayout/maxRectsPack.ts`

**Step 1: Implement MaxRects algorithm**

Standard MaxRects with Best Short Side Fit:
- Maintain list of free rectangles, start with full area
- Sort items by area descending
- For each item (try 4 rotations), inflate by `layoutDistance`
- Find free rect with Best Short Side Fit: minimize `min(freeW - itemW, freeH - itemH)`
- Place item, then for ALL free rects that overlap with placed item, split into up to 4 new rects (top/bottom/left/right of placed item)
- Prune: remove any free rect fully contained by another
- This is the key difference from Guillotine — splits are not guillotine cuts and free rects can overlap

**Step 2: Commit**

```
feat: add standard MaxRects BSSF packing algorithm
```

---

### Task 5: Implement Skyline (BL)

**Files:**
- Create: `src/utils/autoLayout/skylinePack.ts`

**Step 1: Implement Skyline algorithm**

Standard Skyline Bottom-Left packing:
- Skyline = list of `{x, y, width}` segments, start with `[{x:0, y:0, width:usableWidth}]`
- Sort items by height descending
- For each item (try 4 rotations), inflate by `layoutDistance`
- Find placement: scan skyline segments, for each possible x position:
  - Compute max y across all segments the item would span
  - Valid if `maxY + itemH ≤ usableHeight` and `x + itemW ≤ usableWidth`
  - Score = maxY (then x for tiebreak) — choose minimum
- Place item, update skyline: replace spanned segments with new segment at `y + itemH`
- Merge adjacent segments with same y

**Step 2: Commit**

```
feat: add standard Skyline BL packing algorithm
```

---

### Task 6: Implement Bottom-Left

**Files:**
- Create: `src/utils/autoLayout/bottomLeftPack.ts`

**Step 1: Implement Bottom-Left algorithm**

Classic bottom-left placement:
- Sort items by height desc, then width desc
- For each item (try 4 rotations), inflate by `layoutDistance`
- Scan grid of candidate positions: y from 0 to usableHeight, x from 0 to usableWidth
  - Candidate positions = y-coordinates of top edges of placed items + 0, x-coordinates of right edges of placed items + 0
  - Sort candidates by (y asc, x asc)
  - First valid position = no overlap with any placed item and within bounds
- Place at first valid position
- Use AABB collision detection against all placed items

**Step 2: Commit**

```
feat: add standard Bottom-Left packing algorithm
```

---

### Task 7: Implement NFP Standard

**Files:**
- Create: `src/utils/autoLayout/nfpStandardPack.ts`

**Step 1: Implement standard NFP algorithm**

Standard NFP nesting (reuse `nfp.ts` utilities):
- Sort items by area descending
- For each item (try 4 rotations):
  - Extract convex hull via `getShapePolygon` (same approach as nestPack.ts)
  - Compute IFP with container
  - Compute NFP with all placed polygons
  - Collect candidates from NFP/IFP vertices + edge intersections
  - Filter: inside IFP, outside all NFP interiors
  - Choose bottom-left (min y, then min x)
- Key difference from Nest (Custom): no multi-strategy sorting attempts, pure single-pass

**Step 2: Commit**

```
feat: add standard NFP nesting algorithm
```

---

### Task 8: Update calculateAutoLayout — strategy registry + timing

**Files:**
- Modify: `src/utils/autoLayout/calculateAutoLayout.ts`

**Step 1: Add strategy registry**

Import all pack functions and create lookup:

```typescript
import { shelfStandardPack } from './shelfStandardPack';
import { guillotinePack } from './guillotinePack';
import { maxRectsPack } from './maxRectsPack';
import { skylinePack } from './skylinePack';
import { bottomLeftPack } from './bottomLeftPack';
import { nfpStandardPack } from './nfpStandardPack';

type PackFn = (
  items: PreparedModel[],
  usableWidth: number,
  usableHeight: number,
  layoutDistance: number,
) => Placement[];

const PACK_FUNCTIONS: Record<AutoLayoutStrategy, PackFn> = {
  'shelf': shelfPack,
  'nest': nestPack,
  'shelf-standard': shelfStandardPack,
  'nfp-standard': nfpStandardPack,
  'guillotine': guillotinePack,
  'maxrects': maxRectsPack,
  'skyline': skylinePack,
  'bottom-left': bottomLeftPack,
};
```

**Step 2: Replace if/else with registry lookup**

Replace `bestPack` helper:
- For custom strategies (`shelf`, `nest`): keep `bestStrategyPack`/`bestStrategyPackNest` (multi-sort)
- For new strategies: single-pass with `PACK_FUNCTIONS[strategy](items, ...)`

**Step 3: Add timing**

Wrap the pack call with `performance.now()`:

```typescript
const t0 = performance.now();
// ... all packing logic ...
const computeTimeMs = Math.round(performance.now() - t0);
```

Add `computeTimeMs` and `strategy` to result summary.

**Step 4: Commit**

```
feat: add strategy registry and computation timing to auto layout
```

---

### Task 9: Update AutoLayoutApp UI — dropdown + individual buttons + Compare All

**Files:**
- Modify: `src/demo/AutoLayoutApp.tsx`

**Step 1: Add dropdown + Calculate button**

```tsx
const [selectedStrategy, setSelectedStrategy] = useState<AutoLayoutStrategy>('shelf');

<label className="field">
  Algorithm
  <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value as AutoLayoutStrategy)}>
    {ALL_STRATEGIES.map(s => (
      <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
    ))}
  </select>
</label>
<button onClick={() => handleCalculate(selectedStrategy)}>Calculate</button>
```

**Step 2: Add individual buttons grid (2x4)**

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
  {ALL_STRATEGIES.map(s => (
    <button key={s} onClick={() => handleCalculate(s)} disabled={isCalculating || ...}>
      {STRATEGY_LABELS[s]}
    </button>
  ))}
</div>
```

**Step 3: Add Compare All button + handler**

`handleCompareAll`:
- Loop through `ALL_STRATEGIES`
- Call `calculateAutoLayout` for each strategy
- Collect all results into `compareResults` state
- Sort by `paperLost` ascending per paper

**Step 4: Display computation time in results**

Add to both single and compare views:

```tsx
<span>Time: {result.summary.computeTimeMs}ms</span>
```

**Step 5: Compare All results view**

Show ranked list per paper with:
- Rank number (1st highlighted as best)
- Algorithm name
- Paper Lost %
- Sheets count
- Computation time
- Layout image

**Step 6: Commit**

```
feat: add algorithm comparison UI with dropdown, buttons, and Compare All
```

---

### Task 10: Verify & test all algorithms

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Manual test each algorithm**

- Add a model (e.g., Circle, qty 100) + paper (A3)
- Click each individual button, verify layout renders correctly
- Check computation time is displayed

**Step 3: Test Compare All**

- Click Compare All
- Verify all 8 algorithms produce results
- Verify ranking is correct (sorted by Paper Lost %)
- Verify timing is shown

**Step 4: Edge cases**

- Single item, should fit on all algorithms
- Item too large for paper — should show 0 sheets
- Multiple models with different sizes

**Step 5: Final commit**

```
feat: complete 2D bin packing algorithm comparison suite
```
