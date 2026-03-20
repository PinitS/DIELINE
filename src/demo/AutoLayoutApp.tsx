import { useState, useCallback } from "react";
import { getDielineModels } from "../lib/modelMetadata";
import { calculateAutoLayout } from "../utils/autoLayout/calculateAutoLayout";
import type { AutoLayoutPaper, AutoLayoutModelEntry, AutoLayoutPaperResult } from "../utils/autoLayout/types";
import type { DielineModelId, DielineModelMetadata } from "../types";

const LIBRARY_MODELS = getDielineModels();

// Add FlatLayout (TEST) as a demo-only model option
const FLAT_LAYOUT_META: DielineModelMetadata = {
  id: "flatlayout",
  name: "Flat Layout (TEST)",
  exportName: "FlatLayoutDieline",
  componentPath: "src/components/TEST/FlatLayoutDieline.tsx",
  modelDimensionType: "2D",
  attributes: [
    { name: "wingWidth", type: "number", description: "Wing width in mm", defaultValue: 100 },
    { name: "wingHeight", type: "number", description: "Wing height in mm", defaultValue: 80 },
    { name: "slotWidth", type: "number", description: "Slot width in mm", defaultValue: 70 },
    { name: "barHeight", type: "number", description: "Bar height in mm", defaultValue: 15 },
    { name: "tabWidth", type: "number", description: "Tab width in mm", defaultValue: 45 },
    { name: "tabHeight", type: "number", description: "Tab height in mm", defaultValue: 55 },
  ],
};

const MODEL_METADATA: readonly DielineModelMetadata[] = [...LIBRARY_MODELS, FLAT_LAYOUT_META];

let nextModelEntryId = 1;
let nextPaperId = 1;

const createDefaultAttributes = (modelId: DielineModelId): Record<string, unknown> => {
  const meta = MODEL_METADATA.find((m) => m.id === modelId);
  if (!meta) return {};
  const attrs: Record<string, unknown> = {};
  for (const attr of meta.attributes) {
    if (attr.defaultValue !== undefined) {
      attrs[attr.name] = attr.defaultValue;
    }
  }
  return attrs;
};

export const AutoLayoutApp = () => {
  // --- Models ---
  const [modelEntries, setModelEntries] = useState<AutoLayoutModelEntry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<DielineModelId>(MODEL_METADATA[0]?.id ?? "circle");
  const [editingAttributes, setEditingAttributes] = useState<Record<string, unknown>>(
    createDefaultAttributes(MODEL_METADATA[0]?.id ?? "circle"),
  );
  const [editingQuantity, setEditingQuantity] = useState(100);

  // --- Papers ---
  const [papers, setPapers] = useState<AutoLayoutPaper[]>([]);
  const [paperName, setPaperName] = useState("A3");
  const [paperWidth, setPaperWidth] = useState(420);
  const [paperHeight, setPaperHeight] = useState(297);

  // --- Layout config ---
  const [layoutDistance, setLayoutDistance] = useState(3);
  const [spacingLeft, setSpacingLeft] = useState(5);
  const [spacingRight, setSpacingRight] = useState(5);
  const [griper, setGriper] = useState(10);

  // --- Results ---
  const [results, setResults] = useState<AutoLayoutPaperResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultImageUrls, setResultImageUrls] = useState<Map<string, string>>(new Map());

  // --- Handlers ---

  const handleModelIdChange = (modelId: DielineModelId) => {
    setSelectedModelId(modelId);
    setEditingAttributes(createDefaultAttributes(modelId));
  };

  const handleAddModel = () => {
    const entry: AutoLayoutModelEntry = {
      id: `entry-${nextModelEntryId++}`,
      modelId: selectedModelId,
      attributes: { ...editingAttributes },
      quantity: editingQuantity,
    };
    setModelEntries((prev) => [...prev, entry]);
  };

  const handleRemoveModel = (entryId: string) => {
    setModelEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  const handleAddPaper = () => {
    const paper: AutoLayoutPaper = {
      id: `paper-${nextPaperId++}`,
      name: paperName,
      width: paperWidth,
      height: paperHeight,
    };
    setPapers((prev) => [...prev, paper]);
  };

  const handleRemovePaper = (paperId: string) => {
    setPapers((prev) => prev.filter((p) => p.id !== paperId));
  };

  const handleCalculate = useCallback(async () => {
    if (modelEntries.length === 0 || papers.length === 0) return;

    setIsCalculating(true);

    // Clean up old image URLs
    resultImageUrls.forEach((url) => URL.revokeObjectURL(url));
    setResultImageUrls(new Map());

    try {
      const layoutResults = await calculateAutoLayout({
        papers,
        models: modelEntries,
        layoutDistance,
        spacingLeft,
        spacingRight,
        griper,
      });
      // Create object URLs for images
      const urls = new Map<string, string>();
      for (const result of layoutResults) {
        urls.set(result.paperId, URL.createObjectURL(result.image));
      }

      setResults(layoutResults);
      setResultImageUrls(urls);
    } catch (err) {
      console.error("Auto layout calculation failed:", err);
    } finally {
      setIsCalculating(false);
    }
  }, [modelEntries, papers, layoutDistance, spacingLeft, spacingRight, griper, resultImageUrls]);

  const selectedMeta = MODEL_METADATA.find((m) => m.id === selectedModelId);

  return (
    <div className="demo-shell auto-layout-shell">
      <aside className="control-panel">
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>Auto Layout</h1>
          <p className="muted">Calculate optimal dieline placement on paper sheets.</p>
          <a href="#/" style={{ fontSize: 13, color: "#3b82f6" }}>← Back to Demo</a>
        </div>

        {/* --- Add Model --- */}
        <div className="summary-card">
          <h2>Add Model</h2>
          <label className="field">
            Dieline type
            <select value={selectedModelId} onChange={(e) => handleModelIdChange(e.target.value as DielineModelId)}>
              {MODEL_METADATA.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>

          {selectedMeta && (
            <div className="section-grid">
              {selectedMeta.attributes.map((attr) => (
                <label key={attr.name} className="field">
                  {attr.name} (mm)
                  <input
                    type="number"
                    min={0.1}
                    step={1}
                    value={(editingAttributes[attr.name] as number) ?? attr.defaultValue ?? 0}
                    onChange={(e) =>
                      setEditingAttributes((prev) => ({ ...prev, [attr.name]: Number(e.target.value) || 0.1 }))
                    }
                  />
                </label>
              ))}
            </div>
          )}

          <label className="field">
            Quantity
            <input
              type="number"
              min={1}
              step={1}
              value={editingQuantity}
              onChange={(e) => setEditingQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          <div className="toggle-row">
            <button type="button" onClick={handleAddModel}>+ Add Model</button>
          </div>
        </div>

        {/* --- Model List --- */}
        {modelEntries.length > 0 && (
          <div className="summary-card">
            <h2>Models ({modelEntries.length})</h2>
            {modelEntries.map((entry) => {
              const meta = MODEL_METADATA.find((m) => m.id === entry.modelId);
              return (
                <div key={entry.id} className="model-entry-item">
                  <div className="model-entry-info">
                    <strong>{meta?.name ?? entry.modelId}</strong>
                    <span className="muted">Qty: {entry.quantity}</span>
                  </div>
                  <button type="button" className="remove-btn" onClick={() => handleRemoveModel(entry.id)}>
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Add Paper --- */}
        <div className="summary-card">
          <h2>Add Paper</h2>
          <label className="field">
            Paper name
            <input
              type="text"
              value={paperName}
              onChange={(e) => setPaperName(e.target.value)}
              placeholder="e.g. A3, A2, Custom"
            />
          </label>
          <div className="section-grid">
            <label className="field">
              Width (mm)
              <input
                type="number"
                min={1}
                step={1}
                value={paperWidth}
                onChange={(e) => setPaperWidth(Number(e.target.value) || 1)}
              />
            </label>
            <label className="field">
              Height (mm)
              <input
                type="number"
                min={1}
                step={1}
                value={paperHeight}
                onChange={(e) => setPaperHeight(Number(e.target.value) || 1)}
              />
            </label>
          </div>
          <div className="toggle-row">
            <button type="button" onClick={handleAddPaper}>+ Add Paper</button>
          </div>
        </div>

        {/* --- Paper List --- */}
        {papers.length > 0 && (
          <div className="summary-card">
            <h2>Papers ({papers.length})</h2>
            {papers.map((p) => (
              <div key={p.id} className="model-entry-item">
                <div className="model-entry-info">
                  <strong>{p.name}</strong>
                  <span className="muted">{p.width} x {p.height} mm</span>
                </div>
                <button type="button" className="remove-btn" onClick={() => handleRemovePaper(p.id)}>
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* --- Layout Config --- */}
        <div className="summary-card">
          <h2>Layout Settings</h2>
          <div className="section-grid">
            <label className="field">
              Distance (mm)
              <input type="number" min={0} step={0.5} value={layoutDistance} onChange={(e) => setLayoutDistance(Number(e.target.value) || 0)} />
            </label>
            <label className="field">
              Griper (mm)
              <input type="number" min={0} step={0.5} value={griper} onChange={(e) => setGriper(Number(e.target.value) || 0)} />
            </label>
            <label className="field">
              Left spacing (mm)
              <input type="number" min={0} step={0.5} value={spacingLeft} onChange={(e) => setSpacingLeft(Number(e.target.value) || 0)} />
            </label>
            <label className="field">
              Right spacing (mm)
              <input type="number" min={0} step={0.5} value={spacingRight} onChange={(e) => setSpacingRight(Number(e.target.value) || 0)} />
            </label>
          </div>
        </div>

        {/* --- Calculate --- */}
        <div className="toggle-row">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={isCalculating || modelEntries.length === 0 || papers.length === 0}
            style={{ background: "#0f172a", color: "#fff", borderColor: "#0f172a", fontWeight: 700 }}
          >
            {isCalculating ? "Calculating..." : "Calculate Layout"}
          </button>
        </div>
      </aside>

      {/* --- Results Panel --- */}
      <section className="canvas-panel auto-layout-results">
        {results.length === 0 && !isCalculating && (
          <div className="auto-layout-empty">
            <p className="muted">Add models and papers, then click "Calculate Layout" to see results.</p>
          </div>
        )}

        {isCalculating && (
          <div className="auto-layout-empty">
            <p>Calculating layouts...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="auto-layout-results-grid">
            {results.map((result) => (
              <div key={result.paperId} className="paper-result-card">
                <div className="paper-result-header">
                  <h2>{result.paperName}</h2>
                  <span className="muted">{result.paperWidth} x {result.paperHeight} mm</span>
                  <span className="frame-badge">{result.summary.totalSheets} sheet{result.summary.totalSheets !== 1 ? "s" : ""}</span>
                  <span className="paper-lost-badge">
                    Paper lost: {result.summary.paperLost.toFixed(1)}%
                  </span>
                </div>

                {resultImageUrls.get(result.paperId) && (
                  <div className="variation-image-wrapper">
                    <img src={resultImageUrls.get(result.paperId)} alt={`Layout for ${result.paperName}`} className="variation-image" />
                  </div>
                )}

                <div className="variation-summary">
                  <div className="calc-row" style={{ fontWeight: 700 }}>
                    <span>Total sheets needed</span>
                    <strong>{result.summary.totalSheets} sheet{result.summary.totalSheets !== 1 ? "s" : ""}</strong>
                  </div>

                  {result.summary.calculator.some((c) => c.excessCount > 0) && (
                    <>
                      <h4>Excess:</h4>
                      {result.summary.calculator.filter((c) => c.excessCount > 0).map((calc) => {
                        const meta = MODEL_METADATA.find((m) => m.id === calc.modelId);
                        return (
                          <div key={calc.modelId} className="calc-row">
                            <span>{meta?.name ?? calc.modelId}</span>
                            <span className="surplus-badge">+{calc.excessCount} pcs</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
