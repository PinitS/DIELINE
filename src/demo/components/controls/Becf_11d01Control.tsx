import type { ChangeEvent } from "react";
import { DEFAULT_BECF11D01_ATTRIBUTES } from "../../../defaults";
import type { Becf11d01Attributes, DielineBounds, DisplayUnit, TexturePlacement } from "../../../types";
import { BECF11D01_FOLD_FRAME_COUNT, BECF11D01_FOLD_SEQUENCE } from "../../../utils/becf11d01Geometry";
import { formatDielineDisplayValue } from "../../../utils/units";
import type { DemoViewMode } from "../../demoTypes";

type Becf_11d01ControlProps = {
  viewMode: DemoViewMode;
  displayUnit: DisplayUnit;
  showDimensions: boolean;
  measuredBounds: DielineBounds;
  attribute: Becf11d01Attributes;
  setAttribute: (attr: Becf11d01Attributes) => void;
  texture: TexturePlacement | undefined;
  texturePreviewUrl: string | null;
  textureFileName: string;
  textureControlsDisabled: boolean;
  tuckFrame: number;
  onDisplayUnitChange: (unit: DisplayUnit) => void;
  onTuckFrameChange: (frame: number) => void;
  onToggleDimensions: () => void;
  onTextureUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpdateTexturePlacement: (key: "offsetXRatio" | "offsetYRatio" | "scale", value: number) => void;
  onResetTexturePlacement: () => void;
  onResetCanvasView: () => void;
};

export const Becf_11d01Control = ({
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
  tuckFrame,
  onDisplayUnitChange,
  onTuckFrameChange,
  onToggleDimensions,
  onTextureUpload,
  onUpdateTexturePlacement,
  onResetTexturePlacement,
  onResetCanvasView,
}: Becf_11d01ControlProps) => {
  const currentFoldStepIndex = Math.min(
    BECF11D01_FOLD_SEQUENCE.length - 1,
    Math.floor((tuckFrame / Math.max(BECF11D01_FOLD_FRAME_COUNT - 1, 1)) * BECF11D01_FOLD_SEQUENCE.length),
  );

  if (viewMode === "3d") {
    return (
      <div className="summary-card frame-card">
        <div className="frame-meta-row">
          <h2>Fold keyframes</h2>
          <span className="frame-badge">{`Frame ${tuckFrame + 1} / ${BECF11D01_FOLD_FRAME_COUNT}`}</span>
        </div>
        <label className="field">
          <span>{`Current step: ${BECF11D01_FOLD_SEQUENCE[currentFoldStepIndex]}`}</span>
          <input className="frame-slider" type="range" min={0} max={BECF11D01_FOLD_FRAME_COUNT - 1} step={1} value={tuckFrame} onChange={(event) => onTuckFrameChange(Number(event.target.value))} />
        </label>
        <div className="frame-range-labels"><span>First frame</span><span>Last frame</span></div>
        <ol className="fold-sequence-list">
          {BECF11D01_FOLD_SEQUENCE.map((step, index) => <li key={step} className={index === currentFoldStepIndex ? "is-current" : ""}>{step}</li>)}
        </ol>
      </div>
    );
  }

  if (viewMode === "texture") {
    return (
      <div className="upload-card">
        <div><h2>Texture image</h2><p className="muted">Save these values if you want to restore texture placement from DB/API later.</p></div>
        <label className="upload-field"><span>{texturePreviewUrl ? "Change image" : "Upload image"}</span><input type="file" accept="image/*" onChange={onTextureUpload} /></label>
        {texture && (
          <div className="summary-card texture-actions">
            <h2>Texture controls</h2>
            <label className="field">Scale ({texture.scale.toFixed(2)}x)<div className="texture-control-row"><input type="range" min={0.1} max={8} step={0.01} value={texture.scale} disabled={textureControlsDisabled} onChange={(event) => onUpdateTexturePlacement("scale", Number(event.target.value))} /><input className="texture-number-input" type="number" min={0.1} max={8} step={0.01} value={texture.scale} disabled={textureControlsDisabled} onChange={(event) => onUpdateTexturePlacement("scale", Number(event.target.value) || 0.1)} /></div></label>
            <label className="field">Offset X ({(texture.offsetXRatio * 100).toFixed(1)}%)<div className="texture-control-row"><input type="range" min={-200} max={200} step={1} value={texture.offsetXRatio * 100} disabled={textureControlsDisabled} onChange={(event) => onUpdateTexturePlacement("offsetXRatio", Number(event.target.value) / 100)} /><input className="texture-number-input" type="number" min={-200} max={200} step={0.5} value={(texture.offsetXRatio * 100).toFixed(1)} disabled={textureControlsDisabled} onChange={(event) => onUpdateTexturePlacement("offsetXRatio", Number(event.target.value) / 100 || 0)} /></div></label>
            <label className="field">Offset Y ({(texture.offsetYRatio * 100).toFixed(1)}%)<div className="texture-control-row"><input type="range" min={-200} max={200} step={1} value={texture.offsetYRatio * 100} disabled={textureControlsDisabled} onChange={(event) => onUpdateTexturePlacement("offsetYRatio", Number(event.target.value) / 100)} /><input className="texture-number-input" type="number" min={-200} max={200} step={0.5} value={(texture.offsetYRatio * 100).toFixed(1)} disabled={textureControlsDisabled} onChange={(event) => onUpdateTexturePlacement("offsetYRatio", Number(event.target.value) / 100 || 0)} /></div></label>
          </div>
        )}
        <div className="toggle-row"><button type="button" onClick={onResetTexturePlacement} disabled={!texturePreviewUrl}>Reset texture placement</button><button type="button" onClick={onResetCanvasView}>Reset canvas view</button></div>
        <p className="file-meta">{textureFileName || "No image uploaded yet."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="section-grid">
        <label className="field">Display unit
          <select value={displayUnit} onChange={(event) => onDisplayUnitChange(event.target.value as DisplayUnit)}><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select>
        </label>
      </div>
      <div className="section-grid">
        <label className="field">length (mm)<input type="number" min={1} step={0.5} value={attribute.length ?? DEFAULT_BECF11D01_ATTRIBUTES.length} onChange={(event) => setAttribute({ ...attribute, length: Number(event.target.value) || 1 })} /></label>
        <label className="field">height (mm)<input type="number" min={1} step={0.5} value={attribute.height ?? DEFAULT_BECF11D01_ATTRIBUTES.height} onChange={(event) => setAttribute({ ...attribute, height: Number(event.target.value) || 1 })} /></label>
        <label className="field">width (mm)<input type="number" min={1} step={0.5} value={attribute.width ?? DEFAULT_BECF11D01_ATTRIBUTES.width} onChange={(event) => setAttribute({ ...attribute, width: Number(event.target.value) || 1 })} /></label>
        <label className="field">closurePanel (mm)<input type="number" min={1} step={0.5} value={attribute.closurePanel ?? DEFAULT_BECF11D01_ATTRIBUTES.closurePanel} onChange={(event) => setAttribute({ ...attribute, closurePanel: Number(event.target.value) || 1 })} /></label>
        <label className="field">dustFlap (mm)<input type="number" min={1} step={0.5} value={attribute.dustFlap ?? DEFAULT_BECF11D01_ATTRIBUTES.dustFlap} onChange={(event) => setAttribute({ ...attribute, dustFlap: Number(event.target.value) || 1 })} /></label>
        <label className="field">glueWidth (mm)<input type="number" min={1} step={0.5} value={attribute.glueWidth ?? DEFAULT_BECF11D01_ATTRIBUTES.glueWidth} onChange={(event) => setAttribute({ ...attribute, glueWidth: Number(event.target.value) || 1 })} /></label>
        <label className="field">flapInset (mm)<input type="number" min={0.1} step={0.1} value={attribute.flapInset ?? DEFAULT_BECF11D01_ATTRIBUTES.flapInset} onChange={(event) => setAttribute({ ...attribute, flapInset: Number(event.target.value) || 0.1 })} /></label>
      </div>
      <div className="toggle-row"><button type="button" onClick={onToggleDimensions}>{showDimensions ? "Hide" : "Show"} dimensions</button></div>
      <div className="summary-card">
        <h2>Measured bounds</h2>
        <p>{`Overall width: ${formatDielineDisplayValue(measuredBounds.overallWidthMm, displayUnit)}`}</p>
        <p>{`Overall height: ${formatDielineDisplayValue(measuredBounds.overallHeightMm, displayUnit)}`}</p>
      </div>
    </>
  );
};