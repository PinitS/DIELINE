# Tuck-End Box Critical Parts Prompt

Use this prompt when analyzing or generating a tuck-end box dieline from an image.

## Primary instruction

You are analyzing a **tuck-end box dieline**. Pay special attention to the parts that are most often misidentified:

- `DUST FLAP`
- `TOP CLOSURE PANEL`
- `BOTTOM CLOSURE PANEL`
- `GLUE AREA`

## Image requirement

Before doing any analysis, make sure you have the dieline image.

If no image is attached or no image path is provided, ask:

> Please provide the dieline image or the image path to analyze. Most project images are usually located in `src/assets/dieline-images`.

If the user gives multiple candidate images, ask which file should be used.

## Analysis rules

1. Do **not** guess from memory or from a box name alone.
2. Use the image as the source of truth.
3. Identify the main body panels separately from closure-related parts.
4. Explicitly distinguish `GLUE AREA` from the main body panel.
5. Explicitly distinguish `DUST FLAP` from `TOP CLOSURE PANEL` and `BOTTOM CLOSURE PANEL`.
6. Do not merge top and bottom closures into one generic flap group.
7. If a part is ambiguous in the image, say it is ambiguous instead of inventing certainty.

## Critical-part checklist

### 1) DUST FLAP
- Treat dust flaps as **secondary side flaps** attached to closure structures.
- Do not classify a dust flap as a main panel.
- Do not confuse a dust flap with the full-width closure panel.
- Check whether dust flaps appear on both top and bottom, or only one side.

### 2) TOP CLOSURE PANEL
- Identify the main closure element connected to the top opening.
- Distinguish it from nearby dust flaps and small side tabs.
- Confirm whether it is a tuck flap, closure panel, or locking-style top feature.

### 3) BOTTOM CLOSURE PANEL
- Identify the main closure element connected to the bottom opening.
- Do not assume the bottom is identical to the top unless the image supports that.
- Check whether the bottom closure structure differs from the top closure.

### 4) GLUE AREA
- Identify the narrow side area intended for gluing.
- Do not count the glue area as a normal visible product panel.
- Check whether it is positioned on the far left or far right of the unfolded dieline.

## Mandatory verification before answering

Before finalizing your answer, verify:

- Which parts are body panels?
- Which parts are closure panels?
- Which parts are dust flaps?
- Which area is the glue tab/glue area?
- Whether top and bottom closures are actually the same or different.
- Whether any labels should remain uncertain because the image is unclear.

## Output guidance

When you answer, explicitly mention these four parts if they exist in the image:

- `DUST FLAP`
- `TOP CLOSURE PANEL`
- `BOTTOM CLOSURE PANEL`
- `GLUE AREA`

If generating code or structured data, preserve these distinctions in your reasoning and output.

## Recommended instruction snippet

You may append this directly to a larger generation prompt:

> Before analyzing, confirm the image input first. If no image is provided, ask for one. Most project images are usually in `src/assets/dieline-images`. While analyzing a tuck-end box dieline, pay extra attention to `DUST FLAP`, `TOP CLOSURE PANEL`, `BOTTOM CLOSURE PANEL`, and `GLUE AREA`. Do not confuse these parts with each other, do not treat the glue area as a main panel, and do not assume top and bottom closures are identical unless the image clearly shows that they are.

