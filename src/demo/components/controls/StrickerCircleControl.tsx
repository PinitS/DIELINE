import type { ChangeEvent } from "react";
import { DEFAULT_CIRCLE_ATTRIBUTES, formatDielineDisplayValue } from "../../../index";
import type { CircleAttributes, DielineBounds, DisplayUnit, TexturePlacement } from "../../../types";
import type { DemoViewMode } from "../../demoTypes";

type StrickerCircleControlProps = {
  viewMode: DemoViewMode;
  displayUnit: DisplayUnit;
  showDimensions: boolean;
  measuredBounds: DielineBounds;
  attribute: CircleAttributes;
  setAttribute: (attr: CircleAttributes) => void;
  texture: TexturePlacement | undefined;
  texturePreviewUrl: string | null;
  textureFileName: string;
  textureControlsDisabled: boolean;
  onDisplayUnitChange: (unit: DisplayUnit) => void;
  onToggleDimensions: () => void;
  onTextureUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpdateTexturePlacement: (key: "offsetXRatio" | "offsetYRatio" | "scale", value: number) => void;
  onResetTexturePlacement: () => void;
  onResetCanvasView: () => void;
};

export const StrickerCircleControl = ({
  viewMode,
  displayUnit,
  showDimensions,
  measuredBounds,
  attribute,
  setAttribute,
  texture,
  texturePreviewUrl,
  textureFileName,
  textureControlsDisabled,
  onDisplayUnitChange,
  onToggleDimensions,
  onTextureUpload,
  onUpdateTexturePlacement,
  onResetTexturePlacement,
  onResetCanvasView,
}: StrickerCircleControlProps) => {
  if (viewMode === "texture") {
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

        {texture && (
          <div className="summary-card texture-actions">
            <h2>Texture controls</h2>

            <label className="field">
              Scale ({texture.scale.toFixed(2)}x)
              <div className="texture-control-row">
                <input
                  type="range"
                  min={0.1}
                  max={8}
                  step={0.01}
                  value={texture.scale}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("scale", Number(event.target.value))}
                />
                <input
                  className="texture-number-input"
                  type="number"
                  min={0.1}
                  max={8}
                  step={0.01}
                  value={texture.scale}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("scale", Number(event.target.value) || 0.1)}
                />
              </div>
            </label>

            <label className="field">
              Offset X ({(texture.offsetXRatio * 100).toFixed(1)}%)
              <div className="texture-control-row">
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={1}
                  value={texture.offsetXRatio * 100}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("offsetXRatio", Number(event.target.value) / 100)}
                />
                <input
                  className="texture-number-input"
                  type="number"
                  min={-200}
                  max={200}
                  step={0.5}
                  value={(texture.offsetXRatio * 100).toFixed(1)}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("offsetXRatio", Number(event.target.value) / 100 || 0)}
                />
              </div>
            </label>

            <label className="field">
              Offset Y ({(texture.offsetYRatio * 100).toFixed(1)}%)
              <div className="texture-control-row">
                <input
                  type="range"
                  min={-200}
                  max={200}
                  step={1}
                  value={texture.offsetYRatio * 100}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("offsetYRatio", Number(event.target.value) / 100)}
                />
                <input
                  className="texture-number-input"
                  type="number"
                  min={-200}
                  max={200}
                  step={0.5}
                  value={(texture.offsetYRatio * 100).toFixed(1)}
                  disabled={textureControlsDisabled}
                  onChange={(event) => onUpdateTexturePlacement("offsetYRatio", Number(event.target.value) / 100 || 0)}
                />
              </div>
            </label>
          </div>
        )}

        <div className="toggle-row">
          <button type="button" onClick={onResetTexturePlacement} disabled={!texturePreviewUrl}>Reset texture placement</button>
          <button type="button" onClick={onResetCanvasView}>Reset canvas view</button>
        </div>

        <p className="file-meta">
          {textureFileName || "No image uploaded yet."}
        </p>

        {texture && (
          <div className="summary-card texture-actions">
            <h2>Texture data for DB/API</h2>
            <div className="texture-meta-grid">
              <div className="texture-meta-item">
                <span>hasTexture</span>
                <strong>{texture.hasTexture ? "true" : "false"}</strong>
              </div>
              <div className="texture-meta-item">
                <span>texture size</span>
                <strong>{texture.imageWidth > 0 && texture.imageHeight > 0
                  ? `${texture.imageWidth} × ${texture.imageHeight}px`
                  : "-"}</strong>
              </div>
              <div className="texture-meta-item">
                <span>offset X</span>
                <strong>{`${(texture.offsetXRatio * 100).toFixed(2)}%`}</strong>
              </div>
              <div className="texture-meta-item">
                <span>offset Y</span>
                <strong>{`${(texture.offsetYRatio * 100).toFixed(2)}%`}</strong>
              </div>
              <div className="texture-meta-item texture-meta-item-wide">
                <span>scale</span>
                <strong>{`${texture.scale.toFixed(3)}x`}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // dieline view mode
  return (
    <>
      <div className="section-grid">
        <label className="field">Display unit
          <select value={displayUnit} onChange={(event) => onDisplayUnitChange(event.target.value as DisplayUnit)}>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
        </label>
      </div>

      <label className="field">Circle size (mm)
        <input
          type="number"
          min={1}
          step={1}
          value={attribute.size ?? DEFAULT_CIRCLE_ATTRIBUTES.size}
          onChange={(event) => setAttribute({ size: Number(event.target.value) || 1 })}
        />
      </label>

      <div className="toggle-row">
        <button type="button" onClick={onToggleDimensions}>{showDimensions ? "Hide" : "Show"} dimensions</button>
      </div>

      <div className="summary-card">
        <h2>Measured bounds</h2>
        <p>{`Overall width: ${formatDielineDisplayValue(measuredBounds.overallWidthMm, displayUnit)}`}</p>
        <p>{`Overall height: ${formatDielineDisplayValue(measuredBounds.overallHeightMm, displayUnit)}`}</p>
      </div>
    </>
  );
};
