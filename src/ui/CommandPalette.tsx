import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Search,
  Sparkles,
  Maximize2,
  Magnet,
  Eye,
  Grid,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { exportProjectJson, exportSvg, exportPointsCsv } from '../export/exportProject';
import { snapCreasesToOrigamiGrid } from '../cv/rasterLines';
import { approximateFraction } from '../geometry/rational';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onRunAnalysis: () => void;
  onLoadCP: () => void;
  onLoadDove: () => void;
  onLoadSchwarz: () => void;
  onOpenLanding?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onRunAnalysis,
  onLoadCP,
  onLoadDove,
  onLoadSchwarz,
  onOpenLanding,
}) => {
  const [query, setQuery] = useState('');

  const {
    fitToPaper,
    setCamera,
    toggleSnapping,
    snappingEnabled,
    loupe,
    setLoupeActive,
    setGridConfig,
    clearRulers,
    resetCalibration,
    getProjectData,
  } = useAppStore(useShallow((state) => ({
    fitToPaper: state.fitToPaper,
    setCamera: state.setCamera,
    toggleSnapping: state.toggleSnapping,
    snappingEnabled: state.snappingEnabled,
    loupe: state.loupe,
    setLoupeActive: state.setLoupeActive,
    setGridConfig: state.setGridConfig,
    clearRulers: state.clearRulers,
    resetCalibration: state.resetCalibration,
    getProjectData: state.getProjectData,
  })));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'auto_analyze',
      label: 'Run Automatic CP Analysis & Vectorization',
      category: 'Intelligence',
      icon: <Sparkles className="w-4 h-4 text-figma-blue" />,
      run: () => {
        onRunAnalysis();
        onClose();
      },
    },
    {
      id: 'fit_paper',
      label: 'Fit Paper to Screen [0]',
      category: 'View',
      icon: <Maximize2 className="w-4 h-4" />,
      run: () => {
        fitToPaper(window.innerWidth - 360, window.innerHeight - 80);
        onClose();
      },
    },
    {
      id: 'zoom_100',
      label: 'Zoom to 100% [1]',
      category: 'View',
      icon: <Maximize2 className="w-4 h-4" />,
      run: () => {
        setCamera({ zoom: 1 });
        onClose();
      },
    },
    {
      id: 'toggle_snap',
      label: `Toggle Snapping (Currently: ${snappingEnabled ? 'ON' : 'OFF'}) [S]`,
      category: 'Snapping',
      icon: <Magnet className="w-4 h-4 text-emerald-500" />,
      run: () => {
        toggleSnapping();
        onClose();
      },
    },
    {
      id: 'toggle_loupe',
      label: `Toggle Loupe Magnifier (Hold Alt)`,
      category: 'View',
      icon: <Eye className="w-4 h-4 text-purple-500" />,
      run: () => {
        setLoupeActive(!loupe.active);
        onClose();
      },
    },
    {
      id: 'open_landing',
      label: 'View Quiet Premium Overview & Waitlist',
      category: 'View',
      icon: <Sparkles className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        onOpenLanding?.();
        onClose();
      },
    },
    {
      id: 'grid_32',
      label: 'Set Grid to 32 × 32',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        setGridConfig({ divisionsX: 32, divisionsY: 32, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'grid_48',
      label: 'Set Grid to 48 × 48',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-figma-blue" />,
      run: () => {
        setGridConfig({ divisionsX: 48, divisionsY: 48, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'grid_56',
      label: 'Set Grid to 56 × 56 (Kamiya Box-Pleat)',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-figma-blue" />,
      run: () => {
        setGridConfig({ divisionsX: 56, divisionsY: 56, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'grid_64',
      label: 'Set Grid to 64 × 64',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        setGridConfig({ divisionsX: 64, divisionsY: 64, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'grid_80',
      label: 'Set Grid to 80 × 80 (Dense Box-Pleat)',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        setGridConfig({ divisionsX: 80, divisionsY: 80, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'grid_96',
      label: 'Set Grid to 96 × 96',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        setGridConfig({ divisionsX: 96, divisionsY: 96, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'grid_128',
      label: 'Set Grid to 128 × 128',
      category: 'Grid',
      icon: <Grid className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        setGridConfig({ divisionsX: 128, divisionsY: 128, majorSubdivisions: 8 });
        onClose();
      },
    },
    {
      id: 'snap_to_grid',
      label: 'Align / Snap Creases to Current Grid',
      category: 'Grid',
      icon: <Magnet className="w-4 h-4 text-[#4F6BA6]" />,
      run: () => {
        const { creases, points, grid, pushHistory } = useAppStore.getState();
        if (creases.length || points.length) {
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
        }
        onClose();
      },
    },
    {
      id: 'export_svg',
      label: 'Export Layered Vector SVG',
      category: 'Export',
      icon: <Download className="w-4 h-4 text-emerald-600" />,
      run: () => {
        exportSvg(getProjectData());
        onClose();
      },
    },
    {
      id: 'export_json',
      label: 'Export Project JSON',
      category: 'Export',
      icon: <Download className="w-4 h-4" />,
      run: () => {
        exportProjectJson(getProjectData());
        onClose();
      },
    },
    {
      id: 'reset_calib',
      label: 'Reset Paper Calibration',
      category: 'Paper',
      icon: <RotateCcw className="w-4 h-4 text-neutral-400" />,
      run: () => {
        resetCalibration();
        onClose();
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[500px] max-w-[90vw] bg-white rounded-2xl shadow-quiet-card border border-[#E5E5EA]/70 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-neutral-100">
          <Search className="w-4 h-4 text-neutral-400 mr-2.5 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs text-neutral-900 placeholder-neutral-400 bg-transparent border-none outline-none focus:ring-0"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 border border-neutral-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 text-xs">
          {filtered.length > 0 ? (
            filtered.map((action) => (
              <button
                key={action.id}
                onClick={action.run}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-neutral-100 text-left transition text-neutral-800 group"
              >
                <div className="flex items-center space-x-2.5">
                  {action.icon}
                  <span className="font-medium text-xs text-neutral-900 group-hover:text-figma-blue">
                    {action.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-50">
                  {action.category}
                </span>
              </button>
            ))
          ) : (
            <div className="text-center py-6 text-neutral-400 text-xs">No matching commands found</div>
          )}
        </div>
      </div>
    </div>
  );
};
