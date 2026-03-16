# Dieline JSON to Component Prompt

Use this prompt after you already have a structured dieline JSON spec.

## Goal

Generate a reusable 2D dieline component that follows the repository pattern in `src/components/2D/*`.

## Prompt

You are given a dieline JSON spec derived from a dieline image.
Generate a TypeScript React Three Fiber component that matches this repository's conventions.

Repository rules:

1. Follow the same structural pattern as:
   - `src/components/2D/StrickerRectangleDieline.tsx`
   - `src/components/2D/StrickerCircleDieline.tsx`
2. Use `BaseDielineCanvas` as the wrapper.
3. Use `forwardRef` with the correct prop type from `src/types.ts`.
4. Keep measurement logic separate from rendering logic.
5. Use `@react-three/drei` `Line` elements for shape rendering.
6. Keep the component customizable through typed `attribute` props.
7. Respect distinctions in the JSON for:
   - `DUST FLAP`
   - `TOP CLOSURE PANEL`
   - `BOTTOM CLOSURE PANEL`
   - `GLUE AREA`

Implementation guidance:

- Prefer reusable geometry calculations over hardcoded one-off points.
- Use the JSON as the source of truth.
- If the JSON has ambiguities, keep the code conservative.
- If a new measurement helper is needed, place it in `src/utils/measure.ts`.
- Match naming, formatting, and simplicity of existing `2D` components.

Output rules:

- Return **ONLY TypeScript code**.
- Do not include explanations.
- Do not include markdown fences.
- Generate component code that is easy to customize later.

