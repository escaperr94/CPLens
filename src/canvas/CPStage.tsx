import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Group } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '../store/projectStore';
import { BASE_PAPER_SIZE, paperToScreen, screenToPaper, paperToWorld, worldToPaper } from './transforms';
import { findSnapTarget, GeometryScene } from '../geometry/snapping';
import { findCreaseIntersections } from '../geometry/intersection';
import { rectifyImage } from './imageRectifier';
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
import { Point2D } from '../geometry/point';
import { projectPointOntoSegment } from '../geometry/segment';

export const CPStage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [htmlImage, setHtmlImage] = useState<HTMLImageElement | null>(null);
  const [rectifiedCanvas, setRectifiedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState<Point2D | null>(null);

  const panRafRef = useRef<number | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ paper: Point2D; screen: Point2D } | null>(null);

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
    setCalibrationCorner,
    addPoint,
    updatePoint,
    selectPoint,
    addCrease,
    selectCrease,
    addMeasurement,
    selectMeasurement,
    addRuler,
    setDrawingMeasurementStart,
    setDrawingCreaseStart,
    setCrop,
  } = useAppStore();

  // Load image object whenever image URL changes
  useEffect(() => {
    if (!image.url) return;
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
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });
      return;
    }

    if (e.evt.button !== 0) return;

    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Determine target point: snapCandidate if active, else raw cursor
    const rawPaper = screenToPaper(pointer, camera);
    const targetPaper = snappingEnabled && snapCandidate ? snapCandidate.point : rawPaper;

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
        addPoint({
          x: targetPaper.x,
          y: targetPaper.y,
          label: `P${points.length + 1}`,
          color: '#ef4444',
        });
        break;
      }

      case 'measure': {
        if (!drawingMeasurementStart) {
          setDrawingMeasurementStart(targetPaper);
        } else {
          addMeasurement({
            p1: drawingMeasurementStart,
            p2: targetPaper,
          });
          setDrawingMeasurementStart(null);
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
        } else if (e.target === stage) {
          selectPoint(null);
          selectCrease(null);
          selectMeasurement(null);
        }
        break;
      }
    }
  };

  // Mouse move with RAF throttling for 60-120fps smooth performance
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning && lastPanPos) {
      const dx = e.evt.clientX - lastPanPos.x;
      const dy = e.evt.clientY - lastPanPos.y;
      setLastPanPos({ x: e.evt.clientX, y: e.evt.clientY });

      if (!panRafRef.current) {
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = null;
          const currentCam = useAppStore.getState().camera;
          setCamera({
            panX: currentCam.panX + dx,
            panY: currentCam.panY + dy,
          });
        });
      }
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const paperPos = screenToPaper(pointer, camera);
    pendingCursorRef.current = { paper: paperPos, screen: pointer };

    if (!cursorRafRef.current) {
      cursorRafRef.current = requestAnimationFrame(() => {
        cursorRafRef.current = null;
        if (pendingCursorRef.current) {
          const { paper, screen } = pendingCursorRef.current;
          setCursor(paper, screen);

          // Calculate snap candidate
          if (snappingEnabled && activeTool !== 'calibrate') {
            const snap = findSnapTarget(paper, geometryScene, {
              ...snapOptions,
              zoom: camera.zoom,
            });
            setSnapCandidate(snap);
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
      setLastPanPos(null);
      if (panRafRef.current) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
    }
  };

  // Cursor style
  let cursorStyle = 'default';
  if (isSpacePressed || activeTool === 'pan') cursorStyle = isPanning ? 'grabbing' : 'grab';
  else if (activeTool === 'point' || activeTool === 'measure' || activeTool === 'line' || activeTool === 'ruler')
    cursorStyle = 'crosshair';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#F4F5F7] select-none overflow-hidden"
      style={{ cursor: cursorStyle }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Layer 1: Static Geometry & Image Layer (listening={false} for zero hit-canvas overhead) */}
        <Layer
          x={camera.panX}
          y={camera.panY}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
          listening={false}
          imageSmoothingEnabled={!camera.pixelated}
        >
          {/* Subtle Outer Blue Selection Outline (matching media_1789408992098.png) */}
          <Rect
            x={-3 / camera.zoom}
            y={-3 / camera.zoom}
            width={BASE_PAPER_SIZE + 6 / camera.zoom}
            height={BASE_PAPER_SIZE + 6 / camera.zoom}
            stroke="#0D99FF"
            strokeWidth={1.5 / camera.zoom}
            cornerRadius={4 / camera.zoom}
            listening={false}
          />

          {/* Paper Background Area [0, 0, BASE_PAPER_SIZE, BASE_PAPER_SIZE] */}
          <Rect
            x={0}
            y={0}
            width={BASE_PAPER_SIZE}
            height={BASE_PAPER_SIZE}
            fill="#ffffff"
            stroke={layers.boundary ? '#18181B' : '#E5E5E5'}
            strokeWidth={layers.boundary ? 1.5 / camera.zoom : 1 / camera.zoom}
            shadowColor="rgba(0, 0, 0, 0.06)"
            shadowBlur={20 / camera.zoom}
            shadowOffsetY={4 / camera.zoom}
            listening={false}
          />

          {/* Raster Image (hidden in pure Vector CP mode, transparent in overlay) */}
          {layers.image && htmlImage && viewMode !== 'vector' && (
            <>
              {paper.rectified && rectifiedCanvas ? (
                // Rectified Square Image
                <KonvaImage
                  image={rectifiedCanvas}
                  x={0}
                  y={0}
                  width={BASE_PAPER_SIZE}
                  height={BASE_PAPER_SIZE}
                  opacity={viewMode === 'image' ? 1.0 : imageOpacity}
                  listening={false}
                />
              ) : (
                // Unrectified Source Image
                <KonvaImage
                  image={htmlImage}
                  x={0}
                  y={0}
                  width={BASE_PAPER_SIZE}
                  height={BASE_PAPER_SIZE / (paper.aspectRatio || 1)}
                  opacity={viewMode === 'image' ? 1.0 : imageOpacity}
                  listening={false}
                />
              )}
            </>
          )}

          {/* Layer 2: Grid */}
          {layers.grid && <GridLayer config={grid} zoom={camera.zoom} />}

          {/* Layer 3: Crease Lines (batched by color) */}
          {layers.creases && (
            <CreaseLayer
              creases={creases}
              selectedId={selectedCreaseId}
              zoom={camera.zoom}
              onSelectCrease={selectCrease}
            />
          )}

          {/* Layer 4: Intersections */}
          {layers.intersections && <IntersectionLayer creases={creases} zoom={camera.zoom} />}

          {/* Layer 5: Symmetry */}
          {layers.symmetry && (
            <SymmetryLayer
              axes={symmetry.axes}
              enabled={symmetry.enabled}
              points={points}
              zoom={camera.zoom}
            />
          )}
        </Layer>

        {/* Layer 2: Interactive Dynamic Overlay Layer */}
        <Layer
          x={camera.panX}
          y={camera.panY}
          scaleX={camera.zoom}
          scaleY={camera.zoom}
        >
          {/* Intermediate line drawing preview */}
          {drawingCreaseStart && cursorPaper && (
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
            />
          )}

          {/* Layer 6: Rulers */}
          {layers.rulers && <RulerLayer rulers={rulers} zoom={camera.zoom} />}

          {/* Layer 7: Measurements */}
          {layers.measurements && (
            <MeasurementLayer
              measurements={measurements}
              drawingStart={drawingMeasurementStart}
              cursor={snappingEnabled && snapCandidate ? snapCandidate.point : cursorPaper}
              selectedId={selectedMeasurementId}
              zoom={camera.zoom}
              onSelect={selectMeasurement}
            />
          )}

          {/* Layer 8: Reference Points */}
          {layers.points && (
            <PointLayer
              points={points}
              selectedId={selectedPointId}
              zoom={camera.zoom}
              onSelectPoint={selectPoint}
              onHoverPoint={setHoveredPoint}
            />
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

          {/* Layer 10: Snap indicator */}
          <SnapOverlay snap={snapCandidate} zoom={camera.zoom} />
        </Layer>
      </Stage>

      {/* Loupe Magnifier when Alt is pressed or active */}
      <Loupe
        cursorScreen={cursorScreen}
        cursorPaper={cursorPaper}
        snap={snapCandidate}
        sourceCanvas={rectifiedCanvas || (stageRef.current ? stageRef.current.toCanvas() : null)}
        active={isAltPressed || loupe.active}
        zoom={loupe.zoom}
        size={loupe.sizePx}
      />
    </div>
  );
};
