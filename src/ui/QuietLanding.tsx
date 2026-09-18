import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowDown,
  Check,
  Sparkles,
  ChevronRight,
  Compass,
  Grid,
  Layers,
  Ruler,
  Maximize2,
  X,
} from 'lucide-react';

interface QuietLandingProps {
  onEnterStudio: () => void;
}

export const QuietLanding: React.FC<QuietLandingProps> = ({ onEnterStudio }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll reveal observer with 1.5s cubic-bezier transition
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({
    hero: false,
    preview: false,
    feature1: false,
    feature2: false,
    feature3: false,
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
      { threshold: 0.15 }
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

  const getRevealStyle = (id: string) => {
    const isRevealed = revealedSections[id];
    return {
      transition: 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: isRevealed ? 1 : 0,
      transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.98)',
    };
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-[#1D1D1F] font-sans selection:bg-[#E1E8F5] selection:text-[#4F6BA6] overflow-y-auto overflow-x-hidden relative">
      {/* Top Floating Glass Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-[#FAFAFA]/80 border-b border-[#D2D2D7]/20 transition duration-300">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded-md bg-[#4F6BA6] flex items-center justify-center text-white text-[11px] font-bold tracking-tight shadow-sm">
            CP
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#1D1D1F]">CP Lens</span>
          <span className="text-[11px] font-medium text-[#86868B] px-2 py-0.5 bg-[#E1E8F5]/60 rounded-full">
            Quiet Premium
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="#waitlist"
            className="text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] transition px-3 py-1.5"
          >
            Waitlist
          </a>
          <button
            onClick={onEnterStudio}
            className="group flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-medium text-white shimmer-button shadow-[0_2px_10px_rgba(79,107,166,0.25)] hover:shadow-[0_10px_30px_-10px_rgba(79,107,166,0.4)] transition"
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
        className="min-h-[100vh] w-full flex items-center justify-center px-6 pt-20 pb-16 relative"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl md:text-[96px] font-semibold tracking-tight text-[#1D1D1F] leading-[1.1] text-balance">
            Origami geometry, revealed.
          </h1>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-2xl" />
      </div>

      {/* Visual Preview Card Section */}
      <section
        data-section-id="preview"
        style={getRevealStyle('preview')}
        className="py-24 px-6 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-4xl">
          {/* 16:10 aspect ratio card with 24px rounded corners */}
          <div
            className="w-full aspect-[16/10] bg-white rounded-[24px] overflow-hidden p-6 flex flex-col relative border border-[#E5E5EA]/60"
            style={{
              boxShadow:
                '0 2px 8px rgba(0,0,0,0.04), 0 24px 48px -8px rgba(0,0,0,0.06), 0 48px 80px -12px rgba(0,0,0,0.04)',
            }}
          >
            {/* Window control header bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5EA]/50">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#E5E5EA]" />
                <div className="w-3 h-3 rounded-full bg-[#E5E5EA]" />
                <div className="w-3 h-3 rounded-full bg-[#E5E5EA]" />
              </div>
              <div className="text-[11px] font-mono font-medium text-[#86868B] flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F6BA6]" />
                <span>Dove_2021.cp — 64 × 64 Lattice</span>
              </div>
              <button
                onClick={onEnterStudio}
                className="text-[11px] text-[#4F6BA6] hover:text-[#5D7BB8] font-medium transition flex items-center space-x-1"
              >
                <span>Interactive</span>
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>

            {/* Skeletal UI with abstract crease pattern geometry */}
            <div className="flex-1 mt-4 grid grid-cols-12 gap-4 h-full overflow-hidden">
              {/* Left tools skeleton */}
              <div className="col-span-1 flex flex-col items-center space-y-2 pt-2">
                <div className="w-7 h-7 rounded-lg bg-[#F5F5F7]" />
                <div className="w-7 h-7 rounded-lg bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center text-xs font-bold">
                  L
                </div>
                <div className="w-7 h-7 rounded-lg bg-[#F5F5F7]" />
                <div className="w-7 h-7 rounded-lg bg-[#F5F5F7]" />
              </div>

              {/* Center Crease Diagram Preview */}
              <div className="col-span-8 bg-[#F5F5F7]/80 rounded-2xl relative overflow-hidden flex items-center justify-center p-4 border border-[#E5E5EA]/40">
                {/* Simulated origami lattice lines */}
                <svg className="w-full h-full max-w-[400px] max-h-[400px]" viewBox="0 0 100 100">
                  {/* Grid lines */}
                  {Array.from({ length: 9 }).map((_, i) => (
                    <React.Fragment key={i}>
                      <line
                        x1={i * 12.5}
                        y1="0"
                        x2={i * 12.5}
                        y2="100"
                        stroke="#D2D2D7"
                        strokeWidth="0.3"
                        strokeOpacity="0.6"
                      />
                      <line
                        x1="0"
                        y1={i * 12.5}
                        x2="100"
                        y2={i * 12.5}
                        stroke="#D2D2D7"
                        strokeWidth="0.3"
                        strokeOpacity="0.6"
                      />
                    </React.Fragment>
                  ))}
                  {/* Mountain & Valley crease vectors */}
                  <line x1="0" y1="0" x2="100" y2="100" stroke="#D75B50" strokeWidth="1" strokeDasharray="3 1" />
                  <line x1="100" y1="0" x2="0" y2="100" stroke="#4F6BA6" strokeWidth="1" />
                  <line x1="25" y1="0" x2="25" y2="100" stroke="#D75B50" strokeWidth="0.8" strokeDasharray="3 1" />
                  <line x1="75" y1="0" x2="75" y2="100" stroke="#4F6BA6" strokeWidth="0.8" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#4F6BA6" strokeWidth="0.9" />
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#D75B50" strokeWidth="0.7" strokeDasharray="2 1" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="#D75B50" strokeWidth="0.7" strokeDasharray="2 1" />
                  {/* Reference points */}
                  <circle cx="25" cy="25" r="2" fill="#FFFFFF" stroke="#4F6BA6" strokeWidth="1" />
                  <circle cx="50" cy="50" r="2.2" fill="#FFFFFF" stroke="#4F6BA6" strokeWidth="1.2" />
                  <circle cx="75" cy="75" r="2" fill="#FFFFFF" stroke="#4F6BA6" strokeWidth="1" />
                  <circle cx="75" cy="25" r="2" fill="#FFFFFF" stroke="#4F6BA6" strokeWidth="1" />
                </svg>

                {/* Floating badge */}
                <div className="absolute bottom-3 right-3 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-mono text-[#4F6BA6] border border-[#E5E5EA]/70 shadow-xs flex items-center space-x-1">
                  <span>P4 = 21/56, 35/80</span>
                </div>
              </div>

              {/* Right Inspector skeleton */}
              <div className="col-span-3 flex flex-col space-y-2.5 pt-1">
                <div className="h-4 w-20 rounded bg-[#E5E5EA]" />
                <div className="h-10 rounded-xl bg-[#F5F5F7] p-2 flex items-center justify-between">
                  <div className="h-3 w-12 rounded bg-[#E5E5EA]" />
                  <div className="h-4 w-14 rounded bg-[#E1E8F5]" />
                </div>
                <div className="h-8 rounded-xl bg-[#F5F5F7]" />
                <div className="h-16 rounded-xl bg-[#F5F5F7] p-2 space-y-1.5">
                  <div className="h-2.5 w-16 rounded bg-[#E5E5EA]" />
                  <div className="h-2.5 w-24 rounded bg-[#E5E5EA]/70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-2xl" />
      </div>

      {/* Context & Features Section */}
      <section className="py-32 px-6 flex flex-col items-center">
        <div className="w-full max-w-2xl flex flex-col gap-48">
          {/* Feature 1 */}
          <div data-section-id="feature1" style={getRevealStyle('feature1')} className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F]">
              Computer vision for crease patterns.
            </h2>
            <p className="text-2xl md:text-[28px] font-medium leading-[1.6] text-[#86868B] text-balance">
              Transform raster drawings and photographs into clean, foldable vector geometry with Hough centerline extraction and perspective rectification.
            </p>
          </div>

          {/* Feature 2 */}
          <div data-section-id="feature2" style={getRevealStyle('feature2')} className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F]">
              Exact origami rational fractions.
            </h2>
            <p className="text-2xl md:text-[28px] font-medium leading-[1.6] text-[#86868B] text-balance">
              Never guess coordinates. Inspect continuous fractions, origami powers-of-two, and precise lattice indices without floating-point drift.
            </p>
          </div>

          {/* Feature 3 */}
          <div data-section-id="feature3" style={getRevealStyle('feature3')} className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1D1D1F]">
              Lattice precision from 16 to 128.
            </h2>
            <p className="text-2xl md:text-[28px] font-medium leading-[1.6] text-[#86868B] text-balance">
              Box-pleat support for Satoshi Kamiya standards (grid 56), dense complex models (grid 80), and arbitrary custom divisions with automatic cell-bounded snapping.
            </p>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full flex justify-center px-6">
        <div className="quiet-divider w-full max-w-2xl" />
      </div>

      {/* Workflow / Process Section */}
      <section
        data-section-id="workflow"
        style={getRevealStyle('workflow')}
        className="py-32 px-6 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-4xl flex flex-col items-center space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#4F6BA6] font-semibold">
              The Workflow
            </span>
            <h3 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              From raster sketch to vector craft.
            </h3>
          </div>

          {/* Workflow Sequence */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
            {[
              { step: '01', title: 'Import' },
              { step: '02', title: 'Geometric OCR' },
              { step: '03', title: 'Snap Lattice' },
              { step: '04', title: 'Rational Math' },
              { step: '05', title: 'Vector Export' },
            ].map((item, idx, arr) => (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-white/70 border border-[#E5E5EA]/60 min-w-[130px] shadow-2xs">
                  <span className="text-[10px] font-mono font-medium text-[#86868B]">{item.step}</span>
                  <span className="text-sm font-medium text-[#1D1D1F] mt-0.5">{item.title}</span>
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
        <div className="quiet-divider w-full max-w-2xl" />
      </div>

      {/* Waitlist Form Section */}
      <section
        id="waitlist"
        data-section-id="waitlist"
        style={getRevealStyle('waitlist')}
        className="py-36 px-6 flex flex-col items-center justify-center"
      >
        <div className="w-full max-w-[448px] mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F]">
              Early access for folders.
            </h2>
            <p className="text-base text-[#86868B] font-medium text-balance">
              Join the quiet community of origami designers and crease pattern collectors.
            </p>
          </div>

          {/* Waitlist Form */}
          {!isSubmitted ? (
            <form onSubmit={handleWaitlistSubmit} className="space-y-3">
              {/* Gradient-Border Input */}
              <div className="gradient-border-wrapper rounded-full">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full h-16 rounded-full px-6 bg-white text-base text-[#1D1D1F] placeholder-[#86868B] outline-none border-none font-medium transition duration-300"
                />
              </div>

              {/* Shimmer Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-16 rounded-full text-base font-semibold text-white shimmer-button flex items-center justify-center space-x-2 disabled:opacity-50"
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
            /* Quiet success state with check icon and soft fade */
            <div className="h-32 rounded-3xl bg-white border border-[#E5E5EA]/60 p-6 flex flex-col items-center justify-center space-y-2 shadow-2xs transition-all duration-500">
              <div className="w-8 h-8 rounded-full bg-[#E1E8F5] text-[#4F6BA6] flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-[#1D1D1F]">You’re on the waitlist.</p>
              <p className="text-xs text-[#86868B]">We will notify you quietly when access opens.</p>
            </div>
          )}

          {/* Immediate Studio Launch Link */}
          <div className="pt-4">
            <button
              onClick={onEnterStudio}
              className="text-xs font-medium text-[#86868B] hover:text-[#4F6BA6] transition inline-flex items-center space-x-1"
            >
              <span>Or explore the live interactive studio now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 px-6 border-t border-[#D2D2D7]/30 text-center text-xs text-[#86868B]">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#1D1D1F]">CP Lens</span>
            <span>—</span>
            <span>Quiet Premium Origami CAD</span>
          </div>
          <p>© 2026 CP Lens. Crafted for high-precision crease pattern geometry.</p>
        </div>
      </footer>
    </div>
  );
};
