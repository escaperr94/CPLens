import { Point2D, distance } from './point';
import { Segment } from './segment';

export interface CreaseIntersection {
  id: string;
  x: number;
  y: number;
  creaseIds: string[];
}

/**
 * Calculates intersection point of two 2D line segments
 * Returns Point2D if segments intersect, null otherwise
 */
export function segmentIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
  tolerance: number = 1e-6
): Point2D | null {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;

  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-12) {
    // Parallel or collinear
    return null;
  }

  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;

  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  if (t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance) {
    return {
      x: p1.x + t * d1x,
      y: p1.y + t * d1y,
    };
  }

  return null;
}

/**
 * Finds all intersections among a list of crease segments within the unit square [0,1]^2
 */
export function findCreaseIntersections(
  creases: Segment[],
  clusterRadius: number = 1e-4
): CreaseIntersection[] {
  const rawIntersections: { pt: Point2D; creaseIds: string[] }[] = [];

  for (let i = 0; i < creases.length; i++) {
    for (let j = i + 1; j < creases.length; j++) {
      const c1 = creases[i];
      const c2 = creases[j];
      // Fast AABB bounding box rejection
      if (
        Math.max(c1.p1.x, c1.p2.x) < Math.min(c2.p1.x, c2.p2.x) ||
        Math.min(c1.p1.x, c1.p2.x) > Math.max(c2.p1.x, c2.p2.x) ||
        Math.max(c1.p1.y, c1.p2.y) < Math.min(c2.p1.y, c2.p2.y) ||
        Math.min(c1.p1.y, c1.p2.y) > Math.max(c2.p1.y, c2.p2.y)
      ) continue;
      const pt = segmentIntersection(c1.p1, c1.p2, c2.p1, c2.p2);

      if (pt) {
        // Clamp to unit square
        if (pt.x >= -1e-5 && pt.x <= 1 + 1e-5 && pt.y >= -1e-5 && pt.y <= 1 + 1e-5) {
          const clamped = {
            x: Math.max(0, Math.min(1, pt.x)),
            y: Math.max(0, Math.min(1, pt.y)),
          };
          rawIntersections.push({ pt: clamped, creaseIds: [c1.id, c2.id] });
        }
      }
    }
  }

  // Cluster nearby intersections
  const clustered: CreaseIntersection[] = [];

  for (const raw of rawIntersections) {
    let found = false;
    for (const group of clustered) {
      if (distance(raw.pt, { x: group.x, y: group.y }) <= clusterRadius) {
        for (const cid of raw.creaseIds) {
          if (!group.creaseIds.includes(cid)) {
            group.creaseIds.push(cid);
          }
        }
        found = true;
        break;
      }
    }

    if (!found) {
      clustered.push({
        id: `int_${clustered.length + 1}`,
        x: raw.pt.x,
        y: raw.pt.y,
        creaseIds: [...raw.creaseIds],
      });
    }
  }

  return clustered;
}

