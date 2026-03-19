# Auto Layout Feature Design

## Purpose
Tool for automatically placing dieline models on paper sheets to minimize waste. Supports multiple models, multiple paper sizes, and generates comparison variations.

## Algorithm: Best-Fit Decreasing + Shelf
1. Convert all dielines to SVG (no dimensions) to get shape polylines + bounding box
2. Create offset polylines per `layoutDistance` for collision boundary (green lines)
3. Sort items largest-to-smallest by area
4. Place items using shelf algorithm: row by row, trying normal + 90° rotation
5. Generate 1-3 variations per paper size (different sort orders)
6. All sheets identical per variation; compute totalSheets = ceil(needed / perSheet)
7. Compute surplus = (totalSheets * perSheet) - required

## Input
- `papers`: Array of `{id, name, width, height}` (mm)
- `models`: Array of `{id, modelId, attributes, quantity}`
- `layoutDistance` (mm), `spacingLeft` (mm), `spacingRight` (mm), `griper` (mm)

## Output per paper
- `paperId`, `paperName`, `paperWidth`, `paperHeight`, `totalSheets`
- `surplus`: per model excess count
- `variations[]` (1-3): placements, summary (paperLost%, calculator), image Blob

## SVG Rendering
- Paper border: black
- Griper zone: green (bottom)
- Dieline shapes: red cut lines (actual shape)
- Distance boundary: green offset polyline per shape
- No dimension labels

## Demo Page `/auto-layout`
- Settings panel: add models (dropdown + attributes + quantity), add papers (name + size), layout config
- Results panel: all paper sizes, 1-3 variations each, comparison UI
