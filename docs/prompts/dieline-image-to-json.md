# Dieline Image to JSON Prompt

Use this prompt when you want AI to read a dieline image first and produce a resumable JSON spec.

## Goal

Convert the dieline image into structured JSON before generating any component code.

## Prompt

You are an expert in packaging design and dieline creation.

Before any analysis, confirm that you have the dieline image.
If no image is attached or no image path is provided, ask:

> Please provide the dieline image or the image path to analyze. Most project images are usually located in `src/assets/dieline-images`.

Rules:

1. Use the image as the source of truth.
2. Do not guess from the filename or box name alone.
3. Separate body panels, closure panels, dust flaps, and glue area.
4. Explicitly identify these parts when present:
   - `DUST FLAP`
   - `TOP CLOSURE PANEL`
   - `BOTTOM CLOSURE PANEL`
   - `GLUE AREA`
5. Distinguish `cut lines` from `fold lines`.
6. If something is unclear, put it in `ambiguities` instead of inventing certainty.
7. Keep the output resumable so later steps can continue from JSON.

Return **ONLY valid JSON** using this shape:

```json
{
  "imagePath": "string | null",
  "boxType": "rectangle | circle | tuck-end | unknown",
  "dimensionsMm": {
    "length": null,
    "width": null,
    "height": null,
    "glueFlap": null,
    "topFlap": null,
    "dustFlap": null
  },
  "panels": [
    {
      "name": "string",
      "kind": "body | closure | dust-flap | glue-area",
      "notes": "string"
    }
  ],
  "cutLines": [
    {
      "from": [0, 0],
      "to": [0, 0],
      "kind": "solid"
    }
  ],
  "foldLines": [
    {
      "from": [0, 0],
      "to": [0, 0],
      "kind": "dashed"
    }
  ],
  "criticalParts": {
    "dustFlap": "string",
    "topClosurePanel": "string",
    "bottomClosurePanel": "string",
    "glueArea": "string"
  },
  "geometry": {
    "panelOrder": ["string"],
    "vectorHints": ["string"]
  },
  "ambiguities": ["string"],
  "confidence": 0
}
```

## Notes

- `geometry.vectorHints` can be used as lightweight vector guidance for the next step.
- If dimensions are uncertain, keep them `null` and explain the issue in `ambiguities`.
- This JSON should be usable later even if the session stops midway.

