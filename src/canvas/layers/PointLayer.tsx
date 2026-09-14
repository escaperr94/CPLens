import React from 'react';
import { Group, Circle } from 'react-konva';
import { ReferencePoint } from '../../store/types';
import { BASE_PAPER_SIZE } from '../transforms';

interface PointLayerProps {
  points: ReferencePoint[];
  selectedId: string | null;
  zoom: number;
  draggable?: boolean;
  onSelectPoint: (id: string) => void;
  onMovePoint: (id: string, point: { x: number; y: number }) => void;
  onHoverPoint: (p: ReferencePoint | null) => void;
}

export const PointLayer: React.FC<PointLayerProps> = React.memo(({
  points,
  selectedId,
  zoom,
  draggable = false,
  onSelectPoint,
  onMovePoint,
  onHoverPoint,
}) => {
  // Figma handle: ~8-10px screen diameter regardless of zoom
  const radius = 4.5 / zoom;
  const strokeW = 1 / zoom;

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
          draggable={draggable}
          onMouseDown={(e) => { e.cancelBubble = true; }}
          onTouchStart={(e) => { e.cancelBubble = true; }}
          onDragStart={(e) => {
            e.cancelBubble = true;
            onSelectPoint(p.id);
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            onMovePoint(p.id, {
              x: Math.max(0, Math.min(1, node.x() / BASE_PAPER_SIZE)),
              y: Math.max(0, Math.min(1, node.y() / BASE_PAPER_SIZE)),
            });
          }}
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
              hitStrokeWidth={12 / zoom}
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
});
