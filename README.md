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
  - `CircleDieline`
  - `RectangleDieline`
- Named helpers:
  - `convertDielineMillimeters`
  - `formatDielineDisplayValue`
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

- Use `CircleDieline` for circles
- Use `RectangleDieline` for rectangles

All input dimensions are in **millimeters**.

## Basic usage

```tsx
import { CircleDieline } from "react-dieline";

export function Example() {
  return (
    <CircleDieline
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
import { RectangleDieline } from "react-dieline";

export function Example() {
  return (
    <RectangleDieline
      attribute={{ width: 120, height: 80 }}
      displayUnit="cm"
      showDimensions
      showLabels
    />
  );
}
```

## Public exports

- `CircleDieline`
- `RectangleDieline`
- `convertDielineMillimeters`
- `formatDielineDisplayValue`

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
- `showLabels?: boolean`
- `className?: string`
- `style?: CSSProperties`
- `onMeasure?: (bounds) => void`

## Shape-specific props

### CircleDieline

```tsx
attribute: { size: number }
```

### RectangleDieline

```tsx
attribute: { width: number; height: number }
```

## Reading measurements via callback

```tsx
<CircleDieline
  attribute={{ size: 100 }}
  onMeasure={(bounds) => {
    console.log(bounds.overallWidthMm);
    console.log(bounds.overallHeightMm);
  }}
/>
```

## Reading measurements via ref

```tsx
import { useRef } from "react";
import { CircleDieline } from "react-dieline";

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
        Reset pan
      </button>
      <CircleDieline ref={ref} attribute={{ size: 120 }} />
    </>
  );
}
```

## Ref API

- `getOverallWidth(): number`
- `getOverallHeight(): number`
- `resetView(): void`

The ref API returns dimensions in **millimeters**.

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

