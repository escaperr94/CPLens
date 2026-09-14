import React, { useRef, useEffect } from 'react';
import { Point2D } from '../geometry/point';
import { approximateFraction } from '../geometry/rational';
import { SnapCandidate } from '../geometry/snapping';

interface LoupeProps {
  cursorScreen: Point2D | null;
  cursorPaper: Point2D | null;
  snap: SnapCandidate | null;
  sourceCanvas: HTMLCanvasElement | null;
  active: boolean;
  zoom?: number;
  size?: number;
}

export const Loupe: React.FC<LoupeProps> = ({
  cursorScreen,
  cursorPaper,
  snap,
  sourceCanvas,
  active,
  zoom = 8,
  size = 170,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || !cursorScreen || !canvasRef.current || !sourceCanvas) return;

    const loupeCanvas = canvasRef.current;
    const ctx = loupeCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Source area to crop around cursorScreen
    const sampleW = size / zoom;
    const sampleH = size / zoom;
    const sx = cursorScreen.x - sampleW / 2;
    const sy = cursorScreen.y - sampleH / 2;

    ctx.imageSmoothingEnabled = false; // pixelated inspection
    ctx.drawImage(sourceCanvas, sx, sy, sampleW, sampleH, 0, 0, size, size);

    // Draw reticle
    const center = size / 2;
    ctx.strokeStyle = '#0D99FF';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    // Horizontal
    ctx.moveTo(0, center);
    ctx.lineTo(center - 8, center);
    ctx.moveTo(center + 8, center);
    ctx.lineTo(size, center);

    // Vertical
    ctx.moveTo(center, 0);
    ctx.lineTo(center, center - 8);
    ctx.moveTo(center, center + 8);
    ctx.lineTo(center, size);
    ctx.stroke();

    // Center reticle ring
    ctx.strokeStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.stroke();
  }, [active, cursorScreen, sourceCanvas, zoom, size]);

  if (!active || !cursorScreen) return null;

  const posX = cursorScreen.x + 20;
  const posY = cursorScreen.y - size - 20;

  const fracX = cursorPaper ? approximateFraction(cursorPaper.x, { maxDenominator: 64 }) : null;
  const fracY = cursorPaper ? approximateFraction(cursorPaper.y, { maxDenominator: 64 }) : null;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-full border-2 border-white bg-white shadow-figma-menu overflow-hidden"
      style={{
        width: size,
        height: size,
        left: Math.max(10, Math.min(window.innerWidth - size - 10, posX)),
        top: Math.max(10, Math.min(window.innerHeight - size - 10, posY)),
      }}
    >
      <canvas ref={canvasRef} width={size} height={size} className="w-full h-full" />
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="rounded-full bg-white/95 px-2 py-0.5 font-mono text-[10px] text-neutral-800 border border-neutral-200 shadow-sm font-semibold">
          {zoom}× {fracX && fracY ? `(${fracX.formatted}, ${fracY.formatted})` : ''}
        </span>
      </div>
    </div>
  );
};
