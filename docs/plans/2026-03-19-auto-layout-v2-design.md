# Auto Layout v2 Design

## Goals
1. **Accurate packing**: Dual strategy (bounding-box float math vs polygon-aware raster), pick best
2. **Quantity-aware scoring**: Factor in quantity to minimize surplus, not just maximize per-sheet
3. **Multi-model**: All models must fit on single sheet, error if not possible
4. **Export**: JSON + PNG download, PNG as Blob ready for API upload

## Algorithm

### Dual Strategy

**Strategy A — Bounding-box float math**
- stepX = boundaryWidthMm (float, e.g. 96.003mm — NOT ceil'd to cells)
- Grid: stepY = boundaryHeightMm
- Hex: stepY = boundaryHeightMm × √3/2, xOffset = boundaryWidthMm / 2
- Both orientations (normal + rotated)
- Pure math positioning, no raster mask needed

**Strategy B — Polygon-aware raster**
- Bitmap mask with scanline collision
- For concave shapes that can interlock (cross, complex)
- Greedy top-left scan

All strategies run, results collected and compared.

### Quantity-aware Scoring

For each layout with max M items/sheet and quantity Q:
1. Try N = 1..M, compute surplus(N) = ceil(Q/N) × N - Q
2. Find optimal N (least surplus)
3. Rank: surplus (lowest) → sheets (fewest) → wastePerPiece (lowest)
4. surplus >= 0 always
5. If tied → show as multiple variations

### Multi-model
- Use raster scan for mixed models
- Every model must have countPerSheet >= 1
- If any model can't fit → show error, no layout

## Export Format

Button per variation → downloads 2 files:

**result.json:**
```json
{
  "config": { "layoutDistance", "spacingLeft", "spacingRight", "griper" },
  "paper": { "name", "width", "height", "aspectRatio" },
  "models": [{ "id", "modelId", "attributes", "quantity" }],
  "result": {
    "totalSheets": 10,
    "paperLost": 18.5,
    "layout": { "width": 420, "height": 297, "imageFile": "layout.png" },
    "perModel": [{
      "modelEntryId", "modelId",
      "countPerSheet", "quantityNeeded", "totalProduced", "surplus"
    }]
  }
}
```

**layout.png:** PNG Blob from canvas render (same as displayed on screen)

The Blob is also available programmatically for API upload via FormData.
