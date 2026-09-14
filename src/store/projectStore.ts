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
}

export interface AppStore extends ProjectState, UIState {
  // History
  past: ProjectState[];
  future: ProjectState[];

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
  setSnapCandidate: (snap: SnapCandidate | null) => void;
  toggleSnapping: () => void;
  setLayerVisibility: (layer: keyof LayerVisibility, visible: boolean) => void;
  setLoupeActive: (active: boolean) => void;

  // Temporary tool interactions
  setDrawingMeasurementStart: (p: Point2D | null) => void;
  setDrawingCreaseStart: (p: Point2D | null) => void;

  // Project serialization
  getProjectData: () => ProjectState;
  loadProjectData: (data: ProjectState) => void;
}

const DEFAULT_LAYERS: LayerVisibility = {
  image: true,
  grid: true,
  creases: true,
  boundary: true,
  intersections: false,
  points: false,
  measurements: true,
  rulers: true,
  symmetry: true,
};

function getSnapshot(state: AppStore): ProjectState {
  return {
    version: 1,
    image: { ...state.image },
    paper: { ...state.paper, corners: [...state.paper.corners] as any },
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
  imageOpacity: 0.45,
  isAnalyzing: false,
  analysisStep: '',
  analysisProgress: 0,
  analysisReport: null,

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
    set((state) => ({
      grid: { ...state.grid, ...patch },
    }));
  },

  addPoint: (point) => {
    get().pushHistory();
    const newPoint: ReferencePoint = {
      ...point,
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => ({
      points: [...state.points, newPoint],
      selectedPointId: newPoint.id,
    }));
  },

  updatePoint: (id, patch) => {
    get().pushHistory();
    set((state) => ({
      points: state.points.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },

  deletePoint: (id) => {
    get().pushHistory();
    set((state) => ({
      points: state.points.filter((p) => p.id !== id),
      selectedPointId: state.selectedPointId === id ? null : state.selectedPointId,
    }));
  },

  selectPoint: (id) => set({ selectedPointId: id }),

  addCrease: (crease) => {
    get().pushHistory();
    const newCrease: CreaseLine = {
      ...crease,
      id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    set((state) => ({
      creases: [...state.creases, newCrease],
      selectedCreaseId: newCrease.id,
    }));
  },

  updateCrease: (id, patch) => {
    get().pushHistory();
    set((state) => ({
      creases: state.creases.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  deleteCrease: (id) => {
    get().pushHistory();
    set((state) => ({
      creases: state.creases.filter((c) => c.id !== id),
      selectedCreaseId: state.selectedCreaseId === id ? null : state.selectedCreaseId,
    }));
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

  setSnapCandidate: (snap) => set((state) => {
    const prev = state.snapCandidate;
    if (!prev && !snap) return state;
    if (prev && snap && prev.kind === snap.kind && prev.sourceId === snap.sourceId &&
      Math.hypot(prev.point.x - snap.point.x, prev.point.y - snap.point.y) < 1e-5) return state;
    return { snapCandidate: snap };
  }),

  toggleSnapping: () => set((state) => ({ snappingEnabled: !state.snappingEnabled })),

  setLayerVisibility: (layer, visible) => {
    set((state) => ({
      layers: { ...state.layers, [layer]: visible },
    }));
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
}));
