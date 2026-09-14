import { BASE_PAPER_SIZE } from '../canvas/transforms';
import { Point2D, distance } from './point';
import { Segment, projectPointOntoSegment } from './segment';
import { CreaseIntersection } from './intersection';
import { GridConfig, nearestGridIntersection } from './grid';
import { SymmetryAxis, reflectPoint } from './symmetry';

export type SnapKind = 'reference-point' | 'intersection' | 'grid' | 'crease' | 'edge' | 'symmetry';

export interface SnapCandidate {
  point: Point2D;
  kind: SnapKind;
  distancePx: number;
  label?: string;
  sourceId?: string;
}

export interface SnapOptions {
  snapRadiusPx: number; // default e.g. 12 screen pixels
  zoom: number;         // current stage zoom
  enabledTargets: {
    points: boolean;
    intersections: boolean;
    grid: boolean;
    creases: boolean;
    paperBounds: boolean;
    symmetry: boolean;
  };
}

export interface GeometryScene {
  referencePoints: { id: string; x: number; y: number; label?: string }[];
  intersections: CreaseIntersection[];
  creases: Segment[];
  gridConfig: GridConfig;
  symmetryAxes?: SymmetryAxis[];
}

export const DEFAULT_SNAP_OPTIONS: SnapOptions = {
  snapRadiusPx: 12,
  zoom: 1,
  enabledTargets: {
    points: true,
    intersections: true,
    grid: true,
    creases: true,
    paperBounds: true,
    symmetry: true,
  },
};

/**
 * Finds best snap candidate given cursor in normalized paper coordinates
 */
export function findSnapTarget(
  cursor: Point2D,
  scene: GeometryScene,
  options: SnapOptions = DEFAULT_SNAP_OPTIONS
): SnapCandidate | null {
  const { snapRadiusPx, zoom, enabledTargets } = options;
  const maxWorldDist = snapRadiusPx / ((zoom || 1) * BASE_PAPER_SIZE);

  let bestCandidate: SnapCandidate | null = null;
  let minScreenDist = snapRadiusPx;

  // 1. Existing Reference Points (highest priority)
  if (enabledTargets.points) {
    for (let i = 0; i < scene.referencePoints.length; i++) {
      const p = scene.referencePoints[i];
      if (Math.abs(p.x - cursor.x) > maxWorldDist || Math.abs(p.y - cursor.y) > maxWorldDist) continue;
      const dWorld = distance(cursor, p);
      const dPx = dWorld * zoom * BASE_PAPER_SIZE;
      if (dPx < minScreenDist) {
        minScreenDist = dPx;
        bestCandidate = {
          point: { x: p.x, y: p.y },
          kind: 'reference-point',
          distancePx: dPx,
          label: p.label || 'Point',
          sourceId: p.id,
        };
      }
    }
  }

  // 2. Crease Intersections (high priority)
  if (enabledTargets.intersections) {
    for (let i = 0; i < scene.intersections.length; i++) {
      const inter = scene.intersections[i];
      if (Math.abs(inter.x - cursor.x) > maxWorldDist || Math.abs(inter.y - cursor.y) > maxWorldDist) continue;
      const dWorld = distance(cursor, inter);
      const dPx = dWorld * zoom * BASE_PAPER_SIZE;
      if (dPx < minScreenDist) {
        minScreenDist = dPx;
        bestCandidate = {
          point: { x: inter.x, y: inter.y },
          kind: 'intersection',
          distancePx: dPx,
          label: 'Intersection',
          sourceId: inter.id,
        };
      }
    }
  }

  if (bestCandidate) return bestCandidate;

  // 3. Grid Intersections
  if (enabledTargets.grid && scene.gridConfig.enabled) {
    const { paperPoint, gridX, gridY } = nearestGridIntersection(cursor, scene.gridConfig);
    const dWorld = distance(cursor, paperPoint);
    const dPx = dWorld * zoom * BASE_PAPER_SIZE;
    if (dPx < minScreenDist) {
      minScreenDist = dPx;
      bestCandidate = {
        point: paperPoint,
        kind: 'grid',
        distancePx: dPx,
        label: `Grid (${gridX}, ${gridY})`,
      };
    }
  }

  // 4. Crease Lines (project onto crease segment with fast AABB rejection)
  if (enabledTargets.creases) {
    for (let i = 0; i < scene.creases.length; i++) {
      const c = scene.creases[i];
      const minX = Math.min(c.p1.x, c.p2.x) - maxWorldDist;
      if (cursor.x < minX) continue;
      const maxX = Math.max(c.p1.x, c.p2.x) + maxWorldDist;
      if (cursor.x > maxX) continue;
      const minY = Math.min(c.p1.y, c.p2.y) - maxWorldDist;
      if (cursor.y < minY) continue;
      const maxY = Math.max(c.p1.y, c.p2.y) + maxWorldDist;
      if (cursor.y > maxY) continue;

      const proj = projectPointOntoSegment(cursor, c.p1, c.p2);
      const dPx = proj.distance * zoom * BASE_PAPER_SIZE;
      if (dPx < minScreenDist) {
        minScreenDist = dPx;
        bestCandidate = {
          point: proj.point,
          kind: 'crease',
          distancePx: dPx,
          label: `${c.type || 'Crease'} line`,
          sourceId: c.id,
        };
      }
    }
  }

  // 5. Paper Corners and Edges
  if (enabledTargets.paperBounds) {
    const corners: Point2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    for (const c of corners) {
      const dPx = distance(cursor, c) * zoom * BASE_PAPER_SIZE;
      if (dPx < minScreenDist) {
        minScreenDist = dPx;
        bestCandidate = {
          point: c,
          kind: 'edge',
          distancePx: dPx,
          label: 'Paper corner',
        };
      }
    }
  }

  return bestCandidate;
}

