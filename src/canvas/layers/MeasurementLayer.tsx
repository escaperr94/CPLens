import React from 'react';
import { Group, Line, Circle, Text, Rect } from 'react-konva';
import { MeasurementItem } from '../../store/types';
import { Point2D, distance, midpoint } from '../../geometry/point';
import { approximateFraction } from '../../geometry/rational';
import { matchOrigamiAngle } from '../../geometry/line';
import { BASE_PAPER_SIZE } from '../transforms';

interface MeasurementLayerProps {
  measurements: MeasurementItem[];
  drawingStart: Point2D | null;
  cursor: Point2D | null;
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string) => void;
}

export const MeasurementLayer: React.FC<MeasurementLayerProps> = ({
  measurements,
  drawingStart,
  cursor,
  selectedId,
  zoom,
  onSelect,
}) => {
  const strokeW = Math.max(1, 1.5 / zoom);
  const fontSize = Math.max(10, 11 / zoom);
  const tickSize = Math.max(3, 4 / zoom);

  const renderMeasurement = (p1: Point2D, p2: Point2D, id?: string, isSelected?: boolean) => {
    const w1 = { x: p1.x * BASE_PAPER_SIZE, y: p1.y * BASE_PAPER_SIZE };
    const w2 = { x: p2.x * BASE_PAPER_SIZE, y: p2.y * BASE_PAPER_SIZE };

    const distNorm = distance(p1, p2);
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);

    let angleDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 180;

    const fracDx = approximateFraction(dx, { maxDenominator: 64 });
    const fracDy = approximateFraction(dy, { maxDenominator: 64 });
    const origamiMatch = matchOrigamiAngle(angleDeg, 2.5);

    const angleLabel = origamiMatch
      ? `${origamiMatch.standardAngle}°`
      : `${angleDeg.toFixed(1)}°`;

    const labelText = `d: ${distNorm.toFixed(4)}W | Δx: ${fracDx.formatted}, Δy: ${fracDy.formatted} | ${angleLabel}`;

    const mid = midpoint(w1, w2);
    const strokeColor = isSelected ? '#0D99FF' : '#059669';

    const cardWidth = labelText.length * (fontSize * 0.55) + 8 / zoom;
    const cardHeight = fontSize + 6 / zoom;

    return (
      <Group
        key={id || 'temp'}
        onClick={() => id && onSelect(id)}
        onTap={() => id && onSelect(id)}
      >
        {/* Dimension Line */}
        <Line
          points={[w1.x, w1.y, w2.x, w2.y]}
          stroke={strokeColor}
          strokeWidth={strokeW}
          dash={[4 / zoom, 2 / zoom]}
          hitStrokeWidth={Math.max(10, 12 / zoom)}
        />

        {/* End ticks */}
        <Circle x={w1.x} y={w1.y} radius={tickSize} fill="#FFFFFF" stroke={strokeColor} strokeWidth={strokeW} />
        <Circle x={w2.x} y={w2.y} radius={tickSize} fill="#FFFFFF" stroke={strokeColor} strokeWidth={strokeW} />

        {/* Info label badge (Figma white card) */}
        <Group x={mid.x} y={mid.y - 12 / zoom}>
          <Rect
            x={-cardWidth / 2}
            y={-cardHeight / 2}
            width={cardWidth}
            height={cardHeight}
            fill="#FFFFFF"
            cornerRadius={3 / zoom}
            stroke="#E5E5E5"
            strokeWidth={1 / zoom}
            shadowColor="rgba(0, 0, 0, 0.08)"
            shadowBlur={4 / zoom}
            shadowOffsetY={1 / zoom}
          />
          <Text
            text={labelText}
            fontSize={fontSize}
            fontFamily="monospace"
            fill="#1E1E1E"
            align="center"
            listening={false}
            x={-cardWidth / 2 + 4 / zoom}
            y={-fontSize / 2}
          />
        </Group>
      </Group>
    );
  };

  return (
    <Group>
      {measurements.map((m) =>
        renderMeasurement(m.p1, m.p2, m.id, m.id === selectedId)
      )}
      {drawingStart && cursor && renderMeasurement(drawingStart, cursor)}
    </Group>
  );
};
