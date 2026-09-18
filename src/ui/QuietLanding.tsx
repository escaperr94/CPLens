import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crosshair,
  Grid,
  Layers,
  Maximize2,
  Sparkles,
  Zap,
} from 'lucide-react';

interface QuietLandingProps {
  onEnterStudio: () => void;
}

interface LandmarkPreset {
  id: 'center' | 'silver' | 'lattice' | 'diagonal';
  name: string;
  fractionLabel: string;
  decimalLabel: string;
  x: number;
  y: number;
  svgX: number; // 0-100
  svgY: number; // 0-100
  description: string;
  axiom: string;
  rank: number;
  errorMm: string;
  sequence: {
    step: number;
    title: string;
    instruction: string;
    technique: string;
  }[];
}

const LANDMARK_PRESETS: LandmarkPreset[] = [
  {
    id: 'center',
    name: 'Center',
    fractionLabel: 'x = 1/2, y = 1/2',
    decimalLabel: '(0.5000, 0.5000)',
    x: 0.5,
    y: 0.5,
    svgX: 50,
    svgY: 50,
    description: 'Exact geometric midpoint of the square paper.',
    axiom: 'Axiom 1 & 2 • Direct Bisection',
    rank: 1,
    errorMm: '0.0000 mm',
    sequence: [
      {
        step: 1,
        title: 'Book Fold Width',
        instruction: 'Fold left edge to right edge and crease midpoint lightly.',
        technique: 'Edge-to-Edge Bisection',
      },
      {
        step: 2,
        title: 'Book Fold Height',
        instruction: 'Fold bottom edge to top edge to mark center horizontal line.',
        technique: 'Orthogonal Bisection',
      },
      {
        step: 3,
        title: 'Intersection Landmark',
        instruction: 'Crease intersection identifies the exact (1/2, 1/2) center.',
        technique: 'Direct Landmark Target',
      },
    ],
  },
  {
    id: 'silver',
    name: 'Silver Ratio',
    fractionLabel: 'x = √2 - 1, y = √2 - 1',
    decimalLabel: '(0.4142, 0.4142)',
    x: 0.4142,
    y: 0.4142,
    svgX: 41.42,
    svgY: 58.58,
    description: 'Fundamental 22.5° octagonal constant (√2 - 1 ≈ 0.41421).',
    axiom: 'Lang 22.5° • Octagonal Bisector',
    rank: 2,
    errorMm: '0.0000 mm',
    sequence: [
      {
        step: 1,
        title: 'Corner Diagonal',
        instruction: 'Valley fold corner (0,0) to corner (1,1) along 45° paper axis.',
        technique: 'Diagonal Symmetry Axis',
      },
      {
        step: 2,
        title: '22.5° Angle Bisector',
        instruction: 'Fold bottom edge to meet diagonal crease; pinch on bottom edge.',
        technique: 'Axiom 3 Angle Bisector',
      },
      {
        step: 3,
        title: 'Perpendicular Transfer',
        instruction: 'Swing pinch perpendicular to diagonal to lock silver landmark.',
        technique: 'Lang 22.5° Reference Point',
      },
    ],
  },
  {
    id: 'lattice',
    name: 'Lattice (3/8)',
    fractionLabel: 'x = 3/8, y = 3/8',
    decimalLabel: '(0.3750, 0.3750)',
    x: 0.375,
    y: 0.375,
    svgX: 37.5,
    svgY: 62.5,
    description: 'Standard 8-division Kamiya box-pleat rational node.',
    axiom: 'Dyadic Binary Division • Haga Theorem',
    rank: 3,
    errorMm: '0.0000 mm',
    sequence: [
      {
        step: 1,
        title: 'Halve Paper',
        instruction: 'Book fold paper in half horizontally to locate the 1/2 line.',
        technique: 'Dyadic Half Bisection',
      },
      {
        step: 2,
        title: 'Quarter Division',
        instruction: 'Valley fold bottom edge to 1/2 crease line to obtain 1/4 mark.',
        technique: 'Dyadic Quarter Division',
      },
      {
        step: 3,
        title: 'Eighth Division',
        instruction: 'Fold 1/4 crease to 1/2 crease to yield exact 3/8 rational coordinate.',
        technique: 'Rational Intermediate Snap',
      },
    ],
  },
  {
    id: 'diagonal',
    name: 'Diagonal Corner',
    fractionLabel: 'x = 1/4, y = 3/4',
    decimalLabel: '(0.2500, 0.7500)',
    x: 0.25,
    y: 0.75,
    svgX: 25.0,
    svgY: 25.0,
    description: 'Corner flap root anchor for bird and frog bases.',
    axiom: 'Axiom 3 • Edge-to-Center Corner',
    rank: 2,
    errorMm: '0.0000 mm',
    sequence: [
      {
        step: 1,
        title: 'Vertical Quarter Line',
        instruction: 'Valley fold left edge to center 1/2 line to establish x = 1/4.',
        technique: 'Edge Alignment',
      },
      {
        step: 2,
        title: 'Horizontal Three-Quarter',
        instruction: 'Valley fold top edge to center 1/2 crease to establish y = 3/4.',
        technique: 'Transverse Fold',
      },
      {
        step: 3,
        title: 'Flap Root Intersection',
        instruction: 'Pinch diagonal angle bisector through corner to lock node.',
        technique: 'Corner Root Anchor',
      },
    ],
  },
];

export const QuietLanding: React.FC<QuietLandingProps> = ({ onEnterStudio }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active landmark preset state
  const [activePresetId, setActivePresetId] = useState<LandmarkPreset['id']>('lattice');
  const activePreset = LANDMARK_PRESETS.find((p) => p.id === activePresetId) || LANDMARK_PRESETS[2];

  // Scroll reveal observer with 1.5s cubic-bezier transition
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({
    hero: false,
    preview: false,
    tools: false,
    features: false,
    workflow: false,
    waitlist: false,
  });

  useEffect(() => {
    // Reveal hero immediately after mount with subtle delay
    const heroTimer = setTimeout(() => {
      setRevealedSections((prev) => ({ ...prev, hero: true }));
    }, 100);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            if (id) {
              setRevealedSections((prev) => ({ ...prev, [id]: true }));
            }
          }
        });
      },
      { threshold: 0.12 }
    );

    const elements = document.querySelectorAll('[data-section-id]');
    elements.forEach((el) => observer.observe(el));

    return () => {
      clearTimeout(heroTimer);
      observer.disconnect();
    };
  }, []);

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitted) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const getRevealStyle = (id: string): React.CSSProperties => {
    const isRevealed = revealedSections[id];
    return {
      transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: isRevealed ? 1 : 0,
      transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.985)',
    };
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#1D1D1F] font-sans selection:bg-[#E1E8F5] selection:text-[#4F6BA6] overflow-y-auto overflow-x-hidden relative">
      {/* 1. Glassmorphism Top Bar with subtle frosted blur */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-8 py-3.5 backdrop-blur-xl bg-[#FAFAFA]/80 border-b border-[#D2D2D7]/30 transition duration-300">
        <div className="flex items-center space-x-3">
          {/* Refined origami logo badge */}
          <div className="w-6 h-6 rounded-lg bg-[#4F6BA6] flex items-center justify-center text-white shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 12 12 22 22 12 12 2" />
              <line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" strokeDasharray="2 2" />
              <line x1="12" y1="2" x2="12" y2="22" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#1D1D1F]">CP Lens</span>
          {/* Quiet Luxury Pill Badge */}
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#E1E8F5]/80 text-[#4F6BA6] border border-[#4F6BA6]/20 shadow-xs">
            Quiet Luxury
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="#waitlist"
            className="text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] transition px-2 py-1.5"
          >
            Waitlist
          </a>
          <button
            onClick={onEnterStudio}
            className="group flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-medium text-white shimmer-button shadow-quiet-button hover:shadow-lg transition duration-300"
          >
            <span>Open Studio</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section
        data-section-id="hero"
        style={getRevealStyle('hero')}
        className="min-h-[85vh] sm:min-h-[90vh] w-full flex flex-col items-center justify-center px-6 pt-28 sm:pt-36 pb-16 relative text-center"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          {/* Origami algorithm pill */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E5EA] shadow-quiet-pill text-[12px] font-medium text-[#1D1D1F] mb-8">
            <span className="w-2 h-2 rounded-full bg-[#4F6BA6]" />
            <span className="text-[#86868B]">Lang 22.5° Reference Finder</span>
            <span className="text-[#D2D2D7]">•</span>
            <span className="text-[#4F6BA6] font-semibold">Studio v2.4</span>
          </div>

          {/* Hero Headline with tight editorial line heights and tracking */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[96px] font-semibold tracking-[-0.03em] text-[#1D1D1F] leading-[0.98] sm:leading-[1.0] md:leading-[1.02] text-balance max-w-4xl">
            Origami geometry, revealed.
          </h1>

          {/* Subtitle with text-[#86868B] and leading-relaxed */}
          <p className="mt-6 sm:mt-8 text-lg sm:text-xl md:text-2xl font-normal text-[#86868B] leading-relaxed max-w-2xl sm:max-w-3xl text-balance">
            Precision computer vision, rational coordinate solving, and Robert J. Lang&apos;s 22.5° reference finder for folders and mathematical origami designers.
          </p>

          {/* Hero Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3.5">
            <a
              href="#waitlist"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-semibold text-white shimmer-button shadow-quiet-button flex items-center justify-center space-x-2 transition"
            >
              <span>Request Early Access</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              onClick={onEnterStudio}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full text-sm font-medium text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] border border-[#E5E5EA] shadow-quiet-pill transition flex items-center justify-center space-x-2"
            >
              <span>Explore Studio Directly</span>
              <ChevronRight className="w-4 h-4 text-[#86868B]" />
            </button>
          </div>

          {/* Subtle VIP live counter badge */}
          <div className="mt-8 flex items-center space-x-2 text-xs text-[#86868B] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Join 1,420+ origami mathematicians & designers on the waitlist</span>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-3xl" />
      </div>

      {/* 2. Interactive Crease Pattern & Reference Finder Preview Section */}
      <section
        data-section-id="preview"
        style={getRevealStyle('preview')}
        className="py-20 sm:py-28 px-4 sm:px-6 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-5xl">
          {/* Card Header Title */}
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E1E8F5]/80 text-[#4F6BA6] text-xs font-semibold">
              <Crosshair className="w-3.5 h-3.5" />
              <span>INTERACTIVE REFERENCE FINDER PREVIEW</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              Click landmark presets to calculate exact folds.
            </h2>
            <p className="text-sm sm:text-base text-[#86868B] max-w-xl mx-auto text-balance">
              Test dynamic crosshairs and Lang&apos;s 22.5° reference folding sequences in real time.
            </p>
          </div>

          {/* 16:10 or responsive luxury card with layered soft shadows */}
          <div className="w-full bg-white rounded-[24px] sm:rounded-[28px] overflow-hidden p-5 sm:p-7 border border-[#E5E5EA]/70 shadow-quiet-card flex flex-col relative transition-all duration-300">
            {/* Window control header bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EA]/60">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#E5E5EA]" />
                <div className="w-3 h-3 rounded-full bg-[#E5E5EA]" />
                <div className="w-3 h-3 rounded-full bg-[#E5E5EA]" />
              </div>
              <div className="text-[11px] font-mono font-medium text-[#86868B] flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#4F6BA6]" />
                <span>Dove_Kamiya.cp — Kamiya 64×64 Lattice</span>
              </div>
              <button
                onClick={onEnterStudio}
                className="text-[11px] text-[#4F6BA6] hover:text-[#5D7BB8] font-medium transition flex items-center space-x-1"
                title="Launch full studio"
              >
                <span>Full Studio</span>
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            {/* Landmark Presets Bar */}
            <div className="mt-4 pt-1 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F0F2]">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-[#86868B]">
                <Compass className="w-3.5 h-3.5 text-[#4F6BA6]" />
                <span className="font-semibold text-[#1D1D1F]">Origami Presets:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {LANDMARK_PRESETS.map((preset) => {
                  const isSelected = preset.id === activePresetId;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setActivePresetId(preset.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition duration-200 flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-[#4F6BA6] text-white shadow-xs font-semibold'
                          : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E1E8F5]/60 hover:text-[#4F6BA6] border border-[#E5E5EA]/60'
                      }`}
                    >
                      <span>{preset.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#86868B]'
                        }`}
                      >
                        {preset.fractionLabel.split(',')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Interactive Split Grid */}
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Interactive Crease Pattern Canvas */}
              <div className="lg:col-span-7 bg-[#F5F5F7]/90 rounded-2xl p-4 sm:p-6 border border-[#E5E5EA]/50 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Paper Canvas Container */}
                <div className="relative w-full max-w-[360px] sm:max-w-[380px] aspect-square bg-white rounded-xl shadow-xs border border-[#E5E5EA] p-2 flex items-center justify-center">
                  <svg
                    className="w-full h-full cursor-crosshair select-none"
                    viewBox="0 0 100 100"
                  >
                    {/* Background grid lines (8x8 box-pleat mesh) */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <React.Fragment key={i}>
                        <line
                          x1={i * 12.5}
                          y1="0"
                          x2={i * 12.5}
                          y2="100"
                          stroke="#E5E5EA"
                          strokeWidth="0.35"
                        />
                        <line
                          x1="0"
                          y1={i * 12.5}
                          x2="100"
                          y2={i * 12.5}
                          stroke="#E5E5EA"
                          strokeWidth="0.35"
                        />
                      </React.Fragment>
                    ))}

                    {/* Paper diagonals & Mountain/Valley crease vectors */}
                    <line x1="0" y1="0" x2="100" y2="100" stroke="#D75B50" strokeWidth="0.8" strokeDasharray="3 1.5" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="#4F6BA6" strokeWidth="0.8" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#4F6BA6" strokeWidth="0.6" strokeDasharray="4 1" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="#4F6BA6" strokeWidth="0.6" strokeDasharray="4 1" />
                    <line x1="25" y1="0" x2="25" y2="100" stroke="#D75B50" strokeWidth="0.5" strokeDasharray="2.5 1" />
                    <line x1="75" y1="0" x2="75" y2="100" stroke="#D75B50" strokeWidth="0.5" strokeDasharray="2.5 1" />
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#4F6BA6" strokeWidth="0.5" />
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#4F6BA6" strokeWidth="0.5" />

                    {/* DYNAMIC CROSSHAIRS through the active landmark */}
                    {/* Horizontal Guideline */}
                    <line
                      x1="0"
                      y1={activePreset.svgY}
                      x2="100"
                      y2={activePreset.svgY}
                      stroke="#4F6BA6"
                      strokeWidth="0.75"
                      strokeDasharray="2 1.5"
                      className="transition-all duration-300"
                    />
                    {/* Vertical Guideline */}
                    <line
                      x1={activePreset.svgX}
                      y1="0"
                      x2={activePreset.svgX}
                      y2="100"
                      stroke="#4F6BA6"
                      strokeWidth="0.75"
                      strokeDasharray="2 1.5"
                      className="transition-all duration-300"
                    />

                    {/* Paper boundary */}
                    <rect x="0" y="0" width="100" height="100" fill="none" stroke="#D2D2D7" strokeWidth="1" />

                    {/* Target Reticle at active landmark */}
                    <circle
                      cx={activePreset.svgX}
                      cy={activePreset.svgY}
                      r="4.5"
                      fill="none"
                      stroke="#4F6BA6"
                      strokeWidth="0.6"
                      strokeDasharray="1.5 1"
                      className="animate-spin"
                      style={{ transformOrigin: `${activePreset.svgX}px ${activePreset.svgY}px` }}
                    />
                    <circle
                      cx={activePreset.svgX}
                      cy={activePreset.svgY}
                      r="2.6"
                      fill="#FFFFFF"
                      stroke="#4F6BA6"
                      strokeWidth="1.2"
                      className="transition-all duration-300"
                    />
                    <circle
                      cx={activePreset.svgX}
                      cy={activePreset.svgY}
                      r="1.2"
                      fill="#4F6BA6"
                      className="transition-all duration-300"
                    />

                    {/* Reference Point Coordinate Tag */}
                    <g
                      className="transition-all duration-300"
                      transform={`translate(${
                        activePreset.svgX > 65 ? activePreset.svgX - 28 : activePreset.svgX + 4
                      }, ${
                        activePreset.svgY > 80 ? activePreset.svgY - 10 : activePreset.svgY + 6
                      })`}
                    >
                      <rect
                        x="0"
                        y="0"
                        width="24"
                        height="7"
                        rx="2"
                        fill="#1D1D1F"
                        fillOpacity="0.85"
                      />
                      <text
                        x="12"
                        y="4.8"
                        textAnchor="middle"
                        fontSize="3.2"
                        fill="#FFFFFF"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        P({activePreset.x.toFixed(2)}, {activePreset.y.toFixed(2)})
                      </text>
                    </g>
                  </svg>

                  {/* Corner origin badges */}
                  <span className="absolute top-1 left-1.5 text-[9px] font-mono text-[#86868B]/70">(0, 1)</span>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-[#86868B]/70">(0, 0)</span>
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono text-[#86868B]/70">(1, 1)</span>
                  <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-[#86868B]/70">(1, 0)</span>
                </div>

                {/* Floating Bottom Canvas Coordinate HUD Badge */}
                <div className="mt-3.5 w-full max-w-[380px] flex items-center justify-between px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl border border-[#E5E5EA] shadow-2xs text-xs font-mono text-[#1D1D1F]">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#4F6BA6]" />
                    <span className="font-semibold text-[#4F6BA6]">{activePreset.fractionLabel}</span>
                  </div>
                  <span className="text-[#86868B] text-[11px]">{activePreset.decimalLabel}</span>
                </div>
              </div>

              {/* Right Column: Simulated 22.5° Reference Finder Fold Sequence Card */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-white rounded-2xl p-5 border border-[#E5E5EA]/70 shadow-2xs">
                <div>
                  {/* Card Section Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F2]">
                    <div>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#4F6BA6]">
                        22.5° REFERENCE FINDER
                      </span>
                      <h3 className="text-base font-semibold text-[#1D1D1F] mt-0.5">
                        {activePreset.name} Sequence
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E1E8F5] text-[#4F6BA6]">
                        Rank {activePreset.rank}
                      </span>
                      <p className="text-[10px] font-mono text-emerald-600 mt-0.5 font-medium">
                        Error: {activePreset.errorMm}
                      </p>
                    </div>
                  </div>

                  {/* Mathematical description */}
                  <div className="mt-3 p-2.5 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA]/60 text-xs text-[#86868B]">
                    <div className="flex items-center justify-between font-mono text-[#1D1D1F] font-medium text-[11px]">
                      <span>{activePreset.axiom}</span>
                      <span className="text-[#4F6BA6]">{activePreset.decimalLabel}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#86868B]">{activePreset.description}</p>
                  </div>

                  {/* Step-by-Step Folding Sequence */}
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                      <span>Practical Folding Steps</span>
                      <span>Robert J. Lang Axioms</span>
                    </div>

                    {activePreset.sequence.map((item) => (
                      <div
                        key={item.step}
                        className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5EA]/70 flex items-start space-x-3 transition hover:border-[#4F6BA6]/40 hover:bg-[#F9FAFC]"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                          {item.step}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#1D1D1F]">{item.title}</span>
                            <span className="text-[10px] font-mono text-[#86868B] px-1.5 py-0.5 bg-white rounded border border-[#E5E5EA]/60">
                              {item.technique}
                            </span>
                          </div>
                          <p className="text-xs text-[#86868B] leading-relaxed">{item.instruction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA to open this in Studio */}
                <div className="pt-2 border-t border-[#F0F0F2]">
                  <button
                    onClick={onEnterStudio}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#4F6BA6] bg-[#E1E8F5]/50 hover:bg-[#E1E8F5] transition flex items-center justify-center space-x-1.5 border border-[#4F6BA6]/20"
                  >
                    <span>Inspect this landmark in full Studio CAD</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-3xl" />
      </div>

      {/* 3. Tool Demystifying / Usability Explainer Section ("Engineered for Folders") */}
      <section
        data-section-id="tools"
        style={getRevealStyle('tools')}
        className="py-24 sm:py-32 px-6 flex flex-col items-center"
      >
        <div className="w-full max-w-6xl mx-auto space-y-16">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#E1E8F5]/80 text-[#4F6BA6] text-xs font-semibold tracking-wide">
              <Compass className="w-3.5 h-3.5" />
              <span>MATHEMATICAL ORIGAMI TOOLKIT</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] leading-[1.05]">
              Engineered for Folders.
            </h2>
            <p className="text-lg sm:text-xl text-[#86868B] font-normal leading-relaxed text-balance">
              Three core instruments designed specifically to eliminate guesswork from crease pattern reading, coordinate identification, and paper construction.
            </p>
          </div>

          {/* 3-Column Dedicated Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1: 22.5° Reference Finder */}
            <div className="bg-white rounded-3xl p-7 border border-[#E5E5EA]/80 shadow-quiet-card flex flex-col justify-between space-y-6 hover:border-[#4F6BA6]/40 transition duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center shadow-xs">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#4F6BA6]">
                    Algorithm by Robert J. Lang
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
                    22.5° Reference Finder
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-[#86868B] leading-relaxed">
                  Robert J. Lang&apos;s algorithm finds exact practical folding sequences to locate any landmark point on square paper without measurement.
                </p>
              </div>

              {/* Visual Diagram */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7]/90 border border-[#E5E5EA]/70 flex flex-col items-center justify-center">
                <svg className="w-full h-32" viewBox="0 0 120 70">
                  {/* Square outline */}
                  <rect x="25" y="5" width="70" height="60" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth="1" rx="2" />
                  {/* 45° diagonal */}
                  <line x1="25" y1="65" x2="95" y2="5" stroke="#D75B50" strokeWidth="0.8" strokeDasharray="3 1.5" />
                  {/* 22.5° angle line */}
                  <line x1="25" y1="65" x2="95" y2="36" stroke="#4F6BA6" strokeWidth="1.2" />
                  {/* Arc indicating 22.5° */}
                  <path d="M 50,65 A 25,25 0 0,0 48,54" fill="none" stroke="#4F6BA6" strokeWidth="0.8" />
                  <text x="54" y="60" fontSize="5" fill="#4F6BA6" fontWeight="bold">22.5°</text>
                  {/* Target landmark pin */}
                  <circle cx="54" cy="53" r="2.5" fill="#FFFFFF" stroke="#4F6BA6" strokeWidth="1" />
                  <circle cx="54" cy="53" r="1.2" fill="#4F6BA6" />
                  <text x="60" y="52" fontSize="4.5" fill="#1D1D1F" fontFamily="monospace" fontWeight="600">√2 - 1</text>
                </svg>
                <div className="w-full mt-2 pt-2 border-t border-[#E5E5EA]/60 flex items-center justify-between text-[10px] font-mono text-[#86868B]">
                  <span>Huzita Axiom 3</span>
                  <span className="text-emerald-600 font-semibold">Error: 0.0000 mm</span>
                </div>
              </div>

              {/* Bullet Highlights */}
              <ul className="space-y-2 text-xs text-[#86868B]">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Pure origami axioms without ruler measurements</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Minimal step count ranked by physical fold ease</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Exact silver ratios and arbitrary target coordinates</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Orthogonal Crosshair Guidelines */}
            <div className="bg-white rounded-3xl p-7 border border-[#E5E5EA]/80 shadow-quiet-card flex flex-col justify-between space-y-6 hover:border-[#4F6BA6]/40 transition duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center shadow-xs">
                  <Crosshair className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#4F6BA6]">
                    Continuous Coordinate HUD
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
                    Orthogonal Crosshair Guidelines
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-[#86868B] leading-relaxed">
                  Drop horizontal and vertical guide lines across the entire paper showing exact fractional coordinates (1/2, 3/8, √2-1).
                </p>
              </div>

              {/* Visual Diagram */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7]/90 border border-[#E5E5EA]/70 flex flex-col items-center justify-center">
                <svg className="w-full h-32" viewBox="0 0 120 70">
                  {/* Square outline */}
                  <rect x="30" y="5" width="60" height="60" fill="#FFFFFF" stroke="#D2D2D7" strokeWidth="1" rx="2" />
                  {/* Crosshair Horizontal Line */}
                  <line x1="30" y1="42.5" x2="90" y2="42.5" stroke="#4F6BA6" strokeWidth="1" strokeDasharray="3 1.5" />
                  {/* Crosshair Vertical Line */}
                  <line x1="52.5" y1="5" x2="52.5" y2="65" stroke="#4F6BA6" strokeWidth="1" strokeDasharray="3 1.5" />
                  {/* Intersection Reticle */}
                  <circle cx="52.5" cy="42.5" r="3.5" fill="none" stroke="#4F6BA6" strokeWidth="0.8" />
                  <circle cx="52.5" cy="42.5" r="1.5" fill="#4F6BA6" />
                  {/* Axis Badges */}
                  <rect x="44" y="1" width="17" height="6" rx="2" fill="#4F6BA6" />
                  <text x="52.5" y="5.2" textAnchor="middle" fontSize="3.8" fill="#FFFFFF" fontFamily="monospace" fontWeight="600">x=3/8</text>
                  <rect x="91" y="39.5" width="17" height="6" rx="2" fill="#4F6BA6" />
                  <text x="99.5" y="43.8" textAnchor="middle" fontSize="3.8" fill="#FFFFFF" fontFamily="monospace" fontWeight="600">y=3/8</text>
                </svg>
                <div className="w-full mt-2 pt-2 border-t border-[#E5E5EA]/60 flex items-center justify-between text-[10px] font-mono text-[#86868B]">
                  <span>Rational Dyadic Snap</span>
                  <span className="text-[#4F6BA6] font-semibold">(0.3750, 0.3750)</span>
                </div>
              </div>

              {/* Bullet Highlights */}
              <ul className="space-y-2 text-xs text-[#86868B]">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Full-span infinite guidelines across square paper</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Real-time rational fraction conversion (3/8, 5/16, 7/32)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Instant distance, angle, and symmetry readout</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Rational Lattice & Homography */}
            <div className="bg-white rounded-3xl p-7 border border-[#E5E5EA]/80 shadow-quiet-card flex flex-col justify-between space-y-6 hover:border-[#4F6BA6]/40 transition duration-300">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center shadow-xs">
                  <Grid className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#4F6BA6]">
                    Computer Vision OCR
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
                    Rational Lattice & Homography
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-[#86868B] leading-relaxed">
                  Rectify camera perspective and snap to Kamiya box-pleat lattices (16 to 128) automatically.
                </p>
              </div>

              {/* Visual Diagram */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7]/90 border border-[#E5E5EA]/70 flex flex-col items-center justify-center">
                <svg className="w-full h-32" viewBox="0 0 120 70">
                  {/* Skewed camera quadrilateral on left */}
                  <polygon points="12,18 42,8 46,62 8,56" fill="#E1E8F5" fillOpacity="0.4" stroke="#86868B" strokeWidth="0.8" strokeDasharray="2 1.5" />
                  <circle cx="12" cy="18" r="1.5" fill="#4F6BA6" />
                  <circle cx="42" cy="8" r="1.5" fill="#4F6BA6" />
                  <circle cx="46" cy="62" r="1.5" fill="#4F6BA6" />
                  <circle cx="8" cy="56" r="1.5" fill="#4F6BA6" />
                  {/* Transform arrow */}
                  <path d="M 52,35 L 64,35" stroke="#4F6BA6" strokeWidth="1.2" strokeLinecap="round" />
                  <polygon points="65,35 60,32 60,38" fill="#4F6BA6" />
                  {/* Rectified orthogonal lattice on right */}
                  <rect x="72" y="10" width="40" height="50" fill="#FFFFFF" stroke="#4F6BA6" strokeWidth="1" rx="1.5" />
                  {/* Grid lines inside rectified square */}
                  <line x1="82" y1="10" x2="82" y2="60" stroke="#E5E5EA" strokeWidth="0.5" />
                  <line x1="92" y1="10" x2="92" y2="60" stroke="#E5E5EA" strokeWidth="0.5" />
                  <line x1="102" y1="10" x2="102" y2="60" stroke="#E5E5EA" strokeWidth="0.5" />
                  <line x1="72" y1="22.5" x2="112" y2="22.5" stroke="#E5E5EA" strokeWidth="0.5" />
                  <line x1="72" y1="35" x2="112" y2="35" stroke="#E5E5EA" strokeWidth="0.5" />
                  <line x1="72" y1="47.5" x2="112" y2="47.5" stroke="#E5E5EA" strokeWidth="0.5" />
                </svg>
                <div className="w-full mt-2 pt-2 border-t border-[#E5E5EA]/60 flex items-center justify-between text-[10px] font-mono text-[#86868B]">
                  <span>Perspective Rectified</span>
                  <span className="text-[#4F6BA6] font-semibold">Grid 64×64</span>
                </div>
              </div>

              {/* Bullet Highlights */}
              <ul className="space-y-2 text-xs text-[#86868B]">
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Four-point homography camera angle flattening</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Satoshi Kamiya standard grids (56, 64, 80, 128)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-3.5 h-3.5 text-[#4F6BA6] shrink-0" />
                  <span>Cell-bounded snapping eliminates floating-point drift</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-3xl" />
      </div>

      {/* 4. Workflow Section */}
      <section
        data-section-id="workflow"
        style={getRevealStyle('workflow')}
        className="py-24 sm:py-32 px-6 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-4xl flex flex-col items-center space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#4F6BA6] font-semibold">
              The Vector Pipeline
            </span>
            <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              From photograph to foldable vector geometry.
            </h3>
          </div>

          {/* Workflow Sequence */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
            {[
              { step: '01', title: 'Import Photo', desc: 'Raw raster or sketch' },
              { step: '02', title: 'Homography', desc: 'Corner rectification' },
              { step: '03', title: 'Geometric OCR', desc: 'Hough centerlines' },
              { step: '04', title: 'Snap Lattice', desc: 'Kamiya box-pleats' },
              { step: '05', title: 'Reference Folds', desc: 'Lang 22.5° steps' },
            ].map((item, idx, arr) => (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-white border border-[#E5E5EA]/70 min-w-[140px] shadow-2xs">
                  <span className="text-[10px] font-mono font-medium text-[#86868B]">{item.step}</span>
                  <span className="text-sm font-semibold text-[#1D1D1F] mt-0.5">{item.title}</span>
                  <span className="text-[10px] text-[#86868B] mt-0.5">{item.desc}</span>
                </div>

                {idx < arr.length - 1 && (
                  <>
                    <ArrowRight className="hidden md:block w-4 h-4 text-[#86868B]/60" />
                    <ArrowDown className="md:hidden w-4 h-4 text-[#86868B]/60 my-1" />
                  </>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-3xl" />
      </div>

      {/* 5. Premium Waitlist Form & VIP Counter Section */}
      <section
        id="waitlist"
        data-section-id="waitlist"
        style={getRevealStyle('waitlist')}
        className="py-32 sm:py-36 px-6 flex flex-col items-center justify-center relative"
      >
        <div className="w-full max-w-[480px] mx-auto text-center space-y-8">
          {/* Subtle live counter badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E5EA] shadow-quiet-pill">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-[#1D1D1F]">
              Join <span className="font-semibold text-[#4F6BA6]">1,420+</span> origami mathematicians & designers on the waitlist
            </span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              Early access for folders.
            </h2>
            <p className="text-sm sm:text-base text-[#86868B] font-normal leading-relaxed text-balance">
              Join the private beta for mathematical origami designers, crease pattern collectors, and high-precision paper artists.
            </p>
          </div>

          {/* Waitlist Form */}
          {!isSubmitted ? (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3.5">
              {/* Gradient-Border Input */}
              <div className="gradient-border-wrapper rounded-full shadow-quiet-pill">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-15 sm:h-16 rounded-full px-6 bg-white text-base text-[#1D1D1F] placeholder-[#86868B] outline-none border-none font-medium transition duration-300"
                />
              </div>

              {/* Shimmer Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-15 sm:h-16 rounded-full text-base font-semibold text-white shimmer-button flex items-center justify-center space-x-2 disabled:opacity-50 shadow-quiet-button transition duration-300"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Request Early Access</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Quiet celebration state with checkmark and warm message */
            <div className="rounded-3xl bg-white border border-[#E5E5EA] p-7 flex flex-col items-center justify-center space-y-3 shadow-quiet-card transition-all duration-500">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-base font-semibold text-[#1D1D1F]">You&apos;re on the priority waitlist.</p>
                <p className="text-xs text-[#86868B] max-w-xs text-balance">
                  We&apos;ve reserved invitation #1,421 for your email. We will quietly reach out when private beta access opens.
                </p>
              </div>
            </div>
          )}

          {/* Immediate Studio Launch Link */}
          <div className="pt-2">
            <button
              onClick={onEnterStudio}
              className="text-xs font-medium text-[#86868B] hover:text-[#4F6BA6] transition inline-flex items-center space-x-1.5"
            >
              <span>Or explore the live interactive studio now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-6 sm:px-8 border-t border-[#D2D2D7]/30 text-xs text-[#86868B]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded bg-[#4F6BA6] flex items-center justify-center text-white text-[9px] font-bold">
              CP
            </div>
            <span className="font-semibold text-[#1D1D1F]">CP Lens</span>
            <span>—</span>
            <span>Quiet Luxury Origami CAD</span>
          </div>
          <p>© 2026 CP Lens. Crafted for high-precision crease pattern geometry.</p>
        </div>
      </footer>
    </div>
  );
};
