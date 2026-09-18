import React, { useEffect, useRef, useState, useId } from 'react';
import { Point2D } from '../geometry/point';
import { referenceFinderCoordinates } from '../geometry/referenceFinder';
import { FoldStep, groupFoldSteps, foldInstruction } from '../geometry/foldInstructions';
import { useAppStore } from '../store/projectStore';
import { Button } from './shadcn/button';
import { Badge } from './shadcn/badge';
import { cn } from './shadcn/utils';
import { Tabs, TabsList, TabsTrigger } from './shadcn/tabs';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Compass,
} from 'lucide-react';

type Element = {
  type: number;
  from?: number[] | number;
  to?: number[] | number;
  pt?: number[];
  text?: string;
  style: number;
  center?: number[];
  radius?: number;
  ccw?: number;
};

export interface Solution {
  solution: number[];
  err: number;
  rank: number;
  steps: FoldStep[];
  diagrams: Element[][];
}

export interface FoldingSolutionsProps {
  point: Point2D;
  side?: number;
  rank?: number;
  onRankChange?: (rank: number) => void;
  searchTrigger?: number;
  onSearchingChange?: (searching: boolean) => void;
}

export function FoldingSolutions({
  point,
  side = 300,
  rank: controlledRank,
  onRankChange,
  searchTrigger,
  onSearchingChange,
}: FoldingSolutionsProps) {
  const [internalRank, setInternalRank] = useState(4);
  const rank = controlledRank ?? internalRank;
  const setRank = (r: number) => {
    if (onRankChange) onRankChange(r);
    else setInternalRank(r);
  };

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [selectedSolutionIdx, setSelectedSolutionIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [status, setStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState('');

  const worker = useRef<Worker | null>(null);
  const timer = useRef<number>();
  const marker = useId().replace(/:/g, '');

  const stop = () => {
    worker.current?.terminate();
    worker.current = null;
    window.clearTimeout(timer.current);
    setRunning(false);
    onSearchingChange?.(false);
  };

  useEffect(() => {
    stop();
    setSolutions([]);
    setStatus('');
    setSelectedSolutionIdx(0);
    setCurrentStepIdx(0);
    return () => {
      worker.current?.terminate();
      window.clearTimeout(timer.current);
    };
  }, [point.x, point.y]);

  const find = () => {
    stop();
    setSolutions([]);
    setSelectedSolutionIdx(0);
    setCurrentStepIdx(0);
    setRunning(true);
    onSearchingChange?.(true);
    setStatus('Initializing folding database…');

    const w = new Worker(
      `${import.meta.env.BASE_URL}vendor/reference-finder/worker.js`,
      { type: 'module' }
    );
    worker.current = w;

    timer.current = window.setTimeout(() => {
      stop();
      setStatus('Search timed out. Try rank 4 or the external ReferenceFinder.');
    }, 60000);

    w.onerror = () => {
      stop();
      setStatus('Could not load fold engine. Check vendor files or use online ReferenceFinder.');
    };

    w.onmessage = ({ data }) => {
      if (worker.current !== w) return;
      if (data.solution) {
        setSolutions((old) => [
          ...old,
          { ...data.solution, steps: groupFoldSteps(data.solution.steps) },
        ]);
      }
      if (data.progress) {
        setStatus(`Building rank ${data.progress.rank} · ${data.progress.marks ?? 0} reference points…`);
      }
      if (data.done) {
        stop();
        setStatus(`Search complete (rank ≤ ${rank}).`);
      }
      if (data.error) {
        stop();
        setStatus(String(data.error));
      }
    };

    w.postMessage({ ...referenceFinderCoordinates(point), rank });
  };

  // Watch search trigger from parent
  const lastTrigger = useRef(searchTrigger);
  useEffect(() => {
    if (searchTrigger !== undefined && searchTrigger > 0 && searchTrigger !== lastTrigger.current) {
      lastTrigger.current = searchTrigger;
      find();
    }
  }, [searchTrigger]);

  const currentSolution = solutions[selectedSolutionIdx] || null;

  // Keep step index bounded
  useEffect(() => {
    setCurrentStepIdx(0);
  }, [selectedSolutionIdx]);

  const handleCopyCoordinates = async () => {
    const rf = referenceFinderCoordinates(point);
    try {
      await navigator.clipboard.writeText(
        `Canvas: x = ${point.x.toFixed(6)}, y = ${point.y.toFixed(6)}\n` +
        `RefFinder: x = ${rf.x.toFixed(8)}, y = ${rf.y.toFixed(8)}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const applyCreasesToPattern = () => {
    if (!currentSolution) return;
    const store = useAppStore.getState();
    let count = 0;
    const existingCreases = store.creases;

    // Collect all candidate creases across all steps of this solution (style >= 2)
    const candidateLines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    currentSolution.diagrams.forEach((diag) => {
      (diag || []).forEach((e) => {
        if (e.type === 1 && Array.isArray(e.from) && Array.isArray(e.to) && e.style >= 2) {
          const x1 = e.from[0];
          const y1 = 1 - e.from[1];
          const x2 = e.to[0];
          const y2 = 1 - e.to[1];

          // Skip outer boundary edges of the square
          const isLeft = Math.abs(x1) < 1e-4 && Math.abs(x2) < 1e-4;
          const isRight = Math.abs(x1 - 1) < 1e-4 && Math.abs(x2 - 1) < 1e-4;
          const isTop = Math.abs(y1) < 1e-4 && Math.abs(y2) < 1e-4;
          const isBottom = Math.abs(y1 - 1) < 1e-4 && Math.abs(y2 - 1) < 1e-4;

          if (!isLeft && !isRight && !isTop && !isBottom) {
            candidateLines.push({ x1, y1, x2, y2 });
          }
        }
      });
    });

    const isClose = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y) < 1e-3;

    const uniqueLines: { p1: Point2D; p2: Point2D }[] = [];
    candidateLines.forEach((line) => {
      const p1 = { x: line.x1, y: line.y1 };
      const p2 = { x: line.x2, y: line.y2 };

      const alreadyInUnique = uniqueLines.some(
        (u) =>
          (isClose(u.p1, p1) && isClose(u.p2, p2)) ||
          (isClose(u.p1, p2) && isClose(u.p2, p1))
      );

      const alreadyInStore = existingCreases.some(
        (c) =>
          (isClose(c.p1, p1) && isClose(c.p2, p2)) ||
          (isClose(c.p1, p2) && isClose(c.p2, p1))
      );

      if (!alreadyInUnique && !alreadyInStore) {
        uniqueLines.push({ p1, p2 });
      }
    });

    uniqueLines.forEach((line) => {
      store.addCrease({
        p1: line.p1,
        p2: line.p2,
        type: 'auxiliary',
        confirmed: true,
        assignmentSource: 'inferred',
      });
      count++;
    });

    // Pin the found reference point as well
    const foundPt = {
      x: currentSolution.solution[0],
      y: 1 - currentSolution.solution[1],
    };
    const alreadyPinned = store.points.some((pt) => isClose(pt, foundPt));
    if (!alreadyPinned) {
      store.addPoint({
        x: foundPt.x,
        y: foundPt.y,
        label: `Ref (${foundPt.x.toFixed(4)}, ${foundPt.y.toFixed(4)})`,
        color: '#0D99FF',
      });
    }

    setAppliedFeedback(
      count > 0
        ? `Added ${count} reference crease${count > 1 ? 's' : ''} to pattern!`
        : 'All reference creases are already on your canvas'
    );
    setTimeout(() => setAppliedFeedback(''), 3500);
  };

  const rfCoords = referenceFinderCoordinates(point);

  return (
    <div className="space-y-3 pt-1">
      {/* Search Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#111827] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#0D99FF]" />
            Search Depth
          </span>
          <div className="w-44 shrink-0">
            <Tabs
              value={String(rank)}
              onValueChange={(val) => {
                if (!running) setRank(Number(val));
              }}
            >
              <TabsList size="sm" className="w-full">
                <TabsTrigger
                  value="4"
                  disabled={running}
                  className="text-[10px] px-1 whitespace-nowrap"
                >
                  Rank 4 (Fast)
                </TabsTrigger>
                <TabsTrigger
                  value="5"
                  disabled={running}
                  className="text-[10px] px-1 whitespace-nowrap"
                >
                  Rank 5 (Deep)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={running}
            onClick={find}
            isLoading={running}
            className={cn('h-8 font-medium text-xs', running ? 'flex-1' : 'w-full')}
          >
            {!running && <Sparkles className="w-3.5 h-3.5 text-blue-200" />}
            {running ? 'Searching sequences…' : 'Find Folding Sequences'}
          </Button>

          {running && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                stop();
                setStatus('Search cancelled');
              }}
              className="h-8 px-2.5 text-[11px]"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Status Line */}
        {status && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#0D99FF] font-mono bg-[#EBF5FF] border border-[#0D99FF]/20 px-2.5 py-1 rounded-[6px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D99FF] animate-pulse shrink-0" />
            <span className="truncate">{status}</span>
          </div>
        )}
      </div>

      {/* Solutions Section */}
      {solutions.length > 0 && currentSolution && (
        <div className="space-y-2 border-t border-[#E5E5E5] pt-2">
          {/* Solution Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {solutions.map((s, idx) => {
              const isSelected = idx === selectedSolutionIdx;
              const errMm = (s.err * side).toFixed(2);
              return (
                <Button
                  key={idx}
                  type="button"
                  size="xs"
                  variant={isSelected ? 'accent' : 'secondary'}
                  onClick={() => setSelectedSolutionIdx(idx)}
                  className={cn(
                    'shrink-0 h-6 px-2 text-[10px]',
                    isSelected
                      ? 'bg-[#EBF5FF] text-[#0D99FF] border border-[#0D99FF]/30 font-semibold'
                      : 'text-[#6B7280]'
                  )}
                >
                  <span>Sol {idx + 1}</span>
                  <span className="opacity-70 font-mono text-[9px]">(Δ {errMm}mm)</span>
                </Button>
              );
            })}
          </div>

          {/* Current Solution Stepper Card */}
          <div className="border border-[#E5E5E5] rounded-[8px] p-2.5 bg-white space-y-2 shadow-2xs">
            {/* Step Stepper Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={currentStepIdx === 0}
                  onClick={() => setCurrentStepIdx((i) => Math.max(0, i - 1))}
                  aria-label="Previous fold step"
                  className="h-6 w-6 text-[#1D1D1F] disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-medium text-[#1D1D1F] font-mono px-0.5">
                  Step {currentStepIdx + 1} of {currentSolution.steps.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={currentStepIdx === currentSolution.steps.length - 1}
                  onClick={() =>
                    setCurrentStepIdx((i) =>
                      Math.min(currentSolution.steps.length - 1, i + 1)
                    )
                  }
                  aria-label="Next fold step"
                  className="h-6 w-6 text-[#1D1D1F] disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Badge variant="outline" size="sm" className="font-mono text-[9px] text-[#86868B]">
                Δ {(currentSolution.err * side).toFixed(3)}mm
              </Badge>
            </div>

            {/* Single Crisp Instruction Line */}
            <div className="text-[11px] text-[#111827] bg-[#F9FAFB] px-2.5 py-1.5 rounded-[6px] border border-[#E5E5E5] flex items-start gap-1.5 leading-snug">
              <span className="font-semibold text-[#0D99FF] shrink-0">Step {currentStepIdx + 1}:</span>
              <span className="font-medium">
                {currentSolution.steps[currentStepIdx]
                  ? foldInstruction(currentSolution.steps[currentStepIdx])
                  : 'Fold instruction'}
              </span>
            </div>

            {/* High-Clarity Origami Diagram SVG */}
            <div className="space-y-1.5">
              <div className="relative rounded-[6px] overflow-hidden border border-[#E5E5E5] bg-white p-2 flex items-center justify-center">
                <svg
                  viewBox="-0.12 -0.12 1.24 1.24"
                  className="w-full max-w-[220px] max-h-[220px] aspect-square mx-auto block"
                  aria-label={`Fold step diagram ${currentStepIdx + 1}`}
                >
                  <defs>
                    <marker
                      id={`${marker}-${selectedSolutionIdx}-${currentStepIdx}`}
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#DC2626" />
                    </marker>
                  </defs>

                  {/* Paper Square */}
                  <rect
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    fill="#FFFFFF"
                    stroke="#E5E5EA"
                    strokeWidth="0.008"
                    rx="0.008"
                  />

                  {/* Diagram Elements for Current Step */}
                  {(currentSolution.diagrams[currentStepIdx] || []).map((e, k) => {
                    if (!e) return null;

                    // Lines: creases or paper edges
                    if (e.type === 1 && Array.isArray(e.from) && Array.isArray(e.to)) {
                      const x1 = e.from[0];
                      const y1 = 1 - e.from[1];
                      const x2 = e.to[0];
                      const y2 = 1 - e.to[1];

                      const isActiveFold = e.style === 4;
                      const isRefCrease = e.style >= 2;

                      const strokeColor = isActiveFold
                        ? '#DC2626'
                        : isRefCrease
                        ? '#2563EB'
                        : '#8E8E93';
                      const strokeWidth = isActiveFold
                        ? 0.012
                        : isRefCrease
                        ? 0.008
                        : 0.005;

                      let dashArray: string | undefined;
                      if (e.style === 3) dashArray = '0.025 0.015';
                      else if (e.style === 6) dashArray = '0.01 0.012';

                      return (
                        <line
                          key={k}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={dashArray}
                        />
                      );
                    }

                    // Landmark Points
                    if (e.type === 0 && e.pt) {
                      return (
                        <g key={k}>
                          <circle
                            cx={e.pt[0]}
                            cy={1 - e.pt[1]}
                            r="0.018"
                            fill="#DC2626"
                            stroke="#FFFFFF"
                            strokeWidth="0.004"
                          />
                          <circle
                            cx={e.pt[0]}
                            cy={1 - e.pt[1]}
                            r="0.006"
                            fill="#FFFFFF"
                          />
                        </g>
                      );
                    }

                    // Landmark Text Labels
                    if (e.type === 4 && e.pt && e.text) {
                      return (
                        <text
                          key={k}
                          x={e.pt[0] + 0.022}
                          y={1 - e.pt[1] - 0.018}
                          fontSize="0.05"
                          fontWeight="600"
                          fill="#1D1D1F"
                          fontFamily="sans-serif"
                        >
                          {e.text}
                        </text>
                      );
                    }

                    // Curved Fold Action Arrows (type === 2)
                    if (
                      e.type === 2 &&
                      e.center &&
                      e.radius &&
                      typeof e.from === 'number' &&
                      typeof e.to === 'number'
                    ) {
                      const start = e.ccw ? e.from : e.to;
                      const end = e.ccw ? e.to : e.from;
                      const delta = (end - start + 2 * Math.PI) % (2 * Math.PI);
                      const x1 = e.center[0] + e.radius * Math.cos(start);
                      const y1 = 1 - e.center[1] - e.radius * Math.sin(start);
                      const x2 = e.center[0] + e.radius * Math.cos(end);
                      const y2 = 1 - e.center[1] - e.radius * Math.sin(end);

                      return (
                        <path
                          key={k}
                          d={`M ${x1} ${y1} A ${e.radius} ${e.radius} 0 ${
                            delta > Math.PI ? 1 : 0
                          } 0 ${x2} ${y2}`}
                          fill="none"
                          stroke="#DC2626"
                          strokeWidth="0.009"
                          strokeLinecap="round"
                          markerEnd={
                            e.ccw
                              ? `url(#${marker}-${selectedSolutionIdx}-${currentStepIdx})`
                              : undefined
                          }
                          markerStart={
                            !e.ccw
                              ? `url(#${marker}-${selectedSolutionIdx}-${currentStepIdx})`
                              : undefined
                          }
                        />
                      );
                    }

                    return null;
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-3 text-[10px] text-[#86868B] py-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-[#DC2626] rounded-full inline-block" />
                  Active Fold
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-[#2563EB] rounded-full inline-block" />
                  Reference Crease
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] inline-block" />
                  Landmark
                </span>
              </div>
            </div>

            {/* Action: Apply Folds to Crease Pattern */}
            <div className="pt-1 space-y-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={applyCreasesToPattern}
                className="w-full text-[11px] font-semibold text-[#0D99FF] border border-[#0D99FF]/20 hover:bg-[#EBF5FF]"
              >
                <Layers className="w-3.5 h-3.5" />
                Apply Folds to Crease Pattern
              </Button>

              {appliedFeedback && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 py-1 px-2 rounded-md animate-fadeIn">
                  <Check className="w-3 h-3 shrink-0" />
                  <span>{appliedFeedback}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coordinate Export & External Engine Reference */}
      <div className="pt-2 border-t border-[#E5E5E5] space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-[#6B7280] truncate">
            Robert J. Lang Engine Coordinates
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#6B7280] bg-[#F9FAFB] p-2 rounded-[6px] border border-[#E5E5E5] space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[#6B7280]">Canvas (TL):</span>
            <span className="text-[#111827] font-semibold">({point.x.toFixed(4)}, {point.y.toFixed(4)})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#6B7280]">Engine (BL):</span>
            <span className="text-[#111827] font-semibold">({rfCoords.x.toFixed(4)}, {rfCoords.y.toFixed(4)})</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCopyCoordinates}
            className="h-6 px-1.5 text-[10px] text-[#0D99FF] hover:text-[#0088EE]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Coordinates</span>
              </>
            )}
          </Button>
          <a
            href="https://mutsuntsai.github.io/reference-finder/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-[#0D99FF] hover:underline px-1.5 py-1"
          >
            <span>Open ReferenceFinder Online</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
