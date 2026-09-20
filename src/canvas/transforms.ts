import { Point2D } from '../geometry/point';
import { CameraState } from '../store/types';

export const BASE_PAPER_SIZE = 1000; // standard world units for 1.0 x 1.0 paper

/**
 * Converts normalized paper coordinate [0, 1] to world coordinates
 */
export function paperToWorld(
  p: Point2D,
  paperWidth: number = BASE_PAPER_SIZE,
  paperHeight: number = BASE_PAPER_SIZE,
  origin: Point2D = { x: 0, y: 0 }
): Point2D {
  return {
    x: origin.x + p.x * (paperWidth || BASE_PAPER_SIZE),
    y: origin.y + p.y * (paperHeight || BASE_PAPER_SIZE),
  };
}

/**
 * Converts world coordinates to normalized paper coordinates [0, 1]
 */
export function worldToPaper(
  p: Point2D,
  paperWidth: number = BASE_PAPER_SIZE,
  paperHeight: number = BASE_PAPER_SIZE,
  origin: Point2D = { x: 0, y: 0 }
): Point2D {
  return {
    x: (p.x - origin.x) / (paperWidth || BASE_PAPER_SIZE),
    y: (p.y - origin.y) / (paperHeight || BASE_PAPER_SIZE),
  };
}

/**
 * Converts normalized paper coordinate [0, 1] to screen pixel coordinates
 */
export function paperToScreen(
  p: Point2D,
  camera: CameraState,
  paperWidth: number = BASE_PAPER_SIZE,
  paperHeight: number = BASE_PAPER_SIZE,
  origin: Point2D = { x: 0, y: 0 }
): Point2D {
  const world = paperToWorld(p, paperWidth, paperHeight, origin);
  return {
    x: world.x * camera.zoom + camera.panX,
    y: world.y * camera.zoom + camera.panY,
  };
}

/**
 * Converts screen pixel coordinates to normalized paper coordinate [0, 1]
 */
export function screenToPaper(
  screen: Point2D,
  camera: CameraState,
  paperWidth: number = BASE_PAPER_SIZE,
  paperHeight: number = BASE_PAPER_SIZE,
  origin: Point2D = { x: 0, y: 0 }
): Point2D {
  const worldX = (screen.x - camera.panX) / camera.zoom;
  const worldY = (screen.y - camera.panY) / camera.zoom;
  return worldToPaper({ x: worldX, y: worldY }, paperWidth, paperHeight, origin);
}

