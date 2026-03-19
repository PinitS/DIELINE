import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Becf_10803_dieline } from "../components/3D/TuckEndBoxes/Becf_10803/Becf_10803_dieline";
import { Becf_11d01_dieline } from "../components/3D/TuckEndBoxes/Becf_11d01/Becf_11d01_dieline";
import { StrickerCircleDieline } from "../components/2D/StrickerCircleDieline";
import { StrickerRectangleDieline } from "../components/2D/StrickerRectangleDieline";
import { getDielineModelById, getDielineModels } from "../lib/modelMetadata";
import type {
  Becf10a0aAttributes,
  Becf11d01Attributes,
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
import { Becf_11d01Control } from "./components/controls/Becf_11d01Control";
import type { DemoViewMode } from "./demoTypes";

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

const getValueByModelId = <T,>(
  modelId: DielineModelId,
  circleValue: T,
  rectangleValue: T,
  tuckEndBoxValue: T,
  becf11d01Value: T,
  becf10a0aValue: T,
) => {
  switch (modelId) {
    case "circle":
      return circleValue;
    case "rectangle":
      return rectangleValue;
    case "becf10803":
      return tuckEndBoxValue;
    case "becf11d01":
      return becf11d01Value;
    case "becf10a0a":
      return becf10a0aValue;
    default:
      return circleValue;
  }
};

export const App = () => {
  const modelRef = useRef<DielineCanvasHandle | null>(null);
  const [viewMode, setViewMode] = useState<DemoViewMode>("dieline");
  const [shapeType, setShapeType] = useState<DielineModelId>("circle");

  // Attribute states per model type
  const [attributeStrickerCircle, setAttributeStrickerCircle] = useState<CircleAttributes>({});
  const [attributeStrickerRectangle, setAttributeStrickerRectangle] = useState<RectangleAttributes>({});
  const [attributeBecf_10803, setAttributeBecf_10803] = useState<TuckEndBoxAttributes>({});
  const [attributeBecf_11d01, setAttributeBecf_11d01] = useState<Becf11d01Attributes>({});
  const [attributeBecf_10a0a, setAttributeBecf_10a0a] = useState<Becf10a0aAttributes>({});

  // Texture states per model type
  const [textureStrickerCircle, setTextureStrickerCircle] = useState<TexturePlacement | undefined>(undefined);
  const [textureStrickerRectangle, setTextureStrickerRectangle] = useState<TexturePlacement | undefined>(undefined);
  const [textureBecf_10803, setTextureBecf_10803] = useState<TexturePlacement | undefined>(undefined);
  const [textureBecf_11d01, setTextureBecf_11d01] = useState<TexturePlacement | undefined>(undefined);
  const [textureBecf_10a0a, setTextureBecf_10a0a] = useState<TexturePlacement | undefined>(undefined);
  const [texturePreviewUrlStrickerCircle, setTexturePreviewUrlStrickerCircle] = useState<string | null>(null);
  const [texturePreviewUrlStrickerRectangle, setTexturePreviewUrlStrickerRectangle] = useState<string | null>(null);
  const [texturePreviewUrlBecf_10803, setTexturePreviewUrlBecf_10803] = useState<string | null>(null);
  const [texturePreviewUrlBecf_11d01, setTexturePreviewUrlBecf_11d01] = useState<string | null>(null);
  const [texturePreviewUrlBecf_10a0a, setTexturePreviewUrlBecf_10a0a] = useState<string | null>(null);
  const [textureFileNameStrickerCircle, setTextureFileNameStrickerCircle] = useState("");
  const [textureFileNameStrickerRectangle, setTextureFileNameStrickerRectangle] = useState("");
  const [textureFileNameBecf_10803, setTextureFileNameBecf_10803] = useState("");
  const [textureFileNameBecf_11d01, setTextureFileNameBecf_11d01] = useState("");
  const [textureFileNameBecf_10a0a, setTextureFileNameBecf_10a0a] = useState("");

  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>("mm");
  const [showDimensions, setShowDimensions] = useState(true);
  const [measuredBounds, setMeasuredBounds] = useState({ overallWidthMm: 0, overallHeightMm: 0 });
  const [tuckFrame, setTuckFrame] = useState(0);
  const texturePreviewUrlsRef = useRef<string[]>([]);

  const isTextureMode = viewMode === "texture";
  const is3DMode = viewMode === "3d";
  const selectedModelMetadata = getDielineModelById(shapeType) ?? MODEL_METADATA[0];
  const supports3DView = selectedModelMetadata.modelDimensionType === "3D";

  const currentTexture = getValueByModelId(
    shapeType,
    textureStrickerCircle,
    textureStrickerRectangle,
    textureBecf_10803,
    textureBecf_11d01,
    textureBecf_10a0a,
  );
  const currentTexturePreviewUrl = getValueByModelId(
    shapeType,
    texturePreviewUrlStrickerCircle,
    texturePreviewUrlStrickerRectangle,
    texturePreviewUrlBecf_10803,
    texturePreviewUrlBecf_11d01,
    texturePreviewUrlBecf_10a0a,
  );
  const currentTextureFileName = getValueByModelId(
    shapeType,
    textureFileNameStrickerCircle,
    textureFileNameStrickerRectangle,
    textureFileNameBecf_10803,
    textureFileNameBecf_11d01,
    textureFileNameBecf_10a0a,
  );

  const setTextureForModel = (modelId: DielineModelId, texture: TexturePlacement | undefined) => {
    switch (modelId) {
      case "circle":
        setTextureStrickerCircle(texture);
        return;
      case "rectangle":
        setTextureStrickerRectangle(texture);
        return;
      case "becf10803":
        setTextureBecf_10803(texture);
        return;
      case "becf11d01":
        setTextureBecf_11d01(texture);
        return;
      case "becf10a0a":
        setTextureBecf_10a0a(texture);
        return;
      default:
        setTextureStrickerCircle(texture);
    }
  };

  const setCurrentTexture = (texture: TexturePlacement | undefined) => {
    setTextureForModel(shapeType, texture);
  };

  const replaceTexturePreviewUrl = (
    setPreviewUrl: React.Dispatch<React.SetStateAction<string | null>>,
    nextTextureUrl: string,
  ) => {
    setPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }

      return nextTextureUrl;
    });
  };

  const setTexturePreviewUrlForModel = (modelId: DielineModelId, nextTextureUrl: string) => {
    switch (modelId) {
      case "circle":
        replaceTexturePreviewUrl(setTexturePreviewUrlStrickerCircle, nextTextureUrl);
        return;
      case "rectangle":
        replaceTexturePreviewUrl(setTexturePreviewUrlStrickerRectangle, nextTextureUrl);
        return;
      case "becf10803":
        replaceTexturePreviewUrl(setTexturePreviewUrlBecf_10803, nextTextureUrl);
        return;
      case "becf11d01":
        replaceTexturePreviewUrl(setTexturePreviewUrlBecf_11d01, nextTextureUrl);
        return;
      case "becf10a0a":
        replaceTexturePreviewUrl(setTexturePreviewUrlBecf_10a0a, nextTextureUrl);
        return;
      default:
        replaceTexturePreviewUrl(setTexturePreviewUrlStrickerCircle, nextTextureUrl);
    }
  };

  const setTextureFileNameForModel = (modelId: DielineModelId, nextTextureFileName: string) => {
    switch (modelId) {
      case "circle":
        setTextureFileNameStrickerCircle(nextTextureFileName);
        return;
      case "rectangle":
        setTextureFileNameStrickerRectangle(nextTextureFileName);
        return;
      case "becf10803":
        setTextureFileNameBecf_10803(nextTextureFileName);
        return;
      case "becf11d01":
        setTextureFileNameBecf_11d01(nextTextureFileName);
        return;
      case "becf10a0a":
        setTextureFileNameBecf_10a0a(nextTextureFileName);
        return;
      default:
        setTextureFileNameStrickerCircle(nextTextureFileName);
    }
  };

  useEffect(() => {
    texturePreviewUrlsRef.current = [
      texturePreviewUrlStrickerCircle,
      texturePreviewUrlStrickerRectangle,
      texturePreviewUrlBecf_10803,
      texturePreviewUrlBecf_11d01,
    ].filter((previewUrl): previewUrl is string => Boolean(previewUrl));
  }, [
    texturePreviewUrlBecf_11d01,
    texturePreviewUrlBecf_10803,
    texturePreviewUrlStrickerCircle,
    texturePreviewUrlStrickerRectangle,
  ]);

  useEffect(() => () => {
    texturePreviewUrlsRef.current.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });
  }, []);

  useEffect(() => {
    if (!supports3DView && is3DMode) {
      setViewMode("dieline");
    }
  }, [is3DMode, supports3DView]);

  const handleTextureUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const targetShapeType = shapeType;
    const nextTextureUrl = URL.createObjectURL(file);

    try {
      const { width, height } = await readImageDimensions(nextTextureUrl);

      setTextureFileNameForModel(targetShapeType, file.name);
      setTextureForModel(targetShapeType, createDefaultTexturePlacement(width, height));
      setTexturePreviewUrlForModel(targetShapeType, nextTextureUrl);
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

  const textureControlsDisabled = !currentTexturePreviewUrl;

  const exportModelJson = () => {
    downloadJsonFile("react-dieline-models.json", getDielineModels());
  };

  const exportPreviewTestPdf = () => {
    try {
      const exportPreviewLayout = modelRef.current?.exportPreviewLayout;
      if (!exportPreviewLayout) {
        throw new Error("Preview export API is not ready yet.");
      }

      exportPreviewLayout.printToPdf({
        title: `${selectedModelMetadata.exportName}.pdf`,
        displayUnit,
      });
    } catch (error) {
      console.error(error);
      window.alert("Unable to open the preview export PDF window. Please allow pop-ups and try again.");
    }
  };

  return (
    <div className="demo-shell">
      <aside className="control-panel" >
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>React Three Fiber dieline demo</h1>
        </div>

        <div className="section-row">
          <label className="field">Dieline type
            <select value={shapeType} onChange={(event) => setShapeType(event.target.value as DielineModelId)}>
              {MODEL_METADATA.map((model) => (
                <option key={model.id} value={model.id}>{`${model.name} (${model.modelDimensionType})`}</option>
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
          <p>{`${selectedModelMetadata.name} · ${selectedModelMetadata.modelDimensionType}`}</p>
          <div className="toggle-row">
            <button type="button" onClick={exportModelJson}>Export model JSON</button>
            <button type="button" onClick={exportPreviewTestPdf}>Export preview PDF (1:1)</button>
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
                  texturePreviewUrl={currentTexturePreviewUrl}
                  textureFileName={currentTextureFileName}
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
                  texturePreviewUrl={currentTexturePreviewUrl}
                  textureFileName={currentTextureFileName}
                  textureControlsDisabled={textureControlsDisabled}
                  onDisplayUnitChange={setDisplayUnit}
                  onToggleDimensions={() => setShowDimensions((value) => !value)}
                  onTextureUpload={handleTextureUpload}
                  onUpdateTexturePlacement={updateTexturePlacement}
                  onResetTexturePlacement={resetTexturePlacement}
                  onResetCanvasView={() => modelRef.current?.resetView()}
                />
              );

            case "becf10803":
              return (
                <Becf_10803Control
                  viewMode={viewMode}
                  displayUnit={displayUnit}
                  showDimensions={showDimensions}
                  measuredBounds={measuredBounds}
                  attribute={attributeBecf_10803}
                  setAttribute={setAttributeBecf_10803}
                  texture={currentTexture}
                  texturePreviewUrl={currentTexturePreviewUrl}
                  textureFileName={currentTextureFileName}
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

            case "becf11d01":
              return (
                <Becf_11d01Control
                  viewMode={viewMode}
                  displayUnit={displayUnit}
                  showDimensions={showDimensions}
                  measuredBounds={measuredBounds}
                  attribute={attributeBecf_11d01}
                  setAttribute={setAttributeBecf_11d01}
                  texture={currentTexture}
                  texturePreviewUrl={currentTexturePreviewUrl}
                  textureFileName={currentTextureFileName}
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

            default:
              return null;
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
                  textureImageUrl={isTextureMode ? currentTexturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  onMeasure={setMeasuredBounds}
                />
              );

            case "rectangle":
              return (
                <StrickerRectangleDieline
                  ref={modelRef}
                  attribute={attributeStrickerRectangle}
                  displayUnit={displayUnit}
                  textureImageUrl={isTextureMode ? currentTexturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  onMeasure={setMeasuredBounds}
                />
              );

            case "becf10803":
              return (
                <Becf_10803_dieline
                  ref={modelRef}
                  attribute={attributeBecf_10803}
                  displayUnit={displayUnit}
                  renderMode={is3DMode ? "folded3d" : "dieline"}
                  frame={is3DMode ? tuckFrame : 0}
                  textureImageUrl={isTextureMode ? currentTexturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  onMeasure={setMeasuredBounds}
                />
              );

            case "becf11d01":
              return (
                <Becf_11d01_dieline
                  ref={modelRef}
                  attribute={attributeBecf_11d01}
                  displayUnit={displayUnit}
                  renderMode={is3DMode ? "folded3d" : "dieline"}
                  frame={is3DMode ? tuckFrame : 0}
                  textureImageUrl={isTextureMode ? currentTexturePreviewUrl ?? undefined : undefined}
                  texturePlacement={isTextureMode ? currentTexture : undefined}
                  onTexturePlacementChange={isTextureMode ? setCurrentTexture : undefined}
                  showDimensions={isTextureMode ? false : showDimensions}
                  showShapeLines
                  onMeasure={setMeasuredBounds}
                />
              );
            default:
              return null;
          }
        })()}
      </section>
    </div>
  );
};
