import { MountainValleyPanel } from './MountainValleyPanel';
import { ReferenceFinderPanel } from './ReferenceFinderPanel';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Layers,
  Grid as GridIcon,
  Trash2,
  Spline,
  Ruler,
  Sliders,
  ChevronDown,
  Sparkles,
  Magnet,
  Link2,
  Link2Off,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { approximateFraction, getFractionCandidates } from '../geometry/rational';
import { CreaseType, lineFromPoints, lineAngle, matchOrigamiAngle } from '../geometry/line';
import { distance } from '../geometry/point';
import { findCreaseIntersections } from '../geometry/intersection';
import { getOptimalMajorSubdivisions } from '../geometry/grid';
import { snapCreasesToOrigamiGrid } from '../cv/rasterLines';
import { splitCreaseJunctions } from '../geometry/mountainValley';

interface InspectorProps {
  onRunAutoAnalysis: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({ onRunAutoAnalysis }) => {
  const [maxDenom, setMaxDenom] = useState<number>(64);
  const [activeTab, setActiveTab] = useState<'selection' | 'grid' | 'layers'>('selection');
  const [linkDivisions, setLinkDivisions] = useState<boolean>(true);
  const [draftDivX, setDraftDivX] = useState<string>('64');
  const [draftDivY, setDraftDivY] = useState<string>('64');

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

  useEffect(() => { if (selectedPointId || selectedCreaseId || selectedMeasurementId) setActiveTab('selection'); }, [selectedPointId, selectedCreaseId, selectedMeasurementId]);

  const hasSelection = !!(selectedPoint || selectedCrease || selectedMeasurement);
  const handleSnapCreasesToCurrentGrid = () => {
    const { creases, points, grid, pushHistory } = useAppStore.getState();
    if (!creases.length && !points.length) return;
    pushHistory();
    const N = grid.divisionsX;
    const size = 1000; // normalized unit size
    const snapped = snapCreasesToOrigamiGrid(creases, N, size);
    const split = splitCreaseJunctions(snapped, {
      tolerance: 3.5 / size,
      gridN: N,
      size,
    });
    const updatedPoints = points.map((p) => {
      const gx = Math.round(p.x * N) / N;
      const gy = Math.round(p.y * N) / N;
      const px = Math.abs(p.x - gx) <= 3.5 / size ? gx : p.x;
      const py = Math.abs(p.y - gy) <= 3.5 / size ? gy : p.y;
      return {
        ...p,
        x: px,
        y: py,
        xRaw: Number(px.toFixed(5)),
        yRaw: Number(py.toFixed(5)),
        xGrid: approximateFraction(px, { maxDenominator: N }),
        yGrid: approximateFraction(py, { maxDenominator: N }),
      };
    });
    useAppStore.setState({ creases: split, points: updatedPoints });
  };
  useEffect(() => {
    setDraftDivX(String(grid.divisionsX));
  }, [grid.divisionsX]);

  useEffect(() => {
    setDraftDivY(String(grid.divisionsY));
  }, [grid.divisionsY]);

  const commitDivX = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 1 && val <= 512) {
      if (linkDivisions) {
        setGridConfig({
          divisionsX: val,
          divisionsY: val,
          majorSubdivisions: getOptimalMajorSubdivisions(val),
        });
        setDraftDivX(String(val));
        setDraftDivY(String(val));
      } else {
        setGridConfig({
          divisionsX: val,
          majorSubdivisions: getOptimalMajorSubdivisions(val),
        });
        setDraftDivX(String(val));
      }
    } else {
      setDraftDivX(String(grid.divisionsX));
    }
  };

  const commitDivY = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 1 && val <= 512) {
      if (linkDivisions) {
        setGridConfig({
          divisionsX: val,
          divisionsY: val,
          majorSubdivisions: getOptimalMajorSubdivisions(val),
        });
        setDraftDivX(String(val));
        setDraftDivY(String(val));
      } else {
        setGridConfig({
          divisionsY: val,
          majorSubdivisions: getOptimalMajorSubdivisions(val),
        });
        setDraftDivY(String(val));
      }
    } else {
      setDraftDivY(String(grid.divisionsY));
    }
  };

  const stepDivX = (delta: number) => {
    const next = Math.max(1, Math.min(512, grid.divisionsX + delta));
    commitDivX(String(next));
  };

  const stepDivY = (delta: number) => {
    const next = Math.max(1, Math.min(512, grid.divisionsY + delta));
    commitDivY(String(next));
  };


  // Focus coordinate for live inspector
  const targetCoord = selectedPoint ? { x: selectedPoint.x, y: selectedPoint.y } : cursorPaper;

  const lastTarget = useRef({x:0.5,y:0.5});
  if(targetCoord) lastTarget.current=targetCoord;

  // High-performance memoized coordinate fraction calculation (only runs when selection tab is active)
  const roundedCoord = useMemo(() => {
    if (!targetCoord) return null;
    return {
      x: Math.round(targetCoord.x * 10000) / 10000,
      y: Math.round(targetCoord.y * 10000) / 10000,
    };
  }, [targetCoord?.x, targetCoord?.y]);

  const fracX = useMemo(() => {
    return roundedCoord
      ? approximateFraction(roundedCoord.x, { maxDenominator: maxDenom, preferPowerOfTwo: true })
      : null;
  }, [roundedCoord?.x, maxDenom]);

  const fracY = useMemo(() => {
    return roundedCoord
      ? approximateFraction(roundedCoord.y, { maxDenominator: maxDenom, preferPowerOfTwo: true })
      : null;
  }, [roundedCoord?.y, maxDenom]);

  const candidatesX = useMemo(() => {
    if (activeTab !== 'selection' || !roundedCoord) return [];
    return getFractionCandidates(roundedCoord.x, maxDenom);
  }, [activeTab, roundedCoord?.x, maxDenom]);

  const candidatesY = useMemo(() => {
    if (activeTab !== 'selection' || !roundedCoord) return [];
    return getFractionCandidates(roundedCoord.y, maxDenom);
  }, [activeTab, roundedCoord?.y, maxDenom]);

  const intersections = useMemo(() => findCreaseIntersections(creases), [creases]);

  return (
    <aside className="w-[280px] bg-white border border-[#E5E5EA]/70 rounded-2xl shadow-quiet-card m-3 flex flex-col text-xs text-[#1D1D1F] select-none z-20 overflow-hidden">
      {/* Top Segmented Tabs */}
      <div className="p-3 pb-0">
        <div className="bg-[#F5F5F7] p-1 rounded-xl flex items-center space-x-1 border border-[#E5E5EA]/40">
          <button
            onClick={() => setActiveTab('selection')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition ${activeTab === 'selection'
              ? 'bg-[#E1E8F5] text-[#4F6BA6] font-semibold shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            Design
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition ${activeTab === 'grid'
              ? 'bg-[#E1E8F5] text-[#4F6BA6] font-semibold shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            Grid
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition ${activeTab === 'layers'
              ? 'bg-[#E1E8F5] text-[#4F6BA6] font-semibold shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900'
              }`}
          >
            Layers
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'selection' && <ReferenceFinderPanel point={targetCoord || lastTarget.current} />}
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
                    Position (Approximate)
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

                {selectedCrease.assignmentSource === 'inferred' && <p className="text-amber-700">Suggested by local fold constraints. Review before folding.</p>}
                {/* Crease Type Switcher */}
                <div>
                  <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">
                    Crease Type
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-neutral-100 p-1 rounded-lg">
                    {(['mountain', 'valley', 'unknown', 'edge', 'auxiliary'] as CreaseType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateCrease(selectedCrease.id, { type: t, confirmed: t !== 'unknown', assignmentSource: 'manual' })}
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

            <MountainValleyPanel />

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
                    className="w-full py-2 bg-[#4F6BA6] hover:bg-[#5D7BB8] text-white rounded-xl font-medium text-xs shadow-quiet-button transition flex items-center justify-center space-x-1.5 disabled:opacity-40 cursor-pointer"
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
                      className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-0.5 text-[10px] font-mono text-[#4F6BA6] outline-none shadow-2xs cursor-pointer"
                    >
                      <option value={16}>max /16</option>
                      <option value={32}>max /32</option>
                      <option value={48}>max /48</option>
                      <option value={56}>max /56</option>
                      <option value={64}>max /64</option>
                      <option value={80}>max /80</option>
                      <option value={96}>max /96</option>
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
                {[8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128].map((n) => {
                  const isSelected = grid.divisionsX === n && grid.divisionsY === n;
                  return (
                    <button
                      key={n}
                      onClick={() =>
                        setGridConfig({
                          divisionsX: n,
                          divisionsY: n,
                          majorSubdivisions: n % 8 === 0 ? 8 : 4,
                        })
                      }
                      className={`py-2 rounded-xl font-mono text-xs text-center transition border shadow-2xs ${isSelected
                        ? 'bg-[#E1E8F5] border-[#7C95C8]/50 text-[#4F6BA6] font-semibold'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                        }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleSnapCreasesToCurrentGrid}
                className="w-full mt-2.5 py-2 px-3 bg-white hover:bg-[#E1E8F5] text-neutral-700 hover:text-[#4F6BA6] border border-[#E5E5EA] hover:border-[#7C95C8]/50 rounded-xl font-medium text-xs shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Align all creases to current grid"
              >
                <Magnet className="w-3.5 h-3.5 text-[#4F6BA6]" />
                <span>Align Creases to Grid ({grid.divisionsX} × {grid.divisionsY})</span>
              </button>
              </div>

            {/* 2. Grid Overlay Controls */}
            <div className="bg-neutral-50/70 p-3 rounded-xl border border-neutral-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-800 text-xs">Grid Overlay</span>
                <button
                  type="button"
                  onClick={() => setGridConfig({ enabled: !grid.enabled })}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition cursor-pointer ${grid.enabled ? 'bg-[#4F6BA6] justify-end' : 'bg-neutral-300 justify-start'
                    }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-600">Lattice Divisions</span>
                  <button
                    type="button"
                    onClick={() => setLinkDivisions(!linkDivisions)}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                      linkDivisions
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                        : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                    }`}
                    title={linkDivisions ? 'X and Y locked together (Square grid)' : 'X and Y independent'}
                  >
                    {linkDivisions ? <Link2 className="w-3 h-3 text-blue-500" /> : <Link2Off className="w-3 h-3 text-neutral-400" />}
                    <span>{linkDivisions ? '1:1 Locked' : 'Independent'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Divisions X</label>
                    <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-2xs focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition">
                      <input
                        type="number"
                        min={1}
                        max={512}
                        value={draftDivX}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftDivX(v);
                          if (linkDivisions) setDraftDivY(v);
                          const val = parseInt(v, 10);
                          if (!isNaN(val) && val >= 1 && val <= 512) {
                            if (linkDivisions) {
                              setGridConfig({
                                divisionsX: val,
                                divisionsY: val,
                                majorSubdivisions: getOptimalMajorSubdivisions(val),
                              });
                            } else {
                              setGridConfig({
                                divisionsX: val,
                                majorSubdivisions: getOptimalMajorSubdivisions(val),
                              });
                            }
                          }
                        }}
                        onBlur={() => {
                          const val = parseInt(draftDivX, 10);
                          if (isNaN(val) || val < 1 || val > 512) {
                            setDraftDivX(String(grid.divisionsX));
                            if (linkDivisions) setDraftDivY(String(grid.divisionsY));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-full font-mono text-xs text-neutral-800 font-medium bg-transparent outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex flex-col space-y-0.5 text-[9px] text-neutral-400 leading-none ml-1">
                        <button
                          type="button"
                          onClick={() => stepDivX(1)}
                          className="hover:text-neutral-700 cursor-pointer"
                          title="Increase divisions X"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => stepDivX(-1)}
                          className="hover:text-neutral-700 cursor-pointer"
                          title="Decrease divisions X"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 block mb-1">Divisions Y</label>
                    <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-2xs focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition">
                      <input
                        type="number"
                        min={1}
                        max={512}
                        value={draftDivY}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraftDivY(v);
                          if (linkDivisions) setDraftDivX(v);
                          const val = parseInt(v, 10);
                          if (!isNaN(val) && val >= 1 && val <= 512) {
                            if (linkDivisions) {
                              setGridConfig({
                                divisionsX: val,
                                divisionsY: val,
                                majorSubdivisions: getOptimalMajorSubdivisions(val),
                              });
                            } else {
                              setGridConfig({
                                divisionsY: val,
                                majorSubdivisions: getOptimalMajorSubdivisions(val),
                              });
                            }
                          }
                        }}
                        onBlur={() => {
                          const val = parseInt(draftDivY, 10);
                          if (isNaN(val) || val < 1 || val > 512) {
                            setDraftDivY(String(grid.divisionsY));
                            if (linkDivisions) setDraftDivX(String(grid.divisionsX));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-full font-mono text-xs text-neutral-800 font-medium bg-transparent outline-none border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="flex flex-col space-y-0.5 text-[9px] text-neutral-400 leading-none ml-1">
                        <button
                          type="button"
                          onClick={() => stepDivY(1)}
                          className="hover:text-neutral-700 cursor-pointer"
                          title="Increase divisions Y"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => stepDivY(-1)}
                          className="hover:text-neutral-700 cursor-pointer"
                          title="Decrease divisions Y"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-neutral-500">Major Grid Step</span>
                  <select
                    value={grid.majorSubdivisions || 8}
                    onChange={(e) => setGridConfig({ majorSubdivisions: Number(e.target.value) })}
                    className="bg-white border border-neutral-200 rounded-lg px-2 py-0.5 text-[10px] font-mono text-neutral-700 outline-none shadow-2xs"
                  >
                    <option value={4}>4 sections (/4)</option>
                    <option value={8}>8 sections (/8)</option>
                    <option value={10}>10 sections (/10)</option>
                    <option value={16}>16 sections (/16)</option>
                    <option value={0}>None</option>
                  </select>
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
                  className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#4F6BA6]"
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
                          ? 'bg-[#4F6BA6] border-[#4F6BA6] text-white shadow-2xs'
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
