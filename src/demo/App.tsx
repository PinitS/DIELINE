import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  StrickerCircleDieline,
  StrickerRectangleDieline,
  Becf_10803_dieline,
  formatDielineDisplayValue,
} from "../index";
import type { DielineCanvasHandle, DisplayUnit } from "../types";

const ADVANCED_DIMENSION_PRESET = {
  closurePanel: 35,
  dustFlap: 32,
  glueWidth: 12,
  tuckFlap: 15,
} as const;

type DemoViewMode = "dieline" | "texture";

export const App = () => {
  const canvasRef = useRef<DielineCanvasHandle | null>(null);
  const [viewMode, setViewMode] = useState<DemoViewMode>("dieline");
  const [shapeType, setShapeType] = useState<"circle" | "rectangle" | "tuckEndBox">("circle");
  const [circleSize, setCircleSize] = useState(90);
  const [rectWidth, setRectWidth] = useState(120);
  const [rectHeight, setRectHeight] = useState(80);
  const [tuckLength, setTuckLength] = useState(100);
  const [tuckWidth, setTuckWidth] = useState(50);
  const [tuckHeight, setTuckHeight] = useState(150);
  const [tuckClosurePanel, setTuckClosurePanel] = useState<number>(ADVANCED_DIMENSION_PRESET.closurePanel);
  const [tuckDustFlap, setTuckDustFlap] = useState<number>(ADVANCED_DIMENSION_PRESET.dustFlap);
  const [tuckGlueWidth, setTuckGlueWidth] = useState<number>(ADVANCED_DIMENSION_PRESET.glueWidth);
  const [tuckFlap, setTuckFlap] = useState<number>(ADVANCED_DIMENSION_PRESET.tuckFlap);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>("mm");
  const [showDimensions, setShowDimensions] = useState(true);
  const [measuredBounds, setMeasuredBounds] = useState({ overallWidthMm: 0, overallHeightMm: 0 });
  const [refSnapshot, setRefSnapshot] = useState({ width: 0, height: 0 });
  const [texturePreviewUrl, setTexturePreviewUrl] = useState<string | null>(null);
  const [textureFileName, setTextureFileName] = useState<string>("");
  const isTextureMode = viewMode === "texture";

  useEffect(() => () => {
    if (texturePreviewUrl) {
      URL.revokeObjectURL(texturePreviewUrl);
    }
  }, [texturePreviewUrl]);

  const handleTextureUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTextureFileName(file.name);
    setTexturePreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return URL.createObjectURL(file);
    });
    event.target.value = "";
  };

  return (
    <div className="demo-shell">
      <aside className="control-panel">
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>React Three Fiber dieline demo</h1>
          <p className="muted">Drag the canvas to pan. All entered dimensions are in millimeters.</p>
        </div>

        <div className="mode-toggle" aria-label="View mode toggle">
          <button
            type="button"
            className={viewMode === "dieline" ? "is-active" : ""}
            onClick={() => setViewMode("dieline")}
          >
            View dieline
          </button>
          <button
            type="button"
            className={viewMode === "texture" ? "is-active" : ""}
            onClick={() => setViewMode("texture")}
          >
            View texture
          </button>
        </div>

        {viewMode === "dieline" ? (
          <>
            <div className="section-grid">
              <label className="field">Dieline type
                <select value={shapeType} onChange={(e) => setShapeType(e.target.value as "circle" | "rectangle" | "tuckEndBox")}>
                  <option value="circle">Circle</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="tuckEndBox">Tuck End Box</option>
                </select>
              </label>
              <label className="field">Display unit
                <select value={displayUnit} onChange={(e) => setDisplayUnit(e.target.value as DisplayUnit)}>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </label>
            </div>

            {shapeType === "circle" ? (
              <label className="field">Circle size (mm)
                <input type="number" min={1} step={1} value={circleSize} onChange={(e) => setCircleSize(Number(e.target.value) || 1)} />
              </label>
            ) : shapeType === "rectangle" ? (
              <div className="section-grid">
                <label className="field">Rectangle width (mm)
                  <input type="number" min={1} step={1} value={rectWidth} onChange={(e) => setRectWidth(Number(e.target.value) || 1)} />
                </label>
                <label className="field">Rectangle height (mm)
                  <input type="number" min={1} step={1} value={rectHeight} onChange={(e) => setRectHeight(Number(e.target.value) || 1)} />
                </label>
              </div>
            ) : (
              <div className="section-grid">
                <label className="field">A : length (mm)
                  <input type="number" min={1} step={1} value={tuckLength} onChange={(e) => setTuckLength(Number(e.target.value) || 1)} />
                </label>
                <label className="field">B : width (mm)
                  <input type="number" min={1} step={1} value={tuckWidth} onChange={(e) => setTuckWidth(Number(e.target.value) || 1)} />
                </label>
                <label className="field">C : height (mm)
                  <input type="number" min={1} step={1} value={tuckHeight} onChange={(e) => setTuckHeight(Number(e.target.value) || 1)} />
                </label>
                <label className="field">closurePanel (mm)
                  <input type="number" min={1} step={1} value={tuckClosurePanel} onChange={(e) => setTuckClosurePanel(Number(e.target.value) || 1)} />
                </label>
                <label className="field">dustFlap (mm)
                  <input type="number" min={1} step={1} value={tuckDustFlap} onChange={(e) => setTuckDustFlap(Number(e.target.value) || 1)} />
                </label>
                <label className="field">glueWidth (mm)
                  <input type="number" min={1} step={1} value={tuckGlueWidth} onChange={(e) => setTuckGlueWidth(Number(e.target.value) || 1)} />
                </label>
                <label className="field">tuckFlap (mm)
                  <input type="number" min={1} step={1} value={tuckFlap} onChange={(e) => setTuckFlap(Number(e.target.value) || 1)} />
                </label>
              </div>
            )}

            <div className="toggle-row">
              <button type="button" onClick={() => setShowDimensions((v) => !v)}>{showDimensions ? "Hide" : "Show"} dimensions</button>
              <button type="button" onClick={() => setRefSnapshot({ width: canvasRef.current?.getOverallWidth() ?? 0, height: canvasRef.current?.getOverallHeight() ?? 0 })}>Read size from ref API</button>
            </div>

            <div className="summary-card">
              <h2>Measured bounds</h2>
              <p>{`Overall width: ${formatDielineDisplayValue(measuredBounds.overallWidthMm, displayUnit)}`}</p>
              <p>{`Overall height: ${formatDielineDisplayValue(measuredBounds.overallHeightMm, displayUnit)}`}</p>
              <p>{`Ref width (mm): ${refSnapshot.width.toFixed(2)}`}</p>
              <p>{`Ref height (mm): ${refSnapshot.height.toFixed(2)}`}</p>
            </div>
          </>
        ) : (
          <div className="upload-card">
            <div>
              <h2>Texture image</h2>
              <p className="muted">In texture mode, the action panel will show only image upload.</p>
            </div>

            <label className="upload-field">
              <span>{texturePreviewUrl ? "Change image" : "Upload image"}</span>
              <input type="file" accept="image/*" onChange={handleTextureUpload} />
            </label>

            <p className="file-meta">
              {textureFileName || "No image uploaded yet."}
            </p>
          </div>
        )}
      </aside>

      <section className="canvas-panel">
        {shapeType === "circle" ? (
          <StrickerCircleDieline
            ref={canvasRef}
            attribute={{ size: circleSize }}
            displayUnit={displayUnit}
            width="100%"
            height={720}
            textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
            showDimensions={isTextureMode ? false : showDimensions}
            widthLabel="Overall Width"
            heightLabel="Overall Height"
            onMeasure={setMeasuredBounds}
          />
        ) : shapeType === "rectangle" ? (
          <StrickerRectangleDieline
            ref={canvasRef}
            attribute={{ width: rectWidth, height: rectHeight }}
            displayUnit={displayUnit}
            width="100%"
            height={720}
            textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
            showDimensions={isTextureMode ? false : showDimensions}
            widthLabel="Overall Width"
            heightLabel="Overall Height"
            onMeasure={setMeasuredBounds}
          />
        ) : (
          <Becf_10803_dieline
            ref={canvasRef}
            attribute={{
              length: tuckLength,
              width: tuckWidth,
              height: tuckHeight,
              closurePanel: tuckClosurePanel,
              dustFlap: tuckDustFlap,
              glueWidth: tuckGlueWidth,
              tuckFlap,
            }}
            displayUnit={displayUnit}
            width="100%"
            height={720}
            textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
            showDimensions={isTextureMode ? false : showDimensions}
            widthLabel="Overall Width"
            heightLabel="Overall Height"
            onMeasure={setMeasuredBounds}
          />
        )}
      </section>
    </div>
  );
};
