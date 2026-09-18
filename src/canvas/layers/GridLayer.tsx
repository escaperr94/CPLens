import React from 'react';
import { Group, Shape } from 'react-konva';
import { GridConfig } from '../../geometry/grid';
import { BASE_PAPER_SIZE } from '../transforms';

interface GridLayerProps {
  config: GridConfig;
  zoom: number;
  paperWidth?: number;
  paperHeight?: number;
}

export const GridLayer: React.FC<GridLayerProps> = React.memo(({ config, zoom, paperWidth, paperHeight }) => {
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
  const pW = paperWidth || BASE_PAPER_SIZE;
  const pH = paperHeight || BASE_PAPER_SIZE;

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
            const x = (i / divisionsX) * pW;
            context.moveTo(x, 0);
            context.lineTo(x, pH);
          }
          // Horizontal lines
          for (let j = 0; j <= divisionsY; j++) {
            const isMajor = majorSubdivisions > 0 && j % (divisionsY / majorSubdivisions) === 0;
            if (isMajor) continue;
            const y = (j / divisionsY) * pH;
            context.moveTo(0, y);
            context.lineTo(pW, y);
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
              const x = (i / divisionsX) * pW;
              context.moveTo(x, 0);
              context.lineTo(x, pH);
            }
            // Horizontal major lines
            for (let j = 0; j <= divisionsY; j++) {
              const isMajor = j % (divisionsY / majorSubdivisions) === 0;
              if (!isMajor) continue;
              const y = (j / divisionsY) * pH;
              context.moveTo(0, y);
              context.lineTo(pW, y);
            }
            context.fillStrokeShape(shape);
          }}
          stroke={color}
          strokeWidth={majorStrokeWidth}
          opacity={Math.min(1, opacity * 1.5)}
          listening={false}
        />
      )}
      {/* 22.5° and 45° Octagonal Diagonal Guidelines */}
      {(config.diagonal22_5 || config.diagonalAngles === '22.5') && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            const S = Math.min(pW, pH);
            context.moveTo(0, 0);
            context.lineTo(pW, pH);
            context.moveTo(0, pH);
            context.lineTo(pW, 0);
            // 22.5° and 67.5° angle guidelines from corners and centers
            // tan(22.5°) = sqrt(2) - 1 ≈ 0.41421356
            const t22 = (Math.SQRT2 - 1) * S;
            const t67 = S - t22; // ≈ 0.58578644 * S

            // From Top-Left (0, 0)
            context.moveTo(0, 0); context.lineTo(S, t22);
            context.moveTo(0, 0); context.lineTo(t22, S);

            // From Top-Right (S, 0)
            context.moveTo(S, 0); context.lineTo(0, t22);
            context.moveTo(S, 0); context.lineTo(t67, S);

            // From Bottom-Left (0, S)
            context.moveTo(0, S); context.lineTo(S, t67);
            context.moveTo(0, S); context.lineTo(t22, 0);

            // From Bottom-Right (S, S)
            context.moveTo(S, S); context.lineTo(0, t67);
            context.moveTo(S, S); context.lineTo(t67, 0);

            // Center bisectors
            const half = S / 2;
            context.moveTo(half, 0); context.lineTo(0, half);
            context.moveTo(half, 0); context.lineTo(S, half);
            context.moveTo(0, half); context.lineTo(half, S);
            context.moveTo(S, half); context.lineTo(half, S);

            context.fillStrokeShape(shape);
          }}
          stroke="#8B5CF6"
          strokeWidth={strokeWidth}
          opacity={opacity * 0.85}
          dash={[4 / zoom, 4 / zoom]}
          listening={false}
        />
      )}
    </Group>
  );
});

