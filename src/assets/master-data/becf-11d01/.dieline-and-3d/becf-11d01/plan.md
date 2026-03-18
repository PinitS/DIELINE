# Dieline / 3D Implementation Plan

## Job Summary

- Job name: becf-11d01
- Source DXF: src/assets/master-data/becf-11d01/becf-11d01.dxf
- Objective: Build matching 2D dieline and folded 3D component output under `src/components/3D/TuckEndBoxes/Becf_11d01`
- Scope: 2D + folded 3D

## Source Interpretation

- Units: Millimeters (confirmed by dimension annotations `378.00mm`, `512.50mm`, `175.00mm`, `74.00mm`, `230.00mm`)
- Main layers: `cut`, `crease`, `dimensions`
- Entity types found: Straight `LINE` entities for cut/fold geometry and `TEXT` entities for dimension labels; no arcs/splines detected
- Assumptions:
  - `dimensions` layer is informational only
  - major-flap hinge lines with `y=-0.5`, `y=-1`, `y=230.5`, `y=231` should map to normalized hinges at body edges in 3D while preserving the exact cutback in 2D
  - the right-most side panel is 73.5 mm in source geometry, while nominal depth elsewhere is 74 mm

## Interpreted Structure

- Main panels:
  - body strip: `front 175 x 230`, `side-right 74 x 230`, `back 175 x 230`, `side-left 73.5 x 230`
  - glue tab: angled left tab from `x=-15` to `x=0`
  - top flaps: front/back major flaps `171 x 74`, side flaps `74 x 74` and `73.5 x 74`
  - bottom flaps mirror the top
- Fold lines:
  - vertical body folds at `x=0`, `175`, `249`, `424`
  - top flap hinges across `y≈230`
  - bottom flap hinges across `y≈0`
- Cut lines:
  - single outer perimeter built entirely from straight segments
  - no interior windows, slots, or holes
- Glue areas:
  - one tapered glue flap on the far left side
- Curves / arcs / splines needing special handling:
  - none in the DXF; all geometry is linear

## AI-Readable Geometry Output

- geometry.json sections populated: source entity summary, normalized extents/cuts/folds/panels, topology, assumptions, validation
- Stable IDs strategy: `panel_*`, `flap_*`, `fold_*`, `cut_*` derived from structural role rather than DXF order
- Unknown or ambiguous items:
  - whether to preserve the source-side asymmetry (`73.5` mm right panel) in folded 3D or normalize to nominal `74`

## Implementation Mapping

- Shared geometry utilities to create/update:
  - likely add a bespoke helper for this square-flap standard-box geometry instead of forcing `src/utils/tuckEndBoxGeometry.ts`, which currently assumes rounded tuck flaps and symmetric dust flaps
  - reuse `BaseDielineCanvas`, `SceneLine`, and the folded-panel mesh pattern from `Becf_10803`
- 2D dieline file(s) to create/update: `src/components/3D/TuckEndBoxes/Becf_11d01/Becf_11d01_dieline.tsx`
- 3D folded file(s) to create/update: `src/components/3D/TuckEndBoxes/Becf_11d01/Becf_11d01_folded3d.tsx`
- Measurement / bounds logic to create/update:
  - either add a dedicated bounds helper for this exact geometry or compute bounds locally from the normalized extents
  - if library export is desired, also update `src/index.ts`; if registry selection is desired, revisit `src/lib/modelMetadata.ts` because it currently supports only one `tuckEndBox` model entry

## Validation Checklist

- [x] Units confirmed
- [x] Cut vs fold semantics tagged
- [x] Curves preserved or sampled with source retained
- [x] Panel adjacency mapped
- [x] Recovery artifacts updated

## Risks / Open Questions

- The folded 3D model may need a deliberate decision between exact source asymmetry (`73.5` mm side-left panel) and a nominalized `74` mm rectangular volume.
- Existing tuck-end utilities are not a perfect shape match for this ECMA A10.10.03.03 square-flap standard box.

## Confirmation

Plan is ready. Do you want me to implement it now?