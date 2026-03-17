# react-dieline

React Three Fiber dieline component library for creating printable dieline templates.

## Features

- **3 rendering modes**: Dieline, Texture preview, and 3D folded view
- **Pannable & zoomable canvas** with mouse wheel and drag
- **Print export** - Generate SVG or PDF for printing
- **Millimeter-first** inputs with display in mm, cm, or in
- **Type-safe API** with full TypeScript support

## Install

```bash
npm install react-dieline
```

Peer dependencies:

```bash
npm install react react-dom
```

## Quick Start

```tsx
import { StrickerCircleDieline } from "react-dieline";

<StrickerCircleDieline
  attribute={{ size: 90 }}
  displayUnit="mm"
/>
```

---

## Models

### 1. StrickerCircleDieline

Circle dieline with configurable diameter.

**Attributes:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `number` | `90` | Diameter in mm |

**Usage:**
```tsx
import { StrickerCircleDieline } from "react-dieline";

<StrickerCircleDieline
  attribute={{ size: 120 }}
  displayUnit="mm"
/>
```

---

### 2. StrickerRectangleDieline

Rectangle dieline with configurable width and height.

**Attributes:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` | `120` | Width in mm |
| `height` | `number` | `80` | Height in mm |

**Usage:**
```tsx
import { StrickerRectangleDieline } from "react-dieline";

<StrickerRectangleDieline
  attribute={{ width: 200, height: 150 }}
  displayUnit="mm"
/>
```

---

### 3. Becf_10803_dieline

Tuck-end-box dieline (BECF 10803 standard). Supports 2D dieline view and 3D folded view.

**Attributes:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `length` | `number` | `100` | Box length in mm |
| `width` | `number` | `50` | Box width in mm |
| `height` | `number` | `150` | Box height in mm |
| `closurePanel` | `number` | `50` | Closure panel size in mm |
| `dustFlap` | `number` | `32` | Dust flap size in mm |
| `glueWidth` | `number` | `12` | Glue strip width in mm |
| `tuckFlap` | `number` | `15` | Tuck flap size in mm |

**Usage:**
```tsx
import { Becf_10803_dieline } from "react-dieline";

// 2D dieline view
<Becf_10803_dieline
  attribute={{
    length: 100,
    width: 50,
    height: 150,
    closurePanel: 50,
    dustFlap: 32,
    glueWidth: 12,
    tuckFlap: 15,
  }}
  displayUnit="mm"
/>

// 3D folded view
<Becf_10803_dieline
  attribute={{ length: 100, width: 50, height: 150 }}
  renderMode="folded3d"
  frame={0.5}
/>
```

---

## Default Values

Import default attributes from the library:

```tsx
import {
  DEFAULT_CIRCLE_ATTRIBUTES,
  DEFAULT_RECTANGLE_ATTRIBUTES,
  DEFAULT_TUCK_END_BOX_ATTRIBUTES,
  DEFAULT_DISPLAY_UNIT,
} from "react-dieline";

console.log(DEFAULT_CIRCLE_ATTRIBUTES);     // { size: 90 }
console.log(DEFAULT_RECTANGLE_ATTRIBUTES);  // { width: 120, height: 80 }
console.log(DEFAULT_TUCK_END_BOX_ATTRIBUTES); // { length: 100, width: 50, height: 150, closurePanel: 50, dustFlap: 32, glueWidth: 12, tuckFlap: 15 }
console.log(DEFAULT_DISPLAY_UNIT);           // "mm"
```

---

## Props

### Shared Props

All dieline components accept these props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `number \| string` | `"100%"` | Canvas width |
| `height` | `number \| string` | `"100%"` | Canvas height |
| `displayUnit` | `"mm" \| "cm" \| "in"` | `"mm"` | Unit for dimension labels |
| `backgroundColor` | `string` | `"#d9d9d9"` | Canvas background |
| `shapeStrokeColor` | `string` | `"#ff2d2d"` | Cut line color |
| `dimensionColor` | `string` | `"#111111"` | Dimension line color |
| `labelColor` | `string` | `"#111111"` | Dimension label text color |
| `showDimensions` | `boolean` | `true` | Show/hide dimensions |
| `showShapeLines` | `boolean` | `true` | Show/hide shape outline |
| `className` | `string` | - | CSS class for container |
| `style` | `CSSProperties` | - | Inline styles for container |
| `onMeasure` | `(bounds) => void` | - | Callback with measured bounds |

### Texture Props (Optional)

| Prop | Type | Description |
|------|------|-------------|
| `textureImageUrl` | `string` | URL of texture image |
| `texturePlacement` | `TexturePlacement` | Texture positioning config |
| `onTexturePlacementChange` | `(placement) => void` | Callback when texture moves |

### 3D Props (Tuck-end-box only)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderMode` | `"dieline" \| "folded3d"` | `"dieline"` | Render mode |
| `frame` | `number` | `0` | Animation frame (0-1) |

---

## Ref API

Use `ref` to access imperative methods:

```tsx
import { useRef } from "react";
import { StrickerCircleDieline } from "react-dieline";
import type { DielineCanvasHandle } from "react-dieline";

function App() {
  const modelRef = useRef<DielineCanvasHandle>(null);

  return (
    <>
      <button onClick={() => modelRef.current?.resetView()}>
        Reset View
      </button>
      <button onClick={() => console.log(modelRef.current?.getOverallWidth())}>
        Get Width
      </button>
      <StrickerCircleDieline ref={modelRef} attribute={{ size: 90 }} />
    </>
  );
}
```

### Ref Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getOverallWidth()` | `number` | Overall width in mm |
| `getOverallHeight()` | `number` | Overall height in mm |
| `getOverall()` | `{ overallWidthMm: number, overallHeightMm: number }` | Both dimensions in mm |
| `resetView()` | `void` | Reset pan/zoom to fit |

## Print Export

Access print functions via ref:

```tsx
import { useRef } from "react";
import { StrickerCircleDieline } from "react-dieline";
import type { DielineCanvasHandle } from "react-dieline";

function App() {
  const modelRef = useRef<DielineCanvasHandle>(null);

  const handlePrint = () => {
    modelRef.current?.printController.printToPdf({
      title: "my-dieline.pdf",
      displayUnit: "mm",
    });
  };

  return (
    <>
      <button onClick={handlePrint}>Export PDF</button>
      <StrickerCircleDieline ref={modelRef} attribute={{ size: 90 }} />
    </>
  );
}
```

### Print Controller Methods

| Method | Arguments | Description |
|--------|-----------|-------------|
| `createPrintSvg(options?)` | `{ displayUnit }` | Returns SVG document |
| `openPrintPreview(options?)` | `{ title, displayUnit, autoPrint, marginMm }` | Opens browser print dialog |
| `printToPdf(options?)` | `{ title, displayUnit, marginMm }` | Downloads as PDF |

---

## View Modes

Switch between dieline, texture, and 3D views:

```tsx
<Becf_10803_dieline
  attribute={{ length: 100, width: 50, height: 150 }}
  renderMode="dieline"    // Default: flat dieline
  // renderMode="folded3d" // 3D folded view
/>
```

For texture preview, provide a texture image:

```tsx
<StrickerCircleDieline
  attribute={{ size: 90 }}
  textureImageUrl="/pattern.png"
  texturePlacement={{
    hasTexture: true,
    imageWidth: 512,
    imageHeight: 512,
    offsetXRatio: 0,
    offsetYRatio: 0,
    scale: 1,
  }}
/>
```

---

## Helpers

```tsx
import { convertDielineMillimeters, formatDielineDisplayValue } from "react-dieline";

// Convert between units
const widthCm = convertDielineMillimeters(120, "cm"); // 12

// Format for display
const label = formatDielineDisplayValue(120.5, "mm"); // "120.50 mm"
```

---

## Local Development

```bash
npm run dev      # Start dev server
npm run typecheck  # Type check
npm run build    # Build library
```
