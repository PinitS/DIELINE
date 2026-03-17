import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { getDielineModelById, getDielineModels } from "../index";
import { Becf_10803_dieline } from "../components/3D/TuckEndBoxes/Becf_10803_dieline";
import { StrickerCircleDieline } from "../components/2D/StrickerCircleDieline";
import { StrickerRectangleDieline } from "../components/2D/StrickerRectangleDieline";
import type {
  CircleAttributes,
  DielineCanvasHandle,
  DielineModelId,
  DisplayUnit,
  RectangleAttributes,
  TexturePlacement,
  TuckEndBoxAttributes,
} from "../types";
import { StrickerCircleControl } from "./components/controls/StrickerCircleControl";
import { StrickerRectangleControl } from "./components/controls/StrickerRectangleControl";
import { Becf_10803Control } from "./components/controls/Becf_10803Control";
import type { DemoViewMode } from "./demoTypes";

const ADVANCED_DIMENSION_PRESET = {
  closurePanel: 50,
  dustFlap: 32,
  glueWidth: 12,
  tuckFlap: 15,
} as const;

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

const createDefaultTexturePlacement = (imageWidth: number, imageHeight: number): TexturePlacement => ({
  hasTexture: true,
  imageWidth,
  imageHeight,
  offsetXRatio: 0,
  offsetYRatio: 0,
  scale: 1,
});

export const App = () => {
  const modelRef = useRef<DielineCanvasHandle | null>(null);
  const [viewMode, setViewMode] = useState<DemoViewMode>("dieline");
  const [shapeType, setShapeType] = useState<DielineModelId>("circle");

  // Attribute states per model type
  const [attributeStrickerCircle, setAttributeStrickerCircle] = useState<CircleAttributes>({ size: 90 });
  const [attributeStrickerRectangle, setAttributeStrickerRectangle] = useState<RectangleAttributes>({ width: 120, height: 80 });
  const [attributeBecf_10803, setAttributeBecf_10803] = useState<TuckEndBoxAttributes>({
    length: 100,
    width: 50,
    height: 150,
    closurePanel: ADVANCED_DIMENSION_PRESET.closurePanel,
    dustFlap: ADVANCED_DIMENSION_PRESET.dustFlap,
    glueWidth: ADVANCED_DIMENSION_PRESET.glueWidth,
    tuckFlap: ADVANCED_DIMENSION_PRESET.tuckFlap,
  });

  // Texture states per model type
  const [textureStrickerCircle, setTextureStrickerCircle] = useState<TexturePlacement | undefined>(undefined);
  const [textureStrickerRectangle, setTextureStrickerRectangle] = useState<TexturePlacement | undefined>(undefined);
  const [textureBecf_10803, setTextureBecf_10803] = useState<TexturePlacement | undefined>(undefined);

  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>("mm");
  const [showDimensions, setShowDimensions] = useState(true);
  const [measuredBounds, setMeasuredBounds] = useState({ overallWidthMm: 0, overallHeightMm: 0 });
  const [texturePreviewUrl, setTexturePreviewUrl] = useState<string | null>(null);
  const [textureFileName, setTextureFileName] = useState<string>("");
  const [tuckFrame, setTuckFrame] = useState(0);

  const isTextureMode = viewMode === "texture";
  const is3DMode = viewMode === "3d";
  const selectedModelMetadata = getDielineModelById(shapeType) ?? MODEL_METADATA[0];
  const supports3DView = selectedModelMetadata.dimensionType === "3D";

  // Get current texture state based on shapeType
  const currentTexture = shapeType === "circle"
    ? textureStrickerCircle
    : shapeType === "rectangle"
      ? textureStrickerRectangle
      : textureBecf_10803;

  const setCurrentTexture = (texture: TexturePlacement | undefined) => {
    if (shapeType === "circle") {
      setTextureStrickerCircle(texture);
    } else if (shapeType === "rectangle") {
      setTextureStrickerRectangle(texture);
    } else {
      setTextureBecf_10803(texture);
    }
  };

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
      setCurrentTexture(createDefaultTexturePlacement(width, height));
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
    if (!currentTexture) return;

    setCurrentTexture({
      ...currentTexture,
      offsetXRatio: 0,
      offsetYRatio: 0,
      scale: 1,
    });
  };

  const updateTexturePlacement = (key: "offsetXRatio" | "offsetYRatio" | "scale", value: number) => {
    if (!currentTexture) return;

    setCurrentTexture({
      ...currentTexture,
      [key]: key === "scale"
        ? clamp(value, 0.1, 8)
        : clamp(value, -2, 2),
    });
  };

  const textureControlsDisabled = !texturePreviewUrl;

  const exportModelJson = () => {
    downloadJsonFile("react-dieline-models.json", getDielineModels());
  };

  const exportPrintTestPdf = () => {
    try {
      const printController = modelRef.current?.printController;
      if (!printController) {
        throw new Error("Print export API is not ready yet.");
      }

      printController.printToPdf({
        title: `${selectedModelMetadata.exportName}.pdf`,
        displayUnit,
      });
    } catch (error) {
      console.error(error);
      window.alert("Unable to open the print PDF window. Please allow pop-ups and try again.");
    }
  };

  return (
    <div className="demo-shell">
      <aside className="control-panel" >
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>React Three Fiber dieline demo</h1>
        </div>

        <div className="section-grid">
          <label className="field">Dieline type
            <select value={shapeType} onChange={(event) => setShapeType(event.target.value as DielineModelId)}>
              {MODEL_METADATA.map((model) => (
                <option key={model.id} value={model.id}>{`${model.name} (${model.dimensionType})`}</option>
              ))}
            </select>
          </label>
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
            <button type="button" onClick={exportPrintTestPdf}>Print test PDF (1:1)</button>
          </div>
        </div>



        {(() => {
          switch (shapeType) {
            case "circle":
              return (
                <StrickerCircleControl
                  viewMode={viewMode}
                  displayUnit={displayUnit}
                  showDimensions={showDimensions}
                  measuredBounds={measuredBounds}
                  attribute={attributeStrickerCircle}
                  setAttribute={setAttributeStrickerCircle}
                  texture={currentTexture}
                  texturePreviewUrl={texturePreviewUrl}
                  textureFileName={textureFileName}
                  textureControlsDisabled={textureControlsDisabled}
                  onDisplayUnitChange={setDisplayUnit}
                  onToggleDimensions={() => setShowDimensions((value) => !value)}
                  onTextureUpload={handleTextureUpload}
                  onUpdateTexturePlacement={updateTexturePlacement}
                  onResetTexturePlacement={resetTexturePlacement}
                  onResetCanvasView={() => modelRef.current?.resetView()}
                />
              );

            case "rectangle":
              return (
                <StrickerRectangleControl
                  viewMode={viewMode}
                  displayUnit={displayUnit}
                  showDimensions={showDimensions}
                  measuredBounds={measuredBounds}
                  attribute={attributeStrickerRectangle}
                  setAttribute={setAttributeStrickerRectangle}
                  texture={currentTexture}
                  texturePreviewUrl={texturePreviewUrl}
                  textureFileName={textureFileName}
                  textureControlsDisabled={textureControlsDisabled}
                  onDisplayUnitChange={setDisplayUnit}
                  onToggleDimensions={() => setShowDimensions((value) => !value)}
                  onTextureUpload={handleTextureUpload}
                  onUpdateTexturePlacement={updateTexturePlacement}
                  onResetTexturePlacement={resetTexturePlacement}
                  onResetCanvasView={() => modelRef.current?.resetView()}
                />
              );

            case "tuckEndBox":
            default:
              return (
                <Becf_10803Control
                  viewMode={viewMode}
                  displayUnit={displayUnit}
                  showDimensions={showDimensions}
                  measuredBounds={measuredBounds}
                  attribute={attributeBecf_10803}
                  setAttribute={setAttributeBecf_10803}
                  texture={currentTexture}
                  texturePreviewUrl={texturePreviewUrl}
                  textureFileName={textureFileName}
                  textureControlsDisabled={textureControlsDisabled}
                  tuckFrame={tuckFrame}
                  onDisplayUnitChange={setDisplayUnit}
                  onTuckFrameChange={setTuckFrame}
                  onToggleDimensions={() => setShowDimensions((value) => !value)}
                  onTextureUpload={handleTextureUpload}
                  onUpdateTexturePlacement={updateTexturePlacement}
                  onResetTexturePlacement={resetTexturePlacement}
                  onResetCanvasView={() => modelRef.current?.resetView()}
                />
              );
          }
        })()}
      </aside>

      <section className="canvas-panel" >
        {(() => {
          switch (shapeType) {
            case "circle":
              return (
                <StrickerCircleDieline
                  ref={modelRef}
                  attribute={attributeStrickerCircle}
                  displayUnit={displayUnit}
                  textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  allowTextureTransform={false}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  widthLabel="Overall Width"
                  heightLabel="Overall Height"
                  onMeasure={setMeasuredBounds}
                />
              );

            case "rectangle":
              return (
                <StrickerRectangleDieline
                  ref={modelRef}
                  attribute={attributeStrickerRectangle}
                  displayUnit={displayUnit}
                  textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  allowTextureTransform={false}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  widthLabel="Overall Width"
                  heightLabel="Overall Height"
                  onMeasure={setMeasuredBounds}
                />
              );

            case "tuckEndBox":
            default:
              return (
                <Becf_10803_dieline
                  ref={modelRef}
                  attribute={attributeBecf_10803}
                  displayUnit={displayUnit}
                  renderMode={is3DMode ? "folded3d" : "dieline"}
                  frame={is3DMode ? tuckFrame : 0}
                  textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  allowTextureTransform={false}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  widthLabel="Overall Width"
                  heightLabel="Overall Height"
                  onMeasure={setMeasuredBounds}
                />
              );
          }
        })()}
      </section>
    </div>
  );
};
