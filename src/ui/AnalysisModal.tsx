import React from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { useAppStore } from '../store/projectStore';

export const AnalysisModal: React.FC = () => {
  const { isAnalyzing, analysisStep, analysisProgress } = useAppStore();

  if (!isAnalyzing) return null;

  const steps = [
    'Detecting CP region...',
    'Detecting paper boundary...',
    'Rectifying perspective...',
    'Inferring grid lattice...',
    'Detecting crease lines...',
    'Computing intersections...',
    'Recovering reference points...',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="w-[380px] bg-white rounded-2xl shadow-figma-menu border border-neutral-200 p-6 space-y-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-figma-blue flex items-center justify-center">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-900">Geometric Analysis in Progress</h3>
            <p className="text-xs text-neutral-500">Reconstructing CP vector geometry...</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-figma-blue h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
            <span>{analysisStep}</span>
            <span>{analysisProgress}%</span>
          </div>
        </div>

        {/* Step checklist */}
        <div className="space-y-2 py-1 border-t border-neutral-100 pt-3">
          {steps.map((step) => {
            const isCompleted = steps.indexOf(step) < steps.indexOf(analysisStep);
            const isCurrent = step === analysisStep;

            return (
              <div
                key={step}
                className={`flex items-center space-x-2 text-xs transition ${isCompleted
                    ? 'text-emerald-600 font-medium'
                    : isCurrent
                      ? 'text-figma-blue font-medium'
                      : 'text-neutral-300'
                  }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <div
                    className={`w-2 h-2 rounded-full mx-0.5 shrink-0 ${isCurrent ? 'bg-figma-blue animate-ping' : 'bg-neutral-200'
                      }`}
                  />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const AnalysisToast: React.FC = () => {
  const { analysisReport, dismissReport } = useAppStore();

  if (!analysisReport || !analysisReport.visible) return null;

  return (
    <div className="fixed bottom-12 right-6 z-40 max-w-xs w-80 bg-white rounded-xl shadow-figma-menu border border-neutral-200 p-4 animate-slide-up">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-neutral-900">Analysis Complete</span>
        </div>
        <button
          onClick={dismissReport}
          className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-2.5 space-y-1 text-[11px] font-mono text-neutral-600">
        <div className="flex items-center text-emerald-600 font-medium">
          <span className="mr-1.5">✓</span> CP region detected
        </div>
        <div className="flex items-center text-emerald-600 font-medium">
          <span className="mr-1.5">✓</span> Paper boundary detected
        </div>
        <div className="flex items-center text-emerald-600 font-medium">
          <span className="mr-1.5">✓</span> Perspective corrected
        </div>
        <div className="flex items-center text-neutral-700">
          <span className="mr-1.5 text-emerald-500">✓</span> {analysisReport.creaseSegmentsCount} crease segments detected
        </div>
        <div className="flex items-center text-figma-blue font-semibold">
          <span className="mr-1.5">✓</span> Likely base grid: {analysisReport.baseGrid}
        </div>
        <div className="flex items-center text-neutral-700">
          <span className="mr-1.5 text-emerald-500">✓</span> {analysisReport.intersectionsCount} intersections detected
        </div>
        <div className="flex items-center text-neutral-700">
          <span className="mr-1.5 text-emerald-500">✓</span> {analysisReport.referencePointsCount} reference points
        </div>
      </div>
    </div>
  );
};

