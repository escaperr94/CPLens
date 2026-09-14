import React, { useState } from 'react';
import {
  Layers,
  Grid as GridIcon,
  Trash2,
  Spline,
  Ruler,
  Sliders,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { approximateFraction, getFractionCandidates } from '../geometry/rational';
import { CreaseType, lineFromPoints, lineAngle, matchOrigamiAngle } from '../geometry/line';
import { distance } from '../geometry/point';
import { findCreaseIntersections } from '../geometry/intersection';

interface InspectorProps {
  onRunAutoAnalysis: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ onRunAutoAnalysis }) => {
  const [maxDenom, setMaxDenom] = useState<number>(64);
  const [activeTab, setActiveTab] = useState<'selection' | 'grid' | 'layers'>('grid');

  const {
    cursorPaper,
    points,
    selectedPointId,
    updatePoint,
    deletePoint,
    creases,
    selectedCreaseId,
    updateCrease,
    deleteCrease,
    measurements,
    selectedMeasurementId,
    deleteMeasurement,
    grid,
    setGridConfig,
    layers,
    setLayerVisibility,
    rulers,
    clearRulers,
    paper,
    image,
    isAnalyzing,
    viewMode,
    imageOpacity,
    setImageOpacity,
  } = useAppStore();

  const selectedPoint = points.find((p) => p.id === selectedPointId);
  const selectedCrease = creases.find((c) => c.id === selectedCreaseId);
  const selectedMeasurement = measurements.find((m) => m.id === selectedMeasurementId);

  const hasSelection = !!(selectedPoint || selectedCrease || selectedMeasurement);

  // Focus coordinate for live inspector
  const targetCoord = selectedPoint ? { x: selectedPoint.x, y: selectedPoint.y } : cursorPaper;

  const fracX = targetCoord
    ? approximateFraction(targetCoord.x, { maxDenominator: maxDenom, preferPowerOfTwo: true })
    : null;
  const fracY = targetCoord
    ? approximateFraction(targetCoord.y, { maxDenominator: maxDenom, preferPowerOfTwo: true })
    : null;

  const candidatesX = targetCoord ? getFractionCandidates(targetCoord.x, maxDenom) : [];
  const candidatesY = targetCoord ? getFractionCandidates(targetCoord.y, maxDenom) : [];

  const intersections = findCreaseIntersections(creases);

  return (
    <aside className="w-[280px] bg-white border border-neutral-200/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] m-3 flex flex-col text-xs text-neutral-800 select-none z-20 overflow-hidden">
      {/* Top Segmented Tabs (matching media_1789408992098.png) */}
      <div className="p-3 pb-0">
        <div className="bg-neutral-100/80 p-1 rounded-xl flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('selection')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition ${activeTab === 'selection'
              ? 'bg-blue-100/80 text-blue-600 font-semibold shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            Design
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition ${activeTab === 'grid'
              ? 'bg-blue-100/80 text-blue-600 font-semibold shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            Grid
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition ${activeTab === 'layers'
              ? 'bg-blue-100/80 text-blue-600 font-semibold shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            Layers
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* TAB: SELECTION / DYNAMIC INSPECTOR */}
        {activeTab === 'selection' && (
          <>
            {/* CASE 1: POINT SELECTED */}
            {selectedPoint && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: selectedPoint.color || '#0D99FF' }}
                    />
                    <input
                      type="text"
                      value={selectedPoint.label}
                      onChange={(e) => updatePoint(selectedPoint.id, { label: e.target.value })}
                      className="font-semibold text-xs text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-figma-blue px-1 py-0.5 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => deletePoint(selectedPoint.id)}
                    className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-neutral-100 transition"
                    title="Delete Point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Figma-style 2-column Position inputs */}
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                    Position (Rational)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded px-2 py-1">
                      <span className="text-neutral-400 font-mono text-[10px] mr-1.5">X</span>
                      <span className="font-mono font-semibold text-figma-blue text-xs">
                        {fracX?.formatted || selectedPoint.x.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded px-2 py-1">
                      <span className="text-neutral-400 font-mono text-[10px] mr-1.5">Y</span>
                      <span className="font-mono font-semibold text-figma-blue text-xs">
                        {fracY?.formatted || selectedPoint.y.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decimal coordinates */}
                <div className="space-y-1.5 text-[11px] font-mono bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <div className="flex justify-between text-neutral-600">
                    <span className="text-neutral-400">Decimal:</span>
                    <span>
                      ({selectedPoint.x.toFixed(6)}, {selectedPoint.y.toFixed(6)})
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span className="text-neutral-400">Grid ({grid.divisionsX}):</span>
                    <span className="text-neutral-900 font-semibold">
                      ({Math.round(selectedPoint.x * grid.divisionsX)},{' '}
                      {Math.round(selectedPoint.y * grid.divisionsY)})
                    </span>
                  </div>
                  {selectedPoint.confidence !== undefined && (
                    <div className="flex justify-between text-neutral-600">
                      <span className="text-neutral-400">Confidence:</span>
                      <span className="text-emerald-600 font-semibold">
                        {(selectedPoint.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {selectedPoint.incidentCreases && selectedPoint.incidentCreases.length > 0 && (
                    <div className="flex justify-between text-neutral-600 pt-1 border-t border-neutral-200">
                      <span className="text-neutral-400">Incident creases:</span>
                      <span className="text-neutral-800">{selectedPoint.incidentCreases.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Color picker */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Color</span>
                  <input
                    type="color"
                    value={selectedPoint.color || '#0D99FF'}
                    onChange={(e) => updatePoint(selectedPoint.id, { color: e.target.value })}
                    className="w-6 h-6 rounded border border-neutral-200 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* CASE 2: CREASE LINE SELECTED */}
            {selectedCrease && !selectedPoint && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="font-semibold text-xs text-neutral-900 capitalize">
                    {selectedCrease.type} Crease
                  </span>
                  <button
                    onClick={() => deleteCrease(selectedCrease.id)}
                    className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-neutral-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Crease Type Switcher */}
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                    Crease Type
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 rounded-lg">
                    {(['mountain', 'valley', 'edge', 'auxiliary'] as CreaseType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateCrease(selectedCrease.id, { type: t })}
                        className={`py-1 rounded text-[11px] font-medium capitalize transition ${selectedCrease.type === t
                          ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                          : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Geometry specs */}
                {(() => {
                  const len = distance(selectedCrease.p1, selectedCrease.p2);
                  const angle = lineAngle(selectedCrease.p1, selectedCrease.p2);
                  const match = matchOrigamiAngle(angle);

                  return (
                    <div className="space-y-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 font-mono text-[11px]">
                      <div className="flex justify-between text-neutral-600">
                        <span className="text-neutral-400">Length:</span>
                        <span className="text-neutral-900 font-semibold">{len.toFixed(5)} W</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span className="text-neutral-400">Angle:</span>
                        <span className="text-figma-blue font-semibold">
                          {angle.toFixed(1)}° {match ? `(${match.standardAngle}°)` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span className="text-neutral-400">P1:</span>
                        <span>
                          ({selectedCrease.p1.x.toFixed(4)}, {selectedCrease.p1.y.toFixed(4)})
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span className="text-neutral-400">P2:</span>
                        <span>
                          ({selectedCrease.p2.x.toFixed(4)}, {selectedCrease.p2.y.toFixed(4)})
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CASE 3: MEASUREMENT SELECTED */}
            {selectedMeasurement && !selectedPoint && !selectedCrease && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <span className="font-semibold text-xs text-neutral-900">Measurement</span>
                  <button
                    onClick={() => deleteMeasurement(selectedMeasurement.id)}
                    className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-neutral-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(() => {
                  const d = distance(selectedMeasurement.p1, selectedMeasurement.p2);
                  const dx = Math.abs(selectedMeasurement.p2.x - selectedMeasurement.p1.x);
                  const dy = Math.abs(selectedMeasurement.p2.y - selectedMeasurement.p1.y);
                  const angle = lineAngle(selectedMeasurement.p1, selectedMeasurement.p2);
                  const match = matchOrigamiAngle(angle);

                  const fx = approximateFraction(dx, { maxDenominator: 64 });
                  const fy = approximateFraction(dy, { maxDenominator: 64 });

                  return (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                          <div className="text-[10px] text-neutral-400 uppercase font-mono">Δx</div>
                          <div className="font-mono font-bold text-neutral-900 text-xs">{fx.formatted}</div>
                        </div>
                        <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                          <div className="text-[10px] text-neutral-400 uppercase font-mono">Δy</div>
                          <div className="font-mono font-bold text-neutral-900 text-xs">{fy.formatted}</div>
                        </div>
                      </div>

                      <div className="space-y-1 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 font-mono text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Distance:</span>
                          <span className="font-semibold text-neutral-900">{d.toFixed(5)} W</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Angle:</span>
                          <span className="font-semibold text-figma-blue">
                            {angle.toFixed(1)}° {match ? `(~${match.standardAngle}°)` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CASE 4: NOTHING SELECTED (DOCUMENT & LIVE CURSOR INSPECTION) */}
            {!hasSelection && (
              <div className="space-y-4">
                {/* Document Information card */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Document
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${paper.rectified
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}
                    >
                      {paper.rectified ? 'Rectified [0,1]²' : 'Unrectified'}
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px] text-neutral-600">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Base Grid:</span>
                      <span className="font-semibold text-neutral-900">
                        {grid.divisionsX} × {grid.divisionsY}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Creases:</span>
                      <span className="text-neutral-900 font-semibold">{creases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Intersections:</span>
                      <span className="text-neutral-900 font-semibold">{intersections.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Reference Points:</span>
                      <span className="text-neutral-900 font-semibold">{points.length}</span>
                    </div>
                  </div>

                  <button
                    onClick={onRunAutoAnalysis}
                    disabled={isAnalyzing || !image.url}
                    className="w-full py-1.5 bg-figma-blue hover:bg-figma-blueHover text-white rounded-lg font-medium text-xs shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-40"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-Analyze & Vectorize CP</span>
                  </button>
                </div>

                {/* Live cursor inspector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Cursor Inspector
                    </span>
                    <select
                      value={maxDenom}
                      onChange={(e) => setMaxDenom(Number(e.target.value))}
                      className="bg-neutral-50 border border-neutral-200 rounded px-1.5 py-0.5 text-[10px] font-mono text-figma-blue outline-none"
                    >
                      <option value={16}>max /16</option>
                      <option value={32}>max /32</option>
                      <option value={64}>max /64</option>
                      <option value={128}>max /128</option>
                      <option value={256}>max /256</option>
                    </select>
                  </div>

                  {targetCoord && fracX && fracY ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-center">
                          <span className="text-[10px] text-neutral-400 font-mono uppercase">X Fraction</span>
                          <div className="font-mono font-bold text-figma-blue text-sm">{fracX.formatted}</div>
                          <span className="text-[9px] text-neutral-400 font-mono">
                            err: {fracX.error.toFixed(5)}
                          </span>
                        </div>
                        <div className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-center">
                          <span className="text-[10px] text-neutral-400 font-mono uppercase">Y Fraction</span>
                          <div className="font-mono font-bold text-figma-blue text-sm">{fracY.formatted}</div>
                          <span className="text-[9px] text-neutral-400 font-mono">
                            err: {fracY.error.toFixed(5)}
                          </span>
                        </div>
                      </div>

                      <div className="font-mono text-[11px] text-neutral-500 space-y-0.5 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Raw:</span>
                          <span>
                            ({targetCoord.x.toFixed(5)}, {targetCoord.y.toFixed(5)})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Grid ({grid.divisionsX}):</span>
                          <span className="text-neutral-800 font-semibold">
                            ({Math.round(targetCoord.x * grid.divisionsX)},{' '}
                            {Math.round(targetCoord.y * grid.divisionsY)})
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-neutral-400 text-[11px] bg-neutral-50 rounded-lg border border-neutral-200">
                      Hover cursor over paper to inspect
                    </div>
                  )}
                </div>

                {/* Candidate Fractions List */}
                {targetCoord && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
                      Candidate Approximations
                    </span>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left font-mono text-[11px]">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] text-neutral-400">
                          <tr>
                            <th className="p-1.5">Axis</th>
                            <th className="p-1.5">Fraction</th>
                            <th className="p-1.5">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {candidatesX.slice(0, 3).map((c, i) => (
                            <tr key={`x_${i}`} className="hover:bg-neutral-50">
                              <td className="p-1.5 text-figma-blue font-bold">X</td>
                              <td className="p-1.5 font-semibold text-neutral-900">{c.formatted}</td>
                              <td className="p-1.5 text-neutral-400 text-[10px]">{c.error.toFixed(5)}</td>
                            </tr>
                          ))}
                          {candidatesY.slice(0, 3).map((c, i) => (
                            <tr key={`y_${i}`} className="hover:bg-neutral-50">
                              <td className="p-1.5 text-emerald-600 font-bold">Y</td>
                              <td className="p-1.5 font-semibold text-neutral-900">{c.formatted}</td>
                              <td className="p-1.5 text-neutral-400 text-[10px]">{c.error.toFixed(5)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB: GRID SETTINGS (matching media_1789408992098.png) */}
        {activeTab === 'grid' && (
          <div className="space-y-4">
            {/* 1. Origami Grid Presets */}
            <div className="bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-neutral-800 text-xs">Origami Grid Presets</span>
                <div
                  className="w-4 h-4 rounded-full border border-neutral-300 text-neutral-400 flex items-center justify-center text-[10px] font-mono cursor-pointer hover:border-neutral-400"
                  title="Common origami box-pleating / grid lattice presets"
                >
                  i
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[8, 16, 24, 32, 40, 48, 64, 128].map((n) => {
                  const isSelected = grid.divisionsX === n && grid.divisionsY === n;
                  return (
                    <button
                      key={n}
                      onClick={() =>
                        setGridConfig({
                          divisionsX: n,
                          divisionsY: n,
                          majorSubdivisions: n >= 16 ? 8 : 4,
                        })
                      }
                      className={`py-2 rounded-xl font-mono text-xs text-center transition border shadow-2xs ${isSelected
                        ? 'bg-blue-100/80 border-blue-300 text-blue-600 font-semibold'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                        }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Grid Overlay Controls */}
            <div className="bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-800 text-xs">Grid Overlay</span>
                <button
                  type="button"
                  onClick={() => setGridConfig({ enabled: !grid.enabled })}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${grid.enabled ? 'bg-[#0D99FF] justify-end' : 'bg-neutral-300 justify-start'
                    }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Divisions X</label>
                  <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                    <span className="font-mono text-xs text-neutral-800 font-medium">{grid.divisionsX}</span>
                    <div className="flex flex-col space-y-0.5 text-[9px] text-neutral-400 leading-none">
                      <button
                        onClick={() => setGridConfig({ divisionsX: Math.min(256, grid.divisionsX + 1) })}
                        className="hover:text-neutral-700 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => setGridConfig({ divisionsX: Math.max(1, grid.divisionsX - 1) })}
                        className="hover:text-neutral-700 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Divisions Y</label>
                  <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                    <span className="font-mono text-xs text-neutral-800 font-medium">{grid.divisionsY}</span>
                    <div className="flex flex-col space-y-0.5 text-[9px] text-neutral-400 leading-none">
                      <button
                        onClick={() => setGridConfig({ divisionsY: Math.min(256, grid.divisionsY + 1) })}
                        className="hover:text-neutral-700 cursor-pointer"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => setGridConfig({ divisionsY: Math.max(1, grid.divisionsY - 1) })}
                        className="hover:text-neutral-700 cursor-pointer"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600">Opacity</span>
                  <span className="text-xs font-mono text-neutral-400">{(grid.opacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={grid.opacity}
                  onChange={(e) => setGridConfig({ opacity: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#0D99FF]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-neutral-600">Color</span>
                <div className="relative">
                  <input
                    type="color"
                    value={grid.color}
                    onChange={(e) => setGridConfig({ color: e.target.value })}
                    className="opacity-0 absolute inset-0 w-6 h-6 cursor-pointer"
                  />
                  <div
                    className="w-6 h-6 rounded-lg border border-neutral-200 shadow-2xs cursor-pointer"
                    style={{ backgroundColor: grid.color }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Display Section (Checkboxes) */}
            <div className="bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/80 space-y-2.5">
              <span className="font-medium text-neutral-800 text-xs block">Display</span>
              <div className="space-y-2">
                {[
                  { key: 'grid' as const, label: 'Show grid', checked: layers.grid },
                  { key: 'creases' as const, label: 'Show crease lines', checked: layers.creases },
                  { key: 'boundary' as const, label: 'Show boundary', checked: layers.boundary },
                  { key: 'points' as const, label: 'Show vertices', checked: layers.points || layers.intersections },
                ].map((item) => {
                  const handleToggle = () => {
                    if (item.key === 'points') {
                      const next = !item.checked;
                      setLayerVisibility('points', next);
                      setLayerVisibility('intersections', next);
                    } else {
                      setLayerVisibility(item.key, !item.checked);
                    }
                  };
                  return (
                    <label
                      key={item.key}
                      onClick={handleToggle}
                      className="flex items-center space-x-2.5 cursor-pointer select-none group"
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition border ${item.checked
                          ? 'bg-[#0D99FF] border-[#0D99FF] text-white shadow-2xs'
                          : 'bg-white border-neutral-300 group-hover:border-neutral-400'
                          }`}
                      >
                        {item.checked && (
                          <svg className="w-3 h-3 stroke-current stroke-[2.5]" viewBox="0 0 24 24" fill="none">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-neutral-700 font-normal">
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Overlay Raster Opacity (when viewMode is overlay) */}
            {viewMode === 'overlay' && (
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-900 font-medium">Source Image Opacity</span>
                  <span className="text-xs font-mono text-blue-700 font-semibold">{(imageOpacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={imageOpacity}
                  onChange={(e) => setImageOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB: LAYERS */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Visibility Layers
            </div>
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 divide-y divide-neutral-200 p-1">
              {(
                [
                  ['image', 'Original Raster Image'],
                  ['grid', 'Grid Overlay'],
                  ['creases', 'Crease Lines (Vector)'],
                  ['intersections', 'Intersections'],
                  ['points', 'Reference Points'],
                  ['measurements', 'Measurements'],
                  ['rulers', 'Crosshair Rulers'],
                  ['symmetry', 'Symmetry System'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="py-2 px-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={layers[key]}
                    onChange={(e) => setLayerVisibility(key, e.target.checked)}
                    className="rounded border-neutral-300 text-figma-blue focus:ring-0"
                  />
                </div>
              ))}
            </div>

            {rulers.length > 0 && (
              <button
                onClick={clearRulers}
                className="w-full py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg text-xs text-neutral-600 transition"
              >
                Clear All Rulers ({rulers.length})
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
