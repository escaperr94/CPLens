import React from 'react';
import { Group, Line, Text, Rect } from 'react-konva';
import { RulerItem } from '../../store/types';
import { BASE_PAPER_SIZE } from '../transforms';
import { approximateFraction } from '../../geometry/rational';

interface RulerLayerProps {
  rulers: RulerItem[];
  zoom: number;
  paperWidth?: number;
  paperHeight?: number;
}

export const RulerLayer: React.FC<RulerLayerProps> = React.memo(({ rulers, zoom, paperWidth, paperHeight }) => {
  const pW = paperWidth || BASE_PAPER_SIZE;
  const pH = paperHeight || BASE_PAPER_SIZE;

  const strokeW = Math.max(0.5, 1 / zoom);
  const fontSize = Math.max(10, 11 / zoom);

  return (
    <Group listening={false}>
      {rulers.map((r) => {
        const wx = r.point.x * pW;
        const wy = r.point.y * pH;

        const fracX = approximateFraction(r.point.x, { maxDenominator: 64 });
        const fracY = approximateFraction(r.point.y, { maxDenominator: 64 });

        const showH = r.orientation === 'both' || r.orientation === 'horizontal';
        const showV = r.orientation === 'both' || r.orientation === 'vertical';

        return (
          <Group key={r.id}>
            {/* Horizontal guideline */}
            {showH && (
              <>
                <Line
                  points={[-pW, wy, pW * 2, wy]}
                  stroke="#D97706"
                  strokeWidth={strokeW}
                  dash={[4 / zoom, 4 / zoom]}
                  opacity={0.7}
                />
                <Group x={12 / zoom} y={wy - 14 / zoom}>
                  <Rect
                    width={48 / zoom}
                    height={14 / zoom}
                    fill="#FFFFFF"
                    cornerRadius={2 / zoom}
                    stroke="#E5E5E5"
                    strokeWidth={0.8 / zoom}
                    shadowColor="rgba(0,0,0,0.06)"
                    shadowBlur={2 / zoom}
                  />
                  <Text
                    text={`y: ${fracY.formatted}`}
                    fontSize={fontSize}
                    fontFamily="monospace"
                    fill="#92400E"
                    padding={2 / zoom}
                  />
                </Group>
              </>
            )}

            {/* Vertical guideline */}
            {showV && (
              <>
                <Line
                  points={[wx, -pH, wx, pH * 2]}
                  stroke="#D97706"
                  strokeWidth={strokeW}
                  dash={[4 / zoom, 4 / zoom]}
                  opacity={0.7}
                />
                <Group x={wx + 4 / zoom} y={12 / zoom}>
                  <Rect
                    width={48 / zoom}
                    height={14 / zoom}
                    fill="#FFFFFF"
                    cornerRadius={2 / zoom}
                    stroke="#E5E5E5"
                    strokeWidth={0.8 / zoom}
                    shadowColor="rgba(0,0,0,0.06)"
                    shadowBlur={2 / zoom}
                  />
                  <Text
                    text={`x: ${fracX.formatted}`}
                    fontSize={fontSize}
                    fontFamily="monospace"
                    fill="#92400E"
                    padding={2 / zoom}
                  />
                </Group>
              </>
            )}
          </Group>
        );
      })}
    </Group>
  );
});
