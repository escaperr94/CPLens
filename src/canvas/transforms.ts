import { Point2D } from '../geometry/point';
import { CameraState } from '../store/types';

export const BASE_PAPER_SIZE = 1000; // standard world units for 1.0 x 1.0 paper

/**
 * Converts normalized paper coordinate [0, 1] to world coordinates [0, BASE_PAPER_SIZE]
 */
export function paperToWorld(p: Point2D): Point2D {
  return {
    x: p.x * BASE_PAPER_SIZE,
    y: p.y * BASE_PAPER_SIZE,
  };
}

/**
 * Converts world coordinates to normalized paper coordinates [0, 1]
 */
export function worldToPaper(p: Point2D): Point2D {
  return {
    x: p.x / BASE_PAPER_SIZE,
    y: p.y / BASE_PAPER_SIZE,
  };
}

/**
 * Converts normalized paper coordinate [0, 1] to screen pixel coordinates
 */
export function paperToScreen(p: Point2D, camera: CameraState): Point2D {
  const world = paperToWorld(p);
  return {
    x: world.x * camera.zoom + camera.panX,
    y: world.y * camera.zoom + camera.panY,
  };
}

/**
 * Converts screen pixel coordinates to normalized paper coordinate [0, 1]
 */
export function screenToPaper(screen: Point2D, camera: CameraState): Point2D {
  const worldX = (screen.x - camera.panX) / camera.zoom;
  const worldY = (screen.y - camera.panY) / camera.zoom;
  return worldToPaper({ x: worldX, y: worldY });
}

