# Dieline Inspect & Extract - Plan

## Job Summary

- Job name: becf-10a0a
- Source DXF: src/assets/master-data/becf-10a0a/becf-10a0a.dxf
- Objective: Extract panel geometry from a BECF (Bottom End Closure Flap) tuck-end box dieline

## Source Interpretation

- Units: mm
- Main layers: `crease` (fold lines, color 3/green), `cut` (cut lines, color 1/red), `dimensions` (annotations, color 255)
- Entity types found: LINE (majority), ARC (4 instances — 2 on BOTTOM_TUCK_FLAP corners, 2 on TOP_TUCK_FLAP corners), TEXT (5 dimension labels)
- Assumptions: Layer `crease` = fold/score; Layer `cut` = die-cut boundary; Layer `dimensions` = annotation only (not geometry)

## Interpreted Structure

### Panels Identified

| Panel Name | Width | Height | Connected To | Edge Type |
|---|---|---|---|---|
| FRONT_PANEL | 135.0mm | 140.0mm | GLUE_FLAP, SIDE_RIGHT, BOTTOM_CLOSURE | fold left/right/bottom, cut top |
| REAR_PANEL | 135.0mm | 140.0mm | SIDE_RIGHT, SIDE_LEFT, TOP_CLOSURE, BOTTOM_TUCK_FLAP | fold all sides |
| SIDE_LEFT | 69.5mm | 140.0mm | REAR_PANEL, DUST_FLAP_TOP_SL, DUST_FLAP_BOTTOM_SL | fold left/top/bottom, cut right |
| SIDE_RIGHT | 70.0mm | 140.0mm | FRONT_PANEL, REAR_PANEL, DUST_FLAP_TOP_SR, DUST_FLAP_BOTTOM_SR | fold all sides |
| GLUE_FLAP | 15.0mm | ~132mm | FRONT_PANEL | trapezoidal cut, fold hinge at x=0 |
| DUST_FLAP (top SR) | ~64mm | 40mm | SIDE_RIGHT | cut, tapered shape |
| DUST_FLAP (top SL) | ~65mm | 40mm | SIDE_LEFT | cut, tapered shape |
| TOP_CLOSURE | 135.0mm | 70.0mm | REAR_PANEL, TOP_TUCK_FLAP | cut sides, fold at y≈140.5 |
| TOP_TUCK_FLAP | ~129mm | ~15mm | TOP_CLOSURE | fold at y=209, rounded corners (r=5mm) |
| BOTTOM_CLOSURE | 135.0mm | 50.0mm | FRONT_PANEL | cut, notched center |
| BOTTOM_TUCK_FLAP | ~101mm | ~50mm | REAR_PANEL | trapezoidal, rounded corners (r=3mm) |
| DUST_FLAP (bottom SR) | ~70mm | 48.75mm | SIDE_RIGHT | angled cut |
| DUST_FLAP (bottom SL) | ~69.5mm | 48.75mm | SIDE_LEFT | angled cut |

### Fold Lines

- x=0: GLUE_FLAP ↔ FRONT_PANEL (vertical)
- x=135: FRONT_PANEL ↔ SIDE_RIGHT (vertical)
- x=205: SIDE_RIGHT ↔ REAR_PANEL (vertical)
- x=340: REAR_PANEL ↔ SIDE_LEFT (vertical)
- y=0: All main panels ↔ their bottom flaps (horizontal, segmented)
- y=140 / y=140.5: Main panels ↔ their top flaps (horizontal)
- y=209: TOP_CLOSURE ↔ TOP_TUCK_FLAP (horizontal)

### Cut Lines

- Right edge: x=409.5, y=0→140 (SIDE_LEFT outer edge)
- Top edge of FRONT_PANEL: y=140, x=135→0
- All flap outlines (dust flaps, closure flaps, tuck flaps)
- GLUE_FLAP trapezoidal outline

### Glue Areas

- GLUE_FLAP (x=-15 to x=0): trapezoidal tab for gluing FRONT_PANEL to SIDE_LEFT when box is assembled

### Curves / Arcs / Splines

- ARC: center (241.75, -47), r=3mm, 180°→270° — BOTTOM_TUCK_FLAP left corner
- ARC: center (303.25, -47), r=3mm, 270°→360° — BOTTOM_TUCK_FLAP right corner
- ARC: center (334.5, 219), r=5mm, 0°→90° — TOP_TUCK_FLAP right corner
- ARC: center (210.5, 219), r=5mm, 90°→180° — TOP_TUCK_FLAP left corner

## Shared Dimension Validation

- SIDE_LEFT width (69.5mm) ≠ SIDE_RIGHT width (70.0mm): **0.5mm mismatch** — likely intentional for glue overlap
- FRONT_PANEL width (135.0mm) = REAR_PANEL width (135.0mm): ✅ Match

## Drawing Plan

- What will be drawn: Complete box dieline with 13 panel regions (4 main + 1 glue + 4 dust + 2 closure + 2 tuck)
- Panel arrangement: Horizontal strip layout — GLUE_FLAP | FRONT | SIDE_RIGHT | REAR | SIDE_LEFT
- Coordinate system: Origin at bottom-left of FRONT_PANEL (0,0). X increases right, Y increases up.
- Total bounding box: x ∈ [-15, 409.5] (424.5mm), y ∈ [-50, 224] (274mm)

## Validation Checklist

- [x] Units confirmed (mm — from DXF dimension text)
- [x] Cut vs fold semantics tagged (layer `cut` vs `crease`)
- [x] Curves preserved or sampled with source retained (4 ARCs preserved with center/radius/angles)
- [x] Panel adjacency mapped (12 adjacency pairs documented)
- [x] Shared dimensions validated (FRONT=REAR ✅, SIDE mismatch noted ⚠️)
- [x] Recovery artifacts updated (progress.md written)

## Risks / Open Questions

- SIDE_LEFT/SIDE_RIGHT 0.5mm width difference — confirm with user if intentional
- No explicit `score` or `glue` layer in DXF — all folds on `crease` layer, all cuts on `cut` layer
- BOTTOM_CLOSURE has a center notch (lock tab?) — purpose assumed but not confirmed

