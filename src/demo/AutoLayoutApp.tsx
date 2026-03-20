import { useState, useCallback } from "react";
import { getDielineModels } from "../lib/modelMetadata";
import { calculateAutoLayout } from "../utils/autoLayout/calculateAutoLayout";
import type { AutoLayoutPaper, AutoLayoutModelEntry, AutoLayoutPaperResult, AutoLayoutStrategy } from "../utils/autoLayout/types";
import { STRATEGY_LABELS, ALL_STRATEGIES } from "../utils/autoLayout/types";
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

const PAPER_PRESETS = [
  { label: "A2 (420\u00d7594)", name: "A2", width: 420, height: 594 },
  { label: "A3 (420\u00d7297)", name: "A3", width: 420, height: 297 },
  { label: "A4 (210\u00d7297)", name: "A4", width: 210, height: 297 },
  { label: "Custom", name: "Custom", width: 0, height: 0 },
] as const;

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

// Color palette for algorithm buttons
const STRATEGY_COLORS: Record<AutoLayoutStrategy, string> = {
  'shelf': '#0f172a',
  'nest': '#dc2626',
  'shelf-standard': '#2563eb',
  'nfp-standard': '#9333ea',
  'guillotine': '#059669',
  'maxrects': '#d97706',
  'skyline': '#0891b2',
  'bottom-left': '#be185d',
};

type CompareResult = {
  strategy: AutoLayoutStrategy;
  results: AutoLayoutPaperResult[];
  imageUrls: Map<string, string>;
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
  const [selectedPaperPreset, setSelectedPaperPreset] = useState("A3");
  const [paperName, setPaperName] = useState("A3");
  const [paperWidth, setPaperWidth] = useState(420);
  const [paperHeight, setPaperHeight] = useState(297);

  // --- Layout config ---
  const [layoutDistance, setLayoutDistance] = useState(3);
  const [spacingLeft, setSpacingLeft] = useState(5);
  const [spacingRight, setSpacingRight] = useState(5);
  const [griper, setGriper] = useState(10);

  // --- Algorithm selection ---
  const [selectedStrategy, setSelectedStrategy] = useState<AutoLayoutStrategy>('shelf');
  const [includedInCompare, setIncludedInCompare] = useState<Set<AutoLayoutStrategy>>(new Set(['shelf', 'shelf-standard']));

  // --- Results (single algorithm) ---
  const [results, setResults] = useState<AutoLayoutPaperResult[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultImageUrls, setResultImageUrls] = useState<Map<string, string>>(new Map());

  // --- Compare All results ---
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareProgress, setCompareProgress] = useState<{ current: number; total: number; strategy: string }>({ current: 0, total: 0, strategy: "" });

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

  const handlePaperPresetChange = (presetName: string) => {
    setSelectedPaperPreset(presetName);
    const preset = PAPER_PRESETS.find((p) => p.name === presetName);
    if (preset && presetName !== "Custom") {
      setPaperName(preset.name);
      setPaperWidth(preset.width);
      setPaperHeight(preset.height);
    }
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

  const cleanupImageUrls = useCallback(() => {
    resultImageUrls.forEach((url) => URL.revokeObjectURL(url));
    setResultImageUrls(new Map());
    for (const cr of compareResults) {
      cr.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    }
    setCompareResults([]);
  }, [resultImageUrls, compareResults]);

  const handleCalculate = useCallback(async (strategy: AutoLayoutStrategy) => {
    if (modelEntries.length === 0 || papers.length === 0) return;

    setIsCalculating(true);
    cleanupImageUrls();

    try {
      const layoutResults = await calculateAutoLayout({
        papers,
        models: modelEntries,
        layoutDistance,
        spacingLeft,
        spacingRight,
        griper,
        strategy,
      });

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
  }, [modelEntries, papers, layoutDistance, spacingLeft, spacingRight, griper, cleanupImageUrls]);

  const handleCompareAll = useCallback(async () => {
    if (modelEntries.length === 0 || papers.length === 0) return;

    setIsComparing(true);
    cleanupImageUrls();
    setResults([]);

    try {
      const allResults: CompareResult[] = [];
      const strategies = ALL_STRATEGIES.filter((s) => includedInCompare.has(s));

      for (let i = 0; i < strategies.length; i++) {
        const strategy = strategies[i];
        setCompareProgress({ current: i + 1, total: strategies.length, strategy: STRATEGY_LABELS[strategy] });
        const layoutResults = await calculateAutoLayout({
          papers,
          models: modelEntries,
          layoutDistance,
          spacingLeft,
          spacingRight,
          griper,
          strategy,
        });

        const urls = new Map<string, string>();
        for (const result of layoutResults) {
          const key = `${strategy}-${result.paperId}`;
          urls.set(key, URL.createObjectURL(result.image));
        }

        allResults.push({ strategy, results: layoutResults, imageUrls: urls });
      }

      setCompareResults(allResults);
    } catch (err) {
      console.error("Compare all failed:", err);
    } finally {
      setIsComparing(false);
    }
  }, [modelEntries, papers, layoutDistance, spacingLeft, spacingRight, griper, includedInCompare, cleanupImageUrls]);

  const selectedMeta = MODEL_METADATA.find((m) => m.id === selectedModelId);
  const isBusy = isCalculating || isComparing;
  const canCalculate = !isBusy && modelEntries.length > 0 && papers.length > 0;

  return (
    <div className="demo-shell auto-layout-shell">
      <aside className="control-panel">
        <div>
          <p className="eyebrow">react-dieline</p>
          <h1>Auto Layout</h1>
          <p className="muted">Calculate optimal dieline placement on paper sheets.</p>
          <a href="#/" style={{ fontSize: 13, color: "#3b82f6" }}>&larr; Back to Demo</a>
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
            Paper size
            <select value={selectedPaperPreset} onChange={(e) => handlePaperPresetChange(e.target.value)}>
              {PAPER_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>{p.label}</option>
              ))}
            </select>
          </label>
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

        {/* --- Algorithm Selection + Calculate --- */}
        <div className="summary-card">
          <h2>Algorithm</h2>

          {/* Dropdown + Calculate */}
          <label className="field">
            Select algorithm
            <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value as AutoLayoutStrategy)}>
              {ALL_STRATEGIES.map((s) => (
                <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <div className="toggle-row" style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => handleCalculate(selectedStrategy)}
              disabled={!canCalculate}
              style={{ background: STRATEGY_COLORS[selectedStrategy], color: "#fff", borderColor: STRATEGY_COLORS[selectedStrategy], fontWeight: 700, flex: 1 }}
            >
              {isCalculating ? "Calculating..." : "Calculate"}
            </button>
            <button
              type="button"
              onClick={handleCompareAll}
              disabled={!canCalculate}
              style={{ background: "#7c3aed", color: "#fff", borderColor: "#7c3aed", fontWeight: 700, flex: 1 }}
            >
              {isComparing ? "Comparing..." : "Compare All"}
            </button>
          </div>

          {/* Individual algorithm buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
            {ALL_STRATEGIES.map((s) => {
              const included = includedInCompare.has(s);
              return (
                <div key={s} style={{ display: "flex", gap: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleCalculate(s)}
                    disabled={!canCalculate}
                    style={{
                      background: STRATEGY_COLORS[s],
                      color: "#fff",
                      borderColor: STRATEGY_COLORS[s],
                      fontWeight: 600,
                      fontSize: 12,
                      padding: "6px 8px",
                      borderRadius: "4px 0 0 4px",
                      cursor: canCalculate ? "pointer" : "not-allowed",
                      opacity: canCalculate ? 1 : 0.5,
                      flex: 1,
                    }}
                  >
                    {STRATEGY_LABELS[s]}
                  </button>
                  <button
                    type="button"
                    title={included ? "Included in Compare All — click to exclude" : "Excluded from Compare All — click to include"}
                    onClick={() => {
                      setIncludedInCompare((prev: Set<AutoLayoutStrategy>) => {
                        const next = new Set(prev);
                        if (next.has(s)) next.delete(s);
                        else next.add(s);
                        return next;
                      });
                    }}
                    style={{
                      background: included ? "#22c55e" : "#94a3b8",
                      color: "#fff",
                      border: "none",
                      borderRadius: "0 4px 4px 0",
                      width: 28,
                      fontSize: 13,
                      cursor: "pointer",
                      opacity: included ? 1 : 0.6,
                    }}
                  >
                    {included ? "\u2713" : "\u2715"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* --- Results Panel --- */}
      <section className="canvas-panel auto-layout-results">
        {results.length === 0 && compareResults.length === 0 && !isBusy && (
          <div className="auto-layout-empty">
            <p className="muted">Add models and papers, then click "Calculate" or "Compare All" to see results.</p>
          </div>
        )}

        {isBusy && (
          <div className="auto-layout-empty">
            <p>
              {isComparing
                ? `Testing ${compareProgress.current}/${compareProgress.total} — ${compareProgress.strategy}...`
                : "Calculating layout..."}
            </p>
          </div>
        )}

        {/* --- Single Algorithm Results --- */}
        {results.length > 0 && compareResults.length === 0 && (
          <div className="auto-layout-results-grid">
            {results.map((result) => (
              <div key={result.paperId} className="paper-result-card">
                <div className="paper-result-header">
                  <h2>{result.paperName}</h2>
                  <span className="muted">{result.paperWidth} x {result.paperHeight} mm</span>
                  <span className="frame-badge" style={{ background: STRATEGY_COLORS[result.strategy], color: "#fff" }}>
                    {STRATEGY_LABELS[result.strategy]}
                  </span>
                  <span className="frame-badge">{result.summary.totalSheets} sheet{result.summary.totalSheets !== 1 ? "s" : ""}</span>
                  <span className="paper-lost-badge">
                    Paper lost: {result.summary.paperLost.toFixed(1)}%
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {result.summary.computeTimeMs}ms
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

                  {result.summary.calculator.length > 0 && (
                    <>
                      <h4>Per model:</h4>
                      {result.summary.calculator.map((calc) => {
                        const meta = MODEL_METADATA.find((m) => m.id === calc.modelId);
                        return (
                          <div key={calc.modelId} className="calc-row" style={{ flexWrap: "wrap" }}>
                            <span>{meta?.name ?? calc.modelId}</span>
                            <span>
                              {calc.perSheet}/sheet &times; {result.summary.totalSheets} = {calc.totalProduced} pcs
                              {calc.excessCount > 0 && (
                                <span className="surplus-badge" style={{ marginLeft: 6 }}>+{calc.excessCount} excess</span>
                              )}
                            </span>
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

        {/* --- Compare All Results --- */}
        {compareResults.length > 0 && (
          <div className="auto-layout-results-grid">
            {papers.map((paper) => {
              // Gather results for this paper from all algorithms
              const paperResults = compareResults
                .map((cr) => {
                  const r = cr.results.find((r) => r.paperId === paper.id);
                  if (!r) return null;
                  const imgKey = `${cr.strategy}-${paper.id}`;
                  return { ...r, strategy: cr.strategy, imageUrl: cr.imageUrls.get(imgKey) };
                })
                .filter((r): r is NonNullable<typeof r> => r !== null);

              const byPaperLost = [...paperResults].sort((a, b) => a.summary.paperLost - b.summary.paperLost);
              const bySheets = [...paperResults].sort((a, b) => a.summary.totalSheets - b.summary.totalSheets || a.summary.paperLost - b.summary.paperLost);
              const byTime = [...paperResults].sort((a, b) => a.summary.computeTimeMs - b.summary.computeTimeMs);
              // Rank by total excess pieces (lower = better)
              const byExcess = [...paperResults].sort((a, b) => {
                const exA = a.summary.calculator.reduce((s, c) => s + c.excessCount, 0);
                const exB = b.summary.calculator.reduce((s, c) => s + c.excessCount, 0);
                return exA - exB || a.summary.paperLost - b.summary.paperLost;
              });

              const rankingBlock = (
                title: string,
                sorted: typeof paperResults,
                getValue: (r: typeof paperResults[0]) => string,
                accentColor: string,
              ) => (
                <div style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: accentColor }}>
                    {title}
                  </div>
                  {sorted.map((r, idx) => (
                    <div
                      key={r.strategy}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 0",
                        borderBottom: idx < sorted.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}
                    >
                      <span style={{
                        background: idx === 0 ? accentColor : "#cbd5e1",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "0 6px",
                        fontSize: 10,
                        fontWeight: 700,
                        minWidth: 20,
                        textAlign: "center",
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{
                        background: STRATEGY_COLORS[r.strategy],
                        color: "#fff",
                        borderRadius: 10,
                        padding: "0 6px",
                        fontSize: 10,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {STRATEGY_LABELS[r.strategy]}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: idx === 0 ? 700 : 400, marginLeft: "auto", whiteSpace: "nowrap" }}>
                        {getValue(r)}
                      </span>
                    </div>
                  ))}
                </div>
              );

              return (
                <div key={paper.id} className="paper-result-card">
                  <div className="paper-result-header">
                    <h2>{paper.name} — Comparison</h2>
                    <span className="muted">{paper.width} x {paper.height} mm</span>
                  </div>

                  {/* --- Ranking Summary Blocks --- */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {rankingBlock(
                      "Rank by Paper Lost %",
                      byPaperLost,
                      (r) => `${r.summary.paperLost.toFixed(1)}%`,
                      "#22c55e",
                    )}
                    {rankingBlock(
                      "Rank by Sheets",
                      bySheets,
                      (r) => `${r.summary.totalSheets} sheet${r.summary.totalSheets !== 1 ? "s" : ""}`,
                      "#2563eb",
                    )}
                    {rankingBlock(
                      "Rank by Speed",
                      byTime,
                      (r) => `${r.summary.computeTimeMs}ms`,
                      "#d97706",
                    )}
                    {rankingBlock(
                      "Rank by Excess Pieces",
                      byExcess,
                      (r) => {
                        const totalExcess = r.summary.calculator.reduce((s, c) => s + c.excessCount, 0);
                        const details = r.summary.calculator
                          .filter((c) => c.excessCount > 0)
                          .map((c) => {
                            const meta = MODEL_METADATA.find((m) => m.id === c.modelId);
                            return `${meta?.name ?? c.modelId}: +${c.excessCount}`;
                          });
                        return totalExcess === 0 ? "0 excess" : `+${totalExcess} (${details.join(", ")})`;
                      },
                      "#be185d",
                    )}
                  </div>

                  {/* --- Detailed Results (sorted by paper lost) --- */}
                  {byPaperLost.map((r, idx) => (
                    <div
                      key={r.strategy}
                      style={{
                        border: idx === 0 ? "2px solid #22c55e" : "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                        background: idx === 0 ? "#f0fdf4" : "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{
                          background: idx === 0 ? "#22c55e" : "#94a3b8",
                          color: "#fff",
                          borderRadius: 12,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                        }}>
                          #{idx + 1}
                        </span>
                        <span style={{
                          background: STRATEGY_COLORS[r.strategy],
                          color: "#fff",
                          borderRadius: 12,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {STRATEGY_LABELS[r.strategy]}
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          Lost: {r.summary.paperLost.toFixed(1)}%
                        </span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {r.summary.totalSheets} sheet{r.summary.totalSheets !== 1 ? "s" : ""}
                        </span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {r.summary.computeTimeMs}ms
                        </span>
                      </div>

                      {r.imageUrl && (
                        <div className="variation-image-wrapper">
                          <img src={r.imageUrl} alt={`${STRATEGY_LABELS[r.strategy]} layout`} className="variation-image" />
                        </div>
                      )}

                      {r.summary.calculator.length > 0 && (
                        <div className="variation-summary" style={{ marginTop: 6 }}>
                          {r.summary.calculator.map((calc) => {
                            const meta = MODEL_METADATA.find((m) => m.id === calc.modelId);
                            return (
                              <div key={calc.modelId} className="calc-row" style={{ fontSize: 12 }}>
                                <span>{meta?.name ?? calc.modelId}</span>
                                <span>
                                  {calc.perSheet}/sheet &times; {r.summary.totalSheets} = {calc.totalProduced} pcs
                                  {calc.excessCount > 0 && (
                                    <span className="surplus-badge" style={{ marginLeft: 4 }}>+{calc.excessCount}</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
