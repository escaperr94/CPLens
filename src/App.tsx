import React, { useEffect, useState, useCallback } from 'react';
import { TopNav } from './ui/TopNav';
import { Toolbar } from './ui/Toolbar';
import { Inspector } from './ui/Inspector';
import { StatusBar } from './ui/StatusBar';
import { CPStage } from './canvas/CPStage';
import { HoverTooltip } from './ui/HoverTooltip';
import { AnalysisModal, AnalysisToast } from './ui/AnalysisModal';
import { CommandPalette } from './ui/CommandPalette';
import { useShortcuts } from './app/useShortcuts';
import { useAppStore } from './store/projectStore';
import { runCPAnalysisPipeline } from './cv/pipeline';
import { createUnitSquareHomography } from './geometry/homography';

export const App: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen((prev) => !prev),
  });

  const {
    image,
    loadImage,
    setGridConfig,
    fitToPaper,
    startAnalysis,
    updateAnalysisProgress,
    finishAnalysis,
  } = useAppStore();

  // Helper to convert Image to HTMLCanvasElement
  const imageToCanvas = (img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
    return canvas;
  };

  // Run automatic analysis pipeline on an image
  const analyzeImage = useCallback(
    async (imgElement: HTMLImageElement) => {
      try {
        startAnalysis('Initializing computer vision engine...');
        const canvas = imageToCanvas(imgElement);

        const result = await runCPAnalysisPipeline(canvas, (step, percent) => {
          updateAnalysisProgress(step, percent);
        });

        // Apply homography rectification to the paper
        const { toNormalized, toImage } = createUnitSquareHomography(result.corners);

        useAppStore.setState((state) => ({
          paper: {
            corners: result.corners,
            rectified: true,
            homography: toNormalized,
            inverseHomography: toImage,
            aspectRatio: 1,
          },
          grid: {
            ...state.grid,
            enabled: true,
            divisionsX: result.gridDivisions,
            divisionsY: result.gridDivisions,
            majorSubdivisions: result.gridDivisions >= 16 ? 8 : 4,
          },
          creases: result.creases,
          points: result.referencePoints,
        }));

        finishAnalysis(result.report);

        setTimeout(() => {
          fitToPaper(window.innerWidth - 360, window.innerHeight - 80);
        }, 100);
      } catch (err) {
        console.error('Analysis error:', err);
        alert('Could not complete automatic analysis. Please try manual calibration.');
      }
    },
    [startAnalysis, updateAnalysisProgress, finishAnalysis, fitToPaper]
  );

  // Trigger analysis for current loaded image
  const handleRunAutoAnalysis = useCallback(() => {
    if (!image.url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = image.url;
    img.onload = () => {
      analyzeImage(img);
    };
  }, [image.url, analyzeImage]);

  // Load and auto-vectorize CP.png
  const handleLoadCP = useCallback(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/CP.png';
    img.onload = () => {
      loadImage('/CP.png', 'CP.png', img.naturalWidth, img.naturalHeight);
      analyzeImage(img);
    };
  }, [loadImage, analyzeImage]);

  // Load Dove 2021
  const handleLoadDove = useCallback(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/Dove.png';
    img.onload = () => {
      loadImage('/Dove.png', 'Dove_2021.png', img.naturalWidth, img.naturalHeight);

      // Left CP rectangle for Dove 2021
      const cpWidth = 468;
      const cpHeight = 468;
      const offsetX = 26;
      const offsetY = 140;

      const corners: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] = [
        { x: offsetX, y: offsetY },
        { x: offsetX + cpWidth, y: offsetY },
        { x: offsetX + cpWidth, y: offsetY + cpHeight },
        { x: offsetX, y: offsetY + cpHeight },
      ];

      const { toNormalized, toImage } = createUnitSquareHomography(corners);

      useAppStore.setState((state) => ({
        paper: {
          corners,
          rectified: true,
          homography: toNormalized,
          inverseHomography: toImage,
          aspectRatio: 1,
        },
        grid: {
          ...state.grid,
          enabled: true,
          divisionsX: 64,
          divisionsY: 64,
          majorSubdivisions: 8,
        },
      }));

      setTimeout(() => {
        fitToPaper(window.innerWidth - 360, window.innerHeight - 80);
      }, 100);
    };
  }, [loadImage, fitToPaper]);

  // Load CP.png automatically on initial mount
  useEffect(() => {
    handleLoadCP();
  }, [handleLoadCP]);

  // Global paste handler: paste any screenshot directly into the app!
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const url = event.target?.result as string;
              const img = new Image();
              img.src = url;
              img.onload = () => {
                loadImage(url, 'Pasted_Screenshot.png', img.naturalWidth, img.naturalHeight);
                analyzeImage(img);
              };
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImage, analyzeImage]);

  // Global drag & drop handler for image files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const img = new Image();
        img.src = url;
        img.onload = () => {
          loadImage(url, file.name, img.naturalWidth, img.naturalHeight);
          analyzeImage(img);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="flex flex-col w-screen h-screen bg-[#F4F5F7] text-neutral-900 overflow-hidden select-none font-sans"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Figma Top Navigation Bar */}
      <TopNav
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onRunAutoAnalysis={handleRunAutoAnalysis}
        onLoadCP={handleLoadCP}
        onLoadDove={handleLoadDove}
      />

      {/* Main Workspace Canvas */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Floating Figma Toolbar */}
        <Toolbar />

        {/* Central CAD Stage */}
        <main className="flex-1 relative h-full">
          <CPStage />
        </main>

        {/* Figma Right Properties Inspector */}
        <Inspector onRunAutoAnalysis={handleRunAutoAnalysis} />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Floating Hover Card for Reference Points */}
      <HoverTooltip />

      {/* Analysis Progress Modal */}
      <AnalysisModal />

      {/* Analysis Results Toast */}
      <AnalysisToast />

      {/* Cmd+K Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRunAnalysis={handleRunAutoAnalysis}
        onLoadCP={handleLoadCP}
        onLoadDove={handleLoadDove}
      />
    </div>
  );
};
