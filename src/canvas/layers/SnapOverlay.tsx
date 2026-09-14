import React from 'react';
import { Group, Circle, Line, Text, Rect } from 'react-konva';
import { SnapCandidate } from '../../geometry/snapping';
import { BASE_PAPER_SIZE } from '../transforms';
import { approximateFraction } from '../../geometry/rational';

interface SnapOverlayProps {
  snap: SnapCandidate | null;
  zoom: number;
}

export const SnapOverlay: React.FC<SnapOverlayProps> = ({ snap, zoom }) => {
  if (!snap) return null;

  const wx = snap.point.x * BASE_PAPER_SIZE;
  const wy = snap.point.y * BASE_PAPER_SIZE;

  const ringRadius = Math.max(6, 9 / zoom);
  const strokeW = Math.max(1.5, 2 / zoom);
  const fontSize = Math.max(10, 11 / zoom);

  const fracX = approximateFraction(snap.point.x, { maxDenominator: 64 });
  const fracY = approximateFraction(snap.point.y, { maxDenominator: 64 });

  const label = `${snap.label || 'Snap'} (${fracX.formatted}, ${fracY.formatted})`;

  return (
    <Group x={wx} y={wy} listening={false}>
      {/* Target marker */}
      <Circle
        radius={ringRadius}
        stroke="#38bdf8"
        strokeWidth={strokeW}
        fill="rgba(56, 189, 248, 0.25)"
      />
      <Line
        points={[-ringRadius * 1.5, 0, ringRadius * 1.5, 0]}
        stroke="#38bdf8"
        strokeWidth={strokeW * 0.8}
      />
      <Line
        points={[0, -ringRadius * 1.5, 0, ringRadius * 1.5]}
        stroke="#38bdf8"
        strokeWidth={strokeW * 0.8}
      />

      {/* Snap tooltip */}
      <Group x={ringRadius + 4 / zoom} y={-ringRadius - 14 / zoom}>
        <Rect
          width={label.length * (fontSize * 0.55) + 8 / zoom}
          height={fontSize + 4 / zoom}
          fill="rgba(15, 23, 42, 0.95)"
          cornerRadius={2 / zoom}
          stroke="#38bdf8"
          strokeWidth={0.5 / zoom}
        />
        <Text
          text={label}
          fontSize={fontSize}
          fontFamily="monospace"
          fill="#38bdf8"
          padding={2 / zoom}
        />
      </Group>
    </Group>
  );
};

