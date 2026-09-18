import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/projectStore';

interface StatusPillProps {
  onOpenToolGuide?: () => void;
}

export const StatusPill: React.FC<StatusPillProps> = ({ onOpenToolGuide }) => {
  const { creases, points, cursorPaper, grid } = useAppStore(
    useShallow((state) => ({
      creases: state.creases,
      points: state.points,
      cursorPaper: state.cursorPaper,
      grid: state.grid,
    }))
  );

  const xCoord = cursorPaper ? cursorPaper.x.toFixed(4) : '0.0000';
  const yCoord = cursorPaper ? cursorPaper.y.toFixed(4) : '0.0000';
  const sections = grid.majorSubdivisions || 8;

  return (
    <>
      {/* Centered Floating Status Pill */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white border border-[#E5E5E5] shadow-sm rounded-full px-4 py-1.5 flex items-center gap-3 text-xs text-gray-500 select-none font-mono pointer-events-none whitespace-nowrap">
        <span className="whitespace-nowrap">{creases.length} creases</span>
        <span className="text-gray-300">|</span>
        <span className="whitespace-nowrap">{points.length} points</span>
        <span className="text-gray-300">|</span>
        <span className="whitespace-nowrap">Cursor ( {xCoord}, {yCoord} )</span>
        <span className="text-gray-300">|</span>
        <span className="whitespace-nowrap">Grid {grid.divisionsX} × {grid.divisionsY} ({sections} sections)</span>
      </div>

      {/* Floating Help Button (?) at bottom-right */}
      <button
        type="button"
        onClick={onOpenToolGuide}
        className="absolute bottom-4 right-4 z-20 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] shadow-sm flex items-center justify-center text-gray-600 hover:text-black hover:bg-gray-50 font-semibold text-sm cursor-pointer transition-colors"
        title="Origami CAD Tool Guide & Help (?)"
      >
        ?
      </button>
    </>
  );
};
