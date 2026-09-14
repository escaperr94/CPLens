import React from 'react';
import { Group, Line, Circle, Rect, Text } from 'react-konva';
import { Point2D } from '../../geometry/point';
import { CropBox, ToolType } from '../../store/types';
import { BASE_PAPER_SIZE } from '../transforms';

interface CalibrationOverlayProps {
  tool: ToolType;
  corners: [Point2D, Point2D, Point2D, Point2D];
  inProgressCorners: Point2D[];
  crop: CropBox | null;
  zoom: number;
  onUpdateCorner: (index: number, p: Point2D) => void;
  onUpdateCrop: (crop: CropBox) => void;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  tool,
  corners,
  inProgressCorners,
  crop,
  zoom,
  onUpdateCorner,
  onUpdateCrop,
}) => {
  const handleRadius = Math.max(6, 9 / zoom);
  const strokeW = Math.max(1.5, 2 / zoom);
  const fontSize = Math.max(11, 13 / zoom);

  if (tool === 'calibrate') {
    // If in progress (user is clicking corners 1 by 1)
    if (inProgressCorners.length > 0) {
      const pts = inProgressCorners.flatMap((c) => [c.x, c.y]);
      return (
        <Group>
          {pts.length >= 4 && (
            <Line points={pts} stroke="#38bdf8" strokeWidth={strokeW} dash={[6 / zoom, 3 / zoom]} />
          )}
          {inProgressCorners.map((c, i) => (
            <Group key={i} x={c.x} y={c.y}>
              <Circle radius={handleRadius} fill="#0284c7" stroke="#ffffff" strokeWidth={strokeW} />
              <Text
                text={`${i + 1}`}
                fontSize={fontSize}
                fill="#ffffff"
                x={-handleRadius / 2}
                y={-handleRadius / 2}
                fontStyle="bold"
              />
            </Group>
          ))}
        </Group>
      );
    }

    // Existing 4-corner calibration handles
    const quadPoints = [
      corners[0].x, corners[0].y,
      corners[1].x, corners[1].y,
      corners[2].x, corners[2].y,
      corners[3].x, corners[3].y,
      corners[0].x, corners[0].y,
    ];

    const cornerLabels = ['TL', 'TR', 'BR', 'BL'];

    return (
      <Group>
        <Line
          points={quadPoints}
          stroke="#0284c7"
          strokeWidth={strokeW}
          dash={[6 / zoom, 3 / zoom]}
        />
        {corners.map((c, i) => (
          <Group
            key={i}
            x={c.x}
            y={c.y}
            draggable
            onDragMove={(e) => {
              onUpdateCorner(i, { x: e.target.x(), y: e.target.y() });
            }}
          >
            <Circle
              radius={handleRadius}
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth={strokeW}
              shadowColor="#000"
              shadowBlur={4}
            />
            <Text
              text={cornerLabels[i]}
              fontSize={fontSize}
              fill="#0f172a"
              x={-fontSize * 0.6}
              y={-fontSize * 0.4}
              fontStyle="bold"
            />
          </Group>
        ))}
      </Group>
    );
  }

  if (tool === 'crop' && crop) {
    return (
      <Group>
        <Rect
          x={crop.x}
          y={crop.y}
          width={crop.width}
          height={crop.height}
          stroke="#f97316"
          strokeWidth={strokeW}
          dash={[8 / zoom, 4 / zoom]}
          draggable
          onDragMove={(e) => {
            onUpdateCrop({ ...crop, x: e.target.x(), y: e.target.y() });
          }}
        />
        {/* Resize handle bottom right */}
        <Circle
          x={crop.x + crop.width}
          y={crop.y + crop.height}
          radius={handleRadius}
          fill="#f97316"
          stroke="#ffffff"
          strokeWidth={strokeW}
          draggable
          onDragMove={(e) => {
            const newW = Math.max(20, e.target.x() - crop.x);
            const newH = Math.max(20, e.target.y() - crop.y);
            onUpdateCrop({ ...crop, width: newW, height: newH });
          }}
        />
      </Group>
    );
  }

  return null;
};

