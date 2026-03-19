import type { DielineBounds, DisplayUnit } from "../../../types";
import { formatDielineDisplayValue } from "../../../utils/units";
import { DEFAULT_FLAT_LAYOUT_ATTRIBUTES, type FlatLayoutAttributes } from "../../../../TEST/FlatLayoutDieline";

type FlatLayoutControlProps = {
  displayUnit: DisplayUnit;
  showDimensions: boolean;
  measuredBounds: DielineBounds;
  attribute: FlatLayoutAttributes;
  setAttribute: (attr: FlatLayoutAttributes) => void;
  onDisplayUnitChange: (unit: DisplayUnit) => void;
  onToggleDimensions: () => void;
  onResetCanvasView: () => void;
};

export const FlatLayoutControl = ({
  displayUnit,
  showDimensions,
  measuredBounds,
  attribute,
  setAttribute,
  onDisplayUnitChange,
  onToggleDimensions,
  onResetCanvasView,
}: FlatLayoutControlProps) => (
  <>
    <div className="section-row">
      <label className="field">Display unit
        <select value={displayUnit} onChange={(e) => onDisplayUnitChange(e.target.value as DisplayUnit)}>
          <option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option>
        </select>
      </label>
    </div>
    <div className="section-grid">
      <label className="field">wingWidth (mm)
        <input type="number" min={1} step={0.5} value={attribute.wingWidth ?? DEFAULT_FLAT_LAYOUT_ATTRIBUTES.wingWidth} onChange={(e) => setAttribute({ ...attribute, wingWidth: Number(e.target.value) || 1 })} />
      </label>
      <label className="field">wingHeight (mm)
        <input type="number" min={1} step={0.5} value={attribute.wingHeight ?? DEFAULT_FLAT_LAYOUT_ATTRIBUTES.wingHeight} onChange={(e) => setAttribute({ ...attribute, wingHeight: Number(e.target.value) || 1 })} />
      </label>
      <label className="field">slotWidth (mm)
        <input type="number" min={1} step={0.5} value={attribute.slotWidth ?? DEFAULT_FLAT_LAYOUT_ATTRIBUTES.slotWidth} onChange={(e) => setAttribute({ ...attribute, slotWidth: Number(e.target.value) || 1 })} />
      </label>
      <label className="field">barHeight (mm)
        <input type="number" min={1} step={0.5} value={attribute.barHeight ?? DEFAULT_FLAT_LAYOUT_ATTRIBUTES.barHeight} onChange={(e) => setAttribute({ ...attribute, barHeight: Number(e.target.value) || 1 })} />
      </label>
      <label className="field">tabWidth (mm)
        <input type="number" min={1} step={0.5} value={attribute.tabWidth ?? DEFAULT_FLAT_LAYOUT_ATTRIBUTES.tabWidth} onChange={(e) => setAttribute({ ...attribute, tabWidth: Number(e.target.value) || 1 })} />
      </label>
      <label className="field">tabHeight (mm)
        <input type="number" min={1} step={0.5} value={attribute.tabHeight ?? DEFAULT_FLAT_LAYOUT_ATTRIBUTES.tabHeight} onChange={(e) => setAttribute({ ...attribute, tabHeight: Number(e.target.value) || 1 })} />
      </label>
    </div>
    <div className="toggle-row">
      <button type="button" onClick={onToggleDimensions}>{showDimensions ? "Hide" : "Show"} dimensions</button>
      <button type="button" onClick={onResetCanvasView}>Reset canvas view</button>
    </div>
    <div className="summary-card">
      <h2>Measured bounds</h2>
      <p>{`Overall width: ${formatDielineDisplayValue(measuredBounds.overallWidthMm, displayUnit)}`}</p>
      <p>{`Overall height: ${formatDielineDisplayValue(measuredBounds.overallHeightMm, displayUnit)}`}</p>
    </div>
  </>
);

