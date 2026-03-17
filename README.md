# react-dieline

React Three Fiber dieline component library for React.

## Features

- React Three Fiber rendering
- Pannable canvas
- Millimeter-first inputs
- Display labels in `mm`, `cm`, or `in`
- Always formats labels to 2 decimals
- Dynamic font sizing for overall width/height labels
- Type-specific public API:
  - `StrickerCircleDieline`
  - `StrickerRectangleDieline`
  - `Becf_10803_dieline`
- Named helpers:
  - `convertDielineMillimeters`
  - `formatDielineDisplayValue`
- Model metadata helpers:
  - `DIELINE_MODELS`
  - `getDielineModels`
  - `getDielineModelById`
- Measurement callback and imperative ref API

## Install

```bash
npm install react-dieline
```

Peer dependencies:

```bash
npm install react react-dom
```

## Core idea

You choose the shape component directly.

- Use `StrickerCircleDieline` for circles
- Use `StrickerRectangleDieline` for rectangles
- Use `Becf_10803_dieline` for the tuck-end-box model

All input dimensions are in **millimeters**.

## Basic usage

```tsx
import { StrickerCircleDieline } from "react-dieline";

export function Example() {
  return (
    <StrickerCircleDieline
      attribute={{ size: 90 }}
      displayUnit="mm"
      width={800}
      height={600}
    />
  );
}
```

## Rectangle usage

```tsx
import { StrickerRectangleDieline } from "react-dieline";

export function Example() {
  return (
    <StrickerRectangleDieline
      attribute={{ width: 120, height: 80 }}
      displayUnit="cm"
      showDimensions
    />
  );
}
```

## Tuck-end-box usage

```tsx
import { Becf_10803_dieline } from "react-dieline";

export function Example() {
  return (
    <Becf_10803_dieline
      attribute={{ length: 100, width: 50, height: 150 }}
      showDimensions
    />
  );
}
```

## Public exports

- `StrickerCircleDieline`
- `StrickerRectangleDieline`
- `Becf_10803_dieline`
- `DIELINE_MODELS`
- `getDielineModels`
- `getDielineModelById`
- `convertDielineMillimeters`
- `formatDielineDisplayValue`

## Model metadata usage

```tsx
import { getDielineModels } from "react-dieline";

const models = getDielineModels();
const canView3D = models.some((model) => model.dimensionType === "3D");
```

## Props shared by all shapes

- `width?: number | string`
- `height?: number | string`
- `displayUnit?: "mm" | "cm" | "in"`
- `backgroundColor?: string`
- `shapeStrokeColor?: string`
- `dimensionColor?: string`
- `labelColor?: string`
- `widthLabel?: string`
- `heightLabel?: string`
- `showDimensions?: boolean`
  - Controls both dimension lines and dimension labels
  - Default: `true`
- `className?: string`
- `style?: CSSProperties`
- `onMeasure?: (bounds) => void`

## Shape-specific props

### StrickerCircleDieline

```tsx
attribute: { size?: number }
```

Default `size`: `90`

### StrickerRectangleDieline

```tsx
attribute: { width?: number; height?: number }
```

Default `width`: `120`

Default `height`: `80`

### Becf_10803_dieline

```tsx
attribute: {
  length?: number;
  width?: number;
  height?: number;
  closurePanel?: number;
  dustFlap?: number;
  glueWidth?: number;
  tuckFlap?: number;
}
```

Defaults:

- `length: 100`
- `width: 50`
- `height: 150`
- `closurePanel: 45`
- `dustFlap: 32`
- `glueWidth: 12`
- `tuckFlap: 15`

## Reading measurements via callback

```tsx
<StrickerCircleDieline
  attribute={{ size: 100 }}
  onMeasure={(bounds) => {
    console.log(bounds.overallWidthMm);
    console.log(bounds.overallHeightMm);
  }}
/>
```

## Print export via callback

```tsx
import { useState } from "react";
import type { DielinePrintController } from "react-dieline";
import { StrickerCircleDieline } from "react-dieline";

export function Example() {
  const [printApi, setPrintApi] = useState<DielinePrintController | null>(null);

  return (
    <>
      <button onClick={() => printApi?.printToPdf({ title: "circle.pdf" })}>
        Print / Save PDF
      </button>
      <StrickerCircleDieline
        attribute={{ size: 120 }}
        onPrintExportReady={(api) => setPrintApi(api)}
      />
    </>
  );
}
```

`onPrintExportReady` returns a controller with:

- `createPrintSvg()`
- `openPrintPreview()`
- `printToPdf()`

## Reading measurements via ref

```tsx
import { useRef } from "react";
import { StrickerCircleDieline } from "react-dieline";

export function Example() {
  const ref = useRef<{
    getOverallWidth: () => number;
    getOverallHeight: () => number;
    resetView: () => void;
  } | null>(null);

  return (
    <>
      <button onClick={() => console.log(ref.current?.getOverallWidth())}>
        Read width
      </button>
      <button onClick={() => ref.current?.resetView()}>
        Reset view
      </button>
      <StrickerCircleDieline ref={ref} attribute={{ size: 120 }} />
    </>
  );
}
```

## Ref API

- `getOverallWidth(): number`
- `getOverallHeight(): number`
- `resetView(): void`

The ref API returns dimensions in **millimeters**.

`resetView()` restores the fitted initial view.

## Helper usage

```tsx
import { convertDielineMillimeters, formatDielineDisplayValue } from "react-dieline";

const widthCm = convertDielineMillimeters(120, "cm");
const label = formatDielineDisplayValue(120, "cm");
```

## Local development

```bash
npm run dev
npm run typecheck
npm run build
```

