import React, { useState, useEffect } from 'react';
import {
  X,
  Crosshair,
  Compass,
  Grid,
  Spline,
  Keyboard,
  Sparkles,
  ChevronRight,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  Eye,
  Sliders,
  Divide,
  MousePointer2,
  Hand,
  Ruler,
  Layers,
} from 'lucide-react';

export type ToolGuideTabId =
  | 'crosshairs'
  | 'reference-finder'
  | 'grids'
  | 'mountain-valley'
  | 'shortcuts';

export interface ToolGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ToolGuideTabId;
}

interface TabDefinition {
  id: ToolGuideTabId;
  label: string;
  icon: React.ReactNode;
  subtitle: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'crosshairs',
    label: 'Crosshair Rulers & Guidelines',
    icon: <Crosshair className="w-4 h-4" />,
    subtitle: 'Fractional coordinates, alignment rays, and radical geometry',
  },
  {
    id: 'reference-finder',
    label: '22.5° Reference Finder',
    icon: <Compass className="w-4 h-4" />,
    subtitle: "Robert J. Lang's rulerless origami folding sequences",
  },
  {
    id: 'grids',
    label: 'Rational Snapping & Grids',
    icon: <Grid className="w-4 h-4" />,
    subtitle: 'Satoshi Kamiya box-pleat lattices and magnetic snap targets',
  },
  {
    id: 'mountain-valley',
    label: 'Mountain & Valley Assignment',
    icon: <Spline className="w-4 h-4" />,
    subtitle: 'Maekawa-Justin theorem, flat-foldability, and color rules',
  },
  {
    id: 'shortcuts',
    label: 'Keyboard Shortcuts',
    icon: <Keyboard className="w-4 h-4" />,
    subtitle: 'Essential single-key commands for fluid origami CAD editing',
  },
];

export const ToolGuideModal: React.FC<ToolGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'crosshairs',
}) => {
  const [activeTab, setActiveTab] = useState<ToolGuideTabId>(initialTab);

  // Sync active tab when initialTab changes on open
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/35 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-guide-modal-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white/95 backdrop-blur-2xl rounded-3xl border border-[#E5E5EA] shadow-quiet-card flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#E5E5EA]/70 bg-gradient-to-b from-white to-[#FAFAFA]/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="tool-guide-modal-title"
                className="text-sm font-semibold text-[#1D1D1F] tracking-[-0.02em]"
              >
                CP Lens Tool Guide • Origami CAD Demystified
              </h2>
              <p className="text-[11px] text-[#86868B] tracking-[-0.01em]">
                Mathematical foundations, technical origami workflows, and precision tooling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Close guide modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 py-2.5 bg-[#FAFAFA] border-b border-[#E5E5EA]/60 flex space-x-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4F6BA6] text-white shadow-quiet-button shadow-xs'
                    : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/80'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {activeTab === 'crosshairs' && <CrosshairsGuide />}
          {activeTab === 'reference-finder' && <ReferenceFinderGuide />}
          {activeTab === 'grids' && <GridsGuide />}
          {activeTab === 'mountain-valley' && <MountainValleyGuide />}
          {activeTab === 'shortcuts' && <ShortcutsGuide />}
        </div>

        {/* Modal Footer with Quiet Aesthetic */}
        <div className="px-6 py-3 bg-[#FAFAFA] border-t border-[#E5E5EA]/60 flex items-center justify-between text-[11px] text-[#86868B]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span>Interactive CAD Studio Engine Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#1D1D1F] hover:bg-[#333336] text-white text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TAB 1: Crosshair Rulers & Guidelines                                       */
/* -------------------------------------------------------------------------- */
const CrosshairsGuide: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-semibold text-[#1D1D1F] tracking-[-0.02em]">
          Crosshair Rulers & Infinite Alignment Guidelines
        </h3>
        <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
          How origami designers project continuous geometric guides across paper to locate and
          verify crease alignments without cluttering the canvas.
        </p>
      </div>

      {/* SVG Visualization Card */}
      <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-xs">
        <div className="relative w-56 h-56 bg-white border border-[#D2D2D7] rounded-xl shadow-xs overflow-hidden shrink-0">
          {/* Paper sheet representation (unit square [0,1] x [0,1]) */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Paper perimeter */}
            <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth="1" />

            {/* Diagonal reference fold (dashed) */}
            <line x1="0" y1="0" x2="100" y2="100" stroke="#4F6BA6" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />

            {/* Horizontal guideline at y = 50 (1/2) */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#4F6BA6" strokeWidth="1.2" />
            {/* Vertical guideline at x = 50 (1/2) */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="#4F6BA6" strokeWidth="1.2" />

            {/* Horizontal guideline at y = 37.5 (3/8) */}
            <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#E29B24" strokeWidth="0.9" strokeDasharray="2 2" />
            {/* Vertical guideline at x = 41.42 (sqrt(2)-1) */}
            <line x1="41.42" y1="0" x2="41.42" y2="100" stroke="#D75B50" strokeWidth="0.9" strokeDasharray="2 2" />

            {/* Crosshair Center Intersection Point */}
            <circle cx="50" cy="50" r="2.5" fill="#4F6BA6" stroke="#FFFFFF" strokeWidth="1" />
            <circle cx="41.42" cy="37.5" r="2" fill="#D75B50" stroke="#FFFFFF" strokeWidth="0.8" />

            {/* Annotations */}
            <text x="52" y="47" fontSize="5" fill="#4F6BA6" fontWeight="bold">Center (1/2, 1/2)</text>
            <text x="43" y="34" fontSize="4.5" fill="#D75B50">x = √2−1 (0.414)</text>
            <text x="4" y="35" fontSize="4.5" fill="#E29B24">y = 3/8</text>
          </svg>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-[#1D1D1F]">
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Infinite Rays on Square Paper</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              Clicking anywhere with the Crosshair Ruler tool (<kbd className="px-1 py-0.5 rounded bg-[#F5F5F7] border border-[#E5E5EA] text-[10px] font-mono">R</kbd>) creates full-span horizontal and vertical guides across the unit square [0, 1].
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Reading Exact Fractions & Radicals</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              CP Lens continuously analyzes decimal coordinates and matches them to origami fractions like <span className="font-mono text-[#1D1D1F]">3/8</span> (0.375), <span className="font-mono text-[#1D1D1F]">5/16</span> (0.3125), and algebraic silver ratios like <span className="font-mono text-[#1D1D1F]">√2 − 1</span> (0.4142).
            </p>
          </div>
        </div>
      </div>

      {/* Feature Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5EA]/80 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h4 className="font-semibold text-xs text-[#1D1D1F]">Center Crosshair Preset</h4>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            Click &quot;Add Center Crosshair&quot; in the Canvas HUD to drop perfect bilateral and quadrilateral symmetry guides at (0.500, 0.500).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5EA]/80 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h4 className="font-semibold text-xs text-[#1D1D1F]">Landmark Snapping</h4>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            Crosshairs interact with the magnetic snapping engine. Crease drawing tools will cleanly lock onto crosshair intersection nodes.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5EA]/80 space-y-2">
          <div className="w-7 h-7 rounded-lg bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h4 className="font-semibold text-xs text-[#1D1D1F]">One-Click Clear</h4>
          <p className="text-[11px] text-[#86868B] leading-relaxed">
            Keep your workspace pristine. Use &quot;Clear Rulers&quot; in the HUD or Inspector to remove all guide lines without affecting vector creases.
          </p>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TAB 2: 22.5° Reference Finder                                              */
/* -------------------------------------------------------------------------- */
const ReferenceFinderGuide: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-semibold text-[#1D1D1F] tracking-[-0.02em]">
          22.5° Reference Finder • Rulerless Origami Geometry
        </h3>
        <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
          How Dr. Robert J. Lang&apos;s algorithm discovers exact 3–5 step folding sequences to locate
          any arbitrary coordinate on square paper without measuring tools.
        </p>
      </div>

      {/* Hero Diagram & Explanation */}
      <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-xs">
        <div className="relative w-56 h-56 bg-white border border-[#D2D2D7] rounded-xl shadow-xs overflow-hidden shrink-0">
          <svg viewBox="-10 -10 120 120" className="w-full h-full">
            {/* Square paper outline */}
            <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" stroke="#86868B" strokeWidth="1.2" />

            {/* Step 1: 45° diagonal valley fold */}
            <line x1="0" y1="0" x2="100" y2="100" stroke="#4F6BA6" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* Step 2: 22.5° angle bisector fold line */}
            <line x1="0" y1="0" x2="100" y2="41.42" stroke="#D75B50" strokeWidth="1.2" />

            {/* Step 3: Vertical fold to landmark */}
            <line x1="41.42" y1="0" x2="41.42" y2="100" stroke="#2563EB" strokeWidth="1" strokeDasharray="2 2" />

            {/* Target landmark pin */}
            <circle cx="41.42" cy="41.42" r="3" fill="#D75B50" stroke="#FFFFFF" strokeWidth="1" />

            {/* Angle arc for 22.5° */}
            <path d="M 25 0 A 25 25 0 0 1 23 9.5" fill="none" stroke="#D75B50" strokeWidth="0.8" />
            <text x="28" y="8" fontSize="4.5" fill="#D75B50">22.5°</text>

            <text x="44" y="40" fontSize="5" fill="#1D1D1F" fontWeight="bold">√2−1 (0.414)</text>
            <text x="5" y="95" fontSize="4" fill="#86868B">Rank 3 sequence</text>
          </svg>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-[#1D1D1F]">
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">The Origami Reference Problem</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              Traditional origami forbids rulers and pencil markings. When designing complex models, key vertices often lie at coordinates like <span className="font-mono text-[#1D1D1F]">(0.4142, 0.2929)</span>. The 22.5° system uses successive angle bisections of the 90° corner (<span className="font-mono">90° → 45° → 22.5° → 11.25°</span>) to construct these points physically.
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Huzita-Hatori Axioms in CAD</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              CP Lens runs Lang&apos;s tree-search engine in a dedicated Web Worker. It computes fold intersections through rank 4 and rank 5, providing solutions with geometric discrepancy under <span className="font-mono text-emerald-600 font-semibold">0.05 mm</span> on standard paper.
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Workflow */}
      <div className="space-y-3">
        <h4 className="font-semibold text-xs text-[#1D1D1F] tracking-[-0.01em]">
          How to Solve References in CP Lens Studio:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#4F6BA6] font-bold">STEP 01</span>
            <p className="font-medium text-[11px] text-[#1D1D1F]">Pin Reference Point</p>
            <p className="text-[10px] text-[#86868B]">Press <kbd className="font-mono bg-white px-1 border rounded">P</kbd> and click any landmark or intersection on your CP.</p>
          </div>
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#4F6BA6] font-bold">STEP 02</span>
            <p className="font-medium text-[11px] text-[#1D1D1F]">Open 22.5° Solver</p>
            <p className="text-[10px] text-[#86868B]">Click &quot;Open 22.5° Solver&quot; in the HUD or select the point in the sidebar.</p>
          </div>
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#4F6BA6] font-bold">STEP 03</span>
            <p className="font-medium text-[11px] text-[#1D1D1F]">Generate Sequences</p>
            <p className="text-[10px] text-[#86868B]">Click &quot;Find folding sequences&quot; to test rank 4 and rank 5 solutions.</p>
          </div>
          <div className="p-3 bg-[#FAFAFA] border border-[#E5E5EA] rounded-xl space-y-1">
            <span className="text-[10px] font-mono text-[#4F6BA6] font-bold">STEP 04</span>
            <p className="font-medium text-[11px] text-[#1D1D1F]">Inspect Fold Steps</p>
            <p className="text-[10px] text-[#86868B]">Follow step-by-step vector fold diagrams showing valley, mountain, and pinch marks.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TAB 3: Rational Snapping & Grids                                           */
/* -------------------------------------------------------------------------- */
const GridsGuide: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-semibold text-[#1D1D1F] tracking-[-0.02em]">
          Rational Snapping & Box-Pleat Lattices
        </h3>
        <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
          Understanding binary halving grids, Satoshi Kamiya box-pleating lattices (Grid 56), and
          intelligent magnetic snap targets.
        </p>
      </div>

      {/* SVG Grid Illustration */}
      <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-xs">
        <div className="relative w-56 h-56 bg-white border border-[#D2D2D7] rounded-xl shadow-xs overflow-hidden shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            {/* 8x8 Grid lines */}
            {Array.from({ length: 9 }).map((_, i) => (
              <React.Fragment key={i}>
                <line x1={i * 10} y1="0" x2={i * 10} y2="80" stroke="#E5E5EA" strokeWidth="0.8" />
                <line x1="0" y1={i * 10} x2="80" y2={i * 10} stroke="#E5E5EA" strokeWidth="0.8" />
              </React.Fragment>
            ))}

            {/* Box pleating diagonal creases (45°) */}
            <line x1="0" y1="20" x2="20" y2="0" stroke="#4F6BA6" strokeWidth="1.2" />
            <line x1="0" y1="40" x2="40" y2="0" stroke="#D75B50" strokeWidth="1.2" />
            <line x1="20" y1="80" x2="80" y2="20" stroke="#4F6BA6" strokeWidth="1.2" />
            <line x1="40" y1="80" x2="80" y2="40" stroke="#D75B50" strokeWidth="1.2" />

            {/* Snap point indicator */}
            <circle cx="30" cy="30" r="3.5" fill="none" stroke="#4F6BA6" strokeWidth="1" strokeDasharray="1.5 1.5" />
            <circle cx="30" cy="30" r="1.5" fill="#4F6BA6" />

            <text x="34" y="28" fontSize="4.5" fill="#4F6BA6" fontWeight="bold">Grid Snap (3/8, 3/8)</text>
          </svg>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-[#1D1D1F]">
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Binary Halving vs. Kamiya Lattices</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              While classical origami starts with binary halving (<span className="font-mono">16, 32, 64, 128</span>), modern complex box-pleating frequently uses non-power-of-two divisions. Masterworks like Satoshi Kamiya&apos;s <em className="text-[#1D1D1F]">Ancient Dragon</em> utilize a <strong className="text-[#1D1D1F]">56-grid</strong> (dividing paper into 7 parts via Haga&apos;s theorem, then halving three times: <span className="font-mono">7 × 8 = 56</span>).
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Magnetic Snapping Hierarchy</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              When snapping is active, the cursor locks smoothly to:
              <br />
              • <strong className="text-[#1D1D1F]">Grid lattice nodes</strong> (box-pleat intersections)
              <br />
              • <strong className="text-[#1D1D1F]">Crease endpoints & midpoints</strong>
              <br />
              • <strong className="text-[#1D1D1F]">Crease-to-crease intersections</strong>
              <br />
              • <strong className="text-[#1D1D1F]">Pinned reference points & paper perimeter</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#E1E8F5]/50 border border-[#4F6BA6]/20 flex items-center justify-between">
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-[#1D1D1F]">Quick Tip: Dynamic Zoom Snapping</h4>
          <p className="text-[11px] text-[#86868B]">
            The snap radius dynamically scales with camera zoom. Zoom in with your scroll wheel to adjust points with sub-pixel micro-precision.
          </p>
        </div>
        <kbd className="px-2 py-1 bg-white border border-[#D2D2D7] rounded-lg text-xs font-mono text-[#1D1D1F] shrink-0">
          G (Grid)
        </kbd>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TAB 4: Mountain & Valley Assignment                                        */
/* -------------------------------------------------------------------------- */
const MountainValleyGuide: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-semibold text-[#1D1D1F] tracking-[-0.02em]">
          Mountain & Valley Assignment • Flat-Foldability Theorems
        </h3>
        <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
          The mathematical laws of flat origami: Maekawa-Justin theorem, Kawasaki&apos;s theorem,
          and how CP Lens infers fold assignments.
        </p>
      </div>

      {/* Theorem Diagram Card */}
      <div className="bg-[#FAFAFA] border border-[#E5E5EA] rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-xs">
        <div className="relative w-56 h-56 bg-white border border-[#D2D2D7] rounded-xl shadow-xs overflow-hidden shrink-0">
          <svg viewBox="-50 -50 100 100" className="w-full h-full">
            {/* Vertex origin */}
            <circle cx="0" cy="0" r="3" fill="#1D1D1F" />

            {/* 3 Mountain lines (Red) */}
            <line x1="0" y1="0" x2="40" y2="0" stroke="#D75B50" strokeWidth="2.5" />
            <line x1="0" y1="0" x2="0" y2="-40" stroke="#D75B50" strokeWidth="2.5" />
            <line x1="0" y1="0" x2="-40" y2="0" stroke="#D75B50" strokeWidth="2.5" />

            {/* 1 Valley line (Blue, dashed) */}
            <line x1="0" y1="0" x2="0" y2="40" stroke="#4F6BA6" strokeWidth="2.5" strokeDasharray="4 2" />

            {/* Formula text */}
            <text x="5" y="-20" fontSize="7" fill="#D75B50" fontWeight="bold">M</text>
            <text x="-25" y="-5" fontSize="7" fill="#D75B50" fontWeight="bold">M</text>
            <text x="25" y="-5" fontSize="7" fill="#D75B50" fontWeight="bold">M</text>
            <text x="5" y="25" fontSize="7" fill="#4F6BA6" fontWeight="bold">V</text>

            <rect x="-42" y="32" width="84" height="14" rx="4" fill="#1D1D1F" />
            <text x="0" y="42" textAnchor="middle" fontSize="6.5" fill="#FFFFFF" fontWeight="bold">
              M − V = ±2 (3 − 1 = 2)
            </text>
          </svg>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-[#1D1D1F]">
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Maekawa-Justin Theorem</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              At any internal vertex where creases meet in flat origami, the difference between the number of Mountain (<span className="text-[#D75B50] font-semibold">M</span>) and Valley (<span className="text-[#4F6BA6] font-semibold">V</span>) creases is always <strong>±2</strong>:
              <br />
              <span className="font-mono text-[#1D1D1F] font-semibold">|M − V| = 2</span>
              <br />
              This proves that the number of creases meeting at a flat node must always be <strong>even</strong> (4, 6, 8, etc.).
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-[#E5E5EA]">
            <span className="font-semibold text-[#4F6BA6] block text-xs">Kawasaki&apos;s Theorem</span>
            <p className="text-[11px] text-[#86868B] mt-0.5">
              The alternating sum of angles around any flat-foldable node always equals 180°:
              <br />
              <span className="font-mono text-[#1D1D1F] font-semibold">θ₁ + θ₃ + ... = θ₂ + θ₄ + ... = 180°</span>
            </p>
          </div>
        </div>
      </div>

      {/* Color Conventions Table */}
      <div className="border border-[#E5E5EA] rounded-2xl overflow-hidden text-xs">
        <div className="bg-[#FAFAFA] px-4 py-2.5 font-semibold text-xs border-b border-[#E5E5EA] text-[#1D1D1F]">
          CP Lens Standard Vector Color Conventions
        </div>
        <div className="divide-y divide-[#E5E5EA]/70">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-[#D75B50]" />
              <span className="font-medium text-[#1D1D1F]">Mountain Crease (M)</span>
            </div>
            <span className="text-[11px] text-[#86868B]">Folds convex toward viewer (Red)</span>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-[#4F6BA6]" />
              <span className="font-medium text-[#1D1D1F]">Valley Crease (V)</span>
            </div>
            <span className="text-[11px] text-[#86868B]">Folds concave away from viewer (Blue)</span>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-[#1D1D1F]" />
              <span className="font-medium text-[#1D1D1F]">Paper Perimeter (Edge)</span>
            </div>
            <span className="text-[11px] text-[#86868B]">Outer boundary of the paper sheet (Charcoal)</span>
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-purple-600" />
              <span className="font-medium text-[#1D1D1F]">Auxiliary Guideline (Aux)</span>
            </div>
            <span className="text-[11px] text-[#86868B]">Reference lines & preliminary folds (Purple)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TAB 5: Keyboard Shortcuts                                                  */
/* -------------------------------------------------------------------------- */
const ShortcutsGuide: React.FC = () => {
  const tools = [
    { key: 'V', name: 'Select & Inspect', desc: 'Click creases, points, or crosshairs to inspect parameters' },
    { key: 'H', name: 'Hand Tool (Pan)', desc: 'Drag to pan canvas smoothly across paper' },
    { key: 'K', name: 'Calibrate Paper', desc: 'Click 4 corners (TL, TR, BR, BL) to rectify photo perspective' },
    { key: 'P', name: 'Reference Point', desc: 'Pin landmark points to solve 22.5° folding sequences' },
    { key: 'M', name: 'Two-Point Measure', desc: 'Measure exact Euclidean distance and rational ratio' },
    { key: 'L', name: 'Crease Line', desc: 'Draw mountain, valley, or edge creases' },
    { key: 'R', name: 'Crosshair Ruler', desc: 'Place infinite horizontal and vertical guidelines' },
    { key: 'G', name: 'Grid Overlay', desc: 'Display and configure box-pleat lattices' },
    { key: 'Y', name: 'Symmetry', desc: 'Reflect creases across horizontal, vertical, or diagonal fold axes' },
  ];

  const modifiers = [
    { key: '⌘K / Ctrl+K', name: 'Command Palette', desc: 'Fast fuzzy search across all tools, samples, and exports' },
    { key: '⌘Z / Ctrl+Z', name: 'Undo', desc: 'Revert last crease, point, or camera modification' },
    { key: '⌘⇧Z / Ctrl+Y', name: 'Redo', desc: 'Reapply undone geometric modification' },
    { key: 'Space + Drag', name: 'Quick Pan', desc: 'Hold Space to temporarily pan with any tool active' },
    { key: 'Alt / Option', name: '4× Loupe Magnifier', desc: 'Inspect raster pixels and vertices at high magnification' },
    { key: 'Delete / Backspace', name: 'Delete Item', desc: 'Remove selected crease, point, or measurement' },
    { key: 'Esc', name: 'Clear Selection', desc: 'Deselect active item or cancel current drawing step' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-semibold text-[#1D1D1F] tracking-[-0.02em]">
          Studio Keyboard Shortcuts
        </h3>
        <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
          Master single-key navigation to craft crease patterns with surgical speed and focus.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">
          Tool Activation Keys
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {tools.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5EA]/70 text-xs"
            >
              <div className="flex items-center space-x-3">
                <kbd className="w-7 h-7 flex items-center justify-center font-mono font-bold text-xs bg-white text-[#1D1D1F] border border-[#D2D2D7] rounded-lg shadow-2xs">
                  {item.key}
                </kbd>
                <div>
                  <span className="font-semibold text-[#1D1D1F] block">{item.name}</span>
                  <span className="text-[11px] text-[#86868B]">{item.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">
          Actions & Modifiers
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {modifiers.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAFA] border border-[#E5E5EA]/70 text-xs"
            >
              <div className="flex items-center space-x-3">
                <kbd className="px-2 py-1 flex items-center justify-center font-mono font-medium text-[11px] bg-white text-[#1D1D1F] border border-[#D2D2D7] rounded-lg shadow-2xs whitespace-nowrap">
                  {item.key}
                </kbd>
                <div>
                  <span className="font-semibold text-[#1D1D1F] block">{item.name}</span>
                  <span className="text-[11px] text-[#86868B]">{item.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
