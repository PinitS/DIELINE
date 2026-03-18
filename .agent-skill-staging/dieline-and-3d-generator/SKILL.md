---
name: dieline-and-3d-generator
description: Use when work starts from a .dxf dieline file and needs high-confidence geometry extraction, resumable checkpoints, and user confirmation before 2D/3D implementation.
---

# Dieline and 3D Generator

## Overview

Turn raw `.dxf` dielines into a deterministic geometry package before drawing anything. The goal is maximum accuracy, resumability after interruption, and a clear stop point where the user approves the plan before implementation begins.

Use the repo example `src/components/3D/TuckEndBoxes/Becf_10803` as the reference split between:
- 2D dieline drawing
- folded 3D view
- shared geometry/measurement logic

## When to Use

Use this skill when:
- The source of truth is a `.dxf` file
- The shape must be redrawn as code with minimal guessing
- The agent must preserve progress so work can resume after a crash or power loss
- The user wants a planning checkpoint before implementation
- The output should be readable by both humans and AI systems

Do not use this skill for simple edits to an already structured geometry file.

## Required First Response

Start by asking for the `.dxf` path.

If the user has not already provided one, ask:
- exact file path
- intended output location if special handling is needed
- whether the target is only 2D or both 2D and folded 3D

## Required Working Folder

Create a resumable job folder next to the source DXF:

`<dxf-dir>/.dieline-and-3d/<dxf-basename>/`

Create these files immediately:
- `progress.md` from `progress-template.md`
- `geometry.json` using `geometry-schema.json`
- `plan.md` from `plan-template.md`
- `token-summary.md`

Never wait until the end to create progress artifacts.

## Core Workflow

1. **Intake**
   - Confirm the `.dxf` path exists.
   - Record job name, source file, current stage, and next action in `progress.md`.

2. **Read and normalize the DXF**
   - Capture units, layers, blocks, inserts, lines, polylines, arcs, splines, circles, text, and dimensions.
   - Preserve source entities first; normalize second.
   - Do not collapse ambiguous entities into guessed panels.

3. **Build an AI-readable geometry package**
   - Write deterministic IDs for panels, folds, cuts, and guides.
   - Preserve both:
     - native DXF semantics
     - normalized vector geometry
   - Include topology: connected loops, adjacency, hinge lines, panel ownership, and fold direction if known.
   - If curves must be flattened, keep the original primitive plus the sampled representation.

4. **Write the implementation plan before coding**
   - Describe what will be drawn in 2D and how it maps to 3D fold groups.
   - Identify shared geometry utilities to create first.
   - Mirror the `Becf_10803` pattern when relevant:
     - `*_dieline.tsx`
     - `*_folded3d.tsx`
     - shared geometry helpers in `src/utils`

5. **Stop and ask for confirmation**
   - After `plan.md` is ready, summarize the plan briefly.
   - Ask clearly: **“Plan is ready. Do you want me to implement it now?”**
   - Do not start implementation until the user confirms.

6. **Implement with checkpoints**
   - Update `progress.md` after every major milestone.
   - Record exactly what finished, what remains, and the next resumable step.

7. **Close the run**
   - Update `token-summary.md`.
   - Report the total token usage for this skill run.
   - If exact runtime token counts are unavailable, state that clearly and provide the best available estimate instead of pretending certainty.

## Accuracy Rules

- Never claim 100% certainty if the DXF is ambiguous.
- Prefer explicit uncertainty notes over invented geometry.
- Keep units explicit everywhere.
- Maintain stable IDs so later files can reference the same panel or fold.
- Separate these concepts: `cut`, `fold`, `score`, `glue`, `annotation`, `dimension`, `unknown`.

## Minimum Contents of plan.md

- Job summary
- Source file and unit assumptions
- Interpreted structure of the dieline
- Proposed panel/fold mapping
- 2D rendering plan
- 3D folding hierarchy plan
- Validation checklist
- Open questions and risks
- Final confirmation prompt to the user

Use `plan-template.md` as the default structure.

## Minimum Contents of progress.md

- Current stage
- Last completed step
- Next step
- Output files created
- Blocking questions
- Resume instructions
- Change log with timestamps

## Common Mistakes

| Mistake | Fix |
|---|---|
| Jumping from DXF to JSX immediately | Normalize geometry and write `geometry.json` first |
| Flattening curves without keeping originals | Store both original primitive data and sampled points |
| Mixing cut and fold semantics | Tag every edge explicitly |
| No recovery path after interruption | Update `progress.md` after each milestone |
| Starting implementation without approval | Stop after `plan.md` and ask for confirmation |
| Reporting fake token precision | Label unavailable counts honestly and estimate only when needed |

## Quick Reference

1. Ask for `.dxf` path
2. Create resumable job folder
3. Extract + normalize geometry
4. Write `geometry.json`
5. Write `plan.md`
6. Ask for confirmation
7. Implement and checkpoint
8. Summarize token usage