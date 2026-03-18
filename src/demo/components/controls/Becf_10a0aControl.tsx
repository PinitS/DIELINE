import type { ChangeEvent } from "react";
import { DEFAULT_BECF10A0A_ATTRIBUTES } from "../../../defaults";
import type { Becf10a0aAttributes, DielineBounds, DisplayUnit, TexturePlacement } from "../../../types";
import { formatDielineDisplayValue } from "../../../utils/units";
import type { DemoViewMode } from "../../demoTypes";

type Becf_10a0aControlProps = {
  viewMode: DemoViewMode;
  displayUnit: DisplayUnit;
  showDimensions: boolean;
  measuredBounds: DielineBounds;
  attribute: Becf10a0aAttributes;
  setAttribute: (attr: Becf10a0aAttributes) => void;
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

export const Becf_10a0aControl = ({
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
}: Becf_10a0aControlProps) => {
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
        <label className="field">length (mm)<input type="number" min={1} step={0.5} value={attribute.length ?? DEFAULT_BECF10A0A_ATTRIBUTES.length} onChange={(event) => setAttribute({ ...attribute, length: Number(event.target.value) || 1 })} /></label>
        <label className="field">height (mm)<input type="number" min={1} step={0.5} value={attribute.height ?? DEFAULT_BECF10A0A_ATTRIBUTES.height} onChange={(event) => setAttribute({ ...attribute, height: Number(event.target.value) || 1 })} /></label>
        <label className="field">width (mm)<input type="number" min={1} step={0.5} value={attribute.width ?? DEFAULT_BECF10A0A_ATTRIBUTES.width} onChange={(event) => setAttribute({ ...attribute, width: Number(event.target.value) || 1 })} /></label>
        <label className="field">closurePanel (mm)<input type="number" min={1} step={0.5} value={attribute.closurePanel ?? DEFAULT_BECF10A0A_ATTRIBUTES.closurePanel} onChange={(event) => setAttribute({ ...attribute, closurePanel: Number(event.target.value) || 1 })} /></label>
        <label className="field">topClosurePanel (mm)<input type="number" min={1} step={0.5} value={attribute.topClosurePanel ?? DEFAULT_BECF10A0A_ATTRIBUTES.topClosurePanel} onChange={(event) => setAttribute({ ...attribute, topClosurePanel: Number(event.target.value) || 1 })} /></label>
        <label className="field">dustFlap (mm)<input type="number" min={1} step={0.5} value={attribute.dustFlap ?? DEFAULT_BECF10A0A_ATTRIBUTES.dustFlap} onChange={(event) => setAttribute({ ...attribute, dustFlap: Number(event.target.value) || 1 })} /></label>
        <label className="field">glueWidth (mm)<input type="number" min={1} step={0.5} value={attribute.glueWidth ?? DEFAULT_BECF10A0A_ATTRIBUTES.glueWidth} onChange={(event) => setAttribute({ ...attribute, glueWidth: Number(event.target.value) || 1 })} /></label>
        <label className="field">tuckFlap (mm)<input type="number" min={1} step={0.5} value={attribute.tuckFlap ?? DEFAULT_BECF10A0A_ATTRIBUTES.tuckFlap} onChange={(event) => setAttribute({ ...attribute, tuckFlap: Number(event.target.value) || 1 })} /></label>
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

