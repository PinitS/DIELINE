# Guillotine Nesting Algorithm Design

## Algorithm Name: `guillotine-nest`

## Concept
Combines guillotine cutting (full-width vertical cuts dividing paper into columns) with NFP-based nesting (placing items as close as possible following actual contour shapes).

## Algorithm Steps

### Step 1 — Column Assignment (Guillotine Cut)
- Each model type gets its own column
- Column width = `modelWidth + layoutDistance` (fit to model)
- Columns arranged left-to-right with guillotine-style vertical dividers

### Step 2 — Rotation Optimization
- Try both 0° and 90° per column
- Pick the rotation that fits more items

### Step 3 — NFP Nesting Within Column
- Use existing NFP (No-Fit Polygon) utilities
- Place items bottom-up within each column
- Each item placed at the closest valid position to previous items
- Uses `boundaryPolylines` (offset by layoutDistance) for collision

### Step 4 — Fill Remaining Space
- If space remains after all columns, attempt to fit additional items

## Single vs Multi Model
- **1 model**: Entire usable area is 1 column → NFP nest fills the space
- **N models**: N columns, each nests independently

## Integration Points
- New file: `src/utils/autoLayout/guillotineNest.ts`
- Add to `PACK_FUNCTIONS` in `calculateAutoLayout.ts`
- Add `'guillotine-nest'` to `AutoLayoutStrategy` type
- Add option in `AutoLayoutApp.tsx` dropdown
