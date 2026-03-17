import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { getDielineModelById, getDielineModels } from "../index";
import type { DielineCanvasHandle, DielineModelId, DisplayUnit, TexturePlacement } from "../types";
import { DemoCanvas } from "./components/DemoCanvas";
import { DemoControlSection } from "./components/DemoControlSection";
import type { DemoViewMode } from "./demoTypes";

const ADVANCED_DIMENSION_PRESET = {
  closurePanel: 50,
  dustFlap: 32,
  glueWidth: 12,
  tuckFlap: 15,
} as const;

const DEFAULT_TEXTURE_PLACEMENT: TexturePlacement = {
  hasTexture: false,
  imageWidth: 0,
  imageHeight: 0,
  offsetXRatio: 0,
  offsetYRatio: 0,
  scale: 1,
};

const MODEL_METADATA = getDielineModels();

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const downloadJsonFile = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
};

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
  const [shapeType, setShapeType] = useState<DielineModelId>("circle");
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
  const [tuckFrame, setTuckFrame] = useState(0);
  const isTextureMode = viewMode === "texture";
  const is3DMode = viewMode === "3d";
  const selectedModelMetadata = getDielineModelById(shapeType) ?? MODEL_METADATA[0];
  const supports3DView = selectedModelMetadata.dimensionType === "3D";
  const isTuckEndBox = shapeType === "tuckEndBox";
  const isFolded3DMode = is3DMode && supports3DView && isTuckEndBox;

  useEffect(() => () => {
    if (texturePreviewUrl) {
      URL.revokeObjectURL(texturePreviewUrl);
    }
  }, [texturePreviewUrl]);

  useEffect(() => {
    if (!supports3DView && is3DMode) {
      setViewMode("dieline");
    }
  }, [is3DMode, supports3DView]);

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

  const exportModelJson = () => {
    downloadJsonFile("react-dieline-models.json", getDielineModels());
  };

  const readSizeFromRef = () => {
    setRefSnapshot({
      width: canvasRef.current?.getOverallWidth() ?? 0,
      height: canvasRef.current?.getOverallHeight() ?? 0,
    });
  };

  return (
    <div className="demo-shell">
      <aside className="control-panel" >
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>React Three Fiber dieline demo</h1>
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
          <button
            type="button"
            className={viewMode === "3d" ? "is-active" : ""}
            onClick={() => setViewMode("3d")}
            disabled={!supports3DView}
          >
            View 3D
          </button>
        </div>

        <div className="summary-card">
          <h2>Model registry</h2>
          <p>{`${selectedModelMetadata.name} · ${selectedModelMetadata.dimensionType}`}</p>
          <div className="toggle-row">
            <button type="button" onClick={exportModelJson}>Export model JSON</button>
          </div>
        </div>

        <DemoControlSection
          viewMode={viewMode}
          shapeType={shapeType}
          modelMetadata={MODEL_METADATA}
          displayUnit={displayUnit}
          showDimensions={showDimensions}
          measuredBounds={measuredBounds}
          refSnapshot={refSnapshot}
          circleSize={circleSize}
          rectWidth={rectWidth}
          rectHeight={rectHeight}
          tuckLength={tuckLength}
          tuckWidth={tuckWidth}
          tuckHeight={tuckHeight}
          tuckClosurePanel={tuckClosurePanel}
          tuckDustFlap={tuckDustFlap}
          tuckGlueWidth={tuckGlueWidth}
          tuckFlap={tuckFlap}
          tuckFrame={tuckFrame}
          texturePreviewUrl={texturePreviewUrl}
          textureFileName={textureFileName}
          texturePlacement={texturePlacement}
          textureControlsDisabled={textureControlsDisabled}
          onShapeTypeChange={setShapeType}
          onDisplayUnitChange={setDisplayUnit}
          onCircleSizeChange={setCircleSize}
          onRectWidthChange={setRectWidth}
          onRectHeightChange={setRectHeight}
          onTuckLengthChange={setTuckLength}
          onTuckWidthChange={setTuckWidth}
          onTuckHeightChange={setTuckHeight}
          onTuckClosurePanelChange={setTuckClosurePanel}
          onTuckDustFlapChange={setTuckDustFlap}
          onTuckGlueWidthChange={setTuckGlueWidth}
          onTuckFlapChange={setTuckFlap}
          onTuckFrameChange={setTuckFrame}
          onToggleDimensions={() => setShowDimensions((value) => !value)}
          onReadSizeFromRef={readSizeFromRef}
          onTextureUpload={handleTextureUpload}
          onUpdateTexturePlacement={updateTexturePlacement}
          onResetTexturePlacement={resetTexturePlacement}
          onResetCanvasView={() => canvasRef.current?.resetView()}
        />
      </aside>

      <section className="canvas-panel" >
        <DemoCanvas
          canvasRef={canvasRef}
          viewMode={viewMode}
          shapeType={shapeType}
          supports3DView={supports3DView}
          displayUnit={displayUnit}
          showDimensions={showDimensions}
          texturePreviewUrl={texturePreviewUrl}
          texturePlacement={texturePlacement}
          circleSize={circleSize}
          rectWidth={rectWidth}
          rectHeight={rectHeight}
          tuckLength={tuckLength}
          tuckWidth={tuckWidth}
          tuckHeight={tuckHeight}
          tuckClosurePanel={tuckClosurePanel}
          tuckDustFlap={tuckDustFlap}
          tuckGlueWidth={tuckGlueWidth}
          tuckFlap={tuckFlap}
          tuckFrame={tuckFrame}
          onTexturePlacementChange={setTexturePlacement}
          onMeasure={setMeasuredBounds}
        />
      </section>
    </div>
  );
};
