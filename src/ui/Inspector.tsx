import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MountainValleyPanel } from './MountainValleyPanel';
import { ReferenceFinderPanel } from './ReferenceFinderPanel';
import {
  Trash2,
  Crosshair,
  Sparkles,
  Compass,
  Crop,
  Zap,
  Square,
  ArrowLeft,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { approximateFraction, getFractionCandidates } from '../geometry/rational';
import { CreaseType, lineAngle, matchOrigamiAngle } from '../geometry/line';
import { distance } from '../geometry/point';
import { findCreaseIntersections } from '../geometry/intersection';
import { getOptimalMajorSubdivisions } from '../geometry/grid';
import { snapCreasesToOrigamiGrid } from '../cv/rasterLines';
import { RulerItem } from '../store/types';
import {
  FigmaInput,
  FigmaSelect,
  FigmaCheckbox,
  FigmaToggle,
  FigmaDivider,
} from './figma/FigmaControls';

export interface InspectorProps {
  onRunAutoAnalysis?: () => void;
  rulers?: RulerItem[];
}

export const Inspector: React.FC<InspectorProps> = ({ rulers: propRulers, onRunAutoAnalysis }) => {
  const {
    targetPoint,
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
    rulers: storeRulers,
    clearRulers,
    deleteRuler,
    addRuler,
    paper,
    activeTool,
    imageOpacity,
    setImageOpacity,
    sheets,
    activeSheetId,
    setActiveSheetId,
    image,
    canvasImages,
    selectedImageId,
    selectCanvasImage,
    setReferenceImageFromCropped,
    setActiveTool,
    updateCanvasImage,
    updateSheet,
    removeCanvasImage,
    imageTransform,
    updateImageTransform,
    resetImageTransform,
    fitToPaper,
    paperInsets,
    setPaperInsets,
    updateSheetInsets,
    autoTrimBoundary,
  } = useAppStore();

  const rulers = propRulers ?? storeRulers;

  // Tabs: Design (default matching Image #1), Inspect, Guides
  const [activeTab, setActiveTab] = useState<'design' | 'inspect' | 'guides'>(
    propRulers !== undefined ? 'guides' : 'design'
  );

  // Local state for Canvas section
  const [canvasW, setCanvasW] = useState<string>('300');
  const [canvasH, setCanvasH] = useState<string>('300');
  const [canvasUnit, setCanvasUnit] = useState<string>('mm');
  const [canvasBg, setCanvasBg] = useState<string>('FFFFFF');

  // Local state for Grid section
  const [gridType, setGridType] = useState<string>('origami');
  const [draftDivX, setDraftDivX] = useState<string>(String(grid.divisionsX));
  const [draftDivY, setDraftDivY] = useState<string>(String(grid.divisionsY));

  // Local state for Style line widths
  const [mountainWidth, setMountainWidth] = useState<string>('1px');
  const [valleyWidth, setValleyWidth] = useState<string>('1px');
  const [boundaryWidth, setBoundaryWidth] = useState<string>('1px');
  const [auxiliaryWidth, setAuxiliaryWidth] = useState<string>('1px');

  const selectedPoint = points.find((p) => p.id === selectedPointId);
  const selectedCrease = creases.find((c) => c.id === selectedCreaseId);
  const selectedMeasurement = measurements.find((m) => m.id === selectedMeasurementId);

  const isFocusingX = useRef(false);
  const isFocusingY = useRef(false);

  useEffect(() => {
    if (!isFocusingX.current) {
      setDraftDivX(String(grid.divisionsX));
    }
  }, [grid.divisionsX]);

  useEffect(() => {
    if (!isFocusingY.current) {
      setDraftDivY(String(grid.divisionsY));
    }
  }, [grid.divisionsY]);

  const handleDivXChange = (text: string) => {
    setDraftDivX(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 1 && val <= 512) {
      setGridConfig({
        divisionsX: val,
        majorSubdivisions: getOptimalMajorSubdivisions(val),
      });
    }
  };

  const handleDivXBlur = () => {
    isFocusingX.current = false;
    const val = parseInt(draftDivX, 10);
    if (!isNaN(val) && val >= 1 && val <= 512) {
      setGridConfig({
        divisionsX: val,
        majorSubdivisions: getOptimalMajorSubdivisions(val),
      });
      setDraftDivX(String(val));
    } else {
      setDraftDivX(String(grid.divisionsX));
    }
  };

  const handleDivYChange = (text: string) => {
    setDraftDivY(text);
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 1 && val <= 512) {
      setGridConfig({
        divisionsY: val,
        majorSubdivisions: getOptimalMajorSubdivisions(val),
      });
    }
  };

  const handleDivYBlur = () => {
    isFocusingY.current = false;
    const val = parseInt(draftDivY, 10);
    if (!isNaN(val) && val >= 1 && val <= 512) {
      setGridConfig({
        divisionsY: val,
        majorSubdivisions: getOptimalMajorSubdivisions(val),
      });
      setDraftDivY(String(val));
    } else {
      setDraftDivY(String(grid.divisionsY));
    }
  };

  const handleAutoFitBoundary = () => {
    if (creases.length > 0) {
      let minX = 1;
      let minY = 1;
      let maxX = 0;
      let maxY = 0;
      for (const c of creases) {
        minX = Math.min(minX, c.p1.x, c.p2.x);
        minY = Math.min(minY, c.p1.y, c.p2.y);
        maxX = Math.max(maxX, c.p1.x, c.p2.x);
        maxY = Math.max(maxY, c.p1.y, c.p2.y);
      }
      const spanX = maxX - minX;
      const spanY = maxY - minY;
      if (spanX > 0.4 && spanY > 0.4) {
        const fitScale = Math.min(1.6, Math.max(0.9, Number((1 / Math.max(spanX, spanY)).toFixed(2))));
        const shiftX = Math.round((0.5 - (minX + maxX) / 2) * 1000 * fitScale);
        const shiftY = Math.round((0.5 - (minY + maxY) / 2) * 1000 * fitScale);
        updateImageTransform({ scale: fitScale, offsetX: shiftX, offsetY: shiftY });
        fitToPaper(window.innerWidth - 450, window.innerHeight - 80);
        return;
      }
    }
    updateImageTransform({ scale: 1.0, offsetX: 0, offsetY: 0 });
    fitToPaper(window.innerWidth - 450, window.innerHeight - 80);
  };

  const handleSnapCreasesToCurrentGrid = () => {
    const { creases, points, grid, pushHistory } = useAppStore.getState();
    if (!creases.length && !points.length) return;
    pushHistory();
    const N = grid.divisionsX;
    const size = 1000;
    const snapped = snapCreasesToOrigamiGrid(creases, N, size);
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
    useAppStore.setState({ creases: snapped, points: updatedPoints });
  };

  // Target coordinates for inspection
  const targetCoord = selectedPoint
    ? { x: selectedPoint.x, y: selectedPoint.y }
    : (targetPoint || { x: 0.5, y: 0.5 });

  const lastTarget = useRef({ x: 0.5, y: 0.5 });
  lastTarget.current = targetCoord;

  const roundedCoord = useMemo(() => {
    if (!targetCoord) return null;
    return {
      x: Math.round(targetCoord.x * 10000) / 10000,
      y: Math.round(targetCoord.y * 10000) / 10000,
    };
  }, [targetCoord?.x, targetCoord?.y]);

  const fracX = useMemo(() => {
    return roundedCoord
      ? approximateFraction(roundedCoord.x, { maxDenominator: 64, preferPowerOfTwo: true })
      : null;
  }, [roundedCoord?.x]);

  const fracY = useMemo(() => {
    return roundedCoord
      ? approximateFraction(roundedCoord.y, { maxDenominator: 64, preferPowerOfTwo: true })
      : null;
  }, [roundedCoord?.y]);

  const candidatesX = useMemo(() => {
    if (activeTab !== 'inspect' || !roundedCoord) return [];
    return getFractionCandidates(roundedCoord.x, 64);
  }, [activeTab, roundedCoord?.x]);

  const candidatesY = useMemo(() => {
    if (activeTab !== 'inspect' || !roundedCoord) return [];
    return getFractionCandidates(roundedCoord.y, 64);
  }, [activeTab, roundedCoord?.y]);

  const intersections = useMemo(() => findCreaseIntersections(creases), [creases]);

  // Preset buttons 2x4 matrix
  const PRESETS = [
    [8, 16, 24, 32],
    [40, 48, 56, 64],
  ];

  return (
    <aside className="w-[260px] bg-white border-l border-[#E5E5E5] flex flex-col h-full overflow-y-auto text-xs select-none shrink-0">
      {/* Figma Top Tabs (Design | Fold Sequences) */}
      <div className="flex items-center border-b border-[#E5E5E5] px-3 h-9 shrink-0 gap-4 bg-white text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('design')}
          className={`h-full flex items-center border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'design'
              ? 'border-[#0D99FF] text-[#111827] font-semibold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Design
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inspect')}
          className={`h-full flex items-center border-b-2 font-medium transition-colors gap-1.5 cursor-pointer ${
            activeTab === 'inspect'
              ? 'border-[#0D99FF] text-[#111827] font-semibold'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#0D99FF]" />
          <span>Reference Finder</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-4">
        {/* TAB 1: DESIGN (Canonical reference matching Image #1) */}
        {activeTab === 'design' && (
          <>
            {/* Contextual Banner: Selected Point */}
            {selectedPoint && (
              <div className="p-3 bg-[#F9FAFB] border-b border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedPoint.color || '#18A0FB' }}
                    />
                    <input
                      type="text"
                      value={selectedPoint.label}
                      onChange={(e) => updatePoint(selectedPoint.id, { label: e.target.value })}
                      className="font-semibold text-xs text-[#111827] bg-transparent outline-none border-b border-transparent hover:border-[#D1D5DB] focus:border-[#18A0FB] w-28"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePoint(selectedPoint.id)}
                    className="text-[#9CA3AF] hover:text-[#DC2626] p-1 rounded"
                    title="Delete Point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FigmaInput
                    prefixLabel="X"
                    readOnly
                    value={fracX?.formatted || selectedPoint.x.toFixed(4)}
                  />
                  <FigmaInput
                    prefixLabel="Y"
                    readOnly
                    value={fracY?.formatted || selectedPoint.y.toFixed(4)}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                  <span>Grid ({grid.divisionsX}):</span>
                  <span className="text-[#111827] font-semibold">
                    ({Math.round(selectedPoint.x * grid.divisionsX)},{' '}
                    {Math.round(selectedPoint.y * grid.divisionsY)})
                  </span>
                </div>
              </div>
            )}

            {/* Contextual Banner: Selected Crease */}
            {selectedCrease && !selectedPoint && (
              <div className="p-3 bg-[#F9FAFB] border-b border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#111827] capitalize">
                    {selectedCrease.type} Crease
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCrease(selectedCrease.id)}
                    className="text-[#9CA3AF] hover:text-[#DC2626] p-1 rounded"
                    title="Delete Crease"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Quick type switcher */}
                <div className="grid grid-cols-4 gap-1">
                  {(['mountain', 'valley', 'edge', 'auxiliary'] as CreaseType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        updateCrease(selectedCrease.id, {
                          type: t,
                          confirmed: true,
                          assignmentSource: 'manual',
                        })
                      }
                      className={`h-5 rounded-[3px] text-[10px] font-medium capitalize transition-colors flex items-center justify-center ${
                        selectedCrease.type === t
                          ? 'bg-white text-[#111827] shadow-xs font-semibold border border-[#E5E5E5]'
                          : 'text-[#6B7280] hover:text-[#111827]'
                      }`}
                    >
                      {t === 'mountain' ? 'Mtn' : t === 'valley' ? 'Val' : t === 'edge' ? 'Bnd' : 'Aux'}
                    </button>
                  ))}
                </div>
                {(() => {
                  const len = distance(selectedCrease.p1, selectedCrease.p2);
                  const angle = lineAngle(selectedCrease.p1, selectedCrease.p2);
                  const match = matchOrigamiAngle(angle);
                  return (
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                      <span>
                        Angle:{' '}
                        <span className="text-[#18A0FB] font-semibold">
                          {angle.toFixed(1)}° {match ? `(${match.standardAngle}°)` : ''}
                        </span>
                      </span>
                      <span>
                        Len:{' '}
                        <span className="text-[#111827] font-semibold">{len.toFixed(4)}</span>
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Contextual Banner: Selected Measurement */}
            {selectedMeasurement && !selectedPoint && !selectedCrease && (
              <div className="p-3 bg-[#F9FAFB] border-b border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#111827]">Measurement</span>
                  <button
                    type="button"
                    onClick={() => deleteMeasurement(selectedMeasurement.id)}
                    className="text-[#9CA3AF] hover:text-[#DC2626] p-1 rounded"
                    title="Delete Measurement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {(() => {
                  const d = distance(selectedMeasurement.p1, selectedMeasurement.p2);
                  const angle = lineAngle(selectedMeasurement.p1, selectedMeasurement.p2);
                  return (
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                      <span>Dist: <span className="text-[#111827] font-semibold">{d.toFixed(4)}</span></span>
                      <span>Angle: <span className="text-[#18A0FB] font-semibold">{angle.toFixed(1)}°</span></span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Contextual Banner: Calibration Tool Active */}
            {activeTool === 'calibrate' && (
              <div className="p-3 bg-[#EBF5FF] border-b border-[#E5E5E5] text-xs text-[#0D90EE] space-y-1">
                <div className="font-semibold text-[#18A0FB]">Paper Calibration Active</div>
                <p className="text-[11px] text-[#4B5563]">Click 4 corners on paper to rectify perspective.</p>
              </div>
            )}
            {/* Selected Canvas Image Banner */}
            {(() => {
              const selectedImg = canvasImages?.find((img) => img.id === selectedImageId);
              if (!selectedImg) return null;
              return (
                <div className="p-3 bg-[#F0F7FF] border-b border-[#E5E5E5] text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#0D99FF] flex items-center gap-1.5 truncate">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedImg.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCanvasImage(selectedImg.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Figma-style Position & Size (Locked Aspect Ratio) */}
                  <div className="space-y-1.5 bg-white p-2 rounded-[6px] border border-[#E5E5E5]">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pb-0.5 font-medium">
                      <span>Transform</span>
                      <span className="flex items-center gap-1 text-[#0D99FF]">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Original Scale (Locked)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FigmaInput
                        prefixLabel="X"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(selectedImg.x)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateCanvasImage(selectedImg.id, { x: isNaN(val) ? 0 : val });
                        }}
                        containerClassName="flex-1"
                      />
                      <FigmaInput
                        prefixLabel="Y"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(selectedImg.y)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateCanvasImage(selectedImg.id, { y: isNaN(val) ? 0 : val });
                        }}
                        containerClassName="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FigmaInput
                        prefixLabel="W"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(selectedImg.width)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 20) {
                            const ratio = selectedImg.width / (selectedImg.height || 1);
                            updateCanvasImage(selectedImg.id, {
                              width: val,
                              height: Math.max(20, Math.round(val / ratio)),
                            });
                          }
                        }}
                        containerClassName="flex-1"
                      />
                      <FigmaInput
                        prefixLabel="H"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(selectedImg.height)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 20) {
                            const ratio = selectedImg.width / (selectedImg.height || 1);
                            updateCanvasImage(selectedImg.id, {
                              height: val,
                              width: Math.max(20, Math.round(val * ratio)),
                            });
                          }
                        }}
                        containerClassName="flex-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceImageFromCropped(selectedImg.url, selectedImg.name, selectedImg.width, selectedImg.height);
                        selectCanvasImage(null);
                        setActiveSheetId(null);
                      }}
                      className="h-7 px-2 bg-white border border-[#D1D5DB] hover:border-gray-400 text-gray-800 font-medium text-xs rounded-[6px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Dán làm CP chính bên trái"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-[#0D99FF]" />
                      <span>Set as Left CP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('crop');
                      }}
                      className="h-7 px-2 bg-white border border-[#D1D5DB] hover:border-gray-400 text-gray-800 font-medium text-xs rounded-[6px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Cắt một phần ảnh này"
                    >
                      <Crop className="w-3.5 h-3.5 text-[#0D99FF]" />
                      <span>Crop Region</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onRunAutoAnalysis}
                    className="w-full h-8 bg-[#0D99FF] hover:bg-[#0088EE] text-white font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ Run CV Analysis on This Image</span>
                  </button>
                </div>
              );
            })()}
            {/* Active Extracted Sheet Banner */}
            {(() => {
              const activeSheet = sheets?.find((s) => s.id === activeSheetId);
              if (!activeSheet || activeSheet.id === 'main_cp') return null;
              return (
                <div className="p-3 bg-[#EBF5FF] border-b border-[#E5E5E5] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#0D99FF] flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5" />
                      <span>{activeSheet.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#0D99FF]">Selected Sheet</span>
                  </div>

                  {/* Figma-style Position & Size (1:1 Square Scale) */}
                  <div className="space-y-1.5 bg-white p-2 rounded-[6px] border border-[#E5E5E5]">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pb-0.5 font-medium">
                      <span>Transform</span>
                      <span className="flex items-center gap-1 text-[#0D99FF]">
                        <Lock className="w-2.5 h-2.5" />
                        <span>1:1 Square Scale</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FigmaInput
                        prefixLabel="X"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(activeSheet.x)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateSheet(activeSheet.id, { x: isNaN(val) ? 0 : val });
                        }}
                        containerClassName="flex-1"
                      />
                      <FigmaInput
                        prefixLabel="Y"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(activeSheet.y)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateSheet(activeSheet.id, { y: isNaN(val) ? 0 : val });
                        }}
                        containerClassName="flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FigmaInput
                        prefixLabel="W"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(activeSheet.width)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 100) {
                            updateSheet(activeSheet.id, { width: val, height: val });
                          }
                        }}
                        containerClassName="flex-1"
                      />
                      <FigmaInput
                        prefixLabel="H"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(activeSheet.height)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 100) {
                            updateSheet(activeSheet.id, { width: val, height: val });
                          }
                        }}
                        containerClassName="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#4B5563]">
                    <span>Creases: <b>{activeSheet.creases.length}</b></span>
                    <span>Grid: <b>{activeSheet.grid.divisionsX}×{activeSheet.grid.divisionsY}</b></span>
                  </div>
                  <button
                    type="button"
                    onClick={onRunAutoAnalysis}
                    className="w-full h-7 bg-[#0D99FF] hover:bg-[#0088EE] text-white font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Analyze This Sheet (Run CV Pipeline)</span>
                  </button>
                </div>
              );
            })()}
            {/* Contextual Banner: Crop Tool Active */}
            {activeTool === 'crop' && (
              <div className="p-3 bg-[#EBF5FF] border-b border-[#E5E5E5] text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-[#0D99FF]">
                  <Crop className="w-3.5 h-3.5" />
                  <span>Crop / Cut CP Region</span>
                </div>
                <p className="text-[11px] text-[#4B5563] leading-snug">
                  Drag a box on the canvas to cut and extract a region into a new CP sheet to the right.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const paperPos = useAppStore.getState().paperPosition;
                    const sheets = useAppStore.getState().sheets;
                    const canvasImages = useAppStore.getState().canvasImages;
                    const allRight = [
                      paperPos.x + 1000,
                      ...sheets.map((s) => s.x + s.width),
                      ...canvasImages.map((i) => i.x + i.width),
                    ];
                    const newX = Math.max(...allRight) + 120;
                    const newSheetId = useAppStore.getState().addSheet({
                      name: `CP ${sheets.length + 1} (Extracted)`,
                      x: newX,
                      y: paperPos.y,
                      width: 1000,
                      height: 1000,
                      creases: [...useAppStore.getState().creases],
                      points: [...useAppStore.getState().points],
                      grid: { ...useAppStore.getState().grid },
                    });
                    useAppStore.getState().setActiveSheetId(newSheetId);
                    useAppStore.getState().setActiveTool('select');
                    const stageW = window.innerWidth - 500;
                    const stageH = window.innerHeight - 110;
                    const zoom = useAppStore.getState().camera.zoom;
                    const newPanX = (stageW - 1000 * zoom) / 2 - newX * zoom;
                    const newPanY = (stageH - 1000 * zoom) / 2 - paperPos.y * zoom;
                    useAppStore.getState().setCamera({ panX: newPanX, panY: newPanY });
                  }}
                  className="w-full h-7 bg-[#0D99FF] hover:bg-[#0088EE] text-white font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extract CP Sheet to Right</span>
                </button>
              </div>
            )}

            {/* SECTION 1: CANVAS */}
            <div className="pt-3">
              <div className="text-xs font-semibold text-[#111827] px-3 pb-2">Canvas</div>
              {/* Quick CV Analysis Action for Main CP */}
              {image.url && !selectedImageId && !activeSheetId && (
                <div className="px-3 pb-3">
                  <button
                    type="button"
                    onClick={onRunAutoAnalysis}
                    className="w-full h-8 bg-[#0D99FF] hover:bg-[#0088EE] text-white font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>⚡ Run CV Analysis on CP</span>
                  </button>
                </div>
              )}

              {/* Size row */}
              <div className="px-3 flex items-center justify-between gap-1">
                <span className="text-[#6B7280] text-xs w-16 shrink-0">Size</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <FigmaInput
                    prefixLabel="W"
                    value={canvasW}
                    onChange={(e) => setCanvasW(e.target.value)}
                    containerClassName="w-[54px]"
                  />
                  <FigmaInput
                    prefixLabel="H"
                    value={canvasH}
                    onChange={(e) => setCanvasH(e.target.value)}
                    containerClassName="w-[54px]"
                  />
                  <FigmaSelect
                    value={canvasUnit}
                    onChange={(e) => setCanvasUnit(e.target.value)}
                    containerClassName="w-[52px]"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="px">px</option>
                  </FigmaSelect>
                </div>
              </div>

              {/* Background row */}
              <div className="px-3 mt-2 flex items-center justify-between">
                <span className="text-[#6B7280] text-xs w-16 shrink-0">Background</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-[3px] border border-[#E5E5E5] flex items-center justify-center p-0.5 bg-white relative overflow-hidden cursor-pointer shadow-2xs">
                    <input
                      type="color"
                      value={`#${canvasBg}`}
                      onChange={(e) => setCanvasBg(e.target.value.replace('#', '').toUpperCase())}
                      className="opacity-0 absolute inset-0 cursor-pointer"
                    />
                    <div
                      className="w-full h-full rounded-[2px]"
                      style={{ backgroundColor: `#${canvasBg}` }}
                    />
                  </div>
                  <FigmaSelect
                    value={canvasBg}
                    onChange={(e) => setCanvasBg(e.target.value)}
                    containerClassName="w-20 font-mono"
                  >
                    <option value="FFFFFF">FFFFFF</option>
                    <option value="F7F7F7">F7F7F7</option>
                    <option value="000000">000000</option>
                  </FigmaSelect>
                  <span className="text-[11px] font-mono text-[#6B7280]">100%</span>
                </div>
              </div>

              {/* Checkbox: Show canvas border */}
              <div className="px-3 mt-2.5">
                <FigmaCheckbox
                  checked={layers.boundary}
                  onChange={(checked) => setLayerVisibility('boundary', checked)}
                  label="Show canvas border"
                />
              </div>
            </div>

            {/* SECTION 1.5: BOUNDARY & IMAGE SCALE */}
            {(image.url || sheets.some((s) => s.imageUrl)) && (
              <>
                <FigmaDivider />
                <div className="pt-2">
                  <div className="px-3 flex items-center justify-between pb-2">
                    <span className="text-xs font-semibold text-[#111827]">Boundary & Scale</span>
                    <button
                      type="button"
                      onClick={resetImageTransform}
                      className="text-[11px] text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
                      title="Reset image scale & position"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Scale / Zoom row */}
                  <div className="px-3 flex items-center justify-between gap-2">
                    <span className="text-[#6B7280] text-xs w-16 shrink-0">Scale</span>
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <button
                        type="button"
                        onClick={() => updateImageTransform({ scale: Math.max(0.7, Number((imageTransform.scale - 0.05).toFixed(2))) })}
                        className="w-5 h-6 rounded bg-[#F3F4F6] hover:bg-[#E5E7EB] text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                        title="Zoom out 5%"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="70"
                        max="160"
                        value={Math.round(imageTransform.scale * 100)}
                        onChange={(e) => updateImageTransform({ scale: Number(e.target.value) / 100 })}
                        className="flex-1 h-1.5 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#0D99FF]"
                      />
                      <button
                        type="button"
                        onClick={() => updateImageTransform({ scale: Math.min(2.0, Number((imageTransform.scale + 0.05).toFixed(2))) })}
                        className="w-5 h-6 rounded bg-[#F3F4F6] hover:bg-[#E5E7EB] text-gray-700 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                        title="Zoom in 5%"
                      >
                        +
                      </button>
                      <span className="text-xs font-mono text-[#111827] w-10 text-right">
                        {Math.round(imageTransform.scale * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Offset X / Y row */}
                  <div className="px-3 mt-2 flex items-center justify-between gap-2">
                    <span className="text-[#6B7280] text-xs w-16 shrink-0">Pan</span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <FigmaInput
                        prefixLabel="X"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(imageTransform.offsetX)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateImageTransform({ offsetX: isNaN(val) ? 0 : val });
                        }}
                        containerClassName="flex-1"
                      />
                      <FigmaInput
                        prefixLabel="Y"
                        type="text"
                        inputMode="numeric"
                        value={Math.round(imageTransform.offsetY)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateImageTransform({ offsetY: isNaN(val) ? 0 : val });
                        }}
                        containerClassName="flex-1"
                      />
                    </div>
                  </div>

                  {/* Auto-Fit Boundary button */}
                  <div className="px-3 mt-2.5">
                    <button
                      type="button"
                      onClick={handleAutoFitBoundary}
                      className="w-full h-7 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#E5E5E5]"
                      title="Tự động phóng to để khớp viền nếp gấp và cắt bớt lề thừa"
                    >
                      <Crop className="w-3.5 h-3.5 text-[#0D99FF]" />
                      <span>Auto-Fit Boundary (Trim Margins)</span>
                    </button>
                  </div>

                  {/* Boundary Insets & Margin Trim Section */}
                  {(() => {
                    const activeSheet = sheets.find((s) => s.id === (activeSheetId || null));
                    const currentInsets = activeSheet
                      ? (activeSheet.insets || { top: 0, right: 0, bottom: 0, left: 0 })
                      : (paperInsets || { top: 0, right: 0, bottom: 0, left: 0 });

                    const handleSetInset = (edge: 'top' | 'right' | 'bottom' | 'left', val: number) => {
                      const safeVal = Math.max(0, isNaN(val) ? 0 : val);
                      if (activeSheet) {
                        updateSheetInsets(activeSheet.id, { [edge]: safeVal });
                      } else {
                        setPaperInsets({ [edge]: safeVal });
                      }
                    };

                    return (
                      <div className="px-3 mt-3 pt-2.5 border-t border-[#E5E5E5]">
                        <div className="flex items-center justify-between pb-1.5">
                          <span className="text-[11px] font-semibold text-[#111827]">Trim Edges to Boundary</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (activeSheet) {
                                updateSheetInsets(activeSheet.id, { top: 0, right: 0, bottom: 0, left: 0 });
                              } else {
                                setPaperInsets({ top: 0, right: 0, bottom: 0, left: 0 });
                              }
                            }}
                            className="text-[10px] text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
                            title="Reset all edge insets to 0"
                          >
                            Reset Insets
                          </button>
                        </div>

                        {/* Top & Bottom */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-[6px] px-2 py-1">
                            <span className="text-[10px] font-bold text-gray-500 w-7">Top</span>
                            <input
                              type="number"
                              min="0"
                              value={currentInsets.top}
                              onChange={(e) => handleSetInset('top', parseInt(e.target.value, 10))}
                              className="w-full text-xs font-mono text-right bg-transparent focus:outline-hidden"
                            />
                            <span className="text-[10px] text-gray-400">px</span>
                          </div>
                          <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-[6px] px-2 py-1">
                            <span className="text-[10px] font-bold text-gray-500 w-7">Btm</span>
                            <input
                              type="number"
                              min="0"
                              value={currentInsets.bottom}
                              onChange={(e) => handleSetInset('bottom', parseInt(e.target.value, 10))}
                              className="w-full text-xs font-mono text-right bg-transparent focus:outline-hidden"
                            />
                            <span className="text-[10px] text-gray-400">px</span>
                          </div>
                        </div>

                        {/* Left & Right */}
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                          <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-[6px] px-2 py-1">
                            <span className="text-[10px] font-bold text-gray-500 w-7">Left</span>
                            <input
                              type="number"
                              min="0"
                              value={currentInsets.left}
                              onChange={(e) => handleSetInset('left', parseInt(e.target.value, 10))}
                              className="w-full text-xs font-mono text-right bg-transparent focus:outline-hidden"
                            />
                            <span className="text-[10px] text-gray-400">px</span>
                          </div>
                          <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#E5E5E5] rounded-[6px] px-2 py-1">
                            <span className="text-[10px] font-bold text-gray-500 w-7">Right</span>
                            <input
                              type="number"
                              min="0"
                              value={currentInsets.right}
                              onChange={(e) => handleSetInset('right', parseInt(e.target.value, 10))}
                              className="w-full text-xs font-mono text-right bg-transparent focus:outline-hidden"
                            />
                            <span className="text-[10px] text-gray-400">px</span>
                          </div>
                        </div>

                        {/* Auto-Snap to Outer Creases button */}
                        <button
                          type="button"
                          onClick={() => autoTrimBoundary(activeSheetId)}
                          className="w-full mt-2 h-7 bg-[#EBF5FF] hover:bg-[#DEF0FF] text-[#0D99FF] font-medium text-xs rounded-[6px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#BCE1FF]"
                          title="Tự động quét và kéo sát 4 viền vào nếp gấp ngoài cùng"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Auto-Snap Edges to Creases</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Divider */}
            <FigmaDivider />

            {/* SECTION 2: GRID */}
            <div>
              {/* Title row */}
              <div className="px-3 flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-[#111827]">Grid</span>
                <FigmaToggle
                  checked={grid.enabled}
                  onChange={(checked) => setGridConfig({ enabled: checked })}
                  title="Toggle Grid"
                />
              </div>

              {/* Type row */}
              <div className="px-3 flex items-center justify-between gap-2">
                <span className="text-[#6B7280] text-xs w-16 shrink-0">Type</span>
                <FigmaSelect
                  value={gridType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGridType(val);
                    if (val === 'origami22_5') {
                      setGridConfig({ diagonal22_5: true, diagonalAngles: '22.5' });
                    } else if (val === 'isometric') {
                      setGridConfig({ rotation: 60, diagonal22_5: false, diagonalAngles: 'none' });
                    } else {
                      setGridConfig({ rotation: 0, diagonal22_5: false, diagonalAngles: 'none' });
                    }
                  }}
                  containerClassName="flex-1"
                >
                  <option value="origami">Origami grid</option>
                  <option value="origami22_5">22.5° Origami grid</option>
                  <option value="isometric">Isometric 60°</option>
                </FigmaSelect>
              </div>
              {/* Presets row: 2x4 matrix */}
              <div className="px-3 mt-2.5">
                <span className="text-[#6B7280] text-[11px] block mb-1.5">Presets</span>
                <div className="space-y-1.5">
                  {PRESETS.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-4 gap-1.5">
                      {row.map((n) => {
                        const isActive = grid.divisionsX === n && grid.divisionsY === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setGridConfig({
                                divisionsX: n,
                                divisionsY: n,
                                majorSubdivisions: getOptimalMajorSubdivisions(n),
                              });
                            }}
                            className={`h-6 text-[11px] font-mono rounded-[4px] border transition-colors flex items-center justify-center cursor-pointer ${
                              isActive
                                ? 'bg-[#EBF5FF] border-[#18A0FB] text-[#18A0FB] font-semibold'
                                : 'bg-white border-[#E5E5E5] text-[#111827] hover:bg-[#F5F5F5]'
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divisions row */}
              <div className="px-3 mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[#6B7280] text-xs w-16 shrink-0">Divisions</span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <FigmaInput
                    prefixLabel="X"
                    type="text"
                    inputMode="numeric"
                    value={draftDivX}
                    onFocus={() => { isFocusingX.current = true; }}
                    onChange={(e) => handleDivXChange(e.target.value)}
                    onBlur={handleDivXBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    containerClassName="flex-1"
                  />
                  <FigmaInput
                    prefixLabel="Y"
                    type="text"
                    inputMode="numeric"
                    value={draftDivY}
                    onFocus={() => { isFocusingY.current = true; }}
                    onChange={(e) => handleDivYChange(e.target.value)}
                    onBlur={handleDivYBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    containerClassName="flex-1"
                  />
                </div>
              </div>

              {/* Major step row */}
              <div className="px-3 mt-2 flex items-center justify-between gap-2">
                <span className="text-[#6B7280] text-xs w-16 shrink-0">Major step</span>
                <FigmaSelect
                  value={grid.majorSubdivisions ?? 8}
                  onChange={(e) => setGridConfig({ majorSubdivisions: Number(e.target.value) })}
                  containerClassName="flex-1"
                >
                  <option value={4}>4 sections (1/4)</option>
                  <option value={8}>8 sections (1/8)</option>
                  <option value={10}>10 sections (1/10)</option>
                  <option value={16}>16 sections (1/16)</option>
                  <option value={0}>None</option>
                </FigmaSelect>
              </div>
            </div>


            {/* Divider */}
            <FigmaDivider />

            {/* SECTION 3: DISPLAY */}
            <div>
              <div className="text-xs font-semibold text-[#111827] px-3 pb-2.5">Display</div>
              <div className="px-3 flex flex-col space-y-2">
                <FigmaCheckbox
                  checked={layers.grid}
                  onChange={(checked) => setLayerVisibility('grid', checked)}
                  label="Show grid"
                />
                <FigmaCheckbox
                  checked={layers.creases}
                  onChange={(checked) => setLayerVisibility('creases', checked)}
                  label="Show crease lines"
                />
                <FigmaCheckbox
                  checked={layers.boundary}
                  onChange={(checked) => setLayerVisibility('boundary', checked)}
                  label="Show boundary"
                />
                <FigmaCheckbox
                  checked={layers.points || layers.intersections}
                  onChange={(checked) => {
                    setLayerVisibility('points', checked);
                    setLayerVisibility('intersections', checked);
                  }}
                  label="Show vertices"
                />
                <div className="flex items-center justify-between gap-2">
                  <FigmaCheckbox
                    checked={layers.image}
                    onChange={(checked) => setLayerVisibility('image', checked)}
                    label="Show reference image"
                    className="flex-1"
                  />
                  {layers.image && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.05"
                        value={imageOpacity}
                        onChange={(e) => setImageOpacity(parseFloat(e.target.value))}
                        className="w-14 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0D99FF]"
                        title="Reference Image Opacity"
                      />
                      <span className="font-mono text-[10px] text-gray-500 w-6 text-right">
                        {Math.round(imageOpacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <FigmaDivider />

            {/* SECTION 4: STYLE */}
            <div>
              <div className="text-xs font-semibold text-[#111827] px-3 pb-2">Style</div>
              <div className="px-3 space-y-2">
                {/* Mountain row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
                    <span className="text-xs text-[#111827] w-16 shrink-0">Mountain</span>
                  </div>
                  <div className="flex-1 mx-2 h-0.5 bg-[#2563EB] rounded-full" />
                  <FigmaSelect
                    value={mountainWidth}
                    onChange={(e) => setMountainWidth(e.target.value)}
                    containerClassName="w-16"
                  >
                    <option value="1px">1 px</option>
                    <option value="2px">2 px</option>
                    <option value="3px">3 px</option>
                  </FigmaSelect>
                </div>

                {/* Valley row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
                    <span className="text-xs text-[#111827] w-16 shrink-0">Valley</span>
                  </div>
                  <div className="flex-1 mx-2 h-0.5 bg-[#DC2626] rounded-full" />
                  <FigmaSelect
                    value={valleyWidth}
                    onChange={(e) => setValleyWidth(e.target.value)}
                    containerClassName="w-16"
                  >
                    <option value="1px">1 px</option>
                    <option value="2px">2 px</option>
                    <option value="3px">3 px</option>
                  </FigmaSelect>
                </div>

                {/* Boundary row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4B5563] shrink-0" />
                    <span className="text-xs text-[#111827] w-16 shrink-0">Boundary</span>
                  </div>
                  <div className="flex-1 mx-2 h-0.5 bg-[#4B5563] rounded-full" />
                  <FigmaSelect
                    value={boundaryWidth}
                    onChange={(e) => setBoundaryWidth(e.target.value)}
                    containerClassName="w-16"
                  >
                    <option value="1px">1 px</option>
                    <option value="2px">2 px</option>
                    <option value="3px">3 px</option>
                  </FigmaSelect>
                </div>

                {/* Auxiliary row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA] shrink-0" />
                    <span className="text-xs text-[#111827] w-16 shrink-0">Auxiliary</span>
                  </div>
                  <div className="flex-1 mx-2 h-0.5 bg-[#9333EA] rounded-full" />
                  <FigmaSelect
                    value={auxiliaryWidth}
                    onChange={(e) => setAuxiliaryWidth(e.target.value)}
                    containerClassName="w-16"
                  >
                    <option value="1px">1 px</option>
                    <option value="2px">2 px</option>
                    <option value="3px">3 px</option>
                  </FigmaSelect>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: INSPECT (Deep Rational & Fold Geometry Analysis) */}
        {/* TAB 2: REFERENCE FINDER */}
        {activeTab === 'inspect' && (
          <div className="pb-4">
            <ReferenceFinderPanel point={targetCoord || lastTarget.current} />
          </div>
        )}

        {/* TAB 3: GUIDES (Guidelines & Crosshairs Manager) */}
        {activeTab === 'guides' && (
          <div className="p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[#111827] font-semibold text-xs">
                <Crosshair className="w-3.5 h-3.5 text-[#18A0FB]" />
                <span>Crosshairs &amp; Guidelines</span>
                {rulers.length > 0 && (
                  <span className="bg-[#EBF5FF] text-[#18A0FB] text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] font-semibold">
                    {rulers.length}
                  </span>
                )}
              </div>
              {rulers.length > 0 && (
                <button
                  type="button"
                  onClick={clearRulers}
                  className="text-[10px] text-[#6B7280] hover:text-[#DC2626] transition-colors"
                  title="Clear all guidelines"
                >
                  Clear all
                </button>
              )}
            </div>

            {rulers.length === 0 ? (
              <p className="text-[11px] text-[#6B7280] leading-relaxed">
                No active guidelines. Press [R] and click anywhere on paper to place.
              </p>
            ) : null}

            {/* Quick Guideline Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => addRuler({ x: 0.5, y: 0.5 }, 'both')}
                className="h-6 px-2 text-[10px] font-mono text-[#111827] bg-white border border-[#E5E5E5] rounded-[4px] hover:border-[#18A0FB] hover:text-[#18A0FB] transition-colors cursor-pointer"
                title="Add center guideline (1/2, 1/2)"
              >
                + Center (1/2)
              </button>
              <button
                type="button"
                onClick={() => {
                  addRuler({ x: 0.25, y: 0.25 }, 'both');
                  addRuler({ x: 0.75, y: 0.75 }, 'both');
                }}
                className="h-6 px-2 text-[10px] font-mono text-[#111827] bg-white border border-[#E5E5E5] rounded-[4px] hover:border-[#18A0FB] hover:text-[#18A0FB] transition-colors cursor-pointer"
                title="Add quarter guidelines (1/4, 3/4)"
              >
                + Quarters (1/4, 3/4)
              </button>
            </div>

            {/* Active Rulers List */}
            {rulers.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5 mt-2">
                {rulers.map((r, idx) => {
                  const fx = approximateFraction(r.point.x, { maxDenominator: 64 });
                  const fy = approximateFraction(r.point.y, { maxDenominator: 64 });
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-1 px-2 rounded-[4px] bg-[#F9FAFB] border border-[#E5E5E5] text-[11px] hover:border-[#D1D5DB] transition-colors"
                    >
                      <div className="flex items-center space-x-1.5 font-mono">
                        <span className="text-[9px] text-[#6B7280] font-semibold">#{idx + 1}</span>
                        <span className="text-[#18A0FB] font-semibold text-[10px]">
                          x: {fx.formatted}
                        </span>
                        <span className="text-[#D1D5DB]">·</span>
                        <span className="text-[#18A0FB] font-semibold text-[10px]">
                          y: {fy.formatted}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRuler(r.id)}
                        className="text-[#9CA3AF] hover:text-[#DC2626] p-0.5 rounded"
                        title="Remove this guideline"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
