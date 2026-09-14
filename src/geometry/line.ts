import { Point2D, distance } from './point';

export type CreaseType = 'mountain' | 'valley' | 'edge' | 'auxiliary' | 'unknown';

export interface LineEquation {
  a: number; // ax + by + c = 0
  b: number;
  c: number;
}

export interface OrigamiAngleMatch {
  standardAngle: number;
  label: string;
  error: number;
}

// Well-known origami angles
const COMMON_ORIGAMI_ANGLES = [
  { angle: 0, label: '0° (Horizontal)' },
  { angle: 90, label: '90° (Vertical)' },
  { angle: 45, label: '45° (Diagonal)' },
  { angle: 135, label: '135° (Diagonal)' },
  { angle: 22.5, label: '22.5° (8-gon / Bisector)' },
  { angle: 67.5, label: '67.5° (8-gon / Bisector)' },
  { angle: 112.5, label: '112.5° (8-gon / Bisector)' },
  { angle: 157.5, label: '157.5° (8-gon / Bisector)' },
  { angle: 30, label: '30° (Triangle)' },
  { angle: 60, label: '60° (Triangle)' },
  { angle: 120, label: '120° (Triangle)' },
  { angle: 150, label: '150° (Triangle)' },
  { angle: 26.565, label: '26.565° (atan 1/2)' },
  { angle: 63.435, label: '63.435° (atan 2)' },
  { angle: 18.435, label: '18.435° (atan 1/3)' },
  { angle: 71.565, label: '71.565° (atan 3)' },
];

/**
 * Creates normalized line equation ax + by + c = 0 passing through p1 and p2
 */
export function lineFromPoints(p1: Point2D, p2: Point2D): LineEquation {
  let a = p2.y - p1.y;
  let b = p1.x - p2.x;
  let c = p2.x * p1.y - p1.x * p2.y;

  const norm = Math.hypot(a, b);
  if (norm > 1e-12) {
    a /= norm;
    b /= norm;
    c /= norm;
  }
  return { a, b, c };
}

/**
 * Distance from point to line ax + by + c = 0
 */
export function distanceToLine(p: Point2D, line: LineEquation): number {
  return Math.abs(line.a * p.x + line.b * p.y + line.c);
}

/**
 * Calculates angle in degrees in range [0, 180)
 */
export function lineAngle(p1: Point2D, p2: Point2D): number {
  let deg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  if (deg < 0) deg += 180;
  if (deg >= 180) deg -= 180;
  return deg;
}

/**
 * Finds closest well-known origami angle
 */
export function matchOrigamiAngle(angleDeg: number, tolerance: number = 3.0): OrigamiAngleMatch | null {
  // Normalize angle to [0, 180)
  let normAngle = angleDeg % 180;
  if (normAngle < 0) normAngle += 180;

  let bestMatch: OrigamiAngleMatch | null = null;
  let minDiff = Infinity;

  for (const item of COMMON_ORIGAMI_ANGLES) {
    let diff = Math.abs(normAngle - item.angle);
    if (diff > 90) diff = 180 - diff;

    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = {
        standardAngle: item.angle,
        label: item.label,
        error: diff,
      };
    }
  }

  if (bestMatch && bestMatch.error <= tolerance) {
    return bestMatch;
  }
  return null;
}

