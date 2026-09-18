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
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { ToolType } from '../store/types';
import { CreaseType } from '../geometry/line';

interface ToolItem {
  tool: ToolType;
  label: string;
  shortcut: string;
  description: string;
  icon: React.ReactNode;
}

interface ToolbarProps {
  onOpenToolGuide?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onOpenToolGuide }) => {
  const { activeTool, setActiveTool, creaseType, setCreaseType } = useAppStore(useShallow((state) => ({
    activeTool: state.activeTool,
    setActiveTool: state.setActiveTool,
    creaseType: state.creaseType,
    setCreaseType: state.setCreaseType,
  })));

  const tools: ToolItem[] = [
    { tool: 'select', label: 'Select & Inspect', shortcut: 'V', description: 'Inspect crease angles, coordinates & math', icon: <MousePointer2 className="w-4 h-4" /> },
    { tool: 'pan', label: 'Hand Tool (Pan)', shortcut: 'H', description: 'Click and drag to pan viewport', icon: <Hand className="w-4 h-4" /> },
    { tool: 'calibrate', label: 'Calibrate Paper', shortcut: 'K', description: 'Pick 4 corners to rectify photo perspective', icon: <Compass className="w-4 h-4" /> },
    { tool: 'point', label: 'Reference Point', shortcut: 'P', description: 'Pin landmark & solve 22.5° fold sequences', icon: <MapPin className="w-4 h-4" /> },
    { tool: 'measure', label: 'Two-Point Measure', shortcut: 'M', description: 'Measure distance & origami rational ratio', icon: <Ruler className="w-4 h-4" /> },
    { tool: 'line', label: 'Crease Line', shortcut: 'L', description: 'Draw Mountain (red), Valley (blue), or Edge folds', icon: <Spline className="w-4 h-4" /> },
    { tool: 'ruler', label: 'Crosshair Ruler', shortcut: 'R', description: 'Drop orthogonal guidelines with exact fractions', icon: <Crosshair className="w-4 h-4" /> },
    { tool: 'grid', label: 'Grid Overlay', shortcut: 'G', description: 'Display & snap to box-pleat lattice (16 to 128)', icon: <Grid className="w-4 h-4" /> },
    { tool: 'symmetry', label: 'Symmetry Reflection', shortcut: 'Y', description: 'Reflect creases across fold axes', icon: <Divide className="w-4 h-4" /> },
  ];

  return (
    <aside className="absolute left-4 top-16 z-20 flex flex-col items-center bg-white border border-[#E5E5EA]/70 rounded-2xl shadow-quiet-card p-1.5 space-y-1 select-none">
      {tools.map((item) => {
        const isActive = activeTool === item.tool;
        return (
          <button
            key={item.tool}
            aria-label={`${item.label} (${item.shortcut})`}
            onClick={() => setActiveTool(item.tool)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition relative group ${isActive
              ? 'bg-[#E1E8F5] text-[#4F6BA6] font-semibold shadow-2xs'
              : 'text-neutral-500 hover:bg-[#F5F5F7] hover:text-neutral-900'
              }`}
          >
            {item.icon}

            {/* Tooltip */}
            <div className="absolute left-12 px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-[11px] font-sans font-medium whitespace-nowrap shadow-xl hidden group-hover:flex flex-col z-50 pointer-events-none border border-neutral-700/50">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-white">{item.label}</span>
                <span className="text-neutral-400 font-mono text-[10px]">[{item.shortcut}]</span>
              </div>
              <span className="text-[10px] text-neutral-300 font-normal mt-0.5">{item.description}</span>
            </div>
          </button>
        );
      })}

      {/* Crease line sub-picker when Line tool is active */}
      {activeTool === 'line' && (
        <div className="pt-1.5 border-t border-neutral-200 mt-1 flex flex-col space-y-1">
          {(
            [
              { type: 'mountain', label: 'M (Red)', color: 'bg-[#D75B50] text-white' },
              { type: 'valley', label: 'V (Blue)', color: 'bg-[#4F6BA6] text-white' },
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

      {/* Bottom Tool Guide trigger */}
      {onOpenToolGuide && (
        <div className="pt-1.5 border-t border-neutral-200 mt-1 flex flex-col items-center">
          <button
            onClick={onOpenToolGuide}
            aria-label="Origami CAD Tool Guide"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-[#4F6BA6] hover:bg-[#E1E8F5] transition relative group"
          >
            <HelpCircle className="w-4 h-4" />
            <div className="absolute left-12 px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-[11px] font-sans font-medium whitespace-nowrap shadow-xl hidden group-hover:flex flex-col z-50 pointer-events-none border border-neutral-700/50">
              <span className="font-semibold text-white">Tool Guide & Tutorials</span>
              <span className="text-[10px] text-neutral-300 font-normal mt-0.5">Learn how Crosshairs, Reference Finder & Grids work</span>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
};
