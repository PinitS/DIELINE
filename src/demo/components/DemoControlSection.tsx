import type { ChangeEvent } from "react";
import {
  TUCK_END_BOX_FOLD_FRAME_COUNT,
  TUCK_END_BOX_FOLD_SEQUENCE,
  formatDielineDisplayValue,
} from "../../index";
import type {
  DielineBounds,
  DielineModelId,
  DielineModelMetadata,
  DisplayUnit,
  TexturePlacement,
} from "../../types";
import type { DemoViewMode } from "../demoTypes";

type DemoControlSectionProps = {
  viewMode: DemoViewMode;
  shapeType: DielineModelId;
  modelMetadata: readonly DielineModelMetadata[];
  displayUnit: DisplayUnit;
  showDimensions: boolean;
  measuredBounds: DielineBounds;
  refSnapshot: { width: number; height: number };
  circleSize: number;
  rectWidth: number;
  rectHeight: number;
  tuckLength: number;
  tuckWidth: number;
  tuckHeight: number;
  tuckClosurePanel: number;
  tuckDustFlap: number;
  tuckGlueWidth: number;
  tuckFlap: number;
  tuckFrame: number;
  texturePreviewUrl: string | null;
  textureFileName: string;
  texturePlacement: TexturePlacement;
  textureControlsDisabled: boolean;
  onShapeTypeChange: (shapeType: DielineModelId) => void;
  onDisplayUnitChange: (unit: DisplayUnit) => void;
  onCircleSizeChange: (value: number) => void;
  onRectWidthChange: (value: number) => void;
  onRectHeightChange: (value: number) => void;
  onTuckLengthChange: (value: number) => void;
  onTuckWidthChange: (value: number) => void;
  onTuckHeightChange: (value: number) => void;
  onTuckClosurePanelChange: (value: number) => void;
  onTuckDustFlapChange: (value: number) => void;
  onTuckGlueWidthChange: (value: number) => void;
  onTuckFlapChange: (value: number) => void;
  onTuckFrameChange: (value: number) => void;
  onToggleDimensions: () => void;
  onReadSizeFromRef: () => void;
  onTextureUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpdateTexturePlacement: (key: "offsetXRatio" | "offsetYRatio" | "scale", value: number) => void;
  onResetTexturePlacement: () => void;
  onResetCanvasView: () => void;
};

export const DemoControlSection = ({
  viewMode,
  shapeType,
  modelMetadata,
  displayUnit,
  showDimensions,
  measuredBounds,
  refSnapshot,
  circleSize,
  rectWidth,
  rectHeight,
  tuckLength,
  tuckWidth,
  tuckHeight,
  tuckClosurePanel,
  tuckDustFlap,
  tuckGlueWidth,
  tuckFlap,
  tuckFrame,
  texturePreviewUrl,
  textureFileName,
  texturePlacement,
  textureControlsDisabled,
  onShapeTypeChange,
  onDisplayUnitChange,
  onCircleSizeChange,
  onRectWidthChange,
  onRectHeightChange,
  onTuckLengthChange,
  onTuckWidthChange,
  onTuckHeightChange,
  onTuckClosurePanelChange,
  onTuckDustFlapChange,
  onTuckGlueWidthChange,
  onTuckFlapChange,
  onTuckFrameChange,
  onToggleDimensions,
  onReadSizeFromRef,
  onTextureUpload,
  onUpdateTexturePlacement,
  onResetTexturePlacement,
  onResetCanvasView,
}: DemoControlSectionProps) => {
  const currentFoldStepIndex = Math.min(
    TUCK_END_BOX_FOLD_SEQUENCE.length - 1,
    Math.floor((tuckFrame / Math.max(TUCK_END_BOX_FOLD_FRAME_COUNT - 1, 1)) * TUCK_END_BOX_FOLD_SEQUENCE.length),
  );

  switch (viewMode) {
    case "3d":
      return (
        <div className="summary-card frame-card">
          <div className="frame-meta-row">
            <h2>Fold keyframes</h2>
            <span className="frame-badge">{`Frame ${tuckFrame + 1} / ${TUCK_END_BOX_FOLD_FRAME_COUNT}`}</span>
          </div>
          <label className="field">
            <span>{`Current step: ${TUCK_END_BOX_FOLD_SEQUENCE[currentFoldStepIndex]}`}</span>
            <input
              className="frame-slider"
              type="range"
              min={0}
              max={TUCK_END_BOX_FOLD_FRAME_COUNT - 1}
              step={1}
              value={tuckFrame}
              onChange={(event) => onTuckFrameChange(Number(event.target.value))}
            />
          </label>
          <div className="frame-range-labels">
            <span>First frame</span>
            <span>Last frame</span>
          </div>
          <ol className="fold-sequence-list">
            {TUCK_END_BOX_FOLD_SEQUENCE.map((step, index) => (
              <li key={step} className={index === currentFoldStepIndex ? "is-current" : ""}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      );

    case "texture":
      return (
        <div className="upload-card">
          <div>
            <h2>Texture image</h2>
            <p className="muted">Save the values below to DB so the same texture placement can be restored after loading from API.</p>
          </div>

          <label className="upload-field">
            <span>{texturePreviewUrl ? "Change image" : "Upload image"}</span>
            <input type="file" accept="image/*" onChange={onTextureUpload} />
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
                  onChange={(event) => onUpdateTexturePlacement("scale", Number(event.target.value))}
                />
                <input
                  className="texture-number-input"
                  type="number"
                  min={0.1}
                  max={8}
                  step={0.01}
                  value={texturePlacement.scale}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("scale", Number(event.target.value) || 0.1)}
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
                  onChange={(event) => onUpdateTexturePlacement("offsetXRatio", Number(event.target.value) / 100)}
                />
                <input
                  className="texture-number-input"
                  type="number"
                  min={-200}
                  max={200}
                  step={0.5}
                  value={(texturePlacement.offsetXRatio * 100).toFixed(1)}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("offsetXRatio", Number(event.target.value) / 100 || 0)}
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
                  onChange={(event) => onUpdateTexturePlacement("offsetYRatio", Number(event.target.value) / 100)}
                />
                <input
                  className="texture-number-input"
                  type="number"
                  min={-200}
                  max={200}
                  step={0.5}
                  value={(texturePlacement.offsetYRatio * 100).toFixed(1)}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("offsetYRatio", Number(event.target.value) / 100 || 0)}
                />
              </div>
            </label>
          </div>

          <div className="toggle-row">
            <button type="button" onClick={onResetTexturePlacement} disabled={!texturePreviewUrl}>Reset texture placement</button>
            <button type="button" onClick={onResetCanvasView}>Reset canvas view</button>
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
      );

    case "dieline":
    default:
      return (
        <>
          <div className="section-grid">
            <label className="field">Dieline type
              <select value={shapeType} onChange={(event) => onShapeTypeChange(event.target.value as DielineModelId)}>
                {modelMetadata.map((model) => (
                  <option key={model.id} value={model.id}>{`${model.name} (${model.dimensionType})`}</option>
                ))}
              </select>
            </label>
            <label className="field">Display unit
              <select value={displayUnit} onChange={(event) => onDisplayUnitChange(event.target.value as DisplayUnit)}>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </label>
          </div>

          {shapeType === "circle" ? (
            <label className="field">Circle size (mm)
              <input type="number" min={1} step={1} value={circleSize} onChange={(event) => onCircleSizeChange(Number(event.target.value) || 1)} />
            </label>
          ) : shapeType === "rectangle" ? (
            <div className="section-grid">
              <label className="field">Rectangle width (mm)
                <input type="number" min={1} step={1} value={rectWidth} onChange={(event) => onRectWidthChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">Rectangle height (mm)
                <input type="number" min={1} step={1} value={rectHeight} onChange={(event) => onRectHeightChange(Number(event.target.value) || 1)} />
              </label>
            </div>
          ) : (
            <div className="section-grid">
              <label className="field">A : length (mm)
                <input type="number" min={1} step={1} value={tuckLength} onChange={(event) => onTuckLengthChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">B : width (mm)
                <input type="number" min={1} step={1} value={tuckWidth} onChange={(event) => onTuckWidthChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">C : height (mm)
                <input type="number" min={1} step={1} value={tuckHeight} onChange={(event) => onTuckHeightChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">closurePanel (mm)
                <input type="number" min={1} step={1} value={tuckClosurePanel} onChange={(event) => onTuckClosurePanelChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">dustFlap (mm)
                <input type="number" min={1} step={1} value={tuckDustFlap} onChange={(event) => onTuckDustFlapChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">glueWidth (mm)
                <input type="number" min={1} step={1} value={tuckGlueWidth} onChange={(event) => onTuckGlueWidthChange(Number(event.target.value) || 1)} />
              </label>
              <label className="field">tuckFlap (mm)
                <input type="number" min={1} step={1} value={tuckFlap} onChange={(event) => onTuckFlapChange(Number(event.target.value) || 1)} />
              </label>
            </div>
          )}

          <div className="toggle-row">
            <button type="button" onClick={onToggleDimensions}>{showDimensions ? "Hide" : "Show"} dimensions</button>
            <button type="button" onClick={onReadSizeFromRef}>Read size from ref API</button>
          </div>

          <div className="summary-card">
            <h2>Measured bounds</h2>
            <p>{`Overall width: ${formatDielineDisplayValue(measuredBounds.overallWidthMm, displayUnit)}`}</p>
            <p>{`Overall height: ${formatDielineDisplayValue(measuredBounds.overallHeightMm, displayUnit)}`}</p>
            <p>{`Ref width (mm): ${refSnapshot.width.toFixed(2)}`}</p>
            <p>{`Ref height (mm): ${refSnapshot.height.toFixed(2)}`}</p>
          </div>
        </>
      );
  }
};