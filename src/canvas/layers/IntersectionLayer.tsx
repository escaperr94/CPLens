import React, { useMemo } from 'react';
import { Group, Shape } from 'react-konva';
import { CreaseLine } from '../../store/types';
import { findCreaseIntersections } from '../../geometry/intersection';
import { BASE_PAPER_SIZE } from '../transforms';

interface IntersectionLayerProps {
  creases: CreaseLine[];
  zoom: number;
}

export const IntersectionLayer: React.FC<IntersectionLayerProps> = React.memo(({ creases, zoom }) => {
  const intersections = useMemo(() => {
    return findCreaseIntersections(creases);
  }, [creases]);

  if (intersections.length === 0) return null;

  const radius = Math.max(1.5, 2.2 / zoom);
  const strokeW = Math.max(0.5, 0.8 / zoom);

  return (
    <Group listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          for (let i = 0; i < intersections.length; i++) {
            const inter = intersections[i];
            const cx = inter.x * BASE_PAPER_SIZE;
            const cy = inter.y * BASE_PAPER_SIZE;
            context.moveTo(cx + radius, cy);
            context.arc(cx, cy, radius, 0, Math.PI * 2);
          }
          context.fillStrokeShape(shape);
        }}
        fill="#F59E0B"
        stroke="#78350F"
        strokeWidth={strokeW}
        opacity={0.8}
        listening={false}
      />
    </Group>
  );
});


