import { Point2D } from '../geometry/point';
import { createUnitSquareHomography, applyHomography } from '../geometry/homography';

/**
 * Warps a source image quadrilateral defined by 4 corners into a square output canvas
 */
export function rectifyImage(
  image: HTMLImageElement,
  corners: [Point2D, Point2D, Point2D, Point2D],
  outputSize: number = 1600
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Check if it's purely axis-aligned rectangle
  const isRect =
    Math.abs(corners[0].y - corners[1].y) < 1.5 &&
    Math.abs(corners[1].x - corners[2].x) < 1.5 &&
    Math.abs(corners[2].y - corners[3].y) < 1.5 &&
    Math.abs(corners[3].x - corners[0].x) < 1.5;

  if (isRect) {
    const sx = Math.min(corners[0].x, corners[3].x);
    const sy = Math.min(corners[0].y, corners[1].y);
    const sw = Math.max(corners[1].x, corners[2].x) - sx;
    const sh = Math.max(corners[2].y, corners[3].y) - sy;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
    return canvas;
  }

  // Draw source image to temp canvas to sample pixels
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = image.naturalWidth || image.width;
  srcCanvas.height = image.naturalHeight || image.height;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) return canvas;

  srcCtx.drawImage(image, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const srcPixels = srcData.data;
  const srcW = srcCanvas.width;
  const srcH = srcCanvas.height;

  // Compute inverse homography from normalized (0..1) to source image pixels
  const { toImage } = createUnitSquareHomography(corners);

  const outData = ctx.createImageData(outputSize, outputSize);
  const outPixels = outData.data;

  // Sample each pixel in output
  for (let y = 0; y < outputSize; y++) {
    const normY = y / outputSize;
    for (let x = 0; x < outputSize; x++) {
      const normX = x / outputSize;
      const srcPt = applyHomography({ x: normX, y: normY }, toImage);

      const x0 = Math.floor(srcPt.x);
      const y0 = Math.floor(srcPt.y);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y1 = Math.min(srcH - 1, y0 + 1);
      const fx = srcPt.x - x0;
      const fy = srcPt.y - y0;

      const outIdx = (y * outputSize + x) * 4;

      if (x0 >= 0 && x1 < srcW && y0 >= 0 && y1 < srcH) {
        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        for (let c = 0; c < 4; c++) {
          const top = srcPixels[idx00 + c] * (1 - fx) + srcPixels[idx10 + c] * fx;
          const bot = srcPixels[idx01 + c] * (1 - fx) + srcPixels[idx11 + c] * fx;
          outPixels[outIdx + c] = Math.round(top * (1 - fy) + bot * fy);
        }
      } else {
        outPixels[outIdx] = 255;
        outPixels[outIdx + 1] = 255;
        outPixels[outIdx + 2] = 255;
        outPixels[outIdx + 3] = 0; // transparent outside
      }
    }
  }

  ctx.putImageData(outData, 0, 0);
  return canvas;
}

