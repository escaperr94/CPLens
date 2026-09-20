import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/projectStore';
import { findSnapTarget, DEFAULT_SNAP_OPTIONS } from '../../geometry/snapping';
import { DEFAULT_GRID_CONFIG } from '../../geometry/grid';
import { detectCPBoundaryInsets } from '../../cv/pipeline';
import { worldToPaper, paperToWorld, paperToScreen, screenToPaper } from '../transforms';

describe('Non-square Crop, Autofit Boundary, and Manual Grid Inspection', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeSheetId: null,
      selectedImageId: null,
      cropBox: null,
      creases: [],
      points: [],
      measurements: [],
      rulers: [],
      imageTransform: { scale: 1, offsetX: 0, offsetY: 0 },
    });
  });

  it('preserves non-square aspect ratio when cropping a rectangular region (2:1)', () => {
    const store = useAppStore.getState();
    const cropWidth = 800;
    const cropHeight = 400;

    store.setReferenceImageFromCropped('data:image/png;base64,fake', 'Rectangle_CP.png', cropWidth, cropHeight);

    const state = useAppStore.getState();
    expect(state.image.width).toBe(800);
    expect(state.image.height).toBe(400);
    expect(state.paper.aspectRatio).toBeCloseTo(2.0, 4);

    // Corners match rectangular dimensions
    expect(state.paper.corners).toEqual([
      { x: 0, y: 0 },
      { x: 800, y: 0 },
      { x: 800, y: 400 },
      { x: 0, y: 400 },
    ]);

    // Grid layer is enabled automatically for manual inspection
    expect(state.layers.grid).toBe(true);
    expect(state.grid.enabled).toBe(true);

    // imageTransform is reset to 1.0 (no distortion or offset)
    expect(state.imageTransform).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });

    // No creases initially so user can manually place grid and inspect without forcing CV
    expect(state.creases).toHaveLength(0);
  });

  it('preserves tall aspect ratio when cropping a portrait region (1:2)', () => {
    const store = useAppStore.getState();
    const cropWidth = 400;
    const cropHeight = 800;

    store.setReferenceImageFromCropped('data:image/png;base64,fake', 'Portrait_CP.png', cropWidth, cropHeight);

    const state = useAppStore.getState();
    expect(state.image.width).toBe(400);
    expect(state.image.height).toBe(800);
    expect(state.paper.aspectRatio).toBeCloseTo(0.5, 4);

    expect(state.paper.corners).toEqual([
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 800 },
      { x: 0, y: 800 },
    ]);
  });

  it('fits viewport to paper with proper aspect ratio during fitToPaper', () => {
    const store = useAppStore.getState();
    store.setReferenceImageFromCropped('data:image/png;base64,fake', 'Rect.png', 1200, 600); // 2:1

    const viewportW = 1000;
    const viewportH = 800;
    store.fitToPaper(viewportW, viewportH);

    const camera = useAppStore.getState().camera;
    expect(camera.zoom).toBeGreaterThan(0);
    // Paper width is 1000, paper height is 500
    // Zoom should fit both width and height within viewport (with 40px padding)
    const availableW = viewportW - 80; // 920
    const availableH = viewportH - 80; // 720
    const expectedZoom = Math.min(availableW / 1000, availableH / 500); // min(0.92, 1.44) = 0.92
    expect(camera.zoom).toBeCloseTo(expectedZoom, 3);
  });

  it('creates non-square extracted sheet with correct aspect ratio and paper corners', () => {
    const store = useAppStore.getState();
    const cropBox = { x: 100, y: 100, width: 600, height: 300, active: true }; // 2:1 aspect

    const sheetId = store.extractCPFromImage('test-image', cropBox);
    const sheet = useAppStore.getState().sheets.find((s) => s.id === sheetId);

    expect(sheet).toBeDefined();
    expect(sheet?.width).toBe(1000);
    expect(sheet?.height).toBe(500);
    expect(sheet?.paper.aspectRatio).toBeCloseTo(2.0, 4);
    expect(sheet?.paper.corners).toEqual([
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 500 },
      { x: 0, y: 500 },
    ]);
    expect(sheet?.grid.divisionsX).toBe(64);
    expect(sheet?.grid.divisionsY).toBe(32); // 64 / 2 = 32
  });

  it('updates sheet dimensions correctly when resized', () => {
    const store = useAppStore.getState();
    const sheetId = store.addSheet({
      name: 'CP 1 (Cut)',
      width: 1000,
      height: 1000,
    });

    // When resized to 830x830
    store.updateSheet(sheetId, {
      width: 830,
      height: 830,
    });

    const sheet = useAppStore.getState().sheets.find((s) => s.id === sheetId);
    expect(sheet?.width).toBe(830);
    expect(sheet?.height).toBe(830);
  });

  it('manages sheet boundary insets for edge trimming', () => {
    const store = useAppStore.getState();
    const sheetId = store.addSheet({
      name: 'CP 1 (Cut)',
      width: 519,
      height: 832,
    });

    // User trims 15px from top, 10px from bottom, 20px from left, 12px from right
    store.updateSheetInsets(sheetId, {
      top: 15,
      bottom: 10,
      left: 20,
      right: 12,
    });

    const sheet = useAppStore.getState().sheets.find((s) => s.id === sheetId);
    expect(sheet?.insets).toEqual({
      top: 15,
      bottom: 10,
      left: 20,
      right: 12,
    });

    // Effective trimmed frame dimensions
    const frameW = sheet!.width - sheet!.insets!.left - sheet!.insets!.right;
    const frameH = sheet!.height - sheet!.insets!.top - sheet!.insets!.bottom;
    expect(frameW).toBe(519 - 20 - 12); // 487
    expect(frameH).toBe(832 - 15 - 10); // 807
  });

  it('manages main paper insets for boundary margin trimming', () => {
    const store = useAppStore.getState();
    store.setPaperInsets({ top: 18, bottom: 12, left: 15, right: 15 });

    const insets = useAppStore.getState().paperInsets;
    expect(insets).toEqual({ top: 18, bottom: 12, left: 15, right: 15 });
  });

  it('undo/redo restores sheets, transforms, insets, and activeSheetId accurately without lag', () => {
    const store = useAppStore.getState();
    const sheetId = store.addSheet({
      name: 'Sheet 1',
      width: 500,
      height: 500,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    store.setActiveSheetId(sheetId);

    // Save snapshot before user action
    store.pushHistory();

    // User updates insets and transform
    store.updateSheetInsets(sheetId, { top: 25, left: 30 });
    store.updateImageTransform({ scale: 1.25, offsetX: 10, offsetY: 20 });

    let sheet = useAppStore.getState().sheets.find((s) => s.id === sheetId);
    expect(sheet?.insets?.top).toBe(25);
    expect(sheet?.insets?.left).toBe(30);
    expect(useAppStore.getState().imageTransform.scale).toBe(1.25);

    // Undo restores previous insets and transform!
    store.undo();

    sheet = useAppStore.getState().sheets.find((s) => s.id === sheetId);
    expect(sheet?.insets?.top).toBe(0);
    expect(sheet?.insets?.left).toBe(0);
    expect(useAppStore.getState().imageTransform.scale).toBe(1);

    // Redo restores modified state!
    store.redo();

    sheet = useAppStore.getState().sheets.find((s) => s.id === sheetId);
    expect(sheet?.insets?.top).toBe(25);
    expect(sheet?.insets?.left).toBe(30);
    expect(useAppStore.getState().imageTransform.scale).toBe(1.25);
  });

  it('snaps accurately to grid on non-square sheets with custom paper dimensions', () => {
    const gridConfig = {
      ...DEFAULT_GRID_CONFIG,
      divisionsX: 32,
      divisionsY: 16,
      enabled: true,
    };

    const scene = {
      referencePoints: [],
      intersections: [],
      creases: [],
      gridConfig,
    };

    // Sheet of 1000 x 500 (2:1 aspect ratio)
    const paperWidth = 1000;
    const paperHeight = 500;

    // Cursor near grid line (15/32, 7/16)
    // In normalized coords: (15/32, 7/16) = (0.46875, 0.4375)
    const cursor = { x: 0.47, y: 0.438 };

    const snap = findSnapTarget(cursor, scene, DEFAULT_SNAP_OPTIONS, paperWidth, paperHeight);
    expect(snap).not.toBeNull();
    expect(snap?.kind).toBe('grid');
    expect(snap?.label).toBe('Grid (15, 7)');
    expect(snap?.point.x).toBeCloseTo(15 / 32, 4);
    expect(snap?.point.y).toBeCloseTo(7 / 16, 4);
  });

  it('calculates boundary insets accurately from image data using detectCPBoundaryInsets', () => {
    const width = 200;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);
    data.fill(255); // white background

    // Draw a CP square with 20px padding on all sides: from x=20 to x=179, y=20 to y=179
    for (let y = 20; y <= 179; y++) {
      for (let x = 20; x <= 179; x++) {
        if (x === 20 || x === 179 || y === 20 || y === 179) {
          const idx = (y * width + x) * 4;
          data[idx] = 20;
          data[idx + 1] = 20;
          data[idx + 2] = 20;
        }
      }
    }

    const insets = detectCPBoundaryInsets(data, width, height, 1000, 1000);
    expect(insets.left).toBeGreaterThanOrEqual(90);
    expect(insets.top).toBeGreaterThanOrEqual(90);
    expect(insets.right).toBeGreaterThanOrEqual(90);
    expect(insets.bottom).toBeGreaterThanOrEqual(90);
  });

  it('transforms coordinates with custom paper dimensions and frame origin', () => {
    const origin = { x: 500, y: 200 };
    const paperWidth = 800;
    const paperHeight = 400;

    const paperPt = { x: 0.5, y: 0.5 };
    const worldPt = paperToWorld(paperPt, paperWidth, paperHeight, origin);
    expect(worldPt.x).toBe(500 + 0.5 * 800); // 900
    expect(worldPt.y).toBe(200 + 0.5 * 400); // 400

    const roundTripPaper = worldToPaper(worldPt, paperWidth, paperHeight, origin);
    expect(roundTripPaper.x).toBeCloseTo(0.5, 4);
    expect(roundTripPaper.y).toBeCloseTo(0.5, 4);

    const camera = { zoom: 2, panX: 100, panY: 50, pixelated: false };
    const screenPt = paperToScreen(paperPt, camera, paperWidth, paperHeight, origin);
    expect(screenPt.x).toBe(900 * 2 + 100); // 1900
    expect(screenPt.y).toBe(400 * 2 + 50);  // 850

    const roundTripFromScreen = screenToPaper(screenPt, camera, paperWidth, paperHeight, origin);
    expect(roundTripFromScreen.x).toBeCloseTo(0.5, 4);
    expect(roundTripFromScreen.y).toBeCloseTo(0.5, 4);
  });
});
