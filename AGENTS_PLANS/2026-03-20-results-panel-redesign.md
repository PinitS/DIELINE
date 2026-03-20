# Results Panel Redesign

## Date: 2026-03-20

## Goal
Redesign the AutoLayoutApp results panel for better usability:
- Zoomable/pannable layout images via CSS transforms
- Results grouped by Paper (main) > Algorithm (sub)
- Compact summary table in Compare All mode
- Download PNG button per result

## Structure

### Single Algorithm Mode
```
Paper: A3 (420x297 mm)
├── Summary stats
├── [zoomable image] [download]
└── Per-model breakdown

Paper: A4 ...
```

### Compare All Mode
```
Paper: A3 (420x297 mm)
├── Summary table (all algorithms ranked)
├── Algorithm: Shelf
│   ├── [zoomable image] [download]
│   └── stats
├── Algorithm: Guillotine
│   ├── [zoomable image] [download]
│   └── stats
└── ...
```

## Zoomable Image
- CSS `transform: scale() translate()` on wrapper div
- Scroll wheel zoom (0.5x–5x)
- Click+drag pan when zoomed
- Double-click to reset
- Zoom indicator in corner
- `cursor: grab/grabbing`

## Summary Table (Compare All)
Compact table ranked by paper lost %:
| Algorithm | Sheets | Paper Lost | Time | Excess |
Best values highlighted green.

## Download
- PNG download via `<a download>` from existing blob URL
- Filename: `{paperName}-{algorithm}.png`

## No new dependencies
