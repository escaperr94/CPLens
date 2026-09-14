export interface Point2D {
  x: number;
  y: number;
}

export function createPoint(x: number, y: number): Point2D {
  return { x, y };
}

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function distanceSquared(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

export function lerp(p1: Point2D, p2: Point2D, t: number): Point2D {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function addPoints(p1: Point2D, p2: Point2D): Point2D {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtractPoints(p1: Point2D, p2: Point2D): Point2D {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function scalePoint(p: Point2D, scale: number): Point2D {
  return { x: p.x * scale, y: p.y * scale };
}

export function dotProduct(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function crossProduct(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.y - v1.y * v2.x;
}

export function angleBetween(p1: Point2D, p2: Point2D): number {
  // Returns angle in degrees (-180 to 180) from p1 to p2
  const radians = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  let deg = (radians * 180) / Math.PI;
  return deg;
}

export function clamp(val: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, val));
}

export function clampPoint(p: Point2D, min: number = 0, max: number = 1): Point2D {
  return {
    x: clamp(p.x, min, max),
    y: clamp(p.y, min, max),
  };
}

