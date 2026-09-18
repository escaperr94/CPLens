import React, { useState, useMemo } from 'react';
import {
  Crosshair,
  MapPin,
  Ruler,
  Spline,
  Compass,
  Grid,
  Divide,
  MousePointer2,
  Hand,
  Crop,
  Eraser,
  HelpCircle,
  Sparkles,
  Plus,
  Magnet,
} from 'lucide-react';
import { Button } from './shadcn/button';
import { Badge } from './shadcn/badge';
import { useAppStore } from '../store/projectStore';
import { ToolType } from '../store/types';
import { ToolGuideModal, ToolGuideTabId } from './ToolGuideModal';
export interface CanvasHUDProps {
  /** Optional active tool override (defaults to store activeTool) */
  tool?: ToolType;
  /** Optional external guide handler */
  onOpenGuide?: (initialTab?: ToolGuideTabId) => void;
  /** Optional external solver handler */
  onOpenSolver?: () => void;
}

interface ToolDefinition {
  name: string;
  shortcut: string;
  icon: React.ReactNode;
  instruction: string;
  guideTab: ToolGuideTabId;
}

const TOOL_DEFINITIONS: Record<ToolType, ToolDefinition> = {
  ruler: {
    name: 'Crosshair Ruler',
    shortcut: 'R',
    icon: <Crosshair className="w-4 h-4" />,
    instruction:
      'Click paper to place horizontal & vertical guidelines. Displays exact fractional coordinates (1/2, 3/8, √2-1) across the sheet.',
    guideTab: 'crosshairs',
  },
  point: {
    name: 'Reference Point',
    shortcut: 'P',
    icon: <MapPin className="w-4 h-4" />,
    instruction:
      'Click paper to pin a landmark. Inspect in sidebar to calculate 22.5° origami folding sequences.',
    guideTab: 'reference-finder',
  },
  measure: {
    name: 'Two-Point Measure',
    shortcut: 'M',
    icon: <Ruler className="w-4 h-4" />,
    instruction:
      'Click two points to measure exact Euclidean distance and origami rational ratio.',
    guideTab: 'crosshairs',
  },
  line: {
    name: 'Crease Line',
    shortcut: 'L',
    icon: <Spline className="w-4 h-4" />,
    instruction:
      'Click and drag to draw a crease. Choose Mountain (red), Valley (blue), or Edge in toolbar.',
    guideTab: 'mountain-valley',
  },
  calibrate: {
    name: 'Paper Calibration',
    shortcut: 'K',
    icon: <Compass className="w-4 h-4" />,
    instruction:
      'Click 4 paper corners (TL, TR, BR, BL) to rectify perspective distortion from a photo.',
    guideTab: 'crosshairs',
  },
  grid: {
    name: 'Grid Overlay',
    shortcut: 'G',
    icon: <Grid className="w-4 h-4" />,
    instruction:
      'Displays box-pleat lattice overlay. Change divisions (16 to 128) in Grid tab.',
    guideTab: 'grids',
  },
  symmetry: {
    name: 'Symmetry Reflection',
    shortcut: 'Y',
    icon: <Divide className="w-4 h-4" />,
    instruction:
      'Reflect creases across horizontal, vertical, or diagonal fold axes.',
    guideTab: 'crosshairs',
  },
  select: {
    name: 'Select & Inspect',
    shortcut: 'V',
    icon: <MousePointer2 className="w-4 h-4" />,
    instruction:
      'Click creases, points, or crosshairs to inspect exact geometry and angles.',
    guideTab: 'shortcuts',
  },
  pan: {
    name: 'Hand Tool (Pan)',
    shortcut: 'H',
    icon: <Hand className="w-4 h-4" />,
    instruction:
      'Click and drag to pan the paper canvas. Scroll to zoom.',
    guideTab: 'shortcuts',
  },
  crop: {
    name: 'Crop Paper',
    shortcut: 'C',
    icon: <Crop className="w-4 h-4" />,
    instruction:
      'Drag corner and edge handles to adjust the active paper crop boundary.',
    guideTab: 'crosshairs',
  },
  eraser: {
    name: 'Eraser',
    shortcut: 'E',
    icon: <Eraser className="w-4 h-4" />,
    instruction:
      'Click any crease line, reference point, or ruler guideline to delete it.',
    guideTab: 'shortcuts',
  },
};

export const CanvasHUD: React.FC<CanvasHUDProps> = ({
  tool,
  onOpenGuide,
  onOpenSolver,
}) => {
  const [internalGuideOpen, setInternalGuideOpen] = useState(false);
  const [internalGuideTab, setInternalGuideTab] = useState<ToolGuideTabId>('crosshairs');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const {
    activeTool: storeTool,
    rulers,
    addRuler,
    clearRulers,
    layers,
    setLayerVisibility,
    points,
    selectedPointId,
    selectPoint,
    snappingEnabled,
    toggleSnapping,
  } = useAppStore();
  const activeTool = tool ?? storeTool;
  const currentTool = TOOL_DEFINITIONS[activeTool] || TOOL_DEFINITIONS.select;

  // Temporary feedback toast timer
  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 2400);
  };

  const handleOpenHelp = (tab?: ToolGuideTabId) => {
    const targetTab = tab || currentTool.guideTab;
    if (onOpenGuide) {
      onOpenGuide(targetTab);
    } else {
      setInternalGuideTab(targetTab);
      setInternalGuideOpen(true);
    }
  };

  const handleAddCenterCrosshair = () => {
    addRuler({ x: 0.5, y: 0.5 }, 'both');
    if (!layers.rulers) {
      setLayerVisibility('rulers', true);
    }
    showFeedback('Center crosshair added at (1/2, 1/2)');
  };

  const handleClearRulers = () => {
    clearRulers();
    showFeedback('All guidelines cleared');
  };

  const handleOpenSolver = () => {
    // If we have points but none selected, select the first one so the inspector activates
    if (points.length > 0 && !selectedPointId) {
      selectPoint(points[0].id);
    }
    if (onOpenSolver) {
      onOpenSolver();
    } else {
      handleOpenHelp('reference-finder');
    }
  };

  return (
    <>
      <aside
        aria-label="Canvas HUD"
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 select-none pointer-events-auto transition-all duration-200 max-w-[95vw]"
      >
        <div className="h-9 px-3 bg-white/95 backdrop-blur-xl border border-[#E5E5EA] rounded-full shadow-quiet-card flex items-center gap-2.5 text-xs">
          {/* Tool Icon & Name */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center shrink-0">
              {currentTool.icon}
            </div>
            <span className="font-semibold text-xs text-[#1D1D1F] tracking-tight">
              {currentTool.name}
            </span>
            <Badge
              variant="secondary"
              size="sm"
              className="px-1 py-0 h-4 min-h-0 text-[9px] font-mono text-[#86868B] bg-[#F5F5F7] border border-[#E5E5EA] rounded shadow-none select-none"
            >
              {currentTool.shortcut}
            </Badge>
          </div>

          <div className="h-3.5 w-px bg-[#E5E5EA] shrink-0 hidden sm:block" />

          {/* Micro-instruction or Feedback */}
          {feedbackMessage ? (
            <Badge variant="accent" size="sm" className="px-2 py-0.5 text-[11px] font-medium hidden sm:inline-flex animate-fade-in">
              {feedbackMessage}
            </Badge>
          ) : (
            <span className="text-[11px] text-[#86868B] truncate max-w-[200px] md:max-w-[340px] hidden sm:inline">
              {currentTool.instruction}
            </span>
          )}
          {/* Contextual Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {activeTool === 'ruler' && (
              <>
                <Button
                  size="xs"
                  variant="accent"
                  onClick={handleAddCenterCrosshair}
                  className="rounded-full shadow-2xs gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Center Crosshair</span>
                </Button>
                {rulers.length > 0 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={handleClearRulers}
                    className="text-[#86868B] hover:text-red-600 rounded-full h-6 px-2 text-[10px]"
                  >
                    Clear
                  </Button>
                )}
              </>
            )}

            {activeTool === 'point' && (
              <Button
                size="xs"
                variant="accent"
                onClick={handleOpenSolver}
                className="rounded-full shadow-2xs gap-1 font-medium"
              >
                <Sparkles className="w-3 h-3" />
                <span>Open 22.5° Solver</span>
              </Button>
            )}

            {activeTool === 'grid' && (
              <Button
                size="xs"
                variant={snappingEnabled ? 'primary' : 'secondary'}
                onClick={toggleSnapping}
                className="rounded-full shadow-2xs gap-1 font-medium"
              >
                <Magnet className="w-3 h-3" />
                <span>{snappingEnabled ? 'Grid Snap: ON' : 'Grid Snap'}</span>
              </Button>
            )}
            {/* Guide Button */}
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => handleOpenHelp()}
              title="Origami CAD Demystified Guide"
              aria-label="Open Tool Guide"
              className="text-[#86868B] hover:text-[#4F6BA6] rounded-full"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Internal Tool Guide Modal */}
      <ToolGuideModal
        isOpen={internalGuideOpen}
        onClose={() => setInternalGuideOpen(false)}
        initialTab={internalGuideTab}
      />
    </>
  );
};
