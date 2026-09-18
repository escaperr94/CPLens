import { create } from 'zustand';
import { Point2D } from '../geometry/point';
import { CreaseType } from '../geometry/line';
import { DEFAULT_GRID_CONFIG, GridConfig } from '../geometry/grid';
import { IDENTITY_HOMOGRAPHY, createUnitSquareHomography, Matrix3x3 } from '../geometry/homography';
import { SnapCandidate, DEFAULT_SNAP_OPTIONS, SnapOptions } from '../geometry/snapping';
import {
  ProjectState,
  ToolType,
  ReferencePoint,
  CreaseLine,
  MeasurementItem,
  RulerItem,
  CropBox,
  CameraState,
  LayerVisibility,
  AnalysisReport,
  CPViewMode,
  CPSheet,
  CanvasImage,
  ImageTransform,
  SheetInsets,
} from './types';

export interface UIState {
  activeTool: ToolType;
  creaseType: CreaseType;
  selectedPointId: string | null;
  selectedCreaseId: string | null;
  selectedMeasurementId: string | null;
  hoveredPoint: ReferencePoint | null;
  cursorPaper: Point2D | null;
  cursorScreen: Point2D | null;
  targetPoint: Point2D | null;
  snapCandidate: SnapCandidate | null;
  snappingEnabled: boolean;
  snapOptions: SnapOptions;
  loupe: {
    active: boolean;
    zoom: number;
    sizePx: number;
  };
  camera: CameraState;
  // Calibration in progress points
  calibrationCorners: Point2D[];
  // Temporary drawing states
  drawingMeasurementStart: Point2D | null;
  drawingCreaseStart: Point2D | null;
  // View mode (Vector CP / Orihime style vs Overlay vs Image)
  viewMode: CPViewMode;
  imageOpacity: number;
  // Automatic pipeline states
  isAnalyzing: boolean;
  analysisStep: string;
  analysisProgress: number;
  analysisReport: AnalysisReport | null;
  cropBox: CropBox | null;
  selectedImageId: string | null;
  paperPosition: Point2D;
  imageTransform: ImageTransform;
  paperInsets: SheetInsets;
}

export interface AppSnapshot extends ProjectState {
  paperInsets: SheetInsets;
  imageTransform: ImageTransform;
  paperPosition: Point2D;
}

export interface AppStore extends ProjectState, UIState {
  // History
  past: AppSnapshot[];
  future: AppSnapshot[];
  // Actions
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // View mode
  setViewMode: (mode: CPViewMode) => void;
  setImageOpacity: (opacity: number) => void;

  // Analysis pipeline
  startAnalysis: (step: string) => void;
  updateAnalysisProgress: (step: string, progress: number) => void;
  finishAnalysis: (report: AnalysisReport) => void;
  dismissReport: () => void;
  setHoveredPoint: (p: ReferencePoint | null) => void;

  // Image & calibration
  loadImage: (url: string, fileName: string, width: number, height: number) => void;
  setCrop: (crop: CropBox | null) => void;
  setCalibrationCorner: (corner: Point2D) => void;
  completeCalibration: () => void;
  resetCalibration: () => void;

  // Grid
  setGridConfig: (patch: Partial<GridConfig>) => void;

  // Reference points
  addPoint: (point: Omit<ReferencePoint, 'id'>) => void;
  updatePoint: (id: string, patch: Partial<ReferencePoint>) => void;
  deletePoint: (id: string) => void;
  selectPoint: (id: string | null) => void;

  // Creases
  addCrease: (crease: Omit<CreaseLine, 'id'>) => void;
  updateCrease: (id: string, patch: Partial<CreaseLine>) => void;
  deleteCrease: (id: string) => void;
  selectCrease: (id: string | null) => void;

  // Measurements
  addMeasurement: (m: Omit<MeasurementItem, 'id'>) => void;
  updateMeasurement: (id: string, patch: Partial<MeasurementItem>) => void;
  deleteMeasurement: (id: string) => void;
  selectMeasurement: (id: string | null) => void;

  // Rulers
  addRuler: (p: Point2D, orientation?: 'both' | 'horizontal' | 'vertical') => void;
  deleteRuler: (id: string) => void;
  clearRulers: () => void;

  // Symmetry
  toggleSymmetry: () => void;

  // UI & Camera
  setActiveTool: (tool: ToolType) => void;
  setCreaseType: (type: CreaseType) => void;
  setCamera: (patch: Partial<CameraState>) => void;
  zoomAroundPoint: (zoomFactor: number, screenPoint: Point2D) => void;
  fitToPaper: (viewportWidth: number, viewportHeight: number) => void;
  setCursor: (paper: Point2D | null, screen: Point2D | null) => void;
  setTargetPoint: (point: Point2D | null) => void;
  setSnapCandidate: (snap: SnapCandidate | null) => void;
  toggleSnapping: () => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
  setLoupeActive: (active: boolean) => void;

  // Temporary tool interactions
  setDrawingMeasurementStart: (p: Point2D | null) => void;
  setDrawingCreaseStart: (p: Point2D | null) => void;

  // Multi-CP Sheets & Canvas Images
  sheets: CPSheet[];
  activeSheetId: string | null;
  canvasImages: CanvasImage[];
  setCropBox: (box: CropBox | null) => void;
  addSheet: (sheet: Partial<CPSheet>) => string;
  setActiveSheetId: (id: string | null) => void;
  removeSheet: (id: string) => void;
  addCanvasImage: (img: Omit<CanvasImage, 'id'>) => string;
  removeCanvasImage: (id: string) => void;
  updateCanvasImagePosition: (id: string, x: number, y: number) => void;
  updateCanvasImage: (id: string, patch: Partial<CanvasImage>) => void;
  selectCanvasImage: (id: string | null) => void;
  setReferenceImageFromCropped: (url: string, name?: string, width?: number, height?: number) => void;
  extractCPFromImage: (imageId: string, box: CropBox) => string;
  setPaperPosition: (pos: Point2D) => void;
  updateSheetPosition: (id: string, x: number, y: number) => void;
  updateSheet: (id: string, patch: Partial<CPSheet>) => void;
  updateImageTransform: (patch: Partial<ImageTransform>) => void;
  resetImageTransform: () => void;
  setPaperInsets: (insets: Partial<SheetInsets>) => void;
  updateSheetInsets: (sheetId: string, insets: Partial<SheetInsets>) => void;
  autoTrimBoundary: (sheetId?: string | null) => void;
  getProjectData: () => ProjectState;
  loadProjectData: (data: ProjectState) => void;
}

const DEFAULT_LAYERS: LayerVisibility = {
  image: true,
  grid: false,
  creases: true,
  boundary: true,
  intersections: false,
  points: false,
  measurements: true,
  rulers: true,
  symmetry: true,
};

function getSnapshot(state: AppStore): AppSnapshot {
  return {
    version: 1,
    image: { ...state.image },
    paper: { ...state.paper, corners: [...state.paper.corners] as unknown as [Point2D, Point2D, Point2D, Point2D] },
    grid: { ...state.grid },
    points: [...state.points],
    creases: [...state.creases],
    measurements: [...state.measurements],
    rulers: [...state.rulers],
    symmetry: {
      enabled: state.symmetry.enabled,
      axes: [...state.symmetry.axes],
    },
    layers: { ...state.layers },
    sheets: state.sheets.map((s) => ({
      ...s,
      paper: { ...s.paper, corners: [...s.paper.corners] as unknown as [Point2D, Point2D, Point2D, Point2D] },
      grid: { ...s.grid },
      points: [...s.points],
      creases: [...s.creases],
      measurements: s.measurements ? [...s.measurements] : [],
      rulers: s.rulers ? [...s.rulers] : [],
      insets: s.insets ? { ...s.insets } : undefined,
      transform: s.transform ? { ...s.transform } : undefined,
    })),
    activeSheetId: state.activeSheetId,
    canvasImages: state.canvasImages.map((img) => ({ ...img })),
    paperInsets: { ...(state.paperInsets || { top: 0, right: 0, bottom: 0, left: 0 }) },
    imageTransform: { ...state.imageTransform },
    paperPosition: { ...state.paperPosition },
  };
}

export const useAppStore = create<AppStore>((set, get) => ({
  version: 1,
  image: {
    url: null,
    fileName: '',
    width: 0,
    height: 0,
    crop: null,
  },
  paper: {
    corners: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    rectified: false,
    homography: IDENTITY_HOMOGRAPHY,
    inverseHomography: IDENTITY_HOMOGRAPHY,
    aspectRatio: 1,
  },
  grid: DEFAULT_GRID_CONFIG,
  points: [],
  creases: [],
  measurements: [],
  rulers: [],
  symmetry: {
    enabled: true,
    axes: [
      {
        id: 'sym_center_v',
        type: 'vertical',
        p1: { x: 0.5, y: 0 },
        p2: { x: 0.5, y: 1 },
        active: false,
      },
      {
        id: 'sym_center_h',
        type: 'horizontal',
        p1: { x: 0, y: 0.5 },
        p2: { x: 1, y: 0.5 },
        active: false,
      },
    ],
  },
  layers: DEFAULT_LAYERS,

  // UI state
  activeTool: 'select',
  creaseType: 'mountain',
  selectedPointId: null,
  selectedCreaseId: null,
  selectedMeasurementId: null,
  hoveredPoint: null,
  cursorPaper: null,
  cursorScreen: null,
  targetPoint: null,
  snapCandidate: null,
  snappingEnabled: true,
  snapOptions: DEFAULT_SNAP_OPTIONS,
  loupe: {
    active: false,
    zoom: 8,
    sizePx: 160,
  },
  camera: {
    zoom: 1,
    panX: 0,
    panY: 0,
    pixelated: false,
  },
  calibrationCorners: [],
  drawingMeasurementStart: null,
  drawingCreaseStart: null,
  viewMode: 'vector',
  imageOpacity: 0.85,
  isAnalyzing: false,
  analysisStep: '',
  analysisProgress: 0,
  analysisReport: null,
  sheets: [],
  activeSheetId: null,
  canvasImages: [],
  selectedImageId: null,
  cropBox: null,
  paperPosition: { x: 0, y: 0 },
  imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
  paperInsets: { top: 0, right: 0, bottom: 0, left: 0 },

  past: [],
  future: [],

  setViewMode: (mode) => set({ viewMode: mode }),
  setImageOpacity: (opacity) => set({ imageOpacity: opacity }),

  startAnalysis: (step) => {
    set({ isAnalyzing: true, analysisStep: step, analysisProgress: 10 });
  },

  updateAnalysisProgress: (step, progress) => {
    set({ analysisStep: step, analysisProgress: progress });
  },

  finishAnalysis: (report) => {
    set({ isAnalyzing: false, analysisProgress: 100, analysisReport: report });
  },

  dismissReport: () => {
    set((state) => ({
      analysisReport: state.analysisReport ? { ...state.analysisReport, visible: false } : null,
    }));
  },

  setHoveredPoint: (p) => set({ hoveredPoint: p }),

  pushHistory: () => {
    const snap = getSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-30), snap],
      future: [],
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const currentSnap = getSnapshot(get());

    set({
      ...previous,
      sheets: previous.sheets ? previous.sheets.map((s) => ({ ...s })) : [],
      canvasImages: previous.canvasImages ? previous.canvasImages.map((img) => ({ ...img })) : [],
      activeSheetId: previous.activeSheetId ?? null,
      paperInsets: previous.paperInsets ? { ...previous.paperInsets } : { top: 0, right: 0, bottom: 0, left: 0 },
      imageTransform: previous.imageTransform ? { ...previous.imageTransform } : { scale: 1, offsetX: 0, offsetY: 0 },
      paperPosition: previous.paperPosition ? { ...previous.paperPosition } : { x: 0, y: 0 },
      past: past.slice(0, -1),
      future: [currentSnap, ...future],
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const currentSnap = getSnapshot(get());

    set({
      ...next,
      sheets: next.sheets ? next.sheets.map((s) => ({ ...s })) : [],
      canvasImages: next.canvasImages ? next.canvasImages.map((img) => ({ ...img })) : [],
      activeSheetId: next.activeSheetId ?? null,
      paperInsets: next.paperInsets ? { ...next.paperInsets } : { top: 0, right: 0, bottom: 0, left: 0 },
      imageTransform: next.imageTransform ? { ...next.imageTransform } : { scale: 1, offsetX: 0, offsetY: 0 },
      paperPosition: next.paperPosition ? { ...next.paperPosition } : { x: 0, y: 0 },
      past: [...past, currentSnap],
      future: future.slice(1),
    });
  },

  loadImage: (url, fileName, width, height) => {
    get().pushHistory();
    // Default paper corners to full image dimensions
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];
    const { toNormalized, toImage } = createUnitSquareHomography(corners);

    set({
      image: {
        url,
        fileName,
        width,
        height,
        crop: null,
      },
      paper: {
        corners,
        rectified: false,
        homography: toNormalized,
        inverseHomography: toImage,
        aspectRatio: width / (height || 1),
      },
      layers: {
        ...get().layers,
        image: true,
      },
      points: [],
      creases: [],
      measurements: [],
      rulers: [],
    });
  },

  setCrop: (crop) => {
    get().pushHistory();
    set((state) => ({
      image: { ...state.image, crop },
    }));
  },

  setCalibrationCorner: (corner) => {
    const current = get().calibrationCorners;
    if (current.length < 3) {
      set({ calibrationCorners: [...current, corner] });
    } else if (current.length === 3) {
      // 4th corner completes the quadrilateral
      const allCorners: [Point2D, Point2D, Point2D, Point2D] = [
        current[0],
        current[1],
        current[2],
        corner,
      ];
      get().pushHistory();
      const { toNormalized, toImage } = createUnitSquareHomography(allCorners);
      set({
        paper: {
          corners: allCorners,
          rectified: true,
          homography: toNormalized,
          inverseHomography: toImage,
          aspectRatio: 1,
        },
        calibrationCorners: [],
        activeTool: 'select',
      });
    }
  },

  completeCalibration: () => {
    const { calibrationCorners } = get();
    if (calibrationCorners.length === 4) {
      const corners = calibrationCorners as [Point2D, Point2D, Point2D, Point2D];
      get().pushHistory();
      const { toNormalized, toImage } = createUnitSquareHomography(corners);
      set({
        paper: {
          corners,
          rectified: true,
          homography: toNormalized,
          inverseHomography: toImage,
          aspectRatio: 1,
        },
        calibrationCorners: [],
        activeTool: 'select',
      });
    }
  },

  resetCalibration: () => {
    get().pushHistory();
    const { width, height } = get().image;
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0, y: 0 },
      { x: width || 1000, y: 0 },
      { x: width || 1000, y: height || 1000 },
      { x: 0, y: height || 1000 },
    ];
    const { toNormalized, toImage } = createUnitSquareHomography(corners);
    set({
      paper: {
        corners,
        rectified: false,
        homography: toNormalized,
        inverseHomography: toImage,
        aspectRatio: width / (height || 1) || 1,
      },
      calibrationCorners: [],
    });
  },

  setGridConfig: (patch) => {
    const actId = get().activeSheetId;
    set((state) => ({
      grid: { ...state.grid, ...patch },
      sheets: actId && actId !== 'main_cp'
        ? state.sheets.map((s) => (s.id === actId ? { ...s, grid: { ...s.grid, ...patch } } : s))
        : state.sheets,
    }));
  },

  addPoint: (point) => {
    get().pushHistory();
    const newPoint: ReferencePoint = {
      ...point,
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const actId = get().activeSheetId;
    set((state) => ({
      points: [...state.points, newPoint],
      selectedPointId: newPoint.id,
      sheets: actId && actId !== 'main_cp'
        ? state.sheets.map((s) => (s.id === actId ? { ...s, points: [...s.points, newPoint] } : s))
        : state.sheets,
    }));
  },

  updatePoint: (id, patch) => {
    get().pushHistory();
    const actId = get().activeSheetId;
    set((state) => {
      const nextPoints = state.points.map((p) => (p.id === id ? { ...p, ...patch } : p));
      return {
        points: nextPoints,
        sheets: actId && actId !== 'main_cp'
          ? state.sheets.map((s) => (s.id === actId ? { ...s, points: nextPoints } : s))
          : state.sheets,
      };
    });
  },

  deletePoint: (id) => {
    get().pushHistory();
    const actId = get().activeSheetId;
    set((state) => {
      const nextPoints = state.points.filter((p) => p.id !== id);
      return {
        points: nextPoints,
        selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
        sheets: actId && actId !== 'main_cp'
          ? state.sheets.map((s) => (s.id === actId ? { ...s, points: nextPoints } : s))
          : state.sheets,
      };
    });
  },

  selectPoint: (id) => set({ selectedPointId: id }),

  addCrease: (crease) => {
    get().pushHistory();
    const newCrease: CreaseLine = {
      ...crease,
      id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const actId = get().activeSheetId;
    set((state) => ({
      creases: [...state.creases, newCrease],
      selectedCreaseId: newCrease.id,
      sheets: actId && actId !== 'main_cp'
        ? state.sheets.map((s) => (s.id === actId ? { ...s, creases: [...s.creases, newCrease] } : s))
        : state.sheets,
    }));
  },

  updateCrease: (id, patch) => {
    get().pushHistory();
    const actId = get().activeSheetId;
    set((state) => {
      const nextCreases = state.creases.map((c) => (c.id === id ? { ...c, ...patch } : c));
      return {
        creases: nextCreases,
        sheets: actId && actId !== 'main_cp'
          ? state.sheets.map((s) => (s.id === actId ? { ...s, creases: nextCreases } : s))
          : state.sheets,
      };
    });
  },

  deleteCrease: (id) => {
    get().pushHistory();
    const actId = get().activeSheetId;
    set((state) => {
      const nextCreases = state.creases.filter((c) => c.id !== id);
      return {
        creases: nextCreases,
        selectedCreaseId: state.selectedCreaseId === id ? null : state.selectedCreaseId,
        sheets: actId && actId !== 'main_cp'
          ? state.sheets.map((s) => (s.id === actId ? { ...s, creases: nextCreases } : s))
          : state.sheets,
      };
    });
  },

  selectCrease: (id) => set({ selectedCreaseId: id }),

  addMeasurement: (m) => {
    get().pushHistory();
    const newM: MeasurementItem = {
      ...m,
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => ({
      measurements: [...state.measurements, newM],
      selectedMeasurementId: newM.id,
    }));
  },

  updateMeasurement: (id, patch) => {
    get().pushHistory();
    set((state) => ({
      measurements: state.measurements.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  },

  deleteMeasurement: (id) => {
    get().pushHistory();
    set((state) => ({
      measurements: state.measurements.filter((m) => m.id !== id),
      selectedMeasurementId: state.selectedMeasurementId === id ? null : state.selectedMeasurementId,
    }));
  },

  selectMeasurement: (id) => set({ selectedMeasurementId: id }),

  addRuler: (point, orientation = 'both') => {
    get().pushHistory();
    const newRuler: RulerItem = {
      id: `ruler_${Date.now()}`,
      point,
      orientation,
    };
    set((state) => ({
      rulers: [...state.rulers, newRuler],
    }));
  },

  deleteRuler: (id) => {
    get().pushHistory();
    set((state) => ({
      rulers: state.rulers.filter((r) => r.id !== id),
    }));
  },

  clearRulers: () => {
    get().pushHistory();
    set({ rulers: [] });
  },

  toggleSymmetry: () => {
    set((state) => ({
      symmetry: {
        ...state.symmetry,
        enabled: !state.symmetry.enabled,
      },
    }));
  },

  setActiveTool: (tool) => {
    set({
      activeTool: tool,
      drawingMeasurementStart: null,
      drawingCreaseStart: null,
    });
  },

  setCreaseType: (type) => set({ creaseType: type }),

  setCamera: (patch) => {
    set((state) => ({
      camera: { ...state.camera, ...patch },
      snapOptions: {
        ...state.snapOptions,
        zoom: patch.zoom !== undefined ? patch.zoom : state.camera.zoom,
      },
    }));
  },

  zoomAroundPoint: (factor, screenPoint) => {
    const { camera } = get();
    const newZoom = Math.max(0.05, Math.min(64.0, camera.zoom * factor));
    if (newZoom === camera.zoom) return;

    // Zoom centered at cursor:
    // (screenPoint - newPan) / newZoom = (screenPoint - oldPan) / oldZoom
    // newPan = screenPoint - (screenPoint - oldPan) * (newZoom / oldZoom)
    const scaleRatio = newZoom / camera.zoom;
    const newPanX = screenPoint.x - (screenPoint.x - camera.panX) * scaleRatio;
    const newPanY = screenPoint.y - (screenPoint.y - camera.panY) * scaleRatio;

    set({
      camera: {
        ...camera,
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY,
      },
      snapOptions: {
        ...get().snapOptions,
        zoom: newZoom,
      },
    });
  },

  fitToPaper: (viewportWidth, viewportHeight) => {
    const padding = 40;
    const availableW = viewportWidth - padding * 2;
    const availableH = viewportHeight - padding * 2;

    const paperAspect = get().paper.aspectRatio || 1;
    let paperW = 1000;
    let paperH = 1000 / paperAspect;

    const scaleW = availableW / paperW;
    const scaleH = availableH / paperH;
    const fitZoom = Math.min(scaleW, scaleH);

    const panX = (viewportWidth - paperW * fitZoom) / 2;
    const panY = (viewportHeight - paperH * fitZoom) / 2;

    set({
      camera: {
        zoom: fitZoom,
        panX,
        panY,
        pixelated: get().camera.pixelated,
      },
      snapOptions: {
        ...get().snapOptions,
        zoom: fitZoom,
      },
    });
  },

  setCursor: (paper, screen) => set((state) => {
    const prev = state.cursorScreen;
    if (prev && screen && Math.hypot(prev.x - screen.x, prev.y - screen.y) < 0.15) return state;
    if (!prev && !screen && !paper && !state.cursorPaper) return state;
    return { cursorPaper: paper, cursorScreen: screen };
  }),

  setTargetPoint: (point) => set({ targetPoint: point }),

  setSnapCandidate: (snap) => set((state) => {
    const prev = state.snapCandidate;
    if (!prev && !snap) return state;
    if (prev && snap && prev.kind === snap.kind && prev.sourceId === snap.sourceId &&
      Math.hypot(prev.point.x - snap.point.x, prev.point.y - snap.point.y) < 1e-5) return state;
    return { snapCandidate: snap };
  }),

  toggleSnapping: () => set((state) => ({ snappingEnabled: !state.snappingEnabled })),

  setLayerVisibility: (layer, visible) => {
    const actId = get().activeSheetId;
    set((state) => {
      const nextLayers = { ...state.layers, [layer]: visible };
      const nextGrid = layer === 'grid' ? { ...state.grid, enabled: visible } : state.grid;
      return {
        layers: nextLayers,
        grid: nextGrid,
        sheets: actId && actId !== 'main_cp' && layer === 'grid'
          ? state.sheets.map((s) => (s.id === actId ? { ...s, grid: { ...s.grid, enabled: visible } } : s))
          : state.sheets,
      };
    });
  },

  setLoupeActive: (active) => {
    set((state) => ({
      loupe: { ...state.loupe, active },
    }));
  },

  setDrawingMeasurementStart: (p) => set({ drawingMeasurementStart: p }),
  setDrawingCreaseStart: (p) => set({ drawingCreaseStart: p }),

  getProjectData: () => getSnapshot(get()),

  loadProjectData: (data) => {
    get().pushHistory();
    set({
      ...data,
      selectedPointId: null,
      selectedCreaseId: null,
      selectedMeasurementId: null,
    });
  },
  setCropBox: (box) => set({ cropBox: box }),
  setActiveSheetId: (id) => {
    const prevId = get().activeSheetId;
    const sheets = get().sheets;

    let updatedSheets = sheets;
    if (prevId && prevId !== 'main_cp' && prevId !== id) {
      updatedSheets = updatedSheets.map((s) => {
        if (s.id === prevId) {
          return {
            ...s,
            grid: get().grid,
            creases: get().creases,
            points: get().points,
            paper: get().paper,
            measurements: get().measurements,
            rulers: get().rulers,
            viewMode: get().viewMode,
            transform: get().imageTransform,
          };
        }
        return s;
      });
    }

    if (id && id !== 'main_cp') {
      const targetSheet = updatedSheets.find((s) => s.id === id);
      if (targetSheet) {
        set({
          activeSheetId: id,
          selectedImageId: null,
          sheets: updatedSheets,
          grid: { ...targetSheet.grid, enabled: targetSheet.grid.enabled ?? true },
          creases: targetSheet.creases,
          points: targetSheet.points,
          paper: targetSheet.paper,
          measurements: targetSheet.measurements,
          rulers: targetSheet.rulers,
          viewMode: targetSheet.viewMode,
          imageTransform: targetSheet.transform || { scale: 1, offsetX: 0, offsetY: 0 },
          selectedCreaseId: null,
          selectedPointId: null,
          selectedMeasurementId: null,
          layers: {
            ...get().layers,
            grid: targetSheet.grid.enabled ?? true,
          },
        });
        return;
      }
    }

    set({
      activeSheetId: null,
      sheets: updatedSheets,
      imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      selectedCreaseId: null,
      selectedPointId: null,
      selectedMeasurementId: null,
    });
  },
  updateImageTransform: (patch) => {
    const actId = get().activeSheetId;
    set((state) => {
      const nextTransform = { ...state.imageTransform, ...patch };
      return {
        imageTransform: nextTransform,
        sheets: actId && actId !== 'main_cp'
          ? state.sheets.map((s) => (s.id === actId ? { ...s, transform: nextTransform } : s))
          : state.sheets,
      };
    });
  },
  resetImageTransform: () => {
    const actId = get().activeSheetId;
    const defaultTransform = { scale: 1, offsetX: 0, offsetY: 0 };
    set((state) => ({
      imageTransform: defaultTransform,
      sheets: actId && actId !== 'main_cp'
        ? state.sheets.map((s) => (s.id === actId ? { ...s, transform: defaultTransform } : s))
        : state.sheets,
    }));
  },
  selectCanvasImage: (id) => set((state) => ({ selectedImageId: id, activeSheetId: id ? null : state.activeSheetId })),
  addCanvasImage: (img) => {
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newImage: CanvasImage = { ...img, id };
    set((state) => ({
      canvasImages: [...state.canvasImages, newImage],
      selectedImageId: id,
    }));
    return id;
  },
  removeCanvasImage: (id) => {
    set((state) => ({
      canvasImages: state.canvasImages.filter((i) => i.id !== id),
      selectedImageId: state.selectedImageId === id ? null : state.selectedImageId,
    }));
  },
  updateCanvasImagePosition: (id, x, y) => {
    set((state) => ({
      canvasImages: state.canvasImages.map((i) => (i.id === id ? { ...i, x, y } : i)),
    }));
  },
  updateCanvasImage: (id, patch) => {
    set((state) => ({
      canvasImages: state.canvasImages.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  },
  setReferenceImageFromCropped: (url, name, width, height) => {
    get().pushHistory();
    const w = width || 1000;
    const h = height || 1000;
    const corners: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];
    const { toNormalized, toImage } = createUnitSquareHomography(corners);
    set((state) => ({
      image: {
        url,
        fileName: name || 'Cropped_CP.png',
        width: w,
        height: h,
        crop: null,
      },
      paper: {
        corners,
        rectified: true,
        homography: toNormalized,
        inverseHomography: toImage,
        aspectRatio: w / (h || 1),
      },
      imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      layers: {
        ...state.layers,
        image: true,
        boundary: true,
        grid: true,
      },
      grid: {
        ...state.grid,
        enabled: true,
      },
      activeSheetId: null,
      selectedImageId: null,
      cropBox: null,
      creases: [],
      points: [],
      measurements: [],
      rulers: [],
    }));
  },
  setPaperPosition: (pos) => set({ paperPosition: pos }),
  updateSheetPosition: (id, x, y) => {
    set((state) => ({
      sheets: state.sheets.map((s) => (s.id === id ? { ...s, x, y } : s)),
    }));
  },
  updateSheet: (id, patch) => {
    set((state) => ({
      sheets: state.sheets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  },
  setPaperInsets: (patch) => {
    set((state) => ({
      paperInsets: {
        top: patch.top ?? state.paperInsets.top,
        right: patch.right ?? state.paperInsets.right,
        bottom: patch.bottom ?? state.paperInsets.bottom,
        left: patch.left ?? state.paperInsets.left,
      },
    }));
  },
  updateSheetInsets: (sheetId, patch) => {
    set((state) => ({
      sheets: state.sheets.map((s) =>
        s.id === sheetId
          ? { ...s, insets: { ...(s.insets || { top: 0, right: 0, bottom: 0, left: 0 }), ...patch } }
          : s
      ),
    }));
  },
  autoTrimBoundary: async (sheetId) => {
    const targetSheetId = sheetId ?? get().activeSheetId;
    let imgUrl: string | undefined | null;
    let targetW = 1000;
    let targetH = 1000;

    if (targetSheetId && targetSheetId !== 'main_cp') {
      const sheet = get().sheets.find((s) => s.id === targetSheetId);
      if (sheet && sheet.imageUrl) {
        imgUrl = sheet.imageUrl;
        targetW = sheet.width;
        targetH = sheet.height;
      }
    } else {
      imgUrl = get().image.url;
      targetW = get().image.width || 1000;
      targetH = get().image.height || 1000;
    }

    if (!imgUrl) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      await new Promise<void>((res, rej) => {
        if (img.complete && img.naturalWidth > 0) return res();
        img.onload = () => res();
        img.onerror = rej;
      });

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (nw < 20 || nh < 20) return;

      const canvas = document.createElement('canvas');
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, nw, nh);
      const data = imgData.data;

      // Conservative search: only trim whitespace/empty margins, capped at max 12% of dimension (max 60px)
      const maxScanY = Math.min(60, Math.floor(nh * 0.12));
      const maxScanX = Math.min(60, Math.floor(nw * 0.12));

      // Scan rows from top
      let topY = 0;
      for (let y = 0; y < maxScanY; y++) {
        let ink = 0;
        for (let x = 0; x < nw; x++) {
          const idx = (y * nw + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a > 50 && (r < 220 || g < 220 || b < 220)) ink++;
        }
        if (ink < Math.max(3, nw * 0.025)) {
          topY = y + 1;
        } else {
          break;
        }
      }

      // Scan rows from bottom
      let bottomY = 0;
      for (let y = nh - 1; y >= nh - 1 - maxScanY; y--) {
        let ink = 0;
        for (let x = 0; x < nw; x++) {
          const idx = (y * nw + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a > 50 && (r < 220 || g < 220 || b < 220)) ink++;
        }
        if (ink < Math.max(3, nw * 0.025)) {
          bottomY = nh - y;
        } else {
          break;
        }
      }

      // Scan cols from left
      let leftX = 0;
      for (let x = 0; x < maxScanX; x++) {
        let ink = 0;
        for (let y = topY; y < nh - bottomY; y++) {
          const idx = (y * nw + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a > 50 && (r < 220 || g < 220 || b < 220)) ink++;
        }
        if (ink < Math.max(3, (nh - topY - bottomY) * 0.025)) {
          leftX = x + 1;
        } else {
          break;
        }
      }

      // Scan cols from right
      let rightX = 0;
      for (let x = nw - 1; x >= nw - 1 - maxScanX; x--) {
        let ink = 0;
        for (let y = topY; y < nh - bottomY; y++) {
          const idx = (y * nw + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          if (a > 50 && (r < 220 || g < 220 || b < 220)) ink++;
        }
        if (ink < Math.max(3, (nh - topY - bottomY) * 0.025)) {
          rightX = nw - x;
        } else {
          break;
        }
      }

      const scaleX = targetW / nw;
      const scaleY = targetH / nh;
      const insets: SheetInsets = {
        top: Math.round(topY * scaleY),
        bottom: Math.round(bottomY * scaleY),
        left: Math.round(leftX * scaleX),
        right: Math.round(rightX * scaleX),
      };

      if (targetSheetId && targetSheetId !== 'main_cp') {
        get().updateSheetInsets(targetSheetId, insets);
      } else {
        get().setPaperInsets(insets);
      }
    } catch (err) {
      console.error('autoTrimBoundary error:', err);
    }
  },
  addSheet: (partial) => {
    const id = partial.id || `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const paperPos = get().paperPosition;
    const allRightEdges = [
      paperPos.x + 1000,
      ...get().sheets.map((s) => s.x + s.width),
      ...get().canvasImages.map((i) => i.x + i.width),
    ];
    const maxX = Math.max(...allRightEdges);
    const newX = partial.x !== undefined ? partial.x : maxX + 100;
    const newY = partial.y !== undefined ? partial.y : paperPos.y;

    const newSheet: CPSheet = {
      id,
      name: partial.name || `CP ${get().sheets.length + 1}`,
      x: newX,
      y: newY,
      width: partial.width ?? 1000,
      height: partial.height ?? 1000,
      paper: partial.paper || get().paper,
      grid: partial.grid || { ...get().grid, enabled: true },
      points: partial.points || [],
      creases: partial.creases || [],
      measurements: partial.measurements || [],
      rulers: partial.rulers || [],
      viewMode: partial.viewMode || 'vector',
      ...partial,
    };
    set((state) => ({
      sheets: [...state.sheets, newSheet],
      activeSheetId: id,
      grid: newSheet.grid,
      creases: newSheet.creases,
      points: newSheet.points,
      paper: newSheet.paper,
      selectedImageId: null,
      cropBox: null,
      layers: {
        ...state.layers,
        grid: newSheet.grid.enabled ?? true,
      },
    }));
    return id;
  },
  removeSheet: (id) => {
    set((state) => ({
      sheets: state.sheets.filter((s) => s.id !== id),
      activeSheetId: state.activeSheetId === id ? (state.sheets[0]?.id || null) : state.activeSheetId,
    }));
  },
  extractCPFromImage: (imageId, box) => {
    const img = get().canvasImages.find((i) => i.id === imageId);
    const sheetId = `cp_${Date.now()}`;
    const sheetName = img ? `CP from ${img.name}` : `Extracted CP ${get().sheets.length + 1}`;
    const paperPos = get().paperPosition;
    const allRightEdges = [
      paperPos.x + 1000,
      ...get().sheets.map((s) => s.x + s.width),
      ...get().canvasImages.map((i) => i.x + i.width),
    ];
    const maxX = Math.max(...allRightEdges);
    const newX = maxX + 100;
    const newY = paperPos.y;

    const aspect = (box.width && box.height) ? box.width / box.height : 1;
    const sheetW = 1000;
    const sheetH = Math.round(1000 / aspect);
    const newSheet: CPSheet = {
      id: sheetId,
      name: sheetName,
      x: newX,
      y: newY,
      width: sheetW,
      height: sheetH,
      sourceImageId: imageId,
      cropBox: box,
      paper: {
        corners: [
          { x: 0, y: 0 },
          { x: sheetW, y: 0 },
          { x: sheetW, y: sheetH },
          { x: 0, y: sheetH },
        ],
        rectified: true,
        homography: IDENTITY_HOMOGRAPHY,
        inverseHomography: IDENTITY_HOMOGRAPHY,
        aspectRatio: aspect,
      },
      grid: { ...DEFAULT_GRID_CONFIG, divisionsX: 64, divisionsY: Math.max(8, Math.round(64 / aspect)), enabled: true },
      points: [],
      creases: [],
      measurements: [],
      rulers: [],
      viewMode: 'vector',
    };
    set((state) => ({
      sheets: [...state.sheets, newSheet],
      activeSheetId: sheetId,
      cropBox: null,
    }));
    return sheetId;
  },
}));
