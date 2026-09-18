import React, { useMemo } from 'react';
import { Group, Shape, Line } from 'react-konva';
import { CreaseLine } from '../../store/types';
import { BASE_PAPER_SIZE } from '../transforms';

interface CreaseLayerProps {
  creases: CreaseLine[];
  selectedId: string | null;
  zoom: number;
  onSelectCrease: (id: string) => void;
  paperWidth?: number;
  paperHeight?: number;
}

export const CreaseLayer: React.FC<CreaseLayerProps> = React.memo(({
  creases,
  selectedId,
  zoom,
  paperWidth,
  paperHeight,
}) => {
  const pW = paperWidth || BASE_PAPER_SIZE;
  const pH = paperHeight || BASE_PAPER_SIZE;
  const strokeW = 2 / zoom;
  const selectedStrokeW = 4 / zoom;

  // Group creases by type for high-performance single-pass batched drawing
  const { mountains, valleys, edges, auxiliaries, unknowns, selected } = useMemo(() => {
    const m: CreaseLine[] = [];
    const v: CreaseLine[] = [];
    const e: CreaseLine[] = [];
    const a: CreaseLine[] = [];
    const u: CreaseLine[] = [];
    let sel: CreaseLine | null = null;

    for (let i = 0; i < creases.length; i++) {
      const c = creases[i];
      if (c.id === selectedId) {
        sel = c;
      }
      switch (c.type) {
        case 'mountain':
          m.push(c);
          break;
        case 'valley':
          v.push(c);
          break;
        case 'edge':
          e.push(c);
          break;
        case 'auxiliary':
          a.push(c);
          break;
        default:
          u.push(c);
          break;
      }
    }
    return { mountains: m, valleys: v, edges: e, auxiliaries: a, unknowns: u, selected: sel };
  }, [creases, selectedId]);

  return (
    <Group listening={false}>
      {/* 1. Batched Mountain Creases (Solid Red) */}
      {mountains.length > 0 && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            for (let i = 0; i < mountains.length; i++) {
              const c = mountains[i];
              context.moveTo(c.p1.x * pW, c.p1.y * pH);
              context.lineTo(c.p2.x * pW, c.p2.y * pH);
            }
            context.fillStrokeShape(shape);
          }}
          stroke="#DC2626"
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {/* 2. Batched Valley Creases (Solid Blue) */}
      {valleys.length > 0 && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            for (let i = 0; i < valleys.length; i++) {
              const c = valleys[i];
              context.moveTo(c.p1.x * pW, c.p1.y * pH);
              context.lineTo(c.p2.x * pW, c.p2.y * pH);
            }
            context.fillStrokeShape(shape);
          }}
          stroke="#2563EB"
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {/* 3. Batched Paper Edges / Boundaries (Solid Dark) */}
      {edges.length > 0 && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            for (let i = 0; i < edges.length; i++) {
              const c = edges[i];
              context.moveTo(c.p1.x * pW, c.p1.y * pH);
              context.lineTo(c.p2.x * pW, c.p2.y * pH);
            }
            context.fillStrokeShape(shape);
          }}
          stroke="#18181B"
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {/* 4. Batched Auxiliary Creases (Purple) */}
      {auxiliaries.length > 0 && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            for (let i = 0; i < auxiliaries.length; i++) {
              const c = auxiliaries[i];
              context.moveTo(c.p1.x * pW, c.p1.y * pH);
              context.lineTo(c.p2.x * pW, c.p2.y * pH);
            }
            context.fillStrokeShape(shape);
          }}
          stroke="#9333EA"
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {/* Unassigned monochrome creases */}
      {unknowns.length > 0 && (
        <Shape
          sceneFunc={(context, shape) => {
            context.beginPath();
            for (let i = 0; i < unknowns.length; i++) {
              const c = unknowns[i];
              context.moveTo(c.p1.x * pW, c.p1.y * pH);
              context.lineTo(c.p2.x * pW, c.p2.y * pH);
            }
            context.fillStrokeShape(shape);
          }}
          stroke="#52525B"
          strokeWidth={strokeW}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}

      {/* 5. Highlighted Selected Crease (if any) */}
      {selected && (
        <Line
          points={[
            selected.p1.x * pW,
            selected.p1.y * pH,
            selected.p2.x * pW,
            selected.p2.y * pH,
          ]}
          stroke="#0D99FF"
          strokeWidth={selectedStrokeW}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
    </Group>
  );
});

