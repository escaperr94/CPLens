import React, { useEffect, useState } from 'react';
import { Point2D } from '../geometry/point';
import { useAppStore } from '../store/projectStore';
import {
  findOrigamiProportionCandidate,
  parseReferenceCoordinate,
} from '../geometry/referenceFinder';
import { FoldingSolutions } from './FoldingSolutions';
import { Crosshair, Ruler, Pin, Compass, Sparkles } from 'lucide-react';
import { FigmaInput } from './figma/FigmaControls';

interface PresetItem {
  id: string;
  name: string;
  sub: string;
  x: number;
  y: number;
}

const ORIGAMI_PRESETS: PresetItem[] = [
  { id: 'center', name: 'Center', sub: '1/2', x: 0.5, y: 0.5 },
  { id: 'silver', name: 'Silver 22.5°', sub: '√2-1', x: Math.SQRT2 - 1, y: Math.SQRT2 - 1 },
  { id: '3-8', name: '3/8', sub: '0.375', x: 0.375, y: 0.375 },
  { id: '5-8', name: '5/8', sub: '0.625', x: 0.625, y: 0.625 },
  { id: '1-3', name: '1/3', sub: '0.333', x: 1 / 3, y: 1 / 3 },
  { id: '1-4', name: '1/4', sub: '0.250', x: 0.25, y: 0.75 },
];

export function ReferenceFinderPanel({ point }: { point: Point2D }) {
  const [side, setSide] = useState(300);
  const [message, setMessage] = useState('');
  const [followCursor, setFollowCursor] = useState(false);

  const targetPoint = useAppStore((s) => s.targetPoint);
  const setTargetPoint = useAppStore((s) => s.setTargetPoint);

  const [target, setTarget] = useState<Point2D>(point);
  const [draftX, setDraftX] = useState(point.x.toFixed(6));
  const [draftY, setDraftY] = useState(point.y.toFixed(6));

  // Keep target locked on point prop or store targetPoint
  useEffect(() => {
    const pt = targetPoint || point;
    setTarget(pt);
    setDraftX(pt.x.toFixed(6));
    setDraftY(pt.y.toFixed(6));
  }, [point.x, point.y, targetPoint]);

  const candX = findOrigamiProportionCandidate(target.x);
  const candY = findOrigamiProportionCandidate(target.y);

  const applyManualDraft = () => {
    const x = parseReferenceCoordinate(draftX);
    const y = parseReferenceCoordinate(draftY);
    if (x === null || y === null) {
      setMessage('Invalid format. Enter numbers in [0, 1] or fractions.');
      return;
    }
    const next = { x, y };
    setTarget(next);
    setTargetPoint(next);
    setFollowCursor(false);
    setMessage('Coordinates set.');
  };

  const handleSelectPreset = (p: PresetItem) => {
    const next = { x: p.x, y: p.y };
    setTarget(next);
    setDraftX(p.x.toFixed(6));
    setDraftY(p.y.toFixed(6));
    setTargetPoint(next);
    setFollowCursor(false);
    setMessage(`Selected: ${p.name}`);
  };

  const handleUseCurrentPoint = () => {
    setTarget(point);
    setDraftX(point.x.toFixed(6));
    setDraftY(point.y.toFixed(6));
    setMessage('Canvas point captured.');
  };

  const handleAddCrosshair = () => {
    useAppStore.getState().addRuler(target, 'both');
    setMessage('Crosshair guidelines placed.');
  };

  const handleMeasureFromHere = () => {
    const s = useAppStore.getState();
    s.setDrawingMeasurementStart(target);
    s.setActiveTool('measure');
    setMessage('Click canvas to measure distance.');
  };

  const handlePinReference = () => {
    const s = useAppStore.getState();
    s.addPoint({
      ...target,
      label: `Ref ${s.points.length + 1}`,
      color: '#0D99FF',
    });
    setMessage('Landmark point pinned.');
  };

  return (
    <div className="space-y-3 p-3 text-[#111827] text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-[#E5E5E5]">
        <span className="font-semibold text-xs text-[#111827]">22.5° Reference Finder</span>
        <span className="text-[10px] font-mono text-gray-400 border border-[#E5E5E5] px-1.5 py-0.5 rounded">[0, 1]</span>
      </div>

      {/* Target Point Section */}
      <div>
        <div className="flex items-center justify-between pb-1.5">
          <span className="font-semibold text-xs text-[#111827]">Target Coordinates</span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            {candX && (
              <span className="bg-[#EBF5FF] text-[#0D99FF] px-1.5 py-0.5 rounded font-medium">
                {`X ≈ ${candX.label}`}
              </span>
            )}
            {candY && (
              <span className="bg-[#EBF5FF] text-[#0D99FF] px-1.5 py-0.5 rounded font-medium">
                {`Y ≈ ${candY.label}`}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
          <FigmaInput
            prefixLabel="X"
            value={draftX}
            onChange={(e) => setDraftX(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyManualDraft();
            }}
          />
          <FigmaInput
            prefixLabel="Y"
            value={draftY}
            onChange={(e) => setDraftY(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyManualDraft();
            }}
          />
        </div>

        <div className="flex gap-1.5 mb-1.5">
          <button
            type="button"
            className="flex-1 h-6 text-[11px] font-medium text-[#111827] bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] rounded-[4px] transition-colors cursor-pointer truncate whitespace-nowrap"
            onClick={applyManualDraft}
          >
            Apply Coordinates
          </button>
          <button
            type="button"
            className="flex-1 h-6 text-[11px] font-medium text-[#111827] bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] rounded-[4px] transition-colors cursor-pointer truncate whitespace-nowrap"
            onClick={handleUseCurrentPoint}
          >
            Capture Canvas Point
          </button>
        </div>

        <button
          type="button"
          className={`w-full h-6 rounded-[4px] border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            followCursor
              ? 'bg-[#EBF5FF] border-[#0D99FF] text-[#0D99FF] font-semibold'
              : 'bg-white border-[#E5E5E5] text-[#111827] hover:bg-[#F5F5F5]'
          }`}
          onClick={() => {
            const next = !followCursor;
            setFollowCursor(next);
            if (next) {
              setTarget(point);
              setDraftX(point.x.toFixed(6));
              setDraftY(point.y.toFixed(6));
              setMessage('Tracking canvas cursor live.');
            } else {
              setMessage('Target locked.');
            }
          }}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{followCursor ? 'Live Cursor Track: ON' : 'Follow Canvas Cursor'}</span>
        </button>
      </div>

      <div className="border-t border-[#E5E5E5]" />

      {/* Origami Presets Grid (2x3 matrix matching Figma grid presets) */}
      <div>
        <span className="text-[#6B7280] text-[11px] font-medium block mb-1.5">Origami Presets</span>
        <div className="grid grid-cols-2 gap-1.5">
          {ORIGAMI_PRESETS.map((p) => {
            const active =
              Math.abs(target.x - p.x) < 0.001 && Math.abs(target.y - p.y) < 0.001;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`h-7 px-2 rounded-[4px] border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#EBF5FF] border-[#0D99FF] text-[#0D99FF] font-semibold'
                    : 'bg-white border-[#E5E5E5] text-[#111827] hover:bg-[#F5F5F5]'
                }`}
              >
                <span className="text-[11px] truncate">{p.name}</span>
                <span className="text-[10px] font-mono opacity-70 truncate ml-1">{p.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[#E5E5E5]" />

      {/* Guideline & Action Tools */}
      <div>
        <span className="text-[#6B7280] text-[11px] font-medium block mb-1.5">Guideline & Action Tools</span>
        <div className="space-y-1.5">
          <button
            type="button"
            className="w-full h-7 px-2.5 rounded-[4px] border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] text-[#111827] flex items-center justify-between text-[11px] transition-colors cursor-pointer"
            onClick={handleAddCrosshair}
            title="Places orthogonal guide rulers through this point"
          >
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#0D99FF]" />
              <span>Crosshair Guidelines</span>
            </span>
            <span className="text-[10px] font-mono text-gray-400">Rulers</span>
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="h-7 rounded-[4px] border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] text-[#111827] flex items-center justify-center gap-1.5 text-[11px] transition-colors cursor-pointer truncate whitespace-nowrap px-1"
              onClick={handleMeasureFromHere}
            >
              <Ruler className="w-3.5 h-3.5 text-[#0D99FF] shrink-0" />
              <span className="truncate">Measure from here</span>
            </button>
            <button
              type="button"
              className="h-7 rounded-[4px] border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] text-[#111827] flex items-center justify-center gap-1.5 text-[11px] transition-colors cursor-pointer truncate whitespace-nowrap px-1"
              onClick={handlePinReference}
            >
              <Pin className="w-3.5 h-3.5 text-[#0D99FF] shrink-0" />
              <span className="truncate">Pin Reference</span>
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E5E5E5]" />

      {/* Paper Dimension Readout */}
      <div>
        <div className="flex items-center justify-between pb-1">
          <span className="text-[#6B7280] text-[11px]">Paper Dimension</span>
          <div className="w-20">
            <FigmaInput
              type="number"
              min={1}
              max={10000}
              value={side}
              onChange={(e) => setSide(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-[#6B7280] bg-[#F9FAFB] p-1.5 rounded-[4px] border border-[#E5E5E5]">
          <span>Left: <b className="text-[#111827]">{(target.x * side).toFixed(2)}</b> mm</span>
          <span className="text-gray-300">·</span>
          <span>Top: <b className="text-[#111827]">{(target.y * side).toFixed(2)}</b> mm</span>
        </div>
      </div>

      {message && (
        <div className="text-[11px] text-[#0D99FF] font-medium">
          {message}
        </div>
      )}

      {/* Folding Solutions Engine */}
      <div className="border-t border-[#E5E5E5] pt-2">
        <FoldingSolutions point={target} side={side} />
      </div>
    </div>
  );
}
