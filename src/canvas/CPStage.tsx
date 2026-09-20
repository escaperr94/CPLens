import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Stage, Layer, Image as KonvaImage, Rect, Group, Circle, Line, Text, Transformer } from 'react-konva';
import { Sparkles, ArrowLeft, Copy, Square, Crop, Upload } from 'lucide-react';
import Konva from 'konva';
import { useAppStore } from '../store/projectStore';
import { CreaseLine, ReferencePoint, CPSheet } from '../store/types';
import { GridConfig } from '../geometry/grid';
import { BASE_PAPER_SIZE, paperToScreen, screenToPaper, paperToWorld, worldToPaper } from './transforms';
import { findSnapTarget, GeometryScene, SnapOptions } from '../geometry/snapping';
import { findCreaseIntersections } from '../geometry/intersection';
import { rectifyImage } from './imageRectifier';
import { IDENTITY_HOMOGRAPHY } from '../geometry/homography';
import { detectCPBoundaryInsets } from '../cv/pipeline';
import { GridLayer } from './layers/GridLayer';
import { CreaseLayer } from './layers/CreaseLayer';
import { IntersectionLayer } from './layers/IntersectionLayer';
import { PointLayer } from './layers/PointLayer';
import { MeasurementLayer } from './layers/MeasurementLayer';
import { RulerLayer } from './layers/RulerLayer';
import { SymmetryLayer } from './layers/SymmetryLayer';
import { CalibrationOverlay } from './layers/CalibrationOverlay';
import { SnapOverlay } from './layers/SnapOverlay';
import { Loupe } from './Loupe';
import { Point2D, distance } from '../geometry/point';
import { projectPointOntoSegment } from '../geometry/segment';

export const CPStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [htmlImage, setHtmlImage] = useState<HTMLImageElement | null>(null);
  const [rectifiedCanvas, setRectifiedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragCropStart, setDragCropStart] = useState<Point2D | null>(null);
  const [dragSheetId, setDragSheetId] = useState<string | 'main' | null>(null);
  const [dragSheetStart, setDragSheetStart] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const [sheetImages, setSheetImages] = useState<Record<string, HTMLImageElement>>({});
  const [canvasImgElements, setCanvasImgElements] = useState<Record<string, HTMLImageElement>>({});
  const [boundaryEditSheetId, setBoundaryEditSheetId] = useState<string | null>(null);
  const panRafRef = useRef<number | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const lastPanPosRef = useRef<Point2D | null>(null);
  const measureStartScreenRef = useRef<Point2D | null>(null);
  const pendingCursorRef = useRef<{
    paper: Point2D;
    screen: Point2D;
    targetFrame: { origin: Point2D; width: number; height: number; sheet?: CPSheet };
    targetGrid: GridConfig;
  } | null>(null);
  const cropDragOffsetRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const {
    image,
    paper,
    grid,
    points,
    creases,
    measurements,
    rulers,
    symmetry,
    layers,
    activeTool,
    creaseType,
    selectedPointId,
    selectedCreaseId,
    selectedMeasurementId,
    viewMode,
    imageOpacity,
    camera,
    cursorPaper,
    cursorScreen,
    snapCandidate,
    snappingEnabled,
    snapOptions,
    targetPoint,
    loupe,
    calibrationCorners,
    drawingMeasurementStart,
    drawingCreaseStart,
    setCamera,
    zoomAroundPoint,
    fitToPaper,
    setCursor,
    setSnapCandidate,
    setHoveredPoint,
    setTargetPoint,
    setCalibrationCorner,
    addPoint,
    updatePoint,
    selectPoint,
    addCrease,
    selectCrease,
    addMeasurement,
    updateMeasurement,
    selectMeasurement,
    addRuler,
    deletePoint,
    deleteCrease,
    deleteMeasurement,
    deleteRuler,
    setDrawingMeasurementStart,
    setDrawingCreaseStart,
    setCrop,
    cropBox,
    setCropBox,
    sheets,
    canvasImages,
    addSheet,
    extractCPFromImage,
    activeSheetId,
    setActiveSheetId,
    setActiveTool,
    paperPosition,
    setPaperPosition,
    updateSheetPosition,
    selectedImageId,
    selectCanvasImage,
    removeCanvasImage,
    updateCanvasImagePosition,
    setReferenceImageFromCropped,
    addCanvasImage,
    updateCanvasImage,
    updateSheet,
    imageTransform,
    paperInsets,
    setPaperInsets,
    updateSheetInsets,
    autoTrimBoundary,
    loadImage,
  } = useAppStore(useShallow((state) => ({
    image: state.image,
    paper: state.paper,
    grid: state.grid,
    points: state.points,
    creases: state.creases,
    measurements: state.measurements,
    rulers: state.rulers,
    symmetry: state.symmetry,
    layers: state.layers,
    activeTool: state.activeTool,
    creaseType: state.creaseType,
    selectedPointId: state.selectedPointId,
    selectedCreaseId: state.selectedCreaseId,
    selectedMeasurementId: state.selectedMeasurementId,
    viewMode: state.viewMode,
    imageOpacity: state.imageOpacity,
    camera: state.camera,
    cursorPaper: state.cursorPaper,
    cursorScreen: state.cursorScreen,
    snapCandidate: state.snapCandidate,
    snappingEnabled: state.snappingEnabled,
    snapOptions: state.snapOptions,
    targetPoint: state.targetPoint,
    loupe: state.loupe,
    calibrationCorners: state.calibrationCorners,
    drawingMeasurementStart: state.drawingMeasurementStart,
    drawingCreaseStart: state.drawingCreaseStart,
    setCamera: state.setCamera,
    zoomAroundPoint: state.zoomAroundPoint,
    fitToPaper: state.fitToPaper,
    setCursor: state.setCursor,
    setSnapCandidate: state.setSnapCandidate,
    setHoveredPoint: state.setHoveredPoint,
    setTargetPoint: state.setTargetPoint,
    setCalibrationCorner: state.setCalibrationCorner,
    addPoint: state.addPoint,
    updatePoint: state.updatePoint,
    selectPoint: state.selectPoint,
    addCrease: state.addCrease,
    selectCrease: state.selectCrease,
    addMeasurement: state.addMeasurement,
    updateMeasurement: state.updateMeasurement,
    selectMeasurement: state.selectMeasurement,
    addRuler: state.addRuler,
    deletePoint: state.deletePoint,
    deleteCrease: state.deleteCrease,
    deleteMeasurement: state.deleteMeasurement,
    deleteRuler: state.deleteRuler,
    setDrawingMeasurementStart: state.setDrawingMeasurementStart,
    setDrawingCreaseStart: state.setDrawingCreaseStart,
    setCrop: state.setCrop,
    sheets: state.sheets,
    canvasImages: state.canvasImages,
    cropBox: state.cropBox,
    setCropBox: state.setCropBox,
    addSheet: state.addSheet,
    extractCPFromImage: state.extractCPFromImage,
    activeSheetId: state.activeSheetId,
    setActiveSheetId: state.setActiveSheetId,
    setActiveTool: state.setActiveTool,
    paperPosition: state.paperPosition,
    setPaperPosition: state.setPaperPosition,
    updateSheetPosition: state.updateSheetPosition,
    selectedImageId: state.selectedImageId,
    selectCanvasImage: state.selectCanvasImage,
    removeCanvasImage: state.removeCanvasImage,
    updateCanvasImagePosition: state.updateCanvasImagePosition,
    setReferenceImageFromCropped: state.setReferenceImageFromCropped,
    addCanvasImage: state.addCanvasImage,
    updateCanvasImage: state.updateCanvasImage,
    updateSheet: state.updateSheet,
    imageTransform: state.imageTransform,
    paperInsets: state.paperInsets,
    setPaperInsets: state.setPaperInsets,
    updateSheetInsets: state.updateSheetInsets,
    autoTrimBoundary: state.autoTrimBoundary,
    loadImage: state.loadImage,
  })));

  // Check if canvas is completely empty
  const isCanvasEmpty = !image.url && sheets.length === 0 && canvasImages.length === 0;

  // Handler to load an image file from drag & drop, file input, or clipboard paste
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const img = new window.Image();
      img.onload = () => {
        const fileName = file.name || 'Main Crease Pattern';
        loadImage(dataUrl, fileName, img.naturalWidth, img.naturalHeight);
        fitToPaper(dimensions.width, dimensions.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [loadImage, fitToPaper, dimensions.width, dimensions.height]);

  // Window paste listener to handle pasted images from clipboard (e.g. screenshots of CPs)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleImageFile]);

  // Load image object whenever image URL changes
  useEffect(() => {
    if (!image.url) {
      setHtmlImage(null);
      setRectifiedCanvas(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = image.url;
    img.onload = () => {
      setHtmlImage(img);
    };
  }, [image.url]);

  // Update rectified canvas when calibration or image changes
  useEffect(() => {
    if (!htmlImage) return;

    if (paper.rectified) {
      const canvas = rectifyImage(htmlImage, paper.corners, 1200);
      setRectifiedCanvas(canvas);
    } else {
      setRectifiedCanvas(null);
    }
  }, [htmlImage, paper.rectified, paper.corners]);
  // Load images for extracted sheets
  useEffect(() => {
    sheets.forEach((s) => {
      if (s.imageUrl && !sheetImages[s.id]) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = s.imageUrl;
        img.onload = () => {
          setSheetImages((prev) => ({ ...prev, [s.id]: img }));
        };
      }
    });
  }, [sheets, sheetImages]);
  // Load images for canvas images
  useEffect(() => {
    canvasImages.forEach((imgItem) => {
      if (imgItem.url && !canvasImgElements[imgItem.id]) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = imgItem.url;
        img.onload = () => {
          setCanvasImgElements((prev) => ({ ...prev, [imgItem.id]: img }));
        };
      }
    });
  }, [canvasImages, canvasImgElements]);
  // Attach Konva Transformer to selected canvas image or active secondary sheet
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    if (selectedImageId) {
      const node = stageRef.current.findOne(`.canvas_img_${selectedImageId}`);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedImageId, activeSheetId, canvasImages, sheets]);


  // Extract cropped pixels from whichever image overlaps the crop box
  const getCroppedImageInfo = useCallback((): { dataUrl: string; width: number; height: number; imgData?: ImageData } | null => {
    const curBox = useAppStore.getState().cropBox;
    if (!curBox || curBox.width < 10 || curBox.height < 10) return null;

    // 1. Check canvas images
    for (const cImg of canvasImages) {
      const overlapX1 = Math.max(curBox.x, cImg.x);
      const overlapY1 = Math.max(curBox.y, cImg.y);
      const overlapX2 = Math.min(curBox.x + curBox.width, cImg.x + cImg.width);
      const overlapY2 = Math.min(curBox.y + curBox.height, cImg.y + cImg.height);

      if (overlapX2 > overlapX1 && overlapY2 > overlapY1) {
        const imgElement = canvasImgElements[cImg.id];
        if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
          const scaleX = imgElement.naturalWidth / cImg.width;
          const scaleY = imgElement.naturalHeight / cImg.height;

          const sx = Math.max(0, (curBox.x - cImg.x) * scaleX);
          const sy = Math.max(0, (curBox.y - cImg.y) * scaleY);
          const sw = Math.min(imgElement.naturalWidth - sx, curBox.width * scaleX);
          const sh = Math.min(imgElement.naturalHeight - sy, curBox.height * scaleY);

          const outW = Math.round(Math.max(10, sw));
          const outH = Math.round(Math.max(10, sh));

          const offscreen = document.createElement('canvas');
          offscreen.width = outW;
          offscreen.height = outH;
          const ctx = offscreen.getContext('2d');
          if (!ctx) return null;

          if (sw > 0 && sh > 0) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, outW, outH);
            const imgData = ctx.getImageData(0, 0, outW, outH);
            return { dataUrl: offscreen.toDataURL('image/png'), width: outW, height: outH, imgData };
          }
        }
      }
    }

    // 2. Check main paper workspace [paperPosition.x, paperPosition.y, paperW, paperH]
    const paperAspect = paper.aspectRatio || 1;
    const paperW = BASE_PAPER_SIZE;
    const paperH = BASE_PAPER_SIZE / paperAspect;

    const overlapPX1 = Math.max(curBox.x, paperPosition.x);
    const overlapPY1 = Math.max(curBox.y, paperPosition.y);
    const overlapPX2 = Math.min(curBox.x + curBox.width, paperPosition.x + paperW);
    const overlapPY2 = Math.min(curBox.y + curBox.height, paperPosition.y + paperH);

    if (overlapPX2 > overlapPX1 && overlapPY2 > overlapPY1) {
      const sourceCanvasOrImg = rectifiedCanvas || htmlImage;
      if (sourceCanvasOrImg) {
        const srcW = sourceCanvasOrImg.width || 1000;
        const srcH = sourceCanvasOrImg.height || 1000;

        const localX = (curBox.x - paperPosition.x) / paperW;
        const localY = (curBox.y - paperPosition.y) / paperH;
        const localW = curBox.width / paperW;
        const localH = curBox.height / paperH;

        const sx = Math.max(0, localX * srcW);
        const sy = Math.max(0, localY * srcH);
        const sw = Math.min(srcW - sx, localW * srcW);
        const sh = Math.min(srcH - sy, localH * srcH);

        const outW = Math.round(Math.max(10, sw));
        const outH = Math.round(Math.max(10, sh));

        const offscreen = document.createElement('canvas');
        offscreen.width = outW;
        offscreen.height = outH;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return null;

        if (sw > 0 && sh > 0) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(sourceCanvasOrImg, sx, sy, sw, sh, 0, 0, outW, outH);
          const imgData = ctx.getImageData(0, 0, outW, outH);
          return { dataUrl: offscreen.toDataURL('image/png'), width: outW, height: outH, imgData };
        }
      }
    }

    // 3. Check sheets
    for (const s of sheets) {
      const overlapSX1 = Math.max(curBox.x, s.x);
      const overlapSY1 = Math.max(curBox.y, s.y);
      const overlapSX2 = Math.min(curBox.x + curBox.width, s.x + s.width);
      const overlapSY2 = Math.min(curBox.y + curBox.height, s.y + s.height);

      if (overlapSX2 > overlapSX1 && overlapSY2 > overlapSY1) {
        const sImg = sheetImages[s.id];
        if (sImg && sImg.complete && sImg.naturalWidth > 0) {
          const scaleX = sImg.naturalWidth / s.width;
          const scaleY = sImg.naturalHeight / s.height;

          const sx = Math.max(0, (curBox.x - s.x) * scaleX);
          const sy = Math.max(0, (curBox.y - s.y) * scaleY);
          const sw = Math.min(sImg.naturalWidth - sx, curBox.width * scaleX);
          const sh = Math.min(sImg.naturalHeight - sy, curBox.height * scaleY);

          const outW = Math.round(Math.max(10, sw));
          const outH = Math.round(Math.max(10, sh));

          const offscreen = document.createElement('canvas');
          offscreen.width = outW;
          offscreen.height = outH;
          const ctx = offscreen.getContext('2d');
          if (!ctx) return null;

          if (sw > 0 && sh > 0) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(sImg, sx, sy, sw, sh, 0, 0, outW, outH);
            const imgData = ctx.getImageData(0, 0, outW, outH);
            return { dataUrl: offscreen.toDataURL('image/png'), width: outW, height: outH, imgData };
          }
        }
      }
    }

    // Fallback: htmlImage
    if (htmlImage && htmlImage.complete) {
      const outW = htmlImage.naturalWidth || 1000;
      const outH = htmlImage.naturalHeight || 1000;
      const offscreen = document.createElement('canvas');
      offscreen.width = outW;
      offscreen.height = outH;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, outW, outH);
        return { dataUrl: offscreen.toDataURL('image/png'), width: outW, height: outH, imgData };
      }
    }

    return null;
  }, [canvasImages, canvasImgElements, paperPosition, paper.aspectRatio, rectifiedCanvas, htmlImage, sheets, sheetImages]);

  const getCroppedImageDataUrl = useCallback((): string | null => {
    return getCroppedImageInfo()?.dataUrl ?? null;
  }, [getCroppedImageInfo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (boundaryEditSheetId) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          setBoundaryEditSheetId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boundaryEditSheetId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard modifiers (Space for pan, Alt for loupe)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
        lastPanPosRef.current = null;
      }
      if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (panRafRef.current) cancelAnimationFrame(panRafRef.current);
      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    };
  }, []);
  // Global pointerup to ensure dragging crop box never prematurely aborts
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (dragCropStart) {
        setDragCropStart(null);
        const cur = useAppStore.getState().cropBox;
        if (cur && (cur.width < 15 || cur.height < 15)) {
          setCropBox(null);
        }
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dragCropStart, setCropBox]);

  // Crease intersections calculation
  const intersections = useMemo(() => {
    return findCreaseIntersections(creases);
  }, [creases]);

  // Scene geometry for snapping
  const geometryScene: GeometryScene = useMemo(() => {
    return {
      referencePoints: points,
      intersections,
      creases,
      gridConfig: grid,
      symmetryAxes: symmetry.axes,
    };
  }, [points, intersections, creases, grid, symmetry.axes]);
  // Active / Target Sheet Frame resolution (origin, width, height with insets)
  const getActiveSheetFrame = useCallback((sheetId: string | null = activeSheetId) => {
    const targetSheet = sheets.find((s) => s.id === (sheetId || null));
    const insets = targetSheet
      ? (targetSheet.insets || { top: 0, right: 0, bottom: 0, left: 0 })
      : ((sheetId === null || sheetId === 'main_cp') ? paperInsets : { top: 0, right: 0, bottom: 0, left: 0 });
    const frameX = insets.left;
    const frameY = insets.top;
    const sheetOriginX = targetSheet ? targetSheet.x : paperPosition.x;
    const sheetOriginY = targetSheet ? targetSheet.y : paperPosition.y;
    const paperAspect = paper.aspectRatio || 1;
    const curPaperW = targetSheet
      ? Math.max(20, targetSheet.width - insets.left - insets.right)
      : Math.max(20, BASE_PAPER_SIZE - insets.left - insets.right);
    const curPaperH = targetSheet
      ? Math.max(20, targetSheet.height - insets.top - insets.bottom)
      : Math.max(20, (BASE_PAPER_SIZE / paperAspect) - insets.top - insets.bottom);
    return {
      origin: { x: sheetOriginX + frameX, y: sheetOriginY + frameY },
      width: curPaperW,
      height: curPaperH,
      sheet: targetSheet,
    };
  }, [sheets, activeSheetId, paperInsets, paperPosition, paper.aspectRatio]);


  const movePoint = useCallback((id: string, point: Point2D) => {
    const current = useAppStore.getState();
    const frame = getActiveSheetFrame();
    const scene = {
      ...geometryScene,
      // Do not snap a dragged point back to itself.
      referencePoints: geometryScene.referencePoints.filter((p) => p.id !== id),
    };
    const snap = current.snappingEnabled
      ? findSnapTarget(point, scene, { ...current.snapOptions, zoom: current.camera.zoom }, frame.width, frame.height)
      : null;
    updatePoint(id, snap?.point ?? {
      x: Math.max(0, Math.min(1, point.x)),
      y: Math.max(0, Math.min(1, point.y)),
    });
  }, [geometryScene, updatePoint, getActiveSheetFrame]);

  const moveMeasurement = useCallback((id: string, endpoint: 'p1' | 'p2', point: Point2D) => {
    const current = useAppStore.getState();
    const frame = getActiveSheetFrame();
    const snap = current.snappingEnabled
      ? findSnapTarget(point, geometryScene, { ...current.snapOptions, zoom: current.camera.zoom }, frame.width, frame.height)
      : null;
    const next = snap?.point ?? {
      x: Math.max(0, Math.min(1, point.x)),
      y: Math.max(0, Math.min(1, point.y)),
    };
    updateMeasurement(id, endpoint === 'p1' ? { p1: next } : { p2: next });
  }, [geometryScene, updateMeasurement, getActiveSheetFrame]);

  // Zoom on wheel (cursor-anchored zoom)
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const zoomSpeed = 1.12;
    const factor = e.evt.deltaY < 0 ? zoomSpeed : 1 / zoomSpeed;
    zoomAroundPoint(factor, pointer);
  };

  // Stage mouse down
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle click or Space+click initiates pan
    if (e.evt.button === 1 || (e.evt.button === 0 && (isSpacePressed || activeTool === 'pan'))) {
      setIsPanning(true);
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (e.evt.button !== 0) return;

    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldX = (pointer.x - camera.panX) / camera.zoom;
    const worldY = (pointer.y - camera.panY) / camera.zoom;

    // Check if dragging main paper or sheets via frame header
    if (activeTool === 'select') {
      if (
        worldY >= paperPosition.y - 32 &&
        worldY <= paperPosition.y &&
        worldX >= paperPosition.x &&
        worldX <= paperPosition.x + 220
      ) {
        setDragSheetId('main');
        setDragSheetStart({
          mouseX: worldX,
          mouseY: worldY,
          initialX: paperPosition.x,
          initialY: paperPosition.y,
        });
        setActiveSheetId('main_cp');
        return;
      }

      for (const s of sheets) {
        if (
          worldY >= s.y - 32 &&
          worldY <= s.y &&
          worldX >= s.x &&
          worldX <= s.x + 220
        ) {
          setDragSheetId(s.id);
          setDragSheetStart({
            mouseX: worldX,
            mouseY: worldY,
            initialX: s.x,
            initialY: s.y,
          });
          setActiveSheetId(s.id);
          return;
        }
      }
    }

    // If Crop Tool is active, start dragging a crop box anywhere on the canvas
    if (activeTool === 'crop') {
      const worldX = (pointer.x - camera.panX) / camera.zoom;
      const worldY = (pointer.y - camera.panY) / camera.zoom;
      setDragCropStart({ x: worldX, y: worldY });
      setCropBox({ x: worldX, y: worldY, width: 0, height: 0, active: true });
      return;
    }

    // If user clicks on any sheet or paper, switch active sheet
    let clickedSheetId: string | null = null;
      for (const s of sheets) {
        if (worldX >= s.x && worldX <= s.x + s.width && worldY >= s.y && worldY <= s.y + s.height) {
          clickedSheetId = s.id;
          break;
        }
      }
      if (!clickedSheetId && worldX >= paperPosition.x && worldX <= paperPosition.x + 1000 && worldY >= paperPosition.y && worldY <= paperPosition.y + 1000) {
        clickedSheetId = 'main_cp';
      }
      if (clickedSheetId && clickedSheetId !== (activeSheetId || 'main_cp')) {
        setActiveSheetId(clickedSheetId === 'main_cp' ? null : clickedSheetId);
      }


    const activeFrame = getActiveSheetFrame(useAppStore.getState().activeSheetId);

    // Determine target point: snapCandidate if active, else raw cursor
    const rawPaper = {
      x: (worldX - activeFrame.origin.x) / activeFrame.width,
      y: (worldY - activeFrame.origin.y) / activeFrame.height,
    };
    const clickSnap = snappingEnabled
      ? findSnapTarget(rawPaper, geometryScene, { ...snapOptions, zoom: camera.zoom }, activeFrame.width, activeFrame.height)
      : null;
    const targetPaper = clickSnap?.point ?? rawPaper;
    if (activeTool !== 'calibrate' && activeTool !== 'select' && (targetPaper.x < 0 || targetPaper.x > 1 || targetPaper.y < 0 || targetPaper.y > 1)) return;

    // Handle tool clicks
    switch (activeTool) {
      case 'calibrate': {
        // Mode B: click corners
        const rawWorld = {
          x: (pointer.x - camera.panX) / camera.zoom,
          y: (pointer.y - camera.panY) / camera.zoom,
        };
        // Convert world to image pixel coordinates if unrectified
        const imgScale = (image.width || 1000) / BASE_PAPER_SIZE;
        setCalibrationCorner({ x: rawWorld.x * imgScale, y: rawWorld.y * imgScale });
        break;
      }

      case 'point': {
        if (clickSnap?.kind === 'reference-point' && clickSnap.sourceId) {
          selectPoint(clickSnap.sourceId);
          setTargetPoint(clickSnap.point);
          break;
        }
        const newPt = {
          x: targetPaper.x,
          y: targetPaper.y,
          label: `P${points.length + 1}`,
          color: '#0D99FF',
        };
        addPoint(newPt);
        setTargetPoint(targetPaper);
        break;
      }

      case 'measure': {
        if (!drawingMeasurementStart) {
          setDrawingMeasurementStart(targetPaper);
          measureStartScreenRef.current = { x: pointer.x, y: pointer.y };
        } else {
          addMeasurement({
            p1: drawingMeasurementStart,
            p2: targetPaper,
          });
          setDrawingMeasurementStart(null);
          measureStartScreenRef.current = null;
        }
        break;
      }

      case 'line': {
        if (!drawingCreaseStart) {
          setDrawingCreaseStart(targetPaper);
        } else {
          addCrease({
            p1: drawingCreaseStart,
            p2: targetPaper,
            type: creaseType,
            confirmed: true,
          });
          setDrawingCreaseStart(null);
        }
        break;
      }

      case 'ruler': {
        addRuler(targetPaper, 'both');
        break;
      }

      case 'select': {
        // Check if user clicked near a reference point
        const pointTolerance = 14 / (camera.zoom * BASE_PAPER_SIZE);
        let clickedPointId: string | null = null;
        for (const p of points) {
          if (distance(targetPaper, p) < pointTolerance) {
            clickedPointId = p.id;
            break;
          }
        }

        if (clickedPointId) {
          selectPoint(clickedPointId);
          selectCrease(null);
          selectMeasurement(null);
          const found = points.find((p) => p.id === clickedPointId);
          if (found) setTargetPoint({ x: found.x, y: found.y });
          else setTargetPoint(targetPaper);
          break;
        }

        // Check if user clicked near a crease (12px radius)
        const clickTolerance = 12 / (camera.zoom * BASE_PAPER_SIZE);
        let closestCreaseId: string | null = null;
        let minCreaseDist = clickTolerance;

        for (let i = 0; i < creases.length; i++) {
          const c = creases[i];
          const proj = projectPointOntoSegment(targetPaper, c.p1, c.p2);
          if (proj.distance < minCreaseDist) {
            minCreaseDist = proj.distance;
            closestCreaseId = c.id;
          }
        }

        if (closestCreaseId) {
          selectCrease(closestCreaseId);
          selectPoint(null);
          selectMeasurement(null);
          setTargetPoint(targetPaper);
        } else {
          // User clicked paper: lock target point coordinates!
          setTargetPoint(targetPaper);
          selectPoint(null);
          selectCrease(null);
          selectMeasurement(null);
        }
        break;
      }
      case 'eraser': {
        const pointTolerance = 16 / (camera.zoom * BASE_PAPER_SIZE);
        const clickTolerance = 14 / (camera.zoom * BASE_PAPER_SIZE);

        // 1. Check points
        let deleted = false;
        for (const p of points) {
          if (distance(targetPaper, p) < pointTolerance) {
            deletePoint(p.id);
            deleted = true;
            break;
          }
        }
        if (deleted) break;

        // 2. Check creases
        let closestCreaseId: string | null = null;
        let minCreaseDist = clickTolerance;
        for (let i = 0; i < creases.length; i++) {
          const c = creases[i];
          const proj = projectPointOntoSegment(targetPaper, c.p1, c.p2);
          if (proj.distance < minCreaseDist) {
            minCreaseDist = proj.distance;
            closestCreaseId = c.id;
          }
        }
        if (closestCreaseId) {
          deleteCrease(closestCreaseId);
          break;
        }

        // 3. Check measurements
        for (const m of measurements) {
          const proj = projectPointOntoSegment(targetPaper, m.p1, m.p2);
          if (proj.distance < clickTolerance) {
            deleteMeasurement(m.id);
            deleted = true;
            break;
          }
        }
        if (deleted) break;

        // 4. Check rulers
        for (const r of rulers) {
          const dH = Math.abs(targetPaper.y - r.point.y);
          const dV = Math.abs(targetPaper.x - r.point.x);
          if ((r.orientation === 'horizontal' || r.orientation === 'both') && dH < clickTolerance) {
            deleteRuler(r.id);
            break;
          }
          if ((r.orientation === 'vertical' || r.orientation === 'both') && dV < clickTolerance) {
            deleteRuler(r.id);
            break;
          }
        }
        break;
      }
    }
  };

  // Mouse move
  // Mouse move with RAF throttling for 60-120fps smooth performance
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning && lastPanPosRef.current) {
      const dx = e.evt.clientX - lastPanPosRef.current.x;
      const dy = e.evt.clientY - lastPanPosRef.current.y;
      const currentCam = useAppStore.getState().camera;
      setCamera({ panX: currentCam.panX + dx, panY: currentCam.panY + dy });
      lastPanPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (dragSheetId && dragSheetStart) {
      const worldX = (pointer.x - camera.panX) / camera.zoom;
      const worldY = (pointer.y - camera.panY) / camera.zoom;
      const dx = worldX - dragSheetStart.mouseX;
      const dy = worldY - dragSheetStart.mouseY;
      if (dragSheetId === 'main') {
        setPaperPosition({
          x: Math.round(dragSheetStart.initialX + dx),
          y: Math.round(dragSheetStart.initialY + dy),
        });
      } else {
        updateSheetPosition(
          dragSheetId,
          Math.round(dragSheetStart.initialX + dx),
          Math.round(dragSheetStart.initialY + dy)
        );
      }
      return;
    }
    const worldX = (pointer.x - camera.panX) / camera.zoom;
    const worldY = (pointer.y - camera.panY) / camera.zoom;

    // Detect if mouse is hovering over a sheet or main paper
    let targetSheetId = activeSheetId;
    const hoveredSheet = sheets.find((s) => worldX >= s.x && worldX <= s.x + s.width && worldY >= s.y && worldY <= s.y + s.height);
    if (hoveredSheet) {
      targetSheetId = hoveredSheet.id;
    } else if (worldX >= paperPosition.x && worldX <= paperPosition.x + 1000 && worldY >= paperPosition.y && worldY <= paperPosition.y + 1000) {
      targetSheetId = 'main_cp';
    }

    const activeFrame = getActiveSheetFrame(targetSheetId);
    const paperPos = {
      x: (worldX - activeFrame.origin.x) / activeFrame.width,
      y: (worldY - activeFrame.origin.y) / activeFrame.height,
    };
    const isGridActive = (activeFrame.sheet ? (activeFrame.sheet.grid.enabled ?? true) : (grid.enabled ?? true)) && layers.grid;
    const targetGrid = activeFrame.sheet
      ? { ...activeFrame.sheet.grid, enabled: isGridActive }
      : { ...grid, enabled: isGridActive };
    pendingCursorRef.current = { paper: paperPos, screen: pointer, targetFrame: activeFrame, targetGrid };

    if (activeTool === 'crop' && dragCropStart) {
      let width = Math.abs(worldX - dragCropStart.x);
      let height = Math.abs(worldY - dragCropStart.y);
      const isShift = (e.evt as MouseEvent).shiftKey;
      if (isShift) {
        const side = Math.max(width, height);
        width = side;
        height = side;
      }
      const x = worldX < dragCropStart.x ? dragCropStart.x - width : dragCropStart.x;
      const y = worldY < dragCropStart.y ? dragCropStart.y - height : dragCropStart.y;
      setCropBox({ x, y, width, height, active: true });
      return;
    }

    if (!cursorRafRef.current) {
      cursorRafRef.current = requestAnimationFrame(() => {
        cursorRafRef.current = null;
        if (pendingCursorRef.current) {
          const { paper, screen, targetFrame, targetGrid } = pendingCursorRef.current;
          setCursor(paper, screen);

          // Target scene geometry (use hovered/active sheet if distinct)
          const sheetObj = targetFrame.sheet;
          const targetCreases = sheetObj ? (sheetObj.id === activeSheetId ? creases : sheetObj.creases) : creases;
          const targetPoints = sheetObj ? (sheetObj.id === activeSheetId ? points : sheetObj.points) : points;
          const targetScene: GeometryScene = (sheetObj && sheetObj.id !== activeSheetId)
            ? {
                referencePoints: targetPoints,
                intersections: [],
                creases: targetCreases,
                gridConfig: targetGrid,
                symmetryAxes: symmetry.axes,
              }
            : geometryScene;

          // Only snap to discrete corners/intersections (grid, points, intersections), NOT continuous crease lines during hover
          const hoverSnapOptions: SnapOptions = {
            ...snapOptions,
            zoom: camera.zoom,
            enabledTargets: {
              ...snapOptions.enabledTargets,
              creases: false, // Don't snap along continuous lines during hover, ONLY at grid cell corners/intersections!
            },
          };

          // Calculate snap candidate
          if (snappingEnabled && activeTool !== 'calibrate' &&
            paper.x >= -0.02 && paper.x <= 1.02 && paper.y >= -0.02 && paper.y <= 1.02) {
            const snap = findSnapTarget(
              paper,
              targetScene,
              hoverSnapOptions,
              targetFrame.width,
              targetFrame.height
            );
            setSnapCandidate(snap ? {
              ...snap,
              frameOrigin: targetFrame.origin,
              paperWidth: targetFrame.width,
              paperHeight: targetFrame.height,
              gridConfig: targetGrid,
            } : null);
          } else {
            setSnapCandidate(null);
          }
        }
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPosRef.current = null;
      if (panRafRef.current) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
    }
    if (activeTool === 'crop' && dragCropStart) {
      setDragCropStart(null);
      const cur = useAppStore.getState().cropBox;
      if (cur && (cur.width < 15 || cur.height < 15)) {
        setCropBox(null);
      }
      return;
    }
    if (dragSheetId) {
      setDragSheetId(null);
      setDragSheetStart(null);
      return;
    }



    // A measurement can be made with a single Figma-like drag. Click-click
    // remains supported through the mouse-down branch above.
    if (activeTool === 'measure' && drawingMeasurementStart && measureStartScreenRef.current) {
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      const start = measureStartScreenRef.current;
      if (pointer && Math.hypot(pointer.x - start.x, pointer.y - start.y) >= 4) {
        const activeFrame = getActiveSheetFrame();
        const rawPaper = screenToPaper(pointer, camera, activeFrame.width, activeFrame.height, activeFrame.origin);
        const snap = snappingEnabled
          ? findSnapTarget(rawPaper, geometryScene, { ...snapOptions, zoom: camera.zoom }, activeFrame.width, activeFrame.height)
          : null;
        const end = snap?.point ?? rawPaper;
        if (end.x >= 0 && end.x <= 1 && end.y >= 0 && end.y <= 1) {
          addMeasurement({ p1: drawingMeasurementStart, p2: end });
          setDrawingMeasurementStart(null);
        }
      }
      measureStartScreenRef.current = null;
    }
  };

  // Cursor style
  let cursorStyle = 'default';
  if (isSpacePressed || activeTool === 'pan') cursorStyle = isPanning ? 'grabbing' : 'grab';
  else if (activeTool === 'eraser') cursorStyle = 'pointer';
  else if (activeTool === 'crop' || activeTool === 'point' || activeTool === 'measure' || activeTool === 'line' || activeTool === 'ruler')
    cursorStyle = 'crosshair';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#F7F7F7] select-none overflow-hidden"
      style={{ cursor: cursorStyle }}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          handleImageFile(files[0]);
        }
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isPanning) {
            setIsPanning(false);
            lastPanPosRef.current = null;
          }
        }}
        onDblClick={() => { const p = stageRef.current?.getPointerPosition(); if (p) zoomAroundPoint(2, p); }}
      >
        {/* Layer 1: Background & Image Layer */}
        {/* Layer 1: Static Geometry & Image Layer (listening={false} for zero hit-canvas overhead) */}
        <Layer
          x={camera.panX}
          y={camera.panY}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
          listening={false}
          imageSmoothingEnabled={!camera.pixelated}
        >

          {/* Main Paper Figma Frame Title Header */}
          {(Boolean(image.url) || !isCanvasEmpty) && (
            <Group
              x={paperPosition.x}
              y={paperPosition.y - 24 / camera.zoom}
              listening={false}
            >
              <Rect
                x={0}
                y={0}
                width={160 / camera.zoom}
                height={20 / camera.zoom}
                fill="rgba(255, 255, 255, 0.95)"
                stroke={activeSheetId === 'main_cp' || activeSheetId === null ? '#0D99FF' : '#E5E5E5'}
                strokeWidth={1 / camera.zoom}
                cornerRadius={4 / camera.zoom}
              />
              <Text
                x={6 / camera.zoom}
                y={4 / camera.zoom}
                text={image.fileName || 'Main Crease Pattern'}
                fontSize={11 / camera.zoom}
                fontFamily="sans-serif"
                fontStyle="bold"
                fill={activeSheetId === 'main_cp' || activeSheetId === null ? '#0D99FF' : '#111827'}
              />
              <Text
                x={((image.fileName || 'Main Crease Pattern').length * 7 + 10) / camera.zoom}
                y={5 / camera.zoom}
                text={(() => {
                  const paperAspect = paper.aspectRatio || 1;
                  const insets = paperInsets || { top: 0, right: 0, bottom: 0, left: 0 };
                  const w = Math.round(BASE_PAPER_SIZE - insets.left - insets.right);
                  const h = Math.round((BASE_PAPER_SIZE / paperAspect) - insets.top - insets.bottom);
                  return `${w}×${h}`;
                })()}
                fontSize={9 / camera.zoom}
                fontFamily="monospace"
                fill="#9CA3AF"
              />
            </Group>
          )}

          {/* Main Paper Workspace Group */}
          {(Boolean(image.url) || !isCanvasEmpty) && (
            <Group x={paperPosition.x} y={paperPosition.y}>
            {(() => {
              const paperAspect = paper.aspectRatio || 1;
              const paperW = BASE_PAPER_SIZE;
              const paperH = BASE_PAPER_SIZE / paperAspect;
              const insets = paperInsets || { top: 0, right: 0, bottom: 0, left: 0 };
              const frameX = insets.left;
              const frameY = insets.top;
              const frameW = Math.max(20, paperW - insets.left - insets.right);
              const frameH = Math.max(20, paperH - insets.top - insets.bottom);
              return (
                <>
                  {/* Paper Background Area */}
                  <Rect
                    x={frameX}
                    y={frameY}
                    width={frameW}
                    height={frameH}
                    fill="#ffffff"
                    stroke={layers.boundary ? '#111111' : '#E5E5E5'}
                    strokeWidth={1 / camera.zoom}
                    shadowColor="rgba(0, 0, 0, 0.06)"
                    shadowBlur={20 / camera.zoom}
                    shadowOffsetY={4 / camera.zoom}
                    listening={false}
                  />

                  {/* Raster Image with imageTransform & clipping */}
                  {layers.image && (
                    <Group clipX={frameX} clipY={frameY} clipWidth={frameW} clipHeight={frameH}>
                      {(() => {
                        const curTransform = (activeSheetId === null || activeSheetId === 'main_cp')
                          ? imageTransform
                          : { scale: 1, offsetX: 0, offsetY: 0 };
                        const scaledW = paperW * curTransform.scale;
                        const scaledH = paperH * curTransform.scale;
                        const imgX = curTransform.offsetX - (paperW * (curTransform.scale - 1)) / 2;
                        const imgY = curTransform.offsetY - (paperH * (curTransform.scale - 1)) / 2;

                        return (
                          <>
                            {paper.rectified && rectifiedCanvas ? (
                              <KonvaImage
                                image={rectifiedCanvas}
                                x={imgX}
                                y={imgY}
                                width={scaledW}
                                height={scaledH}
                                opacity={imageOpacity}
                                listening={false}
                              />
                            ) : htmlImage ? (
                              <KonvaImage
                                image={htmlImage}
                                x={imgX}
                                y={imgY}
                                width={scaledW}
                                height={scaledH}
                                opacity={imageOpacity}
                                listening={false}
                              />
                            ) : null}
                          </>
                        );
                      })()}
                    </Group>
                  )}

                  {/* Layer 2: Grid on main paper (when main paper is active) */}
                  {layers.grid && (activeSheetId === null || activeSheetId === 'main_cp') && (
                    <Group x={frameX} y={frameY}>
                      <GridLayer config={grid} zoom={camera.zoom} paperWidth={frameW} paperHeight={frameH} />
                    </Group>
                  )}

                  {/* Layer 3: Crease Lines on main paper */}
                  {layers.creases && viewMode !== 'image' && (activeSheetId === null || activeSheetId === 'main_cp') && (
                    <Group x={frameX} y={frameY}>
                      <CreaseLayer
                        creases={creases}
                        selectedId={selectedCreaseId}
                        zoom={camera.zoom}
                        onSelectCrease={selectCrease}
                        paperWidth={frameW}
                        paperHeight={frameH}
                      />
                    </Group>
                  )}

                  {/* Layer 4: Intersections */}
                  {layers.intersections && viewMode !== 'image' && (
                    <Group x={frameX} y={frameY}>
                      <IntersectionLayer creases={creases} zoom={camera.zoom} paperWidth={frameW} paperHeight={frameH} />
                    </Group>
                  )}

                  {/* Layer 5: Symmetry */}
                  {layers.symmetry && (
                    <SymmetryLayer
                      axes={symmetry.axes}
                      enabled={symmetry.enabled}
                      points={points}
                      zoom={camera.zoom}
                    />
                  )}
                </>
              );
            })()}
            </Group>
          )}
        </Layer>

        {/* Layer 2: Interactive Dynamic Overlay Layer */}
        {/* Layer 2: Interactive Dynamic Overlay Layer anchored to active sheet */}
        <Layer
          x={camera.panX}
          y={camera.panY}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
        >
          {(() => {
            const activeFrame = getActiveSheetFrame();
            const curOrigin = activeFrame.origin;
            const curPaperW = activeFrame.width;
            const curPaperH = activeFrame.height;
            return (
              <Group x={curOrigin.x} y={curOrigin.y}>
                {/* Intermediate line drawing preview */}
                {drawingCreaseStart && cursorPaper && viewMode !== 'image' && (
                  <CreaseLayer
                    creases={[
                      {
                        id: 'temp_crease',
                        p1: drawingCreaseStart,
                        p2: snappingEnabled && snapCandidate ? snapCandidate.point : cursorPaper,
                        type: creaseType,
                        confirmed: false,
                      },
                    ]}
                    selectedId={null}
                    zoom={camera.zoom}
                    onSelectCrease={() => { }}
                    paperWidth={curPaperW}
                    paperHeight={curPaperH}
                  />
                )}

                {/* Layer 6: Rulers */}
                {layers.rulers && <RulerLayer rulers={rulers} zoom={camera.zoom} paperWidth={curPaperW} paperHeight={curPaperH} />}

                {/* Layer 7: Measurements */}
                {layers.measurements && (
                  <MeasurementLayer
                    measurements={measurements}
                    drawingStart={drawingMeasurementStart}
                    cursor={snappingEnabled && snapCandidate ? snapCandidate.point : cursorPaper}
                    selectedId={selectedMeasurementId}
                    zoom={camera.zoom}
                    onSelect={selectMeasurement}
                    onMoveMeasurement={moveMeasurement}
                    paperWidth={curPaperW}
                    paperHeight={curPaperH}
                  />
                )}

                {/* Layer 8: Reference Points */}
                {layers.points && (
                  <PointLayer
                    points={points}
                    selectedId={selectedPointId}
                    zoom={camera.zoom}
                    draggable={activeTool === 'select'}
                    onSelectPoint={selectPoint}
                    onMovePoint={movePoint}
                    onHoverPoint={setHoveredPoint}
                    paperWidth={curPaperW}
                    paperHeight={curPaperH}
                  />
                )}
          {/* Locked Canvas Target Reticle */}
          {targetPoint && (
            <Group
              x={targetPoint.x * curPaperW}
              y={targetPoint.y * curPaperH}
              listening={false}
            >
              <Line
                points={[-14 / camera.zoom, 0, 14 / camera.zoom, 0]}
                stroke="#4F6BA6"
                strokeWidth={1.2 / camera.zoom}
                dash={[3 / camera.zoom, 2 / camera.zoom]}
              />
              <Line
                points={[0, -14 / camera.zoom, 0, 14 / camera.zoom]}
                stroke="#4F6BA6"
                strokeWidth={1.2 / camera.zoom}
                dash={[3 / camera.zoom, 2 / camera.zoom]}
              />
              <Circle
                radius={7 / camera.zoom}
                stroke="#4F6BA6"
                strokeWidth={1.5 / camera.zoom}
                fill="#E1E8F5"
                opacity={0.8}
              />
              <Circle
                radius={2.5 / camera.zoom}
                fill="#4F6BA6"
              />
            </Group>
          )}

          {/* Layer 9: Calibration & Crop Overlays */}
          <CalibrationOverlay
            tool={activeTool}
            corners={paper.corners}
            inProgressCorners={calibrationCorners}
            crop={image.crop}
            zoom={camera.zoom}
            onUpdateCorner={(index, pt) => {
              const newCorners = [...paper.corners] as [Point2D, Point2D, Point2D, Point2D];
              newCorners[index] = pt;
              useAppStore.getState().setCalibrationCorner(pt);
            }}
            onUpdateCrop={setCrop}
          />

          </Group>
        );
      })()}
          {/* Canvas Images (Pasted/Imported Images on Canvas) */}
          {canvasImages.map((cImg) => {
            const isSelected = selectedImageId === cImg.id;
            const imgElement = canvasImgElements[cImg.id];
            return (
              <Group
                key={cImg.id}
                name={`canvas_img_${cImg.id}`}
                x={cImg.x}
                y={cImg.y}
                draggable={activeTool === 'select'}
                onDragStart={() => {
                  selectCanvasImage(cImg.id);
                  setActiveSheetId(null);
                }}
                onDragEnd={(e) => {
                  updateCanvasImage(cImg.id, {
                    x: Math.round(e.target.x()),
                    y: Math.round(e.target.y()),
                  });
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scale = Math.max(node.scaleX(), node.scaleY());
                  node.scaleX(1);
                  node.scaleY(1);
                  const ratio = cImg.width / (cImg.height || 1);
                  const newW = Math.max(30, Math.round(cImg.width * scale));
                  const newH = Math.max(30, Math.round(newW / ratio));
                  const newX = Math.round(node.x());
                  const newY = Math.round(node.y());
                  updateCanvasImage(cImg.id, {
                    width: newW,
                    height: newH,
                    x: newX,
                    y: newY,
                  });
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  selectCanvasImage(cImg.id);
                  setActiveSheetId(null);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  selectCanvasImage(cImg.id);
                  setActiveSheetId(null);
                }}
              >
                {/* Image card background */}
                <Rect
                  x={0}
                  y={0}
                  width={cImg.width}
                  height={cImg.height}
                  fill="#ffffff"
                  stroke={isSelected ? '#0D99FF' : '#E5E5E5'}
                  strokeWidth={(isSelected ? 2 : 1) / camera.zoom}
                  shadowColor="rgba(0, 0, 0, 0.08)"
                  shadowBlur={16 / camera.zoom}
                  shadowOffsetY={3 / camera.zoom}
                />
                {imgElement && (
                  <KonvaImage
                    image={imgElement}
                    x={0}
                    y={0}
                    width={cImg.width}
                    height={cImg.height}
                    listening={false}
                  />
                )}
                {/* Header title badge */}
                <Group x={0} y={-22 / camera.zoom} listening={false}>
                  <Rect
                    x={0}
                    y={0}
                    width={Math.max(140, Math.min(220, cImg.name.length * 7 + 60)) / camera.zoom}
                    height={18 / camera.zoom}
                    fill="rgba(255, 255, 255, 0.96)"
                    stroke={isSelected ? '#0D99FF' : '#E5E5E5'}
                    strokeWidth={1 / camera.zoom}
                    cornerRadius={4 / camera.zoom}
                  />
                  <Text
                    x={6 / camera.zoom}
                    y={3 / camera.zoom}
                    text={cImg.name}
                    fontSize={10 / camera.zoom}
                    fontFamily="sans-serif"
                    fontStyle="bold"
                    fill={isSelected ? '#0D99FF' : '#111827'}
                  />
                  <Text
                    x={(Math.min(cImg.name.length * 6, 120) + 12) / camera.zoom}
                    y={4 / camera.zoom}
                    text={`${Math.round(cImg.width)}×${Math.round(cImg.height)}`}
                    fontSize={8 / camera.zoom}
                    fontFamily="monospace"
                    fill="#9CA3AF"
                  />
                </Group>
                {/* Selection border indicator */}
                {isSelected && (
                  <Rect
                    x={-2 / camera.zoom}
                    y={-2 / camera.zoom}
                    width={cImg.width + 4 / camera.zoom}
                    height={cImg.height + 4 / camera.zoom}
                    stroke="#0D99FF"
                    strokeWidth={1.5 / camera.zoom}
                    dash={[4 / camera.zoom, 3 / camera.zoom]}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}


          {/* Multiple CP Sheets on Canvas */}
          {sheets.map((s, idx) => {
            const isSelected = activeSheetId === s.id;
            const sheetImg = sheetImages[s.id];
            return (
              <Group
                key={s.id}
                name={`canvas_sheet_${s.id}`}
                x={s.x}
                y={s.y}
                draggable={activeTool === 'select' && boundaryEditSheetId !== s.id}
                onDragStart={(e) => {
                  if (e.target !== e.currentTarget) return;
                  setActiveSheetId(s.id);
                  selectCanvasImage(null);
                }}
                onDragEnd={(e) => {
                  if (e.target !== e.currentTarget) return;
                  updateSheetPosition(s.id, Math.round(e.target.x()), Math.round(e.target.y()));
                }}
                onTransformEnd={(e) => {
                  const node = e.target;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  node.scaleX(1);
                  node.scaleY(1);
                  const newW = Math.max(100, Math.round(s.width * scaleX));
                  const newH = Math.max(100, Math.round(s.height * scaleY));
                  const newX = Math.round(node.x());
                  const newY = Math.round(node.y());
                  updateSheet(s.id, {
                    width: newW,
                    height: newH,
                    x: newX,
                    y: newY,
                  });
                }}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setActiveSheetId(s.id);
                  selectCanvasImage(null);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  setActiveSheetId(s.id);
                  selectCanvasImage(null);
                }}
                onDblClick={(e) => {
                  e.cancelBubble = true;
                  setBoundaryEditSheetId(s.id);
                }}
              >
                {(() => {
                  const isEditingBoundary = boundaryEditSheetId === s.id;
                  const insets = s.insets || { top: 0, right: 0, bottom: 0, left: 0 };
                  const frameX = insets.left;
                  const frameY = insets.top;
                  const frameW = Math.max(20, s.width - insets.left - insets.right);
                  const frameH = Math.max(20, s.height - insets.top - insets.bottom);

                  return (
                    <>
                      {/* Paper Rect with insets */}
                      <Rect
                        x={frameX}
                        y={frameY}
                        width={frameW}
                        height={frameH}
                        fill="#ffffff"
                        stroke={isSelected ? '#0D99FF' : '#111111'}
                        strokeWidth={(isSelected ? 2 : 1) / camera.zoom}
                        shadowColor="rgba(0, 0, 0, 0.08)"
                        shadowBlur={16 / camera.zoom}
                        shadowOffsetY={3 / camera.zoom}
                      />

                      {/* Render Cropped Image with transform & clipping to insets */}
                      {sheetImg && (isSelected ? layers.image : true) && (
                        <Group clipX={frameX} clipY={frameY} clipWidth={frameW} clipHeight={frameH}>
                           {(() => {
                             const sTransform = isSelected
                               ? imageTransform
                               : (s.transform || { scale: 1, offsetX: 0, offsetY: 0 });
                             const scaledW = s.width * sTransform.scale;
                             const scaledH = s.height * sTransform.scale;
                             const imgX = sTransform.offsetX - (s.width * (sTransform.scale - 1)) / 2;
                             const imgY = sTransform.offsetY - (s.height * (sTransform.scale - 1)) / 2;
                             return (
                               <KonvaImage
                                 image={sheetImg}
                                 x={imgX}
                                 y={imgY}
                                 width={scaledW}
                                 height={scaledH}
                                 opacity={0.92}
                                 listening={false}
                               />
                             );
                           })()}
                        </Group>
                      )}

                      {/* Layer 2: Grid on this sheet aligned to insets */}
                      {((isSelected && layers.grid && grid.enabled) || (!isSelected && s.grid && s.grid.enabled)) && (
                        <Group x={frameX} y={frameY}>
                          <GridLayer
                            config={isSelected ? grid : s.grid}
                            zoom={camera.zoom}
                            paperWidth={frameW}
                            paperHeight={frameH}
                          />
                        </Group>
                      )}

                      {/* Layer 3: Creases on this sheet aligned to insets */}
                      <Group x={frameX} y={frameY}>
                        {isSelected ? (
                          layers.creases && viewMode !== 'image' && (
                            <CreaseLayer
                              creases={creases}
                              selectedId={selectedCreaseId}
                              zoom={camera.zoom}
                              onSelectCrease={selectCrease}
                              paperWidth={frameW}
                              paperHeight={frameH}
                            />
                          )
                        ) : (
                          s.creases.length > 0 && (
                            <CreaseLayer
                              creases={s.creases}
                              selectedId={null}
                              zoom={camera.zoom}
                              onSelectCrease={() => {}}
                              paperWidth={frameW}
                              paperHeight={frameH}
                            />
                          )
                        )}

                        {/* Points on this sheet */}
                        {!isSelected && s.points && s.points.length > 0 && layers.points && (
                          <PointLayer
                            points={s.points}
                            selectedId={null}
                            zoom={camera.zoom}
                            draggable={false}
                            onSelectPoint={() => {}}
                            onMovePoint={() => {}}
                            onHoverPoint={() => {}}
                            paperWidth={frameW}
                            paperHeight={frameH}
                          />
                        )}
                      </Group>

                      {/* Dimmed Margins Outside Frame during boundary edit */}
                      {isEditingBoundary && (
                        <Group listening={false}>
                          {frameY > 0 && (
                            <Rect x={0} y={0} width={s.width} height={frameY} fill="rgba(0, 0, 0, 0.45)" />
                          )}
                          {frameY + frameH < s.height && (
                            <Rect x={0} y={frameY + frameH} width={s.width} height={s.height - frameY - frameH} fill="rgba(0, 0, 0, 0.45)" />
                          )}
                          {frameX > 0 && (
                            <Rect x={0} y={frameY} width={frameX} height={frameH} fill="rgba(0, 0, 0, 0.45)" />
                          )}
                          {frameX + frameW < s.width && (
                            <Rect x={frameX + frameW} y={frameY} width={s.width - frameX - frameW} height={frameH} fill="rgba(0, 0, 0, 0.45)" />
                          )}
                          {/* Active Frame Outline */}
                          <Rect
                            x={frameX}
                            y={frameY}
                            width={frameW}
                            height={frameH}
                            stroke="#0D99FF"
                            strokeWidth={2 / camera.zoom}
                            dash={[6 / camera.zoom, 3 / camera.zoom]}
                          />
                        </Group>
                      )}

                      {/* Interactive Boundary Edge Trim Handles & L-Brackets when selected or editing */}
                      {(isSelected || isEditingBoundary) && (
                        <Group>
                          {/* Top-Left Corner L-Bracket Handle */}
                          <Line
                            points={[
                              frameX, frameY + 12 / camera.zoom,
                              frameX, frameY,
                              frameX + 12 / camera.zoom, frameY
                            ]}
                            stroke="#0D99FF"
                            strokeWidth={3 / camera.zoom}
                            lineCap="square"
                          />
                          <Circle
                            x={frameX}
                            y={frameY}
                            radius={8 / camera.zoom}
                            fill="#FFFFFF"
                            stroke="#0D99FF"
                            strokeWidth={2 / camera.zoom}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldX = (pointer.x - camera.panX) / camera.zoom;
                              const worldY = (pointer.y - camera.panY) / camera.zoom;
                              const localX = worldX - s.x;
                              const localY = worldY - s.y;
                              const newLeft = Math.max(0, Math.min(s.width - insets.right - 20, Math.round(localX)));
                              const newTop = Math.max(0, Math.min(s.height - insets.bottom - 20, Math.round(localY)));
                              updateSheetInsets(s.id, { left: newLeft, top: newTop });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nwse-resize'; }}
                            onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
                          />

                          {/* Top-Right Corner L-Bracket Handle */}
                          <Line
                            points={[
                              frameX + frameW - 12 / camera.zoom, frameY,
                              frameX + frameW, frameY,
                              frameX + frameW, frameY + 12 / camera.zoom
                            ]}
                            stroke="#0D99FF"
                            strokeWidth={3 / camera.zoom}
                            lineCap="square"
                          />
                          <Circle
                            x={frameX + frameW}
                            y={frameY}
                            radius={8 / camera.zoom}
                            fill="#FFFFFF"
                            stroke="#0D99FF"
                            strokeWidth={2 / camera.zoom}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldX = (pointer.x - camera.panX) / camera.zoom;
                              const worldY = (pointer.y - camera.panY) / camera.zoom;
                              const localX = worldX - s.x;
                              const localY = worldY - s.y;
                              const newRight = Math.max(0, Math.min(s.width - insets.left - 20, Math.round(s.width - localX)));
                              const newTop = Math.max(0, Math.min(s.height - insets.bottom - 20, Math.round(localY)));
                              updateSheetInsets(s.id, { right: newRight, top: newTop });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nesw-resize'; }}
                            onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
                          />

                          {/* Bottom-Right Corner L-Bracket Handle */}
                          <Line
                            points={[
                              frameX + frameW - 12 / camera.zoom, frameY + frameH,
                              frameX + frameW, frameY + frameH,
                              frameX + frameW, frameY + frameH - 12 / camera.zoom
                            ]}
                            stroke="#0D99FF"
                            strokeWidth={3 / camera.zoom}
                            lineCap="square"
                          />
                          <Circle
                            x={frameX + frameW}
                            y={frameY + frameH}
                            radius={8 / camera.zoom}
                            fill="#FFFFFF"
                            stroke="#0D99FF"
                            strokeWidth={2 / camera.zoom}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldX = (pointer.x - camera.panX) / camera.zoom;
                              const worldY = (pointer.y - camera.panY) / camera.zoom;
                              const localX = worldX - s.x;
                              const localY = worldY - s.y;
                              const newRight = Math.max(0, Math.min(s.width - insets.left - 20, Math.round(s.width - localX)));
                              const newBottom = Math.max(0, Math.min(s.height - insets.top - 20, Math.round(s.height - localY)));
                              updateSheetInsets(s.id, { right: newRight, bottom: newBottom });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nwse-resize'; }}
                            onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
                          />

                          {/* Bottom-Left Corner L-Bracket Handle */}
                          <Line
                            points={[
                              frameX, frameY + frameH - 12 / camera.zoom,
                              frameX, frameY + frameH,
                              frameX + 12 / camera.zoom, frameY + frameH
                            ]}
                            stroke="#0D99FF"
                            strokeWidth={3 / camera.zoom}
                            lineCap="square"
                          />
                          <Circle
                            x={frameX}
                            y={frameY + frameH}
                            radius={8 / camera.zoom}
                            fill="#FFFFFF"
                            stroke="#0D99FF"
                            strokeWidth={2 / camera.zoom}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldX = (pointer.x - camera.panX) / camera.zoom;
                              const worldY = (pointer.y - camera.panY) / camera.zoom;
                              const localX = worldX - s.x;
                              const localY = worldY - s.y;
                              const newLeft = Math.max(0, Math.min(s.width - insets.right - 20, Math.round(localX)));
                              const newBottom = Math.max(0, Math.min(s.height - insets.top - 20, Math.round(s.height - localY)));
                              updateSheetInsets(s.id, { left: newLeft, bottom: newBottom });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nesw-resize'; }}
                            onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = 'default'; }}
                          />

                          {/* Top Center Edge Bar */}
                          <Rect
                            x={frameX + frameW * 0.3}
                            y={frameY - 4 / camera.zoom}
                            width={frameW * 0.4}
                            height={8 / camera.zoom}
                            fill="#0D99FF"
                            cornerRadius={3 / camera.zoom}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldY = (pointer.y - camera.panY) / camera.zoom;
                              const localY = worldY - s.y;
                              const newTop = Math.max(0, Math.min(s.height - insets.bottom - 20, Math.round(localY)));
                              updateSheetInsets(s.id, { top: newTop });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'ns-resize';
                            }}
                            onMouseLeave={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'default';
                            }}
                          />

                          {/* Bottom Center Edge Bar */}
                          <Rect
                            x={frameX + frameW * 0.3}
                            y={frameY + frameH - 4 / camera.zoom}
                            width={frameW * 0.4}
                            height={8 / camera.zoom}
                            fill="#0D99FF"
                            cornerRadius={3 / camera.zoom}
                            opacity={0.85}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldY = (pointer.y - camera.panY) / camera.zoom;
                              const localY = worldY - s.y;
                              const newBottom = Math.max(0, Math.min(s.height - insets.top - 20, Math.round(s.height - localY)));
                              updateSheetInsets(s.id, { bottom: newBottom });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'ns-resize';
                            }}
                            onMouseLeave={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'default';
                            }}
                          />

                          {/* Left Center Edge Bar */}
                          <Rect
                            x={frameX - 4 / camera.zoom}
                            y={frameY + frameH * 0.3}
                            width={8 / camera.zoom}
                            height={frameH * 0.4}
                            fill="#0D99FF"
                            cornerRadius={3 / camera.zoom}
                            opacity={0.85}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldX = (pointer.x - camera.panX) / camera.zoom;
                              const localX = worldX - s.x;
                              const newLeft = Math.max(0, Math.min(s.width - insets.right - 20, Math.round(localX)));
                              updateSheetInsets(s.id, { left: newLeft });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'ew-resize';
                            }}
                            onMouseLeave={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'default';
                            }}
                          />

                          {/* Right Center Edge Bar */}
                          <Rect
                            x={frameX + frameW - 4 / camera.zoom}
                            y={frameY + frameH * 0.3}
                            width={8 / camera.zoom}
                            height={frameH * 0.4}
                            fill="#0D99FF"
                            cornerRadius={3 / camera.zoom}
                            opacity={0.85}
                            draggable={true}
                            onDragStart={(e) => {
                              e.cancelBubble = true;
                              useAppStore.getState().pushHistory();
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true;
                              const stage = e.target.getStage();
                              const pointer = stage?.getPointerPosition();
                              if (!pointer) return;
                              const worldX = (pointer.x - camera.panX) / camera.zoom;
                              const localX = worldX - s.x;
                              const newRight = Math.max(0, Math.min(s.width - insets.left - 20, Math.round(s.width - localX)));
                              updateSheetInsets(s.id, { right: newRight });
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'ew-resize';
                            }}
                            onMouseLeave={(e) => {
                              const c = e.target.getStage()?.container();
                              if (c) c.style.cursor = 'default';
                            }}
                          />
                        </Group>
                      )}

                      {/* Frame Title Badge above sheet with Crop Button */}
                      <Group x={frameX} y={frameY - 26 / camera.zoom}>
                        <Rect
                          x={0}
                          y={0}
                          width={230 / camera.zoom}
                          height={22 / camera.zoom}
                          fill="rgba(255, 255, 255, 0.95)"
                          stroke={isEditingBoundary ? '#0D99FF' : isSelected ? '#0D99FF' : '#E5E5E5'}
                          strokeWidth={1 / camera.zoom}
                          cornerRadius={4 / camera.zoom}
                        />
                        <Text
                          x={6 / camera.zoom}
                          y={5 / camera.zoom}
                          text={s.name || `CP ${idx + 1}`}
                          fontSize={11 / camera.zoom}
                          fontFamily="sans-serif"
                          fontStyle="bold"
                          fill={isSelected ? '#0D99FF' : '#111827'}
                        />
                        <Text
                          x={((s.name || `CP ${idx + 1}`).length * 7 + 12) / camera.zoom}
                          y={6 / camera.zoom}
                          text={`${Math.round(frameW)}×${Math.round(frameH)}`}
                          fontSize={9 / camera.zoom}
                          fontFamily="monospace"
                          fill="#6B7280"
                        />
                        {/* Interactive Crop Boundary Button on Badge */}
                        <Group
                          x={165 / camera.zoom}
                          y={2 / camera.zoom}
                          onClick={(e) => {
                            e.cancelBubble = true;
                            setBoundaryEditSheetId(isEditingBoundary ? null : s.id);
                          }}
                          onTap={(e) => {
                            e.cancelBubble = true;
                            setBoundaryEditSheetId(isEditingBoundary ? null : s.id);
                          }}
                        >
                          <Rect
                            width={58 / camera.zoom}
                            height={18 / camera.zoom}
                            fill={isEditingBoundary ? '#0D99FF' : '#F3F4F6'}
                            cornerRadius={3 / camera.zoom}
                          />
                          <Text
                            x={8 / camera.zoom}
                            y={4 / camera.zoom}
                            text={isEditingBoundary ? '✓ Done' : '✂ Crop'}
                            fontSize={9 / camera.zoom}
                            fontFamily="sans-serif"
                            fontStyle="bold"
                            fill={isEditingBoundary ? '#FFFFFF' : '#374151'}
                          />
                        </Group>
                      </Group>
                    </>
                  );
                })()}
              </Group>
            );
          })}

          {/* Figma-style Selection & Resize Transformer */}
          {activeTool === 'select' && (selectedImageId || (activeSheetId && activeSheetId !== 'main_cp')) && (
            <Transformer
              ref={trRef}
              anchorSize={Math.max(6, Math.min(10, 8 / camera.zoom))}
              anchorCornerRadius={1.5 / camera.zoom}
              anchorStroke="#0D99FF"
              anchorFill="#FFFFFF"
              anchorStrokeWidth={1.5 / camera.zoom}
              borderStroke="#0D99FF"
              borderStrokeWidth={1 / camera.zoom}
              rotateEnabled={false}
              ignoreStroke={true}
              keepRatio={true}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-right',
                'bottom-left',
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 30 || Math.abs(newBox.height) < 30) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
          {/* Active Canvas Crop Box with Interactive Resize Handles & Repositioning */}
          {cropBox && cropBox.active && (
            <Group>
              {/* Draggable Body to reposition the crop box */}
              <Rect
                x={cropBox.x}
                y={cropBox.y}
                width={cropBox.width}
                height={cropBox.height}
                fill="rgba(13, 153, 255, 0.08)"
                stroke="#0D99FF"
                strokeWidth={1.5 / camera.zoom}
                dash={[4 / camera.zoom, 4 / camera.zoom]}
                draggable={true}
                onMouseDown={(e) => { e.cancelBubble = true; }}
                onDragStart={(e) => {
                  e.cancelBubble = true;
                  const stage = e.target.getStage();
                  const p = stage?.getPointerPosition();
                  if (p) {
                    cropDragOffsetRef.current = {
                      startX: (p.x - camera.panX) / camera.zoom,
                      startY: (p.y - camera.panY) / camera.zoom,
                      initialX: cropBox.x,
                      initialY: cropBox.y,
                    };
                  }
                }}
                onDragMove={(e) => {
                  e.cancelBubble = true;
                  if (!cropDragOffsetRef.current) return;
                  const stage = e.target.getStage();
                  const p = stage?.getPointerPosition();
                  if (!p) return;
                  const curX = (p.x - camera.panX) / camera.zoom;
                  const curY = (p.y - camera.panY) / camera.zoom;
                  const dx = curX - cropDragOffsetRef.current.startX;
                  const dy = curY - cropDragOffsetRef.current.startY;
                  setCropBox({
                    ...cropBox,
                    x: Math.round(cropDragOffsetRef.current.initialX + dx),
                    y: Math.round(cropDragOffsetRef.current.initialY + dy),
                  });
                }}
                onDragEnd={(e) => {
                  e.cancelBubble = true;
                  cropDragOffsetRef.current = null;
                }}
                onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'move'; }}
                onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
              />

              {/* Dimensions text badge */}
              <Text
                x={cropBox.x + 4 / camera.zoom}
                y={cropBox.y - 14 / camera.zoom}
                text={`${Math.round(cropBox.width)} × ${Math.round(cropBox.height)}`}
                fontSize={10 / camera.zoom}
                fontFamily="monospace"
                fill="#0D99FF"
                listening={false}
              />

              {cropBox.width > 20 && cropBox.height > 20 && (
                <Group>
                  {/* Top-Left Corner Handle */}
                  <Circle
                    x={cropBox.x}
                    y={cropBox.y}
                    radius={6 / camera.zoom}
                    fill="#FFFFFF"
                    stroke="#0D99FF"
                    strokeWidth={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wx = (p.x - camera.panX) / camera.zoom;
                      const wy = (p.y - camera.panY) / camera.zoom;
                      const right = cropBox.x + cropBox.width;
                      const bottom = cropBox.y + cropBox.height;
                      const newX = Math.min(right - 10, wx);
                      const newY = Math.min(bottom - 10, wy);
                      setCropBox({ ...cropBox, x: newX, y: newY, width: right - newX, height: bottom - newY });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nwse-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Top-Right Corner Handle */}
                  <Circle
                    x={cropBox.x + cropBox.width}
                    y={cropBox.y}
                    radius={6 / camera.zoom}
                    fill="#FFFFFF"
                    stroke="#0D99FF"
                    strokeWidth={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wx = (p.x - camera.panX) / camera.zoom;
                      const wy = (p.y - camera.panY) / camera.zoom;
                      const left = cropBox.x;
                      const bottom = cropBox.y + cropBox.height;
                      const newW = Math.max(10, wx - left);
                      const newY = Math.min(bottom - 10, wy);
                      setCropBox({ ...cropBox, y: newY, width: newW, height: bottom - newY });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nesw-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Bottom-Right Corner Handle */}
                  <Circle
                    x={cropBox.x + cropBox.width}
                    y={cropBox.y + cropBox.height}
                    radius={6 / camera.zoom}
                    fill="#FFFFFF"
                    stroke="#0D99FF"
                    strokeWidth={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wx = (p.x - camera.panX) / camera.zoom;
                      const wy = (p.y - camera.panY) / camera.zoom;
                      const newW = Math.max(10, wx - cropBox.x);
                      const newH = Math.max(10, wy - cropBox.y);
                      setCropBox({ ...cropBox, width: newW, height: newH });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nwse-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Bottom-Left Corner Handle */}
                  <Circle
                    x={cropBox.x}
                    y={cropBox.y + cropBox.height}
                    radius={6 / camera.zoom}
                    fill="#FFFFFF"
                    stroke="#0D99FF"
                    strokeWidth={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wx = (p.x - camera.panX) / camera.zoom;
                      const wy = (p.y - camera.panY) / camera.zoom;
                      const right = cropBox.x + cropBox.width;
                      const newX = Math.min(right - 10, wx);
                      const newH = Math.max(10, wy - cropBox.y);
                      setCropBox({ ...cropBox, x: newX, width: right - newX, height: newH });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'nesw-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Top Edge Handle Bar */}
                  <Rect
                    x={cropBox.x + cropBox.width * 0.25}
                    y={cropBox.y - 3 / camera.zoom}
                    width={cropBox.width * 0.5}
                    height={6 / camera.zoom}
                    fill="#0D99FF"
                    cornerRadius={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wy = (p.y - camera.panY) / camera.zoom;
                      const bottom = cropBox.y + cropBox.height;
                      const newY = Math.min(bottom - 10, wy);
                      setCropBox({ ...cropBox, y: newY, height: bottom - newY });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'ns-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Bottom Edge Handle Bar */}
                  <Rect
                    x={cropBox.x + cropBox.width * 0.25}
                    y={cropBox.y + cropBox.height - 3 / camera.zoom}
                    width={cropBox.width * 0.5}
                    height={6 / camera.zoom}
                    fill="#0D99FF"
                    cornerRadius={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wy = (p.y - camera.panY) / camera.zoom;
                      const newH = Math.max(10, wy - cropBox.y);
                      setCropBox({ ...cropBox, height: newH });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'ns-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Left Edge Handle Bar */}
                  <Rect
                    x={cropBox.x - 3 / camera.zoom}
                    y={cropBox.y + cropBox.height * 0.25}
                    width={6 / camera.zoom}
                    height={cropBox.height * 0.5}
                    fill="#0D99FF"
                    cornerRadius={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wx = (p.x - camera.panX) / camera.zoom;
                      const right = cropBox.x + cropBox.width;
                      const newX = Math.min(right - 10, wx);
                      setCropBox({ ...cropBox, x: newX, width: right - newX });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'ew-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />

                  {/* Right Edge Handle Bar */}
                  <Rect
                    x={cropBox.x + cropBox.width - 3 / camera.zoom}
                    y={cropBox.y + cropBox.height * 0.25}
                    width={6 / camera.zoom}
                    height={cropBox.height * 0.5}
                    fill="#0D99FF"
                    cornerRadius={2 / camera.zoom}
                    draggable={true}
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      const p = stage?.getPointerPosition();
                      if (!p) return;
                      const wx = (p.x - camera.panX) / camera.zoom;
                      const newW = Math.max(10, wx - cropBox.x);
                      setCropBox({ ...cropBox, width: newW });
                    }}
                    onDragEnd={(e) => { e.cancelBubble = true; }}
                    onMouseEnter={(e) => { e.target.getStage()!.container().style.cursor = 'ew-resize'; }}
                    onMouseLeave={(e) => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
                  />
                </Group>
              )}
            </Group>
          )}
          {/* Topmost Precision Snap Overlay: rendered on top of all sheets & canvas images */}
          {snapCandidate && (() => {
            const fallbackFrame = getActiveSheetFrame();
            const frameOrigin = snapCandidate.frameOrigin || fallbackFrame.origin;
            const pw = snapCandidate.paperWidth || fallbackFrame.width;
            const ph = snapCandidate.paperHeight || fallbackFrame.height;
            const g = snapCandidate.gridConfig || grid;
            return (
              <Group
                x={frameOrigin.x}
                y={frameOrigin.y}
                listening={false}
              >
                <SnapOverlay
                  snap={snapCandidate}
                  zoom={camera.zoom}
                  gridConfig={g}
                  paperWidth={pw}
                  paperHeight={ph}
                />
              </Group>
            );
          })()}
        </Layer>
      </Stage>
      {/* Empty State Dropzone Overlay */}
      {isCanvasEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div
            className={`flex flex-col items-center justify-center max-w-md mx-4 p-8 text-center bg-white/90 backdrop-blur-md rounded-2xl border-2 border-dashed ${
              isDraggingOver ? 'border-[#0D99FF] bg-[#F0F7FF]/95 scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
            } shadow-xl pointer-events-auto transition-all duration-200`}
          >
            <div className="w-16 h-16 mb-4 rounded-2xl bg-[#0D99FF]/10 flex items-center justify-center text-[#0D99FF] shadow-inner">
              <Sparkles className="w-8 h-8 text-[#0D99FF]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1.5">
              No Crease Pattern Loaded
            </h2>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-xs">
              Drop any Crease Pattern image here, paste from clipboard (Ctrl+V / Cmd+V), or browse to begin
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0D99FF] hover:bg-[#0088EE] active:bg-[#0077D4] text-white text-xs font-medium rounded-xl shadow-xs transition-all cursor-pointer select-none">
              <Upload className="w-4 h-4" />
              <span>Open Image File...</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageFile(file);
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      )}
      {/* Floating Crop Action Bar */}
      {cropBox && cropBox.active && !dragCropStart && cropBox.width > 20 && cropBox.height > 20 && (
        <div
          className="absolute z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#E5E5E5] shadow-2xl rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
          style={{
            left: `${Math.max(20, Math.min(dimensions.width - 460, cropBox.x * camera.zoom + camera.panX))}px`,
            top: `${Math.max(20, cropBox.y * camera.zoom + camera.panY - 54)}px`,
          }}
        >
          {/* Crop Dimensions and Aspect Ratio Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700">
            <span>{Math.round(cropBox.width)} × {Math.round(cropBox.height)}</span>
            <span className="text-[10px] text-gray-500 font-sans">
              ({Math.abs(cropBox.width - cropBox.height) < 2 ? '1:1' : (cropBox.width / (cropBox.height || 1)).toFixed(2)})
            </span>
          </div>

          {/* 1:1 Square Constrain Button */}
          <button
            type="button"
            onClick={() => {
              const side = Math.round(Math.max(cropBox.width, cropBox.height));
              setCropBox({ ...cropBox, width: side, height: side });
            }}
            className={`h-7 px-2.5 font-medium text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
              Math.abs(cropBox.width - cropBox.height) < 2
                ? 'bg-[#EBF5FF] text-[#0D99FF] border border-[#BCE1FF] font-semibold'
                : 'hover:bg-gray-100 text-gray-700 border border-transparent'
            }`}
            title="Ép khung cắt thành hình vuông 1:1"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1 Square</span>
          </button>

          <div className="w-[1px] h-4 bg-gray-200" />

          {/* Button 1: Paste to Left CP (Main Workspace) with Autofit */}
          <button
            type="button"
            onClick={() => {
              const cropInfo = getCroppedImageInfo();
              if (cropInfo) {
                setReferenceImageFromCropped(cropInfo.dataUrl, 'Cropped_CP.png', cropInfo.width, cropInfo.height);
                setActiveTool('select');
                setCropBox(null);
                setTimeout(() => {
                  autoTrimBoundary('main_cp');
                  fitToPaper(dimensions.width - 400, dimensions.height - 80);
                }, 80);
              }
            }}
            className="h-7 px-3 bg-[#0D99FF] hover:bg-[#0088EE] text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Dán vùng cắt này sang CP chính và tự động căn khung (bật sẵn Grid để inspect, không bắt buộc chạy CV)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Paste to Left CP</span>
          </button>

          {/* Button 2: Extract to Right Sheet */}
          <button
            type="button"
            onClick={() => {
              const cropInfo = getCroppedImageInfo();
              const allRightEdges = [
                paperPosition.x + 1000,
                ...sheets.map((s) => s.x + s.width),
                ...canvasImages.map((i) => i.x + i.width),
              ];
              const newX = Math.max(...allRightEdges) + 120;
              const newY = paperPosition.y;

              const cropAspect = cropInfo ? cropInfo.width / (cropInfo.height || 1) : 1;
              const sheetW = 1000;
              const sheetH = Math.round(1000 / cropAspect);

              let initialInsets = { top: 0, right: 0, bottom: 0, left: 0 };
              if (cropInfo?.imgData) {
                const detected = detectCPBoundaryInsets(cropInfo.imgData.data, cropInfo.width, cropInfo.height, sheetW, sheetH);
                initialInsets = {
                  top: Math.max(0, Math.min(Math.floor(sheetH * 0.4), detected.top)),
                  bottom: Math.max(0, Math.min(Math.floor(sheetH * 0.4), detected.bottom)),
                  left: Math.max(0, Math.min(Math.floor(sheetW * 0.4), detected.left)),
                  right: Math.max(0, Math.min(Math.floor(sheetW * 0.4), detected.right)),
                };
              }

              const newSheetId = addSheet({
                name: `CP ${sheets.length + 1} (Cut)`,
                x: newX,
                y: newY,
                width: sheetW,
                height: sheetH,
                imageUrl: cropInfo?.dataUrl || undefined,
                creases: [],
                points: [],
                grid: { ...grid, enabled: true, divisionsX: 64, divisionsY: Math.max(8, Math.round(64 / cropAspect)) },
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
                  aspectRatio: cropAspect,
                },
              });
              if (cropInfo) {
                const imgObj = new window.Image();
                imgObj.src = cropInfo.dataUrl;
                setSheetImages((prev) => ({ ...prev, [newSheetId]: imgObj }));
              }
              setCropBox(null);
              setActiveSheetId(newSheetId);
              setActiveTool('select');

              const stageW = dimensions.width;
              const stageH = dimensions.height;
              const zoom = camera.zoom;
              const newPanX = (stageW - sheetW * zoom) / 2 - newX * zoom;
              const newPanY = (stageH - sheetH * zoom) / 2 - newY * zoom;
              setCamera({ panX: newPanX, panY: newPanY });
            }}
            className="h-7 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tạo CP sheet mới chứa ảnh cắt này ở bên phải với tỉ lệ tự nhiên"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0D99FF]" />
            <span>Extract to Right Sheet</span>
          </button>

          {/* Button 3: Paste as Canvas Image */}
          <button
            type="button"
            onClick={() => {
              const cropInfo = getCroppedImageInfo();
              if (cropInfo && cropBox) {
                addCanvasImage({
                  url: cropInfo.dataUrl,
                  name: `Crop_${Date.now().toString().slice(-4)}.png`,
                  x: Math.round(cropBox.x + cropBox.width + 30),
                  y: Math.round(cropBox.y),
                  width: Math.round(cropBox.width),
                  height: Math.round(cropBox.height),
                });
                setCropBox(null);
                setActiveTool('select');
              }
            }}
            className="h-7 px-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg text-xs transition-colors cursor-pointer"
            title="Dán làm ảnh rời trên Canvas"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>As Image</span>
          </button>

          <button
            type="button"
            onClick={() => setCropBox(null)}
            className="h-7 px-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
      {/* Floating Boundary Edit Toolbar for active sheet */}
      {boundaryEditSheetId && (() => {
        const targetSheet = sheets.find((s) => s.id === boundaryEditSheetId);
        if (!targetSheet) return null;
        const insets = targetSheet.insets || { top: 0, right: 0, bottom: 0, left: 0 };
        const frameX = insets.left;
        const frameY = insets.top;
        const frameW = Math.max(20, targetSheet.width - insets.left - insets.right);
        const frameH = Math.max(20, targetSheet.height - insets.top - insets.bottom);
        const screenX = (targetSheet.x + frameX) * camera.zoom + camera.panX;
        const screenY = (targetSheet.y + frameY) * camera.zoom + camera.panY;

        return (
          <div
            className="absolute z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#E5E5E5] shadow-2xl rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
            style={{
              left: `${Math.max(20, Math.min(dimensions.width - 480, screenX))}px`,
              top: `${Math.max(20, screenY - 54)}px`,
            }}
          >
            {/* Dimensions Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700">
              <Crop className="w-3.5 h-3.5 text-[#0D99FF]" />
              <span>{Math.round(frameW)} × {Math.round(frameH)}</span>
            </div>

            {/* Auto-Snap Button */}
            <button
              type="button"
              onClick={() => autoTrimBoundary(boundaryEditSheetId)}
              className="h-7 px-3 bg-[#EBF5FF] hover:bg-[#DEF0FF] text-[#0D99FF] font-medium text-xs rounded-lg flex items-center gap-1.5 border border-[#BCE1FF] transition-colors cursor-pointer"
              title="Tự động quét nét gấp và ép sát 4 cạnh viền"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Snap</span>
            </button>

            {/* 1:1 Square Button */}
            <button
              type="button"
              onClick={() => {
                const maxDim = Math.max(frameW, frameH);
                const diffW = maxDim - frameW;
                const diffH = maxDim - frameH;
                updateSheetInsets(boundaryEditSheetId, {
                  left: Math.max(0, insets.left - Math.round(diffW / 2)),
                  right: Math.max(0, insets.right - Math.round(diffW / 2)),
                  top: Math.max(0, insets.top - Math.round(diffH / 2)),
                  bottom: Math.max(0, insets.bottom - Math.round(diffH / 2)),
                });
              }}
              className="h-7 px-2.5 hover:bg-gray-100 text-gray-700 font-medium text-xs rounded-lg flex items-center gap-1 border border-gray-200 transition-colors cursor-pointer"
              title="Ép khung thành hình vuông 1:1"
            >
              <Square className="w-3.5 h-3.5" />
              <span>1:1</span>
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => updateSheetInsets(boundaryEditSheetId, { top: 0, right: 0, bottom: 0, left: 0 })}
              className="h-7 px-2 hover:bg-gray-100 text-gray-600 font-medium text-xs rounded-lg transition-colors cursor-pointer"
              title="Đặt lại về kích thước ban đầu"
            >
              Reset
            </button>

            <div className="w-[1px] h-4 bg-gray-200" />

            {/* Done Button */}
            <button
              type="button"
              onClick={() => setBoundaryEditSheetId(null)}
              className="h-7 px-3 bg-[#0D99FF] hover:bg-[#0088EE] text-white font-medium text-xs rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Xác nhận và đóng chế độ chỉnh viền (Enter / Esc)"
            >
              <span>Done</span>
            </button>
          </div>
        );
      })()}


      {/* Loupe Magnifier when Alt is pressed or active */}
      <Loupe
        cursorScreen={cursorScreen}
        cursorPaper={cursorPaper}
        snap={snapCandidate}
        sourceCanvas={rectifiedCanvas}
        active={isAltPressed || loupe.active}
        zoom={loupe.zoom}
        size={loupe.sizePx}
      />
    </div>
  );
};
