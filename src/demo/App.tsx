import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  StrickerCircleDieline,
  StrickerRectangleDieline,
  Becf_10803_dieline,
  formatDielineDisplayValue,
} from "../index";
import type { DielineCanvasHandle, DisplayUnit, TexturePlacement } from "../types";

const ADVANCED_DIMENSION_PRESET = {
  closurePanel: 35,
  dustFlap: 32,
  glueWidth: 12,
  tuckFlap: 15,
} as const;

type DemoViewMode = "dieline" | "texture";

const DEFAULT_TEXTURE_PLACEMENT: TexturePlacement = {
  hasTexture: false,
  imageWidth: 0,
  imageHeight: 0,
  offsetXRatio: 0,
  offsetYRatio: 0,
  scale: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const readImageDimensions = (imageUrl: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const image = new Image();

  image.onload = () => {
    resolve({ width: image.naturalWidth, height: image.naturalHeight });
  };

  image.onerror = () => {
    reject(new Error("Unable to read texture image dimensions."));
  };

  image.src = imageUrl;
});

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
  const [texturePlacement, setTexturePlacement] = useState<TexturePlacement>(DEFAULT_TEXTURE_PLACEMENT);
  const isTextureMode = viewMode === "texture";

  useEffect(() => () => {
    if (texturePreviewUrl) {
      URL.revokeObjectURL(texturePreviewUrl);
    }
  }, [texturePreviewUrl]);

  const handleTextureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextTextureUrl = URL.createObjectURL(file);

    try {
      const { width, height } = await readImageDimensions(nextTextureUrl);

      setTextureFileName(file.name);
      setTexturePlacement({
        hasTexture: true,
        imageWidth: width,
        imageHeight: height,
        offsetXRatio: 0,
        offsetYRatio: 0,
        scale: 1,
      });
      setTexturePreviewUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }

        return nextTextureUrl;
      });
    } catch (error) {
      URL.revokeObjectURL(nextTextureUrl);
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };

  const resetTexturePlacement = () => {
    setTexturePlacement((current) => ({
      ...current,
      hasTexture: Boolean(texturePreviewUrl),
      offsetXRatio: 0,
      offsetYRatio: 0,
      scale: 1,
    }));
  };

  const updateTexturePlacement = (key: "offsetXRatio" | "offsetYRatio" | "scale", value: number) => {
    setTexturePlacement((current) => ({
      ...current,
      [key]: key === "scale"
        ? clamp(value, 0.1, 8)
        : clamp(value, -2, 2),
    }));
  };

  const textureControlsDisabled = !texturePreviewUrl;

  return (
    <div className="demo-shell">
      <aside className="control-panel">
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>React Three Fiber dieline demo</h1>
          <p className="muted">
            {isTextureMode
              ? "Texture mode keeps dieline lines visible and hides only dimensions. Use the controls below to adjust the image placement."
              : "Drag the canvas to pan. All entered dimensions are in millimeters."}
          </p>
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
              <p className="muted">Save the values below to DB so the same texture placement can be restored after loading from API.</p>
            </div>

            <label className="upload-field">
              <span>{texturePreviewUrl ? "Change image" : "Upload image"}</span>
              <input type="file" accept="image/*" onChange={handleTextureUpload} />
            </label>

            <div className="summary-card texture-actions">
              <h2>Texture controls</h2>

              <label className="field">
                Scale ({texturePlacement.scale.toFixed(2)}x)
                <div className="texture-control-row">
                  <input
                    type="range"
                    min={0.1}
                    max={8}
                    step={0.01}
                    value={texturePlacement.scale}
                    disabled={textureControlsDisabled}
                    onChange={(e) => updateTexturePlacement("scale", Number(e.target.value))}
                  />
                  <input
                    className="texture-number-input"
                    type="number"
                    min={0.1}
                    max={8}
                    step={0.01}
                    value={texturePlacement.scale}
                    disabled={textureControlsDisabled}
                    onChange={(e) => updateTexturePlacement("scale", Number(e.target.value) || 0.1)}
                  />
                </div>
              </label>

              <label className="field">
                Offset X ({(texturePlacement.offsetXRatio * 100).toFixed(1)}%)
                <div className="texture-control-row">
                  <input
                    type="range"
                    min={-200}
                    max={200}
                    step={1}
                    value={texturePlacement.offsetXRatio * 100}
                    disabled={textureControlsDisabled}
                    onChange={(e) => updateTexturePlacement("offsetXRatio", Number(e.target.value) / 100)}
                  />
                  <input
                    className="texture-number-input"
                    type="number"
                    min={-200}
                    max={200}
                    step={0.5}
                    value={(texturePlacement.offsetXRatio * 100).toFixed(1)}
                    disabled={textureControlsDisabled}
                    onChange={(e) => updateTexturePlacement("offsetXRatio", Number(e.target.value) / 100 || 0)}
                  />
                </div>
              </label>

              <label className="field">
                Offset Y ({(texturePlacement.offsetYRatio * 100).toFixed(1)}%)
                <div className="texture-control-row">
                  <input
                    type="range"
                    min={-200}
                    max={200}
                    step={1}
                    value={texturePlacement.offsetYRatio * 100}
                    disabled={textureControlsDisabled}
                    onChange={(e) => updateTexturePlacement("offsetYRatio", Number(e.target.value) / 100)}
                  />
                  <input
                    className="texture-number-input"
                    type="number"
                    min={-200}
                    max={200}
                    step={0.5}
                    value={(texturePlacement.offsetYRatio * 100).toFixed(1)}
                    disabled={textureControlsDisabled}
                    onChange={(e) => updateTexturePlacement("offsetYRatio", Number(e.target.value) / 100 || 0)}
                  />
                </div>
              </label>
            </div>

            <div className="toggle-row">
              <button type="button" onClick={resetTexturePlacement} disabled={!texturePreviewUrl}>Reset texture placement</button>
              <button type="button" onClick={() => canvasRef.current?.resetView()}>Reset canvas view</button>
            </div>

            <p className="file-meta">
              {textureFileName || "No image uploaded yet."}
            </p>

            <div className="summary-card texture-actions">
              <h2>Texture data for DB/API</h2>
              <div className="texture-meta-grid">
                <div className="texture-meta-item">
                  <span>hasTexture</span>
                  <strong>{texturePlacement.hasTexture ? "true" : "false"}</strong>
                </div>
                <div className="texture-meta-item">
                  <span>texture size</span>
                  <strong>{texturePlacement.imageWidth > 0 && texturePlacement.imageHeight > 0
                    ? `${texturePlacement.imageWidth} × ${texturePlacement.imageHeight}px`
                    : "-"}</strong>
                </div>
                <div className="texture-meta-item">
                  <span>offset X</span>
                  <strong>{`${(texturePlacement.offsetXRatio * 100).toFixed(2)}%`}</strong>
                </div>
                <div className="texture-meta-item">
                  <span>offset Y</span>
                  <strong>{`${(texturePlacement.offsetYRatio * 100).toFixed(2)}%`}</strong>
                </div>
                <div className="texture-meta-item texture-meta-item-wide">
                  <span>scale</span>
                  <strong>{`${texturePlacement.scale.toFixed(3)}x`}</strong>
                </div>
              </div>
            </div>
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
            texturePlacement={isTextureMode ? texturePlacement : undefined}
            onTexturePlacementChange={isTextureMode ? setTexturePlacement : undefined}
            allowTextureTransform={false}
            showDimensions={isTextureMode ? false : showDimensions}
            showShapeLines
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
            texturePlacement={isTextureMode ? texturePlacement : undefined}
            onTexturePlacementChange={isTextureMode ? setTexturePlacement : undefined}
            allowTextureTransform={false}
            showDimensions={isTextureMode ? false : showDimensions}
            showShapeLines
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
            texturePlacement={isTextureMode ? texturePlacement : undefined}
            onTexturePlacementChange={isTextureMode ? setTexturePlacement : undefined}
            allowTextureTransform={false}
            showDimensions={isTextureMode ? false : showDimensions}
            showShapeLines
            widthLabel="Overall Width"
            heightLabel="Overall Height"
            onMeasure={setMeasuredBounds}
          />
        )}
      </section>
    </div>
  );
};
