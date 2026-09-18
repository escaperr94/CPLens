import React, { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  MousePointer2,
  Crop,
  Square,
  Circle,
  Minus,
  MapPin,
  Ruler,
  Crosshair,
  Compass,
  Zap,
  CodeXml,
  ChevronDown,
  ChevronUp,
  Eraser,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { ToolType } from '../store/types';
import { CreaseType } from '../geometry/line';
import { exportOriOrCpFile, exportSvg, exportProjectJson } from '../export/exportProject';

interface FloatingBottomToolbarProps {
  onOpenFoldingSequences?: () => void;
  onOpenToolGuide?: () => void;
  onRunAutoAnalysis?: () => void;
}

export const FloatingBottomToolbar: React.FC<FloatingBottomToolbarProps> = ({
  onOpenFoldingSequences,
  onOpenToolGuide,
  onRunAutoAnalysis,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const {
    activeTool,
    setActiveTool,
    creaseType,
    setCreaseType,
    grid,
    getProjectData,
    creases,
    points,
    cursorPaper,
    undo,
    redo,
    past,
    future,
  } = useAppStore(
    useShallow((state) => ({
      activeTool: state.activeTool,
      setActiveTool: state.setActiveTool,
      creaseType: state.creaseType,
      setCreaseType: state.setCreaseType,
      grid: state.grid,
      getProjectData: state.getProjectData,
      creases: state.creases,
      points: state.points,
      cursorPaper: state.cursorPaper,
      undo: state.undo,
      redo: state.redo,
      past: state.past,
      future: state.future,
    }))
  );

  // Single active menu state ensures only ONE dropdown can be open at a time
  const [openMenu, setOpenMenu] = useState<'shape' | 'line' | 'measure' | 'export' | null>(null);
  const [showQuickStatus, setShowQuickStatus] = useState(false);

  // Click-outside listener automatically closes any open dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: 'shape' | 'line' | 'measure' | 'export') => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const cx = cursorPaper ? cursorPaper.x.toFixed(4) : '0.0000';
  const cy = cursorPaper ? cursorPaper.y.toFixed(4) : '0.0000';

  return (
    <div
      ref={toolbarRef}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 select-none pointer-events-auto"
    >
      {/* Optional Mini Status Pill floating just above toolbar */}
      {showQuickStatus && (
        <div className="bg-white/95 backdrop-blur-sm border border-[#E6E6E6] shadow-sm rounded-full px-3.5 py-1 flex items-center gap-2.5 text-[11px] text-[#6B7280] font-mono select-none animate-in fade-in slide-in-from-bottom-1 duration-150">
          <span>{creases.length} creases</span>
          <span className="text-gray-300">|</span>
          <span>{points.length} points</span>
          <span className="text-gray-300">|</span>
          <span>( {cx}, {cy} )</span>
          <span className="text-gray-300">|</span>
          <span>Grid {grid.divisionsX}×{grid.divisionsY}</span>
        </div>
      )}

      {/* Main Figma Floating Tool Strip */}
      <div className="bg-white border border-[#E6E6E6] rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.15)] p-1 flex items-center gap-0.5">
        {/* 1. Select / Move Tool */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('select');
            setOpenMenu(null);
          }}
          className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-all cursor-pointer ${
            activeTool === 'select'
              ? 'bg-[#0D99FF] text-white shadow-xs font-semibold'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`}
          title="Select & Move (V)"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>

        {/* 2. Crop / Extract CP Frame Tool */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('crop');
            setOpenMenu(null);
          }}
          className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-all cursor-pointer ${
            activeTool === 'crop'
              ? 'bg-[#0D99FF] text-white shadow-xs font-semibold'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`}
          title="Crop / Extract CP Region (C) — drag box on canvas to isolate CP"
        >
          <Crop className="w-4 h-4" />
        </button>

        {/* 3. Shapes & Symmetries (Rectangle, Circle, Symmetry) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setActiveTool('symmetry');
              toggleMenu('shape');
            }}
            className={`h-8 px-1.5 rounded-[8px] flex items-center gap-0.5 transition-all cursor-pointer ${
              activeTool === 'symmetry'
                ? 'bg-[#0D99FF] text-white shadow-xs font-semibold'
                : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
            }`}
            title="Shapes & Symmetry Axes (Y)"
          >
            <Square className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {openMenu === 'shape' && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-[#E6E6E6] rounded-xl shadow-lg p-1 min-w-[150px] z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('crop');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2 text-[#111827]"
              >
                <Square className="w-3.5 h-3.5 text-gray-500" />
                <span>Rectangle Frame</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('symmetry');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2 text-[#111827]"
              >
                <Circle className="w-3.5 h-3.5 text-gray-500" />
                <span>Symmetry Axis (Y)</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Crease Line Tool (Mountain / Valley / Edge) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setActiveTool('line');
              toggleMenu('line');
            }}
            className={`h-8 px-1.5 rounded-[8px] flex items-center gap-0.5 transition-all cursor-pointer ${
              activeTool === 'line'
                ? 'bg-[#0D99FF] text-white shadow-xs font-semibold'
                : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
            }`}
            title={`Crease Line (${creaseType}) (L)`}
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {openMenu === 'line' && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-[#E6E6E6] rounded-xl shadow-lg p-1 min-w-[140px] z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setCreaseType('mountain');
                  setActiveTool('line');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span className="text-[#111827] font-medium">Mountain (Blue)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreaseType('valley');
                  setActiveTool('line');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
                <span className="text-[#111827] font-medium">Valley (Red)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreaseType('edge');
                  setActiveTool('line');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#4B5563]" />
                <span className="text-[#111827] font-medium">Boundary / Edge</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreaseType('auxiliary');
                  setActiveTool('line');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#9333EA]" />
                <span className="text-[#111827] font-medium">Auxiliary (Purple)</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. Landmark Reference Point Tool */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('point');
            setOpenMenu(null);
          }}
          className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-all cursor-pointer ${
            activeTool === 'point'
              ? 'bg-[#0D99FF] text-white shadow-xs font-semibold'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`}
          title="Reference Point / Landmark (P)"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>

        {/* 6. Measure & Ruler Tool */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setActiveTool('measure');
              toggleMenu('measure');
            }}
            className={`h-8 px-1.5 rounded-[8px] flex items-center gap-0.5 transition-all cursor-pointer ${
              activeTool === 'measure' || activeTool === 'ruler'
                ? 'bg-[#0D99FF] text-white shadow-xs font-semibold'
                : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
            }`}
            title="Measure & Rulers (M)"
          >
            <Ruler className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {openMenu === 'measure' && (
            <div className="absolute bottom-full mb-2 left-0 bg-white border border-[#E6E6E6] rounded-xl shadow-lg p-1 min-w-[150px] z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTool('measure');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2 text-[#111827]"
              >
                <Ruler className="w-3.5 h-3.5 text-gray-500" />
                <span>2-Point Measure (M)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('ruler');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center gap-2 text-[#111827]"
              >
                <Crosshair className="w-3.5 h-3.5 text-gray-500" />
                <span>Orthogonal Ruler (R)</span>
              </button>
            </div>
          )}
        </div>

        {/* 7. Eraser Tool */}
        <button
          type="button"
          onClick={() => {
            setActiveTool('eraser');
            setOpenMenu(null);
          }}
          className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-all cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-[#EF4444] text-white shadow-xs font-semibold'
              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`}
          title="Eraser Tool (E) — click on crease, point, ruler, or measurement to erase"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-[#E6E6E6] mx-0.5" />

        {/* 8. Reference Finder Tool */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            if (onOpenFoldingSequences) {
              onOpenFoldingSequences();
            } else {
              setActiveTool('point');
            }
          }}
          className="h-8 px-2.5 rounded-[8px] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] flex items-center gap-1.5 transition-all cursor-pointer"
          title="Open 22.5° Origami Reference Finder & Folding Sequences"
        >
          <Compass className="w-3.5 h-3.5 text-[#0D99FF]" />
          <span className="text-xs font-medium">Reference Finder</span>
        </button>

        {/* 9. Auto-Analyze / OCR CP Tool */}
        {onRunAutoAnalysis && (
          <button
            type="button"
            onClick={() => {
              setOpenMenu(null);
              onRunAutoAnalysis();
            }}
            className="w-8 h-8 rounded-[8px] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] flex items-center justify-center transition-all cursor-pointer"
            title="Auto-Detect & Rectify CP Lines (AI/CV Pipeline on selected image)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-4 bg-[#E6E6E6] mx-0.5" />

        {/* 10. Undo / Redo buttons */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            undo();
          }}
          disabled={past.length === 0}
          className="w-8 h-8 rounded-[8px] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-all cursor-pointer"
          title="Undo (Ctrl+Z / Cmd+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            redo();
          }}
          disabled={future.length === 0}
          className="w-8 h-8 rounded-[8px] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-all cursor-pointer"
          title="Redo (Ctrl+Y / Cmd+Shift+Z)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-[#E6E6E6] mx-0.5" />

        {/* 11. Code & Export */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('export')}
            className="w-8 h-8 rounded-[8px] text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827] flex items-center justify-center transition-all cursor-pointer"
            title="Export Options (.cp, .ori, SVG, JSON)"
          >
            <CodeXml className="w-3.5 h-3.5" />
          </button>

          {openMenu === 'export' && (
            <div className="absolute bottom-full mb-2 right-0 bg-white border border-[#E6E6E6] rounded-xl shadow-lg p-1 min-w-[170px] z-50 text-xs">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Origami CAD Formats
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  exportOriOrCpFile(getProjectData(), 'cp');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-[#0D99FF] font-medium"
              >
                Oridieta / Orihime (.cp)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  exportOriOrCpFile(getProjectData(), 'ori');
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-[#0D99FF] font-medium"
              >
                Oridieta (.ori)
              </button>
              <div className="h-px bg-[#E6E6E6] my-1" />
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  exportSvg(getProjectData());
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#111827]"
              >
                Vector SVG (.svg)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  exportProjectJson(getProjectData());
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#111827]"
              >
                Project JSON (.json)
              </button>
            </div>
          )}
        </div>

        {/* 12. Toggle Quick Status */}
        <button
          type="button"
          onClick={() => setShowQuickStatus(!showQuickStatus)}
          className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-all cursor-pointer ${
            showQuickStatus
              ? 'bg-gray-100 text-gray-900 font-semibold'
              : 'text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#111827]'
          }`}
          title="Toggle Canvas Metadata Readout"
        >
          {showQuickStatus ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
