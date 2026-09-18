import React, { useState, useEffect } from 'react';
import { X, Compass, Check } from 'lucide-react';
import { FoldingSolutions } from './FoldingSolutions';
import { Point2D } from '../geometry/point';
import { parseReferenceCoordinate } from '../geometry/referenceFinder';
import { useAppStore } from '../store/projectStore';
import { FigmaInput } from './figma/FigmaControls';

interface FoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ORIGAMI_LANDMARKS = [
  { label: 'Center (1/2)', x: 0.5, y: 0.5 },
  { label: 'Silver (√2-1)', x: Math.SQRT2 - 1, y: Math.SQRT2 - 1 },
  { label: '3/8 (0.375)', x: 0.375, y: 0.375 },
  { label: '5/8 (0.625)', x: 0.625, y: 0.625 },
  { label: '1/3 (0.333)', x: 1 / 3, y: 1 / 3 },
  { label: '1/4 (0.250)', x: 0.25, y: 0.25 },
  { label: 'Silver (1-1/√2)', x: 1 - 1 / Math.SQRT2, y: 1 - 1 / Math.SQRT2 },
];

export const FoldingModal: React.FC<FoldingModalProps> = ({ isOpen, onClose }) => {
  const targetPoint = useAppStore((s) => s.targetPoint);
  const setTargetPoint = useAppStore((s) => s.setTargetPoint);
  const selectedPointId = useAppStore((s) => s.selectedPointId);
  const points = useAppStore((s) => s.points);

  const [activePoint, setActivePoint] = useState<Point2D>({ x: 0.5, y: 0.5 });
  const [draftX, setDraftX] = useState<string>('0.500000');
  const [draftY, setDraftY] = useState<string>('0.500000');
  const [feedback, setFeedback] = useState<string>('');

  // Synchronize target coordinates whenever modal opens or canvas selection changes
  useEffect(() => {
    if (isOpen) {
      const selectedPt = points.find((p) => p.id === selectedPointId);
      const pt = selectedPt
        ? { x: selectedPt.x, y: selectedPt.y }
        : targetPoint || { x: 0.5, y: 0.5 };

      setActivePoint(pt);
      setDraftX(pt.x.toFixed(6));
      setDraftY(pt.y.toFixed(6));
      setFeedback('');
    }
  }, [isOpen, selectedPointId, targetPoint, points]);

  const applyManualCoordinates = () => {
    const parsedX = parseReferenceCoordinate(draftX);
    const parsedY = parseReferenceCoordinate(draftY);
    if (parsedX === null || parsedY === null) {
      setFeedback('Invalid coordinate format. Use numbers in [0, 1] or fractions.');
      return;
    }
    const next = { x: Math.max(0, Math.min(1, parsedX)), y: Math.max(0, Math.min(1, parsedY)) };
    setActivePoint(next);
    setTargetPoint(next);
    setDraftX(next.x.toFixed(6));
    setDraftY(next.y.toFixed(6));
    setFeedback(`Coordinates set to (${next.x.toFixed(4)}, ${next.y.toFixed(4)})`);
  };

  const handleSelectPreset = (lm: { label: string; x: number; y: number }) => {
    const pt = { x: lm.x, y: lm.y };
    setActivePoint(pt);
    setTargetPoint(pt);
    setDraftX(pt.x.toFixed(6));
    setDraftY(pt.y.toFixed(6));
    setFeedback(`Selected landmark: ${lm.label}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-xl bg-white border border-[#E5E5E5] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EBF5FF] text-[#0D99FF] flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Origami Reference Finder</h2>
              <p className="text-[11px] text-[#6B7280]">
                Interactive step-by-step geometric fold solutions (22.5° & rational ratios)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Coordinates Input Row */}
        <div className="px-5 py-2.5 bg-white border-b border-[#E5E5E5] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold text-[#111827] shrink-0">Target:</span>
            <div className="w-28">
              <FigmaInput
                prefixLabel="X"
                value={draftX}
                onChange={(e) => setDraftX(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyManualCoordinates();
                }}
              />
            </div>
            <div className="w-28">
              <FigmaInput
                prefixLabel="Y"
                value={draftY}
                onChange={(e) => setDraftY(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyManualCoordinates();
                }}
              />
            </div>
            <button
              type="button"
              onClick={applyManualCoordinates}
              className="h-6 px-2.5 bg-[#0D99FF] text-white rounded-[4px] text-xs font-medium hover:bg-[#0088EE] transition-colors cursor-pointer shrink-0"
            >
              Apply
            </button>
          </div>
          {feedback && (
            <span className="text-[11px] font-mono text-[#0D99FF] truncate">{feedback}</span>
          )}
        </div>

        {/* Landmark Preset Strip */}
        <div className="px-5 py-2 bg-[#F9FAFB] border-b border-[#E5E5E5] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] font-medium text-[#6B7280] shrink-0 mr-1 flex items-center gap-1">
            Presets:
          </span>
          {ORIGAMI_LANDMARKS.map((lm) => {
            const isMatch =
              Math.abs(activePoint.x - lm.x) < 1e-4 && Math.abs(activePoint.y - lm.y) < 1e-4;
            return (
              <button
                key={lm.label}
                type="button"
                onClick={() => handleSelectPreset(lm)}
                className={`px-2 py-1 rounded-[4px] text-[11px] font-mono transition-colors shrink-0 cursor-pointer ${
                  isMatch
                    ? 'bg-[#EBF5FF] text-[#0D99FF] font-semibold border border-[#0D99FF]/30 shadow-2xs'
                    : 'bg-white text-[#111827] border border-[#E5E5E5] hover:bg-[#F5F5F5]'
                }`}
              >
                {lm.label}
              </button>
            );
          })}
        </div>

        {/* Content: FoldingSolutions Engine */}
        <div className="p-4 flex-1 overflow-y-auto [scrollbar-width:thin]">
          <FoldingSolutions point={activePoint} side={240} />
        </div>
      </div>
    </div>
  );
};
