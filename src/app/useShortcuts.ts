import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/projectStore';

interface ShortcutOptions {
  onOpenCommandPalette?: () => void;
}

export function useShortcuts(options?: ShortcutOptions) {
  const {
    activeTool,
    setActiveTool,
    toggleSnapping,
    fitToPaper,
    camera,
    setCamera,
    grid,
    setGridConfig,
    undo,
    redo,
    selectedPointId,
    deletePoint,
    selectedCreaseId,
    deleteCrease,
    selectedMeasurementId,
    deleteMeasurement,
    setDrawingMeasurementStart,
    setDrawingCreaseStart,
    selectPoint,
    selectCrease,
    selectMeasurement,
  } = useAppStore(useShallow((state) => ({
    activeTool: state.activeTool,
    setActiveTool: state.setActiveTool,
    toggleSnapping: state.toggleSnapping,
    fitToPaper: state.fitToPaper,
    camera: state.camera,
    setCamera: state.setCamera,
    grid: state.grid,
    setGridConfig: state.setGridConfig,
    undo: state.undo,
    redo: state.redo,
    selectedPointId: state.selectedPointId,
    deletePoint: state.deletePoint,
    selectedCreaseId: state.selectedCreaseId,
    deleteCrease: state.deleteCrease,
    selectedMeasurementId: state.selectedMeasurementId,
    deleteMeasurement: state.deleteMeasurement,
    setDrawingMeasurementStart: state.setDrawingMeasurementStart,
    setDrawingCreaseStart: state.setDrawingCreaseStart,
    selectPoint: state.selectPoint,
    selectCrease: state.selectCrease,
    selectMeasurement: state.selectMeasurement,
  })));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing inside input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Command Palette (Ctrl+K on Windows, Cmd+K on Mac)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        options?.onOpenCommandPalette?.();
        return;
      }

      // Windows Redo: Ctrl+Y
      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Undo / Redo: Ctrl+Z / Ctrl+Shift+Z or Cmd+Z / Cmd+Shift+Z
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Zoom Controls (Ctrl/Cmd + 0, 1, +, -)
      if (isCmdOrCtrl && e.key === '0') {
        e.preventDefault();
        fitToPaper(window.innerWidth - 360, window.innerHeight - 80);
        return;
      }
      if (isCmdOrCtrl && e.key === '1') {
        e.preventDefault();
        setCamera({ zoom: 1 });
        return;
      }
      if (isCmdOrCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setCamera({ zoom: Math.min(64, camera.zoom * 1.25) });
        return;
      }
      if (isCmdOrCtrl && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        setCamera({ zoom: Math.max(0.05, camera.zoom / 1.25) });
        return;
      }

      // If modifier is held, ignore other single key shortcuts
      if (isCmdOrCtrl || e.altKey) return;

      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'p':
          setActiveTool('point');
          break;
        case 'm':
          setActiveTool('measure');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'r':
          setActiveTool('ruler');
          break;
        case 'g':
          setActiveTool('grid');
          break;
        case 's':
          toggleSnapping();
          break;
        case '0':
          fitToPaper(window.innerWidth - 360, window.innerHeight - 80);
          break;
        case '1':
          setCamera({ zoom: 1 });
          break;
        case '[': {
          const nextDiv = Math.max(2, Math.round(grid.divisionsX / 2));
          setGridConfig({ divisionsX: nextDiv, divisionsY: nextDiv });
          break;
        }
        case ']': {
          const nextDiv = Math.min(256, Math.round(grid.divisionsX * 2));
          setGridConfig({ divisionsX: nextDiv, divisionsY: nextDiv });
          break;
        }
        case 'delete':
        case 'backspace':
          if (selectedPointId) deletePoint(selectedPointId);
          else if (selectedCreaseId) deleteCrease(selectedCreaseId);
          else if (selectedMeasurementId) deleteMeasurement(selectedMeasurementId);
          break;
        case 'escape':
          setDrawingMeasurementStart(null);
          setDrawingCreaseStart(null);
          selectPoint(null);
          selectCrease(null);
          selectMeasurement(null);
          setActiveTool('select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTool,
    setActiveTool,
    toggleSnapping,
    fitToPaper,
    camera,
    setCamera,
    grid,
    setGridConfig,
    undo,
    redo,
    selectedPointId,
    deletePoint,
    selectedCreaseId,
    deleteCrease,
    selectedMeasurementId,
    deleteMeasurement,
  ]);
}
