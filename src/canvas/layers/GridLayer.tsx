import React from 'react';
import { Group, Shape } from 'react-konva';
import { GridConfig } from '../../geometry/grid';
import { BASE_PAPER_SIZE } from '../transforms';

interface GridLayerProps {
  config: GridConfig;
  zoom: number;
}

export const GridLayer: React.FC<GridLayerProps> = React.memo(({ config, zoom }) => {
  if (!config.enabled) return null;

  const {
    divisionsX,
    divisionsY,
    majorSubdivisions = 8,
    opacity = 0.4,
    color = '#3b82f6',
    origin,
    scaleX = 1,
    scaleY = 1,
    rotation = 0,
  } = config;

  const strokeWidth = Math.max(0.5, 1 / zoom);
  const majorStrokeWidth = Math.max(1, 1.5 / zoom);

  return (
    <Group
      x={origin.x * BASE_PAPER_SIZE}
      y={origin.y * BASE_PAPER_SIZE}
      scaleX={scaleX}
      scaleY={scaleY}
      rotation={rotation}
      listening={false}
    >
      {/* Minor Grid Lines in single path */}
      <Shape
        sceneFunc={(context, shape) => {
          context.beginPath();
          // Vertical lines
          for (let i = 0; i <= divisionsX; i++) {
            const isMajor = majorSubdivisions > 0 && i % (divisionsX / majorSubdivisions) === 0;
            if (isMajor) continue;
            const x = (i / divisionsX) * BASE_PAPER_SIZE;
            context.moveTo(x, 0);
            context.lineTo(x, BASE_PAPER_SIZE);
          }
          // Horizontal lines
          for (let j = 0; j <= divisionsY; j++) {
            const isMajor = majorSubdivisions > 0 && j % (divisionsY / majorSubdivisions) === 0;
            if (isMajor) continue;
            const y = (j / divisionsY) * BASE_PAPER_SIZE;
            context.moveTo(0, y);
            context.lineTo(BASE_PAPER_SIZE, y);
          }
          context.fillStrokeShape(shape);
        }}
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        listening={false}
      />

      {/* Major Grid Lines in single path */}
      {majorSubdivisions > 0 && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            // Vertical major lines
            for (let i = 0; i <= divisionsX; i++) {
              const isMajor = i % (divisionsX / majorSubdivisions) === 0;
              if (!isMajor) continue;
              const x = (i / divisionsX) * BASE_PAPER_SIZE;
              context.moveTo(x, 0);
              context.lineTo(x, BASE_PAPER_SIZE);
            }
            // Horizontal major lines
            for (let j = 0; j <= divisionsY; j++) {
              const isMajor = j % (divisionsY / majorSubdivisions) === 0;
              if (!isMajor) continue;
              const y = (j / divisionsY) * BASE_PAPER_SIZE;
              context.moveTo(0, y);
              context.lineTo(BASE_PAPER_SIZE, y);
            }
            context.fillStrokeShape(shape);
          }}
          stroke={color}
          strokeWidth={majorStrokeWidth}
          opacity={Math.min(1, opacity * 1.5)}
          listening={false}
        />
      )}
    </Group>
  );
});

