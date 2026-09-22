import React from 'react';
import { Layers, ChevronsUpDown } from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { formatGridFraction } from '../geometry/rational';

export const StatusBar: React.FC = () => {
  const { cursorPaper, targetPoint, camera, snapCandidate, snappingEnabled, grid, creases, points } = useAppStore();

  const activePoint = snapCandidate ? snapCandidate.point : cursorPaper;
  const cursorFx = activePoint ? formatGridFraction(activePoint.x, grid.divisionsX) : null;
  const cursorFy = activePoint ? formatGridFraction(activePoint.y, grid.divisionsY) : null;

  const targetFx = targetPoint ? formatGridFraction(targetPoint.x, grid.divisionsX) : null;
  const targetFy = targetPoint ? formatGridFraction(targetPoint.y, grid.divisionsY) : null;

  let snapText = 'none';
  if (snappingEnabled) {
    if (snapCandidate) {
      if (snapCandidate.kind === 'grid') {
        const gx = Math.round(snapCandidate.point.x * grid.divisionsX);
        const gy = Math.round(snapCandidate.point.y * grid.divisionsY);
        snapText = `Grid (${gx}, ${gy})`;
      } else {
        snapText = snapCandidate.label || snapCandidate.kind;
      }
    } else if (cursorPaper) {
      const gx = Math.round(cursorPaper.x * grid.divisionsX);
      const gy = Math.round(cursorPaper.y * grid.divisionsY);
      snapText = `Grid (${gx}, ${gy})`;
    } else {
      snapText = 'active';
    }
  }

  return (
    <footer className="h-8 bg-white/95 backdrop-blur-md border-t border-[#E5E5EA]/70 px-4 flex items-center justify-between text-xs text-[#86868B] select-none z-20 shadow-[0_-1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Layers/Crease count, Coordinates, Grid, Snap */}
      <div className="flex items-center space-x-4">
        {/* Layer / Entity count */}
        <div className="flex items-center space-x-1.5 text-neutral-700 font-medium">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-mono text-[11px]">{creases.length} creases · {points.length} points</span>
        </div>

        {/* Coordinates or Pinned Target */}
        <div className="flex items-center space-x-2 font-mono text-[11px] text-neutral-600">
          {targetPoint && targetFx && targetFy ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E1E8F5] text-[#4F6BA6] border border-[#4F6BA6]/20 font-semibold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F6BA6] animate-pulse" />
              <span>Pinned: ({targetFx}, {targetFy})</span>
            </span>
          ) : (
            <span className="text-[#86868B]">Click paper to pin point</span>
          )}
          <span>
            cursor: {cursorFx && cursorFy ? `(${cursorFx}, ${cursorFy})` : '(--, --)'}
          </span>
        </div>

        <div className="h-3 w-px bg-neutral-200" />
        {/* Grid size */}
        <div className="flex items-center space-x-1 font-mono text-[11px] text-neutral-600">
          <span>grid =</span>
          <span className="text-[#4F6BA6] font-semibold">{grid.divisionsX} × {grid.divisionsY}</span>
        </div>

        <div className="h-3 w-px bg-neutral-200" />

        {/* Snap Candidate */}
        <div className="flex items-center space-x-1 text-[11px]">
          <span className="text-neutral-500">snap:</span>
          {snappingEnabled ? (
            <span className="text-[#4F6BA6] font-medium">{snapText}</span>
          ) : (
            <span className="text-neutral-400">OFF</span>
          )}
        </div>
      </div>

      {/* Right: Keyboard shortcut hints & Zoom */}
      <div className="flex items-center space-x-3 text-xs text-neutral-500">
        <div className="hidden xl:flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono">V</kbd>
            <span>Select</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono">H</kbd>
            <span>Hand</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono">P</kbd>
            <span>Point</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono">L</kbd>
            <span>Crease</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono">R</kbd>
            <span>Ruler</span>
          </span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[10px] font-mono">
              {typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'}+K
            </kbd>
            <span>Menu</span>
          </span>
        </div>

        <div className="h-3 w-px bg-neutral-200 mx-1 hidden xl:block" />

        {/* Zoom */}
        <div className="flex items-center space-x-1 font-mono text-neutral-700 font-medium">
          <span>Zoom {(camera.zoom * 100).toFixed(0)}%</span>
          <ChevronsUpDown className="w-3 h-3 text-neutral-400" />
        </div>
      </div>
    </footer>
  );
};
