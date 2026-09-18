import { describe, it, expect, vi } from 'vitest';
import { exportPointsCsv } from '../exportProject';
import { ProjectState } from '../../store/types';
import { DEFAULT_GRID_CONFIG } from '../../geometry/grid';

describe('exportPointsCsv', () => {
  it('dynamically formats grid headers for grid 56', () => {
    let capturedUri = '';
    const mockAnchor = {
      set href(val: string) { capturedUri = decodeURI(val); },
      set download(val: string) {},
      click: vi.fn(),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockAnchor),
    });

    const state = {
      grid: { ...DEFAULT_GRID_CONFIG, divisionsX: 56, divisionsY: 56 },
      points: [
        { id: 'p1', label: 'P1', x: 0.5, y: 0.25 },
      ],
    } as unknown as ProjectState;

    exportPointsCsv(state);

    expect(capturedUri).toContain('grid_56_x,grid_56_y');
    expect(capturedUri).toContain('P1,0.500000,0.250000');
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('dynamically formats grid headers for grid 80', () => {
    let capturedUri = '';
    const mockAnchor = {
      set href(val: string) { capturedUri = decodeURI(val); },
      set download(val: string) {},
      click: vi.fn(),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockAnchor),
    });

    const state = {
      grid: { ...DEFAULT_GRID_CONFIG, divisionsX: 80, divisionsY: 80 },
      points: [
        { id: 'p1', label: 'P1', x: 0.1, y: 0.2 },
      ],
    } as unknown as ProjectState;

    exportPointsCsv(state);

    expect(capturedUri).toContain('grid_80_x,grid_80_y');
    expect(mockAnchor.click).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
