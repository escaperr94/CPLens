import { Point2D } from './point';
import { LineEquation, lineFromPoints } from './line';

export type SymmetryType = 'vertical' | 'horizontal' | 'custom' | 'diagonal-main' | 'diagonal-anti';

export interface SymmetryAxis {
  id: string;
  type: SymmetryType;
  p1: Point2D;
  p2: Point2D;
  active: boolean;
}

/**
 * Reflects a point p across the line ax + by + c = 0 (where a^2 + b^2 = 1)
 */
export function reflectPointAcrossLine(p: Point2D, line: LineEquation): Point2D {
  const d = line.a * p.x + line.b * p.y + line.c;
  return {
    x: p.x - 2 * line.a * d,
    y: p.y - 2 * line.b * d,
  };
}

/**
 * Reflects a point across a symmetry axis
 */
export function reflectPoint(p: Point2D, axis: SymmetryAxis): Point2D {
  if (axis.type === 'vertical') {
    const a = axis.p1.x; // line x = a
    return { x: 2 * a - p.x, y: p.y };
  }
  if (axis.type === 'horizontal') {
    const b = axis.p1.y; // line y = b
    return { x: p.x, y: 2 * b - p.y };
  }
  if (axis.type === 'diagonal-main') {
    // line y = x -> (y, x)
    return { x: p.y, y: p.x };
  }
  if (axis.type === 'diagonal-anti') {
    // line x + y = 1 -> (1 - y, 1 - x)
    return { x: 1 - p.y, y: 1 - p.x };
  }

  const line = lineFromPoints(axis.p1, axis.p2);
  return reflectPointAcrossLine(p, line);
}

