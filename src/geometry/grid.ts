import { Point2D } from './point';

export interface GridConfig {
  enabled: boolean;
  divisionsX: number;
  divisionsY: number;
  majorSubdivisions?: number;
  origin: Point2D; // (0,0) offset
  scaleX: number;  // 1.0 = covers whole width
  scaleY: number;  // 1.0 = covers whole height
  rotation: number; // degrees
  opacity: number;
  color: string;
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  enabled: true,
  divisionsX: 64,
  divisionsY: 64,
  majorSubdivisions: 8,
  origin: { x: 0, y: 0 },
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 0.45,
  color: '#3b82f6',
};

export const ORIGAMI_GRID_PRESETS = [8, 12, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 120, 128] as const;

export function getOptimalMajorSubdivisions(divisions: number): number {
  if (divisions % 8 === 0) return 8;
  if (divisions % 6 === 0) return 6;
  if (divisions % 5 === 0) return 5;
  if (divisions % 4 === 0) return 4;
  return Math.min(divisions, 4);
}

/**
 * Transforms normalized paper coordinates to grid-relative coordinates [0, divisionsX] x [0, divisionsY]
 */
export function paperToGridCoords(p: Point2D, config: GridConfig): Point2D {
  // Translate by origin
  let x = (p.x - config.origin.x) / (config.scaleX || 1);
  let y = (p.y - config.origin.y) / (config.scaleY || 1);

  // Rotate if needed
  if (config.rotation !== 0) {
    const rad = (-config.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    x = rx;
    y = ry;
  }

  return {
    x: x * config.divisionsX,
    y: y * config.divisionsY,
  };
}

/**
 * Transforms grid coordinates [0, divisionsX] back to normalized paper coordinates
 */
export function gridToPaperCoords(g: Point2D, config: GridConfig): Point2D {
  let x = (g.x / config.divisionsX) * (config.scaleX || 1);
  let y = (g.y / config.divisionsY) * (config.scaleY || 1);

  if (config.rotation !== 0) {
    const rad = (config.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    x = rx;
    y = ry;
  }

  return {
    x: x + config.origin.x,
    y: y + config.origin.y,
  };
}

/**
 * Finds nearest grid intersection in paper coordinates
 */
export function nearestGridIntersection(p: Point2D, config: GridConfig): {
  paperPoint: Point2D;
  gridX: number;
  gridY: number;
} {
  const g = paperToGridCoords(p, config);
  const gridX = Math.round(g.x);
  const gridY = Math.round(g.y);
  const paperPoint = gridToPaperCoords({ x: gridX, y: gridY }, config);

  return { paperPoint, gridX, gridY };
}

