import { describe, it, expect } from 'vitest';
import { COMMON_GRID_SIZES } from '../gridAnalysis';
import { analyzeRasterGrid, snapCreasesToOrigamiGrid } from '../rasterLines';
import { analyzePixels } from '../pipeline';
import type { CreaseLine } from '../../store/types';
import { lineFromPoints } from '../../geometry/line';

describe('Origami grid inference and snapping', () => {
  it('includes 56 and 80 in COMMON_GRID_SIZES', () => {
    expect(COMMON_GRID_SIZES).toContain(56);
    expect(COMMON_GRID_SIZES).toContain(80);
    expect(COMMON_GRID_SIZES).toContain(112);
    expect(COMMON_GRID_SIZES).toContain(120);
  });

  it('correctly identifies N=56 grid lines', () => {
    const size = 560; // 10px per cell for N=56
    const lines: CreaseLine[] = [];
    // Generate horizontal lines on 56-grid multiples
    for (let k = 5; k <= 50; k += 5) {
      const y = k / 56;
      lines.push({
        id: `h_${k}`,
        p1: { x: 0.1, y: y + 0.0005 },
        p2: { x: 0.9, y: y - 0.0005 },
        type: 'mountain',
        confirmed: false,
        confidence: 0.9,
        equation: lineFromPoints({ x: 0.1, y }, { x: 0.9, y }),
      });
    }
    // Generate vertical lines on 56-grid multiples
    for (let k = 5; k <= 50; k += 5) {
      const x = k / 56;
      lines.push({
        id: `v_${k}`,
        p1: { x: x + 0.0005, y: 0.1 },
        p2: { x: x - 0.0005, y: 0.9 },
        type: 'valley',
        confirmed: false,
        confidence: 0.9,
        equation: lineFromPoints({ x, y: 0.1 }, { x, y: 0.9 }),
      });
    }

    const inference = analyzeRasterGrid(lines, size);
    expect(inference.isGrid).toBe(true);
    expect(inference.n).toBe(56);
  });

  it('correctly identifies N=80 grid lines', () => {
    const size = 800; // 10px per cell for N=80
    const lines: CreaseLine[] = [];
    // Generate horizontal lines on 80-grid with coordinates requiring 80 subdivisions (e.g., k odd)
    for (let k = 7; k <= 73; k += 6) {
      const y = k / 80;
      lines.push({
        id: `h_${k}`,
        p1: { x: 0.1, y: y + 0.0004 },
        p2: { x: 0.9, y: y - 0.0004 },
        type: 'mountain',
        confirmed: false,
        confidence: 0.9,
        equation: lineFromPoints({ x: 0.1, y }, { x: 0.9, y }),
      });
    }
    // Generate vertical lines on 80-grid
    for (let k = 7; k <= 73; k += 6) {
      const x = k / 80;
      lines.push({
        id: `v_${k}`,
        p1: { x: x + 0.0004, y: 0.1 },
        p2: { x: x - 0.0004, y: 0.9 },
        type: 'valley',
        confirmed: false,
        confidence: 0.9,
        equation: lineFromPoints({ x, y: 0.1 }, { x, y: 0.9 }),
      });
    }

    const inference = analyzeRasterGrid(lines, size);
    expect(inference.isGrid).toBe(true);
    expect(inference.n).toBe(80);
  });

  it('bounds pixel tolerance by maxTolPx on dense grids', () => {
    // For size=400 and N=80:
    // cell size = 400 / 80 = 5px.
    // maxTolPx = min(3.8, 5 * 0.42) = min(3.8, 2.1) = 2.1px.
    // A line offset by 2.8px from grid line (which is <= 3.8px old threshold)
    // must NOT snap to the grid line because 2.8px > 2.1px.
    const size = 400;
    const N = 80;
    const targetY = 10 / N; // 0.125
    // offset by 2.8px
    const offsetPx = 2.8;
    const lineY = targetY + offsetPx / size;

    const line: CreaseLine = {
      id: 'test_line',
      p1: { x: 0.1, y: lineY },
      p2: { x: 0.9, y: lineY },
      type: 'mountain',
      confirmed: false,
      confidence: 0.9,
      equation: lineFromPoints({ x: 0.1, y: lineY }, { x: 0.9, y: lineY }),
    };

    const snapped = snapCreasesToOrigamiGrid([line], N, size);
    // Since offset 2.8px exceeds maxTolPx (2.1px), it should not snap to grid line 10/80
    // It remains off-grid or un-snapped (since length is (0.9-0.1)*400 = 320px > 20px, retained as original)
    expect(snapped.length).toBe(1);
    expect(snapped[0].p1.y).not.toBe(targetY);
    expect(snapped[0].p1.y).toBeCloseTo(lineY, 5);

    // Now test a line within maxTolPx (e.g. 1.5px offset):
    const closeOffsetPx = 1.5;
    const closeLineY = targetY + closeOffsetPx / size;
    const closeLine: CreaseLine = {
      id: 'close_line',
      p1: { x: 0.1, y: closeLineY },
      p2: { x: 0.9, y: closeLineY },
      type: 'mountain',
      confirmed: false,
      confidence: 0.9,
      equation: lineFromPoints({ x: 0.1, y: closeLineY }, { x: 0.9, y: closeLineY }),
    };

    const snappedClose = snapCreasesToOrigamiGrid([closeLine], N, size);
    expect(snappedClose.length).toBe(1);
    expect(snappedClose[0].p1.y).toBe(targetY);
    expect(snappedClose[0].p2.y).toBe(targetY);
  });

  it('honors preferredGrid hint in analyzeRasterGrid', () => {
    const size = 560;
    const lines: CreaseLine[] = [];
    for (let k = 5; k <= 50; k += 5) {
      const y = k / 56;
      lines.push({
        id: `h_${k}`,
        p1: { x: 0.1, y },
        p2: { x: 0.9, y },
        type: 'mountain',
        confirmed: false,
        confidence: 0.9,
        equation: lineFromPoints({ x: 0.1, y }, { x: 0.9, y }),
      });
      const x = k / 56;
      lines.push({
        id: `v_${k}`,
        p1: { x, y: 0.1 },
        p2: { x, y: 0.9 },
        type: 'valley',
        confirmed: false,
        confidence: 0.9,
        equation: lineFromPoints({ x, y: 0.1 }, { x, y: 0.9 }),
      });
    }

    const inference = analyzeRasterGrid(lines, size, 56);
    expect(inference.n).toBe(56);
  });
});
