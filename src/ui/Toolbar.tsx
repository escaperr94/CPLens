import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  MousePointer2,
  Hand,
  Compass,
  MapPin,
  Ruler,
  Spline,
  Crosshair,
  Grid,
  Divide,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { ToolType } from '../store/types';
import { CreaseType } from '../geometry/line';

interface ToolItem {
  tool: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, creaseType, setCreaseType } = useAppStore(useShallow((state) => ({
    activeTool: state.activeTool,
    setActiveTool: state.setActiveTool,
    creaseType: state.creaseType,
    setCreaseType: state.setCreaseType,
  })));

  const tools: ToolItem[] = [
    { tool: 'select', label: 'Select', shortcut: 'V', icon: <MousePointer2 className="w-4 h-4" /> },
    { tool: 'pan', label: 'Hand Tool (Pan)', shortcut: 'H', icon: <Hand className="w-4 h-4" /> },
    { tool: 'calibrate', label: 'Calibrate Paper (4 Corners)', shortcut: 'K', icon: <Compass className="w-4 h-4" /> },
    { tool: 'point', label: 'Reference Point', shortcut: 'P', icon: <MapPin className="w-4 h-4" /> },
    { tool: 'measure', label: 'Two-Point Measure', shortcut: 'M', icon: <Ruler className="w-4 h-4" /> },
    { tool: 'line', label: 'Crease Line', shortcut: 'L', icon: <Spline className="w-4 h-4" /> },
    { tool: 'ruler', label: 'Crosshair Ruler', shortcut: 'R', icon: <Crosshair className="w-4 h-4" /> },
    { tool: 'grid', label: 'Grid Overlay', shortcut: 'G', icon: <Grid className="w-4 h-4" /> },
    { tool: 'symmetry', label: 'Symmetry Reflection', shortcut: 'Y', icon: <Divide className="w-4 h-4" /> },
  ];

  return (
    <aside className="absolute left-4 top-16 z-20 flex flex-col items-center bg-white border border-neutral-200/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-1.5 space-y-1 select-none">
      {tools.map((item) => {
        const isActive = activeTool === item.tool;
        return (
          <button
            key={item.tool}
            aria-label={`${item.label} (${item.shortcut})`}
            onClick={() => setActiveTool(item.tool)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition relative group ${isActive
              ? 'bg-blue-100/70 text-blue-600 font-semibold shadow-2xs'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
          >
            {item.icon}

            {/* Tooltip */}
            <div className="absolute left-12 px-2.5 py-1 bg-neutral-900 text-white rounded-lg text-[11px] font-sans font-medium whitespace-nowrap shadow-lg hidden group-hover:block z-50 pointer-events-none">
              <span>{item.label}</span>{' '}
              <span className="text-neutral-400 font-mono ml-1">[{item.shortcut}]</span>
            </div>
          </button>
        );
      })}

      {/* Crease line sub-picker when Line tool is active */}
      {activeTool === 'line' && (
        <div className="pt-1.5 border-t border-neutral-200 mt-1 flex flex-col space-y-1">
          {(
            [
              { type: 'mountain', label: 'M (Red)', color: 'bg-red-500 text-white' },
              { type: 'valley', label: 'V (Blue)', color: 'bg-blue-600 text-white' },
              { type: 'edge', label: 'E (Edge)', color: 'bg-neutral-800 text-white' },
              { type: 'auxiliary', label: 'A (Aux)', color: 'bg-purple-600 text-white' },
            ] as { type: CreaseType; label: string; color: string }[]
          ).map((item) => (
            <button
              key={item.type}
              onClick={() => setCreaseType(item.type)}
              title={`${item.label} Crease`}
              className={`w-8 h-6 rounded text-[10px] font-bold uppercase transition flex items-center justify-center ${creaseType === item.type
                ? `${item.color} shadow-sm ring-2 ring-neutral-300`
                : 'text-neutral-500 hover:bg-neutral-100'
                }`}
            >
              {item.type.charAt(0)}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
