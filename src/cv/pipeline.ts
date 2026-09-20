import { extractRasterLines, inferRasterGrid, analyzeRasterGrid, snapCreasesToOrigamiGrid } from './rasterLines';
import type { Point2D } from '../geometry/point';
import type { CreaseLine, ReferencePoint, AnalysisReport } from '../store/types';
import { lineFromPoints, type CreaseType } from '../geometry/line';
import { approximateFraction } from '../geometry/rational';
import { findCreaseIntersections } from '../geometry/intersection';

export interface PipelineProgressCallback {
  (step: string, percent: number): void;
}

export interface PipelineResult {
  corners: [Point2D, Point2D, Point2D, Point2D];
  gridDivisions: number;
  creases: CreaseLine[];
  referencePoints: ReferencePoint[];
  report: AnalysisReport;
}

/**
 * Finds bounding box of high straight-line density in image (CP region detection)
 */
export function detectCPRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { x0: number; y0: number; width: number; height: number } {
  const colDensity = new Int32Array(width);
  const rowDensity = new Int32Array(height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 50) {
        const isRed = r > 85 && g < 90 && b < 90;
        const isBlue = b > 85 && r < 90 && g < 90;
        const isDark = r < 120 && g < 120 && b < 120;
        const isColored = Math.abs(r - g) > 25 || Math.abs(r - b) > 25 || Math.abs(g - b) > 25;
        const isInk = isRed || isBlue || isDark || (isColored && (r + g + b < 650));

        if (isInk) {
          colDensity[x]++;
          rowDensity[y]++;
        }
      }
    }
  }

  const colThresh = Math.max(10, Math.floor(height * 0.04));
  let minX = 0, maxX = width - 1;
  for (let x = 0; x < width; x++) {
    if (colDensity[x] >= colThresh) {
      minX = x;
      break;
    }
  }
  for (let x = width - 1; x >= 0; x--) {
    if (colDensity[x] >= colThresh) {
      maxX = x;
      break;
    }
  }

  const rowThresh = Math.max(10, Math.floor(width * 0.04));
  let minY = 0, maxY = height - 1;
  for (let y = 0; y < height; y++) {
    if (rowDensity[y] >= rowThresh) {
      minY = y;
      break;
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (rowDensity[y] >= rowThresh) {
      maxY = y;
      break;
    }
  }

  let boxW = maxX - minX;
  let boxH = maxY - minY;

  // Only constrain to 1:1 square if overall image is approximately square (within 18%)
  const imgAspect = width / (height || 1);
  if (Math.abs(imgAspect - 1) < 0.18) {
    if (boxW / (boxH || 1) > 1.25) {
      boxW = boxH;
    } else if (boxH / (boxW || 1) > 1.25) {
      boxH = boxW;
    }
  }

  return {
    x0: minX,
    y0: minY,
    width: Math.max(50, boxW),
    height: Math.max(50, boxH),
  };
}

/**
 * Samples pixel color directly from image buffer with clamping
 */
function sampleColorPx(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  px: number,
  py: number
): { r: number; g: number; b: number } {
  const cx = Math.max(0, Math.min(imgW - 1, Math.round(px)));
  const cy = Math.max(0, Math.min(imgH - 1, Math.round(py)));
  const idx = (cy * imgW + cx) * 4;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
}

/**
 * Evaluates whether a line segment between grid nodes (gx1, gy1) and (gx2, gy2) is Mountain or Valley
 * Uses cross-section sampling perpendicular to the line to handle 1-2px raster lines robustly.
 */
function evaluateSegmentType(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  x0: number,
  y0: number,
  cropW: number,
  cropH: number,
  N: number,
  gx1: number,
  gy1: number,
  gx2: number,
  gy2: number
): CreaseType | null {
  const x1 = x0 + (gx1 / N) * cropW;
  const y1 = y0 + (gy1 / N) * cropH;
  const x2 = x0 + (gx2 / N) * cropW;
  const y2 = y0 + (gy2 / N) * cropH;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return null;

  // Normal vector perpendicular to segment
  const nx = -dy / len;
  const ny = dx / len;

  let redVotes = 0;
  let blueVotes = 0;
  const samples = [0.15, 0.35, 0.5, 0.65, 0.85];
  const offsets = [-2.0, -1.0, 0.0, 1.0, 2.0];

  for (const t of samples) {
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;

    let bestRed = false;
    let bestBlue = false;

    for (const off of offsets) {
      const { r, g, b } = sampleColorPx(data, imgW, imgH, cx + off * nx, cy + off * ny);

      if (r + g + b < 690) {
        if (r - Math.max(g, b) >= 15 && r > 70) {
          bestRed = true;
        } else if (b - Math.max(r, g) >= 10 && b > 60) {
          bestBlue = true;
        }
      }
    }

    if (bestRed) redVotes++;
    else if (bestBlue) blueVotes++;
  }

  if (redVotes >= 2 && redVotes > blueVotes) return 'mountain';
  if (blueVotes >= 2 && blueVotes > redVotes) return 'valley';
  return null;
}

/**
 * Snaps detected CP region to solid outer boundary lines if present
 */
function isBorderInk(r: number, g: number, b: number): boolean {
  if (r + g + b > 680) return false;
  if (r < 80 && g < 80 && b < 80) return true;
  if (r - Math.max(g, b) > 20 && r > 70) return true;
  if (b - Math.max(r, g) > 15 && b > 60) return true;
  if (r + g + b < 520) return true;
  return false;
}

export function refineCPRegion(
  data: Uint8ClampedArray,
  imgW: number,
  imgH: number,
  reg: { x0: number; y0: number; width: number; height: number }
): { x0: number; y0: number; width: number; height: number } {
  let bestY0 = reg.y0;
  let maxInkY0 = 0;
  for (let y = Math.max(0, reg.y0 - 24); y <= Math.min(imgH - 1, reg.y0 + 24); y++) {
    let count = 0;
    for (let x = reg.x0; x <= reg.x0 + reg.width; x++) {
      const { r, g, b } = sampleColorPx(data, imgW, imgH, x, y);
      if (isBorderInk(r, g, b)) count++;
    }
    if (count > maxInkY0 && count > reg.width * 0.4) {
      maxInkY0 = count;
      bestY0 = y;
    }
  }

  let bestY1 = reg.y0 + reg.height;
  let maxInkY1 = 0;
  for (let y = Math.min(imgH - 1, reg.y0 + reg.height + 24); y >= Math.max(0, reg.y0 + reg.height - 24); y--) {
    let count = 0;
    for (let x = reg.x0; x <= reg.x0 + reg.width; x++) {
      const { r, g, b } = sampleColorPx(data, imgW, imgH, x, y);
      if (isBorderInk(r, g, b)) count++;
    }
    if (count > maxInkY1 && count > reg.width * 0.4) {
      maxInkY1 = count;
      bestY1 = y;
    }
  }

  let bestX0 = reg.x0;
  let maxInkX0 = 0;
  for (let x = Math.max(0, reg.x0 - 24); x <= Math.min(imgW - 1, reg.x0 + 24); x++) {
    let count = 0;
    for (let y = bestY0; y <= bestY1; y++) {
      const { r, g, b } = sampleColorPx(data, imgW, imgH, x, y);
      if (isBorderInk(r, g, b)) count++;
    }
    if (count > maxInkX0 && count > (bestY1 - bestY0) * 0.4) {
      maxInkX0 = count;
      bestX0 = x;
    }
  }

  let bestX1 = reg.x0 + reg.width;
  let maxInkX1 = 0;
  for (let x = Math.min(imgW - 1, reg.x0 + reg.width + 24); x >= Math.max(0, reg.x0 + reg.width - 24); x--) {
    let count = 0;
    for (let y = bestY0; y <= bestY1; y++) {
      const { r, g, b } = sampleColorPx(data, imgW, imgH, x, y);
      if (isBorderInk(r, g, b)) count++;
    }
    if (count > maxInkX1 && count > (bestY1 - bestY0) * 0.4) {
      maxInkX1 = count;
      bestX1 = x;
    }
  }

  const w = bestX1 - bestX0;
  const h = bestY1 - bestY0;
  let finalW = w > 50 ? w : reg.width;
  let finalH = h > 50 ? h : reg.height;
  if (Math.abs(finalW - finalH) <= Math.max(finalW, finalH) * 0.03) {
    const avgDim = Math.round((finalW + finalH) / 2);
    finalW = avgDim;
    finalH = avgDim;
  }
  return {
    x0: bestX0,
    y0: bestY0,
    width: finalW,
    height: finalH,
  };
}
/**
 * Detects crease pattern boundary and returns insets to crop margins/whitespace.
 */
export function detectCPBoundaryInsets(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetWidth: number = 1000,
  targetHeight: number = 1000
): { top: number; right: number; bottom: number; left: number } {
  const rawRegion = detectCPRegion(data, width, height);
  const region = refineCPRegion(data, width, height, rawRegion);

  const padLeft = Math.max(0, region.x0);
  const padTop = Math.max(0, region.y0);
  const padRight = Math.max(0, width - (region.x0 + region.width));
  const padBottom = Math.max(0, height - (region.y0 + region.height));

  const scaleX = targetWidth / width;
  const scaleY = targetHeight / height;

  return {
    left: Math.round(padLeft * scaleX),
    top: Math.round(padTop * scaleY),
    right: Math.round(padRight * scaleX),
    bottom: Math.round(padBottom * scaleY),
  };
}


/**
 * Merge contiguous intervals [start, end]
 */
function mergeIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const res: [number, number][] = [intervals[0]];
  for (let k = 1; k < intervals.length; k++) {
    const prev = res[res.length - 1];
    const curr = intervals[k];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      res.push(curr);
    }
  }
  return res;
}

/**
 * Extracts and merges creases along the N x N grid lattice
 */
export function extractCreasesFromLattice(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  region: { x0: number; y0: number; width: number; height: number },
  N: number
): CreaseLine[] {
  const creases: CreaseLine[] = [];
  let idCounter = 1;

  // Add 4 paper boundary edges
  const boundaryEdges: [Point2D, Point2D][] = [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }],
    [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    [{ x: 0, y: 1 }, { x: 0, y: 0 }],
  ];
  for (const [p1, p2] of boundaryEdges) {
    creases.push({
      id: `cr_edge_${idCounter++}`,
      p1,
      p2,
      type: 'edge',
      confirmed: true,
      equation: lineFromPoints(p1, p2),
    });
  }

  // 1. Horizontal Segments with Collinear Merging
  for (const t of ['mountain', 'valley'] as const) {
    for (let j = 0; j <= N; j++) {
      const intervals: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        if (evaluateSegmentType(data, width, height, region.x0, region.y0, region.width, region.height, N, i, j, i + 1, j) === t) {
          intervals.push([i, i + 1]);
        }
      }
      for (const [start, end] of mergeIntervals(intervals)) {
        const p1 = { x: start / N, y: j / N };
        const p2 = { x: end / N, y: j / N };
        creases.push({
          id: `cr_h_${idCounter++}`,
          p1,
          p2,
          type: t,
          confirmed: true,
          equation: lineFromPoints(p1, p2),
        });
      }
    }
  }

  // 2. Vertical Segments with Collinear Merging
  for (const t of ['mountain', 'valley'] as const) {
    for (let i = 0; i <= N; i++) {
      const intervals: [number, number][] = [];
      for (let j = 0; j < N; j++) {
        if (evaluateSegmentType(data, width, height, region.x0, region.y0, region.width, region.height, N, i, j, i, j + 1) === t) {
          intervals.push([j, j + 1]);
        }
      }
      for (const [start, end] of mergeIntervals(intervals)) {
        const p1 = { x: i / N, y: start / N };
        const p2 = { x: i / N, y: end / N };
        creases.push({
          id: `cr_v_${idCounter++}`,
          p1,
          p2,
          type: t,
          confirmed: true,
          equation: lineFromPoints(p1, p2),
        });
      }
    }
  }

  // 3. Diagonal Segments (j - i = d)
  for (const t of ['mountain', 'valley'] as const) {
    for (let d = -N; d <= N; d++) {
      const intervals: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        const j = i + d;
        if (j >= 0 && j < N && evaluateSegmentType(data, width, height, region.x0, region.y0, region.width, region.height, N, i, j, i + 1, j + 1) === t) {
          intervals.push([i, i + 1]);
        }
      }
      for (const [start, end] of mergeIntervals(intervals)) {
        const p1 = { x: start / N, y: (start + d) / N };
        const p2 = { x: end / N, y: (end + d) / N };
        creases.push({
          id: `cr_d1_${idCounter++}`,
          p1,
          p2,
          type: t,
          confirmed: true,
          equation: lineFromPoints(p1, p2),
        });
      }
    }
  }

  // 4. Anti-Diagonal Segments (i + j = s - 1)
  for (const t of ['mountain', 'valley'] as const) {
    for (let s = 1; s <= 2 * N - 1; s++) {
      const intervals: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        const j = s - i - 1;
        if (j >= 0 && j < N && evaluateSegmentType(data, width, height, region.x0, region.y0, region.width, region.height, N, i + 1, j, i, j + 1) === t) {
          intervals.push([i, i + 1]);
        }
      }
      for (const [start, end] of mergeIntervals(intervals)) {
        const p1 = { x: start / N, y: (s - start) / N };
        const p2 = { x: end / N, y: (s - end) / N };
        creases.push({
          id: `cr_d2_${idCounter++}`,
          p1,
          p2,
          type: t,
          confirmed: true,
          equation: lineFromPoints(p1, p2),
        });
      }
    }
  }

  return creases;
}

/**
 * Main asynchronous pipeline executing all 7 steps:
 * 1. Detecting CP region
 * 2. Detecting paper boundary
 * 3. Rectifying perspective
 * 4. Detecting crease lines
 * 5. Inferring grid (32x32)
 * 6. Computing intersections
 * 7. Recovering reference points
 */
export interface AnalysisOptions {
  gridHint?: number;
}

export async function analyzePixels(
  data: Uint8ClampedArray, width: number, height: number,
  onProgress?: PipelineProgressCallback,
  options?: AnalysisOptions
): Promise<PipelineResult> {
  // Step 1: Detecting CP region...
  onProgress?.('Detecting CP region...', 15);
  await new Promise((r) => setTimeout(r, 60));
  const rawRegion = detectCPRegion(data, width, height);
  const region = refineCPRegion(data, width, height, rawRegion);

  // Step 2: Detecting paper boundary...
  onProgress?.('Detecting paper boundary...', 30);
  await new Promise((r) => setTimeout(r, 60));
  const corners: [Point2D, Point2D, Point2D, Point2D] = [
    { x: region.x0, y: region.y0 },
    { x: region.x0 + region.width, y: region.y0 },
    { x: region.x0 + region.width, y: region.y0 + region.height },
    { x: region.x0, y: region.y0 + region.height },
  ];

  // Step 3: Locating axis-aligned paper bounds...
  onProgress?.('Locating axis-aligned paper bounds...', 45);
  await new Promise((r) => setTimeout(r, 60));

  // Step 4 & 5: Inferring grid & detecting crease lines...
  onProgress?.('Detecting colored / monochrome centerlines...', 60);
  await new Promise((r) => setTimeout(r, 60));

  const size = Math.max(region.width, region.height);
  const rawLines = extractRasterLines(data, width, height, region);
  const gridInfo = analyzeRasterGrid(rawLines, size, options?.gridHint);
  const N = gridInfo.n;

  const creases: CreaseLine[] = gridInfo.isGrid
    ? snapCreasesToOrigamiGrid(rawLines, N, size)
    : rawLines;

  // Guarantee the 4 square paper boundary edges are present
  const hasEdge = (p1: Point2D, p2: Point2D) =>
    creases.some(
      (c) =>
        c.type === 'edge' &&
        ((Math.hypot(c.p1.x - p1.x, c.p1.y - p1.y) < 0.05 && Math.hypot(c.p2.x - p2.x, c.p2.y - p2.y) < 0.05) ||
         (Math.hypot(c.p1.x - p2.x, c.p1.y - p2.y) < 0.05 && Math.hypot(c.p2.x - p1.x, c.p2.y - p1.y) < 0.05))
    );

  const boundaryEdges: [Point2D, Point2D][] = [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }],
    [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    [{ x: 0, y: 1 }, { x: 0, y: 0 }],
  ];

  let edgeCounter = 1;
  for (const [p1, p2] of boundaryEdges) {
    if (!hasEdge(p1, p2)) {
      creases.unshift({
        id: `paper_edge_${edgeCounter++}`,
        p1,
        p2,
        type: 'edge',
        confirmed: true,
        equation: lineFromPoints(p1, p2),
      });
    }
  }
  onProgress?.('Detecting and vectorizing crease lines...', 75);
  await new Promise((r) => setTimeout(r, 80));



  // Step 6: Computing intersections...
  onProgress?.('Computing intersections...', 85);
  await new Promise((r) => setTimeout(r, 60));
  const rawIntersections = findCreaseIntersections(creases, 1.5 / Math.max(region.width, region.height));
  const intersectionCount = rawIntersections.length;
  // Raster segment endpoints are useful reference proposals even when a crossing is occluded.
  const endpointTolerance = 1.5 / Math.max(region.width, region.height);
  for (const crease of creases) for (const endpoint of [crease.p1, crease.p2]) {
    const existing = rawIntersections.find(p => Math.hypot(p.x-endpoint.x,p.y-endpoint.y) <= endpointTolerance);
    if (existing) { if (!existing.creaseIds.includes(crease.id)) existing.creaseIds.push(crease.id); }
    else rawIntersections.push({id: `end_${rawIntersections.length}`, ...endpoint, creaseIds:[crease.id]});
  }

  // Step 7: Recovering reference points...
  onProgress?.('Recovering reference points...', 95);
  await new Promise((r) => setTimeout(r, 60));

  const referencePoints: ReferencePoint[] = [];
  let ptId = 1;

  for (const inter of rawIntersections) {
    const fx = approximateFraction(inter.x, { maxDenominator: N });
    const fy = approximateFraction(inter.y, { maxDenominator: N });

    const complexity = (fx.denominator + fy.denominator) / (2 * N);
    const degree = inter.creaseIds.length;
    const confidence = Math.min(0.99, Math.max(0.7, 0.98 - complexity * 0.15 + (degree >= 3 ? 0.05 : 0)));
    const residualPx = Math.hypot(fx.error * region.width, fy.error * region.height);

    referencePoints.push({
      id: `P${ptId++}`,
      x: inter.x,
      y: inter.y,
      xRaw: Number(inter.x.toFixed(5)),
      yRaw: Number(inter.y.toFixed(5)),
      xGrid: fx,
      yGrid: fy,
      confidence: Math.exp(-residualPx / 2),
      residualPx,
      incidentCreases: [...inter.creaseIds],
      label: `P${ptId - 1}`,
      color: '#0D99FF',
      isAutoGenerated: true,
    });
  }

  referencePoints.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const report: AnalysisReport = {
    cpRegionDetected: true,
    paperBoundaryDetected: true,
    perspectiveCorrected: false,
    creaseSegmentsCount: creases.length,
    baseGrid: `${N} × ${N}`,
    intersectionsCount: intersectionCount,
    referencePointsCount: referencePoints.length,
    visible: true,
  };

  onProgress?.('Analysis complete!', 100);

  return {
    corners,
    gridDivisions: N,
    creases,
    referencePoints,
    report,
  };
}
