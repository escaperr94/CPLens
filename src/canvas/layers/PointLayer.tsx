import React from 'react';
import { Group, Circle } from 'react-konva';
import { ReferencePoint } from '../../store/types';
import { BASE_PAPER_SIZE } from '../transforms';

interface PointLayerProps {
  points: ReferencePoint[];
  selectedId: string | null;
  zoom: number;
  onSelectPoint: (id: string) => void;
  onHoverPoint: (p: ReferencePoint | null) => void;
}

export const PointLayer: React.FC<PointLayerProps> = ({
  points,
  selectedId,
  zoom,
  onSelectPoint,
  onHoverPoint,
}) => {
  // Figma handle: ~8-10px screen diameter regardless of zoom
  const radius = Math.max(3.5, 4.5 / zoom);
  const strokeW = Math.max(1, 1.5 / zoom);

  return (
    <Group>
      {points.map((p) => {
        const isSelected = p.id === selectedId;
        const wx = p.x * BASE_PAPER_SIZE;
        const wy = p.y * BASE_PAPER_SIZE;

        return (
          <Group
            key={p.id}
            x={wx}
            y={wy}
            onClick={() => onSelectPoint(p.id)}
            onTap={() => onSelectPoint(p.id)}
            onMouseEnter={() => onHoverPoint(p)}
            onMouseLeave={() => onHoverPoint(null)}
          >
            {/* Selection outline ring (Figma blue) */}
            {isSelected && (
              <Circle
                radius={radius + 4 / zoom}
                stroke="#0D99FF"
                strokeWidth={strokeW * 1.5}
                dash={[3 / zoom, 2 / zoom]}
              />
            )}

            {/* Point marker: white inner, crisp colored border */}
            <Circle
              radius={radius}
              fill="#FFFFFF"
              stroke={p.color || '#0D99FF'}
              strokeWidth={strokeW * 1.5}
              hitStrokeWidth={Math.max(14, 16 / zoom)}
              shadowColor="rgba(0,0,0,0.15)"
              shadowBlur={2 / zoom}
              shadowOffsetY={1 / zoom}
            />
            {/* Inner dot */}
            <Circle
              radius={radius * 0.4}
              fill={p.color || '#0D99FF'}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};
