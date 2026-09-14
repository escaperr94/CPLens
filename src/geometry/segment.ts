import { Point2D, distance, distanceSquared } from './point';
import { CreaseType, lineFromPoints, lineAngle, matchOrigamiAngle } from './line';

export interface Segment {
  id: string;
  p1: Point2D;
  p2: Point2D;
  type?: CreaseType;
}

/**
 * Projects point p onto segment (p1, p2) and returns the clamped projected point and parameter t
 */
export function projectPointOntoSegment(
  p: Point2D,
  p1: Point2D,
  p2: Point2D
): { point: Point2D; t: number; distance: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const l2 = dx * dx + dy * dy;

  if (l2 < 1e-12) {
    return { point: { ...p1 }, t: 0, distance: distance(p, p1) };
  }

  // Parameter t
  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const proj: Point2D = {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };

  return {
    point: proj,
    t,
    distance: distance(p, proj),
  };
}

/**
 * Clips an infinite line passing through p1 and p2 to unit paper square [0, 1] x [0, 1]
 */
export function clipLineToUnitSquare(p1: Point2D, p2: Point2D): [Point2D, Point2D] | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (Math.hypot(dx, dy) < 1e-12) return null;

  const points: Point2D[] = [];

  // Intersect with x = 0
  if (Math.abs(dx) > 1e-9) {
    const t0 = (0 - p1.x) / dx;
    const y0 = p1.y + t0 * dy;
    if (y0 >= -1e-6 && y0 <= 1 + 1e-6) {
      points.push({ x: 0, y: Math.max(0, Math.min(1, y0)) });
    }

    // Intersect with x = 1
    const t1 = (1 - p1.x) / dx;
    const y1 = p1.y + t1 * dy;
    if (y1 >= -1e-6 && y1 <= 1 + 1e-6) {
      points.push({ x: 1, y: Math.max(0, Math.min(1, y1)) });
    }
  }

  // Intersect with y = 0
  if (Math.abs(dy) > 1e-9) {
    const s0 = (0 - p1.y) / dy;
    const x0 = p1.x + s0 * dx;
    if (x0 >= -1e-6 && x0 <= 1 + 1e-6) {
      points.push({ x: Math.max(0, Math.min(1, x0)), y: 0 });
    }

    // Intersect with y = 1
    const s1 = (1 - p1.y) / dy;
    const x1 = p1.x + s1 * dx;
    if (x1 >= -1e-6 && x1 <= 1 + 1e-6) {
      points.push({ x: Math.max(0, Math.min(1, x1)), y: 1 });
    }
  }

  // Deduplicate points
  const unique: Point2D[] = [];
  for (const pt of points) {
    if (!unique.some(u => distance(u, pt) < 1e-5)) {
      unique.push(pt);
    }
  }

  if (unique.length >= 2) {
    return [unique[0], unique[1]];
  }
  return null;
}

