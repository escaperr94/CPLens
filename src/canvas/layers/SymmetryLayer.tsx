import React from 'react';
import { Group, Line, Circle } from 'react-konva';
import { SymmetryAxis, reflectPoint } from '../../geometry/symmetry';
import { ReferencePoint } from '../../store/types';
import { BASE_PAPER_SIZE } from '../transforms';

interface SymmetryLayerProps {
  axes: SymmetryAxis[];
  enabled: boolean;
  points: ReferencePoint[];
  zoom: number;
}

export const SymmetryLayer: React.FC<SymmetryLayerProps> = ({
  axes,
  enabled,
  points,
  zoom,
}) => {
  if (!enabled) return null;

  const strokeW = Math.max(1, 1.5 / zoom);
  const ghostRadius = Math.max(3, 5 / zoom);

  return (
    <Group listening={false}>
      {/* Symmetry axes */}
      {axes
        .filter((a) => a.active)
        .map((axis) => {
          const x1 = axis.p1.x * BASE_PAPER_SIZE;
          const y1 = axis.p1.y * BASE_PAPER_SIZE;
          const x2 = axis.p2.x * BASE_PAPER_SIZE;
          const y2 = axis.p2.y * BASE_PAPER_SIZE;

          return (
            <Line
              key={axis.id}
              points={[x1, y1, x2, y2]}
              stroke="#d946ef" // fuchsia
              strokeWidth={strokeW}
              dash={[8 / zoom, 4 / zoom, 2 / zoom, 4 / zoom]}
              opacity={0.8}
            />
          );
        })}

      {/* Mirrored ghost points */}
      {axes
        .filter((a) => a.active)
        .flatMap((axis) =>
          points.map((p) => {
            const mirrored = reflectPoint(p, axis);
            return (
              <Circle
                key={`sym_${axis.id}_${p.id}`}
                x={mirrored.x * BASE_PAPER_SIZE}
                y={mirrored.y * BASE_PAPER_SIZE}
                radius={ghostRadius}
                fill="rgba(217, 70, 239, 0.4)"
                stroke="#d946ef"
                strokeWidth={strokeW}
                dash={[2 / zoom, 2 / zoom]}
              />
            );
          })
        )}
    </Group>
  );
};

