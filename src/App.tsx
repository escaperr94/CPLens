import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TopNav } from './ui/TopNav';
import { LeftSidebar } from './ui/LeftSidebar';
import { Inspector } from './ui/Inspector';
import { CanvasRulers } from './ui/CanvasRulers';
import { FloatingBottomToolbar } from './ui/FloatingBottomToolbar';
import { FoldingModal } from './ui/FoldingModal';
import { CPStage } from './canvas/CPStage';
import { HoverTooltip } from './ui/HoverTooltip';
import { CanvasHUD } from './ui/CanvasHUD';
import { AnalysisModal, AnalysisToast } from './ui/AnalysisModal';
import { CommandPalette } from './ui/CommandPalette';
import { QuietLanding } from './ui/QuietLanding';
import { ToolGuideModal, ToolGuideTabId } from './ui/ToolGuideModal';
import { useShortcuts } from './app/useShortcuts';
import { useAppStore } from './store/projectStore';
import { runCPAnalysisPipeline } from './cv/client';
import { createUnitSquareHomography } from './geometry/homography';

const SCHWARZ_LANTERN_CP = 'https://upload.wikimedia.org/wikipedia/commons/7/71/Schwarz_lantern_crease_pattern.svg';

export const App: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'studio' | 'landing'>('studio');
  const [isToolGuideOpen, setIsToolGuideOpen] = useState(false);
  const [toolGuideTab, setToolGuideTab] = useState<ToolGuideTabId>('crosshairs');
  const [isFoldingModalOpen, setIsFoldingModalOpen] = useState(false);
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
  } = useAppStore(useShallow((state) => ({
    image: state.image,
    loadImage: state.loadImage,
    setGridConfig: state.setGridConfig,
    fitToPaper: state.fitToPaper,
    startAnalysis: state.startAnalysis,
    updateAnalysisProgress: state.updateAnalysisProgress,
    finishAnalysis: state.finishAnalysis,
  })));

  const analysisController=useRef<AbortController|null>(null);
  useEffect(()=>{
    const unsubscribe=useAppStore.subscribe((state,previous)=>{
      if(state.image.url!==previous.image.url){analysisController.current?.abort();useAppStore.setState({isAnalyzing:false,analysisReport:null});}
    });
    return ()=>{unsubscribe();analysisController.current?.abort();};
  },[]);

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
    async (imgElement: HTMLImageElement, silent = false) => {
      const source=useAppStore.getState().image.url;
      if(!source||imgElement.src!==new URL(source,window.location.href).href)return;
      analysisController.current?.abort();
      const controller=new AbortController();analysisController.current=controller;
      try {
        if (!silent) startAnalysis('Initializing computer vision engine...');
        const canvas = imageToCanvas(imgElement);

        const result = await runCPAnalysisPipeline(canvas, (step, percent) => {
          if(!controller.signal.aborted)updateAnalysisProgress(step, percent);
        },controller.signal);
        if(controller.signal.aborted||useAppStore.getState().image.url!==source)return;

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
          layers: { ...state.layers, grid: true, image: true, creases: true },
          viewMode: 'vector',
          creases: result.creases,
          points: result.referencePoints,
        }));

        finishAnalysis(result.report);

        setTimeout(() => {
          fitToPaper(window.innerWidth - 500, window.innerHeight - 110);
        }, 100);
      } catch (err) {
        if(controller.signal.aborted)return;
        useAppStore.setState({ isAnalyzing: false });
        console.error('Analysis error:', err);
        if (!silent) {
          alert('Could not complete automatic analysis. Please try manual calibration.');
        }
      }
    },
    [startAnalysis, updateAnalysisProgress, finishAnalysis, fitToPaper]
  );

  // Trigger analysis for currently selected sheet, selected canvas image, or loaded image
  const handleRunAutoAnalysis = useCallback(() => {
    const state = useAppStore.getState();
    const activeSheet = state.sheets.find((s) => s.id === state.activeSheetId);

    // If an extracted sheet is active and has an imageUrl, analyze that sheet!
    if (activeSheet && activeSheet.imageUrl && activeSheet.id !== 'main_cp') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeSheet.imageUrl;
      img.onload = async () => {
        try {
          state.startAnalysis(`Analyzing ${activeSheet.name}...`);
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 1000;
          canvas.height = img.naturalHeight || img.height || 1000;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
          }

          const result = await runCPAnalysisPipeline(canvas, (step, percent) => {
            state.updateAnalysisProgress(step, percent);
          });

          state.updateSheet(activeSheet.id, {
            creases: result.creases,
            points: result.referencePoints,
            grid: {
              ...activeSheet.grid,
              enabled: true,
              divisionsX: result.gridDivisions,
              divisionsY: result.gridDivisions,
            },
          });
          state.finishAnalysis(result.report);
        } catch (err) {
          useAppStore.setState({ isAnalyzing: false });
          console.error('Sheet analysis error:', err);
        }
      };
      return;
    }

    const selectedImg = state.canvasImages.find((i) => i.id === state.selectedImageId);
    if (selectedImg) {
      state.setReferenceImageFromCropped(selectedImg.url, selectedImg.name, selectedImg.width, selectedImg.height);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = selectedImg.url;
      img.onload = () => {
        analyzeImage(img);
      };
      return;
    }

    if (state.image.url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = state.image.url;
      img.onload = () => {
        analyzeImage(img);
      };
    }
  }, [analyzeImage]);

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
        fitToPaper(window.innerWidth - 540, window.innerHeight - 80);
      }, 100);
    };
  }, [loadImage, fitToPaper]);

  const handleLoadSchwarz = useCallback(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadImage(SCHWARZ_LANTERN_CP, 'Schwarz_lantern_crease_pattern.svg', img.naturalWidth, img.naturalHeight);
      analyzeImage(img);
    };
    img.onerror = () => alert('Could not load the Wikimedia Commons test crease pattern. Check your network connection.');
    img.src = SCHWARZ_LANTERN_CP;
  }, [loadImage, analyzeImage]);

  // Load CP.png automatically on initial mount
  useEffect(() => {
    let cancelled=false;const img=new Image();
    img.onload=()=>{if(cancelled||useAppStore.getState().image.url)return;loadImage('/CP.png','CP.png',img.naturalWidth,img.naturalHeight);analyzeImage(img, true);};
    img.src='/CP.png';
    return ()=>{cancelled=true;};
  }, [loadImage,analyzeImage]);

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
              img.onload = () => {
                const store = useAppStore.getState();
                if (!store.image.url) {
                  store.loadImage(url, 'Pasted_Screenshot.png', img.naturalWidth, img.naturalHeight);
                } else {
                  const paperPos = store.paperPosition;
                  const allRightEdges = [
                    paperPos.x + 1000,
                    ...store.sheets.map((s) => s.x + s.width),
                    ...store.canvasImages.map((i) => i.x + i.width),
                  ];
                  const newX = Math.max(...allRightEdges) + 80;
                  const newId = store.addCanvasImage({
                    url,
                    name: `Pasted_${Date.now().toString().slice(-4)}.png`,
                    x: newX,
                    y: paperPos.y,
                    width: Math.min(img.naturalWidth || 800, 1000),
                    height: Math.min(img.naturalHeight || 800, 1000),
                  });
                  store.selectCanvasImage(newId);
                  store.setActiveSheetId(null);
                }
              };
              img.src = url;
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
        img.onload = () => {
          const store = useAppStore.getState();
          if (!store.image.url) {
            store.loadImage(url, file.name, img.naturalWidth, img.naturalHeight);
          } else {
            const paperPos = store.paperPosition;
            const allRightEdges = [
              paperPos.x + 1000,
              ...store.sheets.map((s) => s.x + s.width),
              ...store.canvasImages.map((i) => i.x + i.width),
            ];
            const newX = Math.max(...allRightEdges) + 80;
            const newId = store.addCanvasImage({
              url,
              name: file.name,
              x: newX,
              y: paperPos.y,
              width: Math.min(img.naturalWidth || 800, 1000),
              height: Math.min(img.naturalHeight || 800, 1000),
            });
            store.selectCanvasImage(newId);
            store.setActiveSheetId(null);
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  if (currentView === 'landing') {
    return <QuietLanding onEnterStudio={() => setCurrentView('studio')} />;
  }

  return (
    <div
      className="flex flex-col w-screen h-screen bg-[#FAFAFA] text-[#1D1D1F] overflow-hidden select-none font-sans"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Quiet Premium Top Navigation Bar */}
      <TopNav
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onRunAutoAnalysis={handleRunAutoAnalysis}
        onLoadCP={handleLoadCP}
        onLoadDove={handleLoadDove}
        onLoadSchwarz={handleLoadSchwarz}
        onOpenLanding={() => setCurrentView('landing')}
        onOpenToolGuide={() => setIsToolGuideOpen(true)}
      />
      {/* Main Workspace Layout: 3 Columns (LeftSidebar 240px | Center Stage with Rulers | Inspector Right) */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Docked Left Sidebar */}
        <LeftSidebar
          onLoadCP={handleLoadCP}
          onLoadDove={handleLoadDove}
          onLoadSchwarz={handleLoadSchwarz}
          onOpenToolGuide={() => setIsToolGuideOpen(true)}
        />

        {/* Central CAD Stage with Canvas Rulers & Floating Status Pill */}
        <main className="flex-1 min-w-0 relative h-full bg-[#F7F7F7] overflow-hidden">
          {/* Top & Left Rulers */}
          <CanvasRulers />

          {/* Stage offset by 20px top and left */}
          <div className="absolute top-[20px] left-[20px] right-0 bottom-0 overflow-hidden">
            <CPStage />
          </div>

          {/* Unified Figma Floating Bottom Toolbar */}
          <FloatingBottomToolbar
            onOpenFoldingSequences={() => setIsFoldingModalOpen(true)}
            onOpenToolGuide={() => setIsToolGuideOpen(true)}
            onRunAutoAnalysis={handleRunAutoAnalysis}
          />

          {/* Floating Help Button (?) at bottom right matching Figma */}
          <button
            type="button"
            onClick={() => setIsToolGuideOpen(true)}
            className="absolute bottom-5 right-5 z-20 w-8 h-8 rounded-full bg-white border border-[#E5E5E5] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 font-semibold text-sm cursor-pointer transition-colors"
            title="Origami Tool Guide & Shortcuts (?)"
          >
            ?
          </button>
        </main>

        {/* Figma Right Properties Inspector */}
        <Inspector onRunAutoAnalysis={handleRunAutoAnalysis} />
      </div>
      {/* Floating Hover Card for Reference Points */}
      <HoverTooltip />

      {/* Analysis Progress Modal */}
      <AnalysisModal />


      {/* Cmd+K Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRunAnalysis={handleRunAutoAnalysis}
        onLoadCP={handleLoadCP}
        onLoadDove={handleLoadDove}
        onLoadSchwarz={handleLoadSchwarz}
        onOpenLanding={() => setCurrentView('landing')}
      />

      {/* Origami CAD Tool Guide Modal */}
      <ToolGuideModal
        isOpen={isToolGuideOpen}
        onClose={() => setIsToolGuideOpen(false)}
        initialTab={toolGuideTab}
      />
      {/* Origami Folding Sequences Step-by-Step Solver Modal */}
      <FoldingModal
        isOpen={isFoldingModalOpen}
        onClose={() => setIsFoldingModalOpen(false)}
      />
    </div>
  );
};
