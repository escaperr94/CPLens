import React from 'react';
import { Group, Circle, Line, Text, Rect } from 'react-konva';
import { SnapCandidate } from '../../geometry/snapping';
import { BASE_PAPER_SIZE } from '../transforms';
import { formatGridFraction } from '../../geometry/rational';
import { GridConfig } from '../../geometry/grid';
import { useAppStore } from '../../store/projectStore';

export interface SnapOverlayProps {
  snap: SnapCandidate | null;
  zoom: number;
  gridConfig?: GridConfig;
  paperWidth?: number;
  paperHeight?: number;
}

let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function measureTextWidth(text: string, font: string): number {
  if (typeof document === 'undefined') return text.length * 7;
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCtx = measureCanvas.getContext('2d');
  }
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function getSnapBadgeInfo(snap: SnapCandidate): { typeLabel: string; accentColor: string } {
  switch (snap.kind) {
    case 'crease': {
      const lower = (snap.label || '').toLowerCase();
      if (lower.includes('mountain')) {
        return { typeLabel: 'Mountain line', accentColor: '#EF4444' };
      } else if (lower.includes('valley')) {
        return { typeLabel: 'Valley line', accentColor: '#3B82F6' };
      } else if (lower.includes('edge')) {
        return { typeLabel: 'Paper edge', accentColor: '#F59E0B' };
      } else if (lower.includes('auxiliary')) {
        return { typeLabel: 'Auxiliary line', accentColor: '#94A3B8' };
      }
      return {
        typeLabel: snap.label ? (snap.label.charAt(0).toUpperCase() + snap.label.slice(1)) : 'Crease line',
        accentColor: '#0D99FF',
      };
    }
    case 'grid':
      return { typeLabel: 'Grid', accentColor: '#0EA5E9' };
    case 'intersection':
      return { typeLabel: 'Intersection', accentColor: '#A855F7' };
    case 'reference-point':
      return {
        typeLabel: snap.label ? (snap.label.charAt(0).toUpperCase() + snap.label.slice(1)) : 'Point',
        accentColor: '#10B981',
      };
    case 'edge':
      return { typeLabel: snap.label || 'Paper corner', accentColor: '#F59E0B' };
    case 'symmetry':
      return { typeLabel: 'Symmetry', accentColor: '#EC4899' };
    default:
      return { typeLabel: snap.label || 'Snap', accentColor: '#0D99FF' };
  }
}

export const SnapOverlay: React.FC<SnapOverlayProps> = ({ snap, zoom, gridConfig, paperWidth, paperHeight }) => {
  const storeGrid = useAppStore((s) => s.grid);
  const grid = gridConfig ?? storeGrid;

  if (!snap) return null;

  const pW = paperWidth || BASE_PAPER_SIZE;
  const pH = paperHeight || BASE_PAPER_SIZE;
  const wx = snap.point.x * pW;
  const wy = snap.point.y * pH;

  // Visual scaling: elements keep constant pixel size on screen
  const s = 1 / zoom;

  // Grid divisions for X and Y
  const divX = grid?.divisionsX || 32;
  const divY = grid?.divisionsY || 32;

  const strX = formatGridFraction(snap.point.x, divX);
  const strY = formatGridFraction(snap.point.y, divY);
  const coordText = `(${strX}, ${strY})`;

  const { typeLabel, accentColor } = getSnapBadgeInfo(snap);

  // Reticle dimensions
  const ringRadius = 6.5 * s;
  const strokeW = 1.5 * s;
  const tickInner = 6.5 * s;
  const tickOuter = 11.5 * s;

  // Typography for badge
  const labelFont = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  const coordFont = '600 11px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

  const labelWidthScreen = measureTextWidth(typeLabel, labelFont);
  const coordWidthScreen = measureTextWidth(coordText, coordFont);

  const labelWidth = labelWidthScreen * s;
  const coordWidth = coordWidthScreen * s;

  // Badge layout (horizontal flow):
  // [padH] [dot] [gap] [label] [gap] [sep] [gap] [coord] [padH]
  const padH = 8 * s;
  const dotR = 3 * s;
  const gapDotToLabel = 6 * s;
  const gapLabelToSep = 7 * s;
  const gapSepToCoord = 7 * s;

  const dotCenterX = padH + dotR;
  const labelX = dotCenterX + dotR + gapDotToLabel;
  const sepX = labelX + labelWidth + gapLabelToSep;
  const coordX = sepX + gapSepToCoord;
  const badgeWidth = coordX + coordWidth + padH;
  const badgeHeight = 22 * s;

  // Smart placement of tooltip around the reticle
  // Default: floating top-right
  let tooltipX = ringRadius + 6 * s;
  let tooltipY = -ringRadius - 4 * s - badgeHeight;

  // If too close to top edge, flip below
  if (wy + tooltipY < 6 * s) {
    tooltipY = ringRadius + 6 * s;
  }

  // If too close to bottom edge, flip above
  if (wy + tooltipY + badgeHeight > pH) {
    tooltipY = -ringRadius - 4 * s - badgeHeight;
  }

  // If too close to right edge, flip left
  if (wx + tooltipX + badgeWidth > pW) {
    tooltipX = -ringRadius - 6 * s - badgeWidth;
  }

  // If too close to left edge, shift right
  if (wx + tooltipX < 6 * s) {
    tooltipX = 6 * s - wx;
  }

  return (
    <Group x={wx} y={wy} listening={false}>
      {/* 1. Precision Snap Reticle (Figma Smart Guide style) */}
      <Circle
        radius={ringRadius}
        stroke={accentColor}
        strokeWidth={strokeW}
        fill="rgba(13, 153, 255, 0.05)"
        shadowColor="rgba(0, 0, 0, 0.35)"
        shadowBlur={3 * s}
      />
      {/* Center precision pinpoint */}
      <Circle
        radius={1.2 * s}
        fill={accentColor}
        stroke="#FFFFFF"
        strokeWidth={0.6 * s}
      />
      {/* 4 Precision crosshair ticks extending outward from ring */}
      <Line
        points={[-tickOuter, 0, -tickInner, 0]}
        stroke={accentColor}
        strokeWidth={strokeW}
        lineCap="round"
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={2 * s}
      />
      <Line
        points={[tickInner, 0, tickOuter, 0]}
        stroke={accentColor}
        strokeWidth={strokeW}
        lineCap="round"
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={2 * s}
      />
      <Line
        points={[0, -tickOuter, 0, -tickInner]}
        stroke={accentColor}
        strokeWidth={strokeW}
        lineCap="round"
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={2 * s}
      />
      <Line
        points={[0, tickInner, 0, tickOuter]}
        stroke={accentColor}
        strokeWidth={strokeW}
        lineCap="round"
        shadowColor="rgba(0, 0, 0, 0.3)"
        shadowBlur={2 * s}
      />

      {/* 2. Figma-style Floating Capsule Badge */}
      <Group x={tooltipX} y={tooltipY}>
        {/* Dark capsule background */}
        <Rect
          width={badgeWidth}
          height={badgeHeight}
          fill="#18181B"
          cornerRadius={5 * s}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={1 * s}
          shadowColor="rgba(0, 0, 0, 0.45)"
          shadowBlur={10 * s}
          shadowOffsetY={3 * s}
        />

        {/* Category indicator dot */}
        <Circle
          x={dotCenterX}
          y={badgeHeight / 2}
          radius={dotR}
          fill={accentColor}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={0.5 * s}
        />

        {/* Kind label (e.g. Mountain line, Grid, Intersection) */}
        <Text
          x={labelX}
          y={(badgeHeight - 11 * s) / 2}
          text={typeLabel}
          fontSize={11 * s}
          fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
          fontStyle="500"
          fill="#CBD5E1"
          listening={false}
        />

        {/* Vertical divider */}
        <Line
          points={[sepX, 5 * s, sepX, badgeHeight - 5 * s]}
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth={1 * s}
        />

        {/* Coordinate text (e.g. (17/32, 20/32)) */}
        <Text
          x={coordX}
          y={(badgeHeight - 11 * s) / 2}
          text={coordText}
          fontSize={11 * s}
          fontFamily='ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace'
          fontStyle="600"
          fill="#FFFFFF"
          listening={false}
        />
      </Group>
    </Group>
  );
};
