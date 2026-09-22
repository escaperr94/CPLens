import { describe, it, expect } from 'vitest';
import { approximateFraction, approximatePowerOfTwo, getFractionCandidates, formatGridFraction } from '../rational';
import { createUnitSquareHomography, applyHomography } from '../homography';
import { segmentIntersection, findCreaseIntersections } from '../intersection';
import { paperToGridCoords, gridToPaperCoords, DEFAULT_GRID_CONFIG, ORIGAMI_GRID_PRESETS, getOptimalMajorSubdivisions } from '../grid';
import { reflectPoint } from '../symmetry';
import { findSnapTarget, DEFAULT_SNAP_OPTIONS } from '../snapping';
import { matchOrigamiAngle } from '../line';

describe('Rational Approximation Engine', () => {
  it('accurately identifies exact Dove reference fraction 17/64', () => {
    const val = 17 / 64; // 0.265625
    const approx = approximateFraction(val, { maxDenominator: 64 });
    expect(approx.numerator).toBe(17);
    expect(approx.denominator).toBe(64);
    expect(approx.error).toBeLessThan(1e-9);
    expect(approx.formatted).toBe('17/64');
  });

  it('accurately identifies 9/16', () => {
    const val = 9 / 16; // 0.5625
    const approx = approximateFraction(val, { maxDenominator: 64 });
    expect(approx.numerator).toBe(9);
    expect(approx.denominator).toBe(16);
    expect(approx.formatted).toBe('9/16');
  });

  it('handles slight raster inaccuracy (e.g. 0.2659 -> 17/64)', () => {
    const val = 0.2659;
    const approx = approximateFraction(val, { maxDenominator: 64, preferPowerOfTwo: true });
    expect(approx.numerator).toBe(17);
    expect(approx.denominator).toBe(64);
    expect(approx.error).toBeCloseTo(Math.abs(0.2659 - 17 / 64), 5);
  });

  it('provides sorted candidate list', () => {
    const val = 0.265625;
    const candidates = getFractionCandidates(val, 64);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].formatted).toBe('17/64');
  });

  it('formats grid coordinates with exact denominator without reducing', () => {
    // 20/32 = 0.625, should be '20/32' and not '5/8'
    expect(formatGridFraction(20 / 32, 32)).toBe('20/32');
    expect(formatGridFraction(17 / 32, 32)).toBe('17/32');
    expect(formatGridFraction(16 / 32, 32)).toBe('16/32');
    expect(formatGridFraction(8 / 32, 32)).toBe('8/32');
    expect(formatGridFraction(0, 32)).toBe('0/32');
    expect(formatGridFraction(1, 32)).toBe('32/32');

    // On grid 64: 20/32 = 40/64
    expect(formatGridFraction(20 / 32, 64)).toBe('40/64');

    // Non-grid coordinate falls back to reduced fraction
    expect(formatGridFraction(1 / 3, 32)).toBe('1/3');

    // On grid 56 and grid 80:
    expect(formatGridFraction(21 / 56, 56)).toBe('21/56');
    expect(formatGridFraction(35 / 80, 80)).toBe('35/80');
    expect(formatGridFraction(3 / 56, 56)).toBe('3/56');
    expect(formatGridFraction(7 / 80, 80)).toBe('7/80');
  });
});

describe('Homography Rectification', () => {
  it('maps quadrilateral to unit square', () => {
    // Quadrilateral in an image
    const corners: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] = [
      { x: 100, y: 100 }, // TL
      { x: 500, y: 120 }, // TR
      { x: 480, y: 520 }, // BR
      { x: 110, y: 490 }, // BL
    ];

    const { toNormalized, toImage } = createUnitSquareHomography(corners);

    const tlNorm = applyHomography(corners[0], toNormalized);
    expect(tlNorm.x).toBeCloseTo(0, 4);
    expect(tlNorm.y).toBeCloseTo(0, 4);

    const trNorm = applyHomography(corners[1], toNormalized);
    expect(trNorm.x).toBeCloseTo(1, 4);
    expect(trNorm.y).toBeCloseTo(0, 4);

    const brNorm = applyHomography(corners[2], toNormalized);
    expect(brNorm.x).toBeCloseTo(1, 4);
    expect(brNorm.y).toBeCloseTo(1, 4);

    const blNorm = applyHomography(corners[3], toNormalized);
    expect(blNorm.x).toBeCloseTo(0, 4);
    expect(blNorm.y).toBeCloseTo(1, 4);

    // Test round trip
    const centerNorm = { x: 0.5, y: 0.5 };
    const centerImg = applyHomography(centerNorm, toImage);
    const centerNormBack = applyHomography(centerImg, toNormalized);
    expect(centerNormBack.x).toBeCloseTo(0.5, 4);
    expect(centerNormBack.y).toBeCloseTo(0.5, 4);
  });
});

describe('Intersection Solver', () => {
  it('finds intersection of diagonals in unit square', () => {
    const p = segmentIntersection(
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 }
    );
    expect(p).not.toBeNull();
    expect(p?.x).toBeCloseTo(0.5, 5);
    expect(p?.y).toBeCloseTo(0.5, 5);
  });

  it('returns null for parallel segments', () => {
    const p = segmentIntersection(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 }
    );
    expect(p).toBeNull();
  });
});

describe('Grid Subsystem', () => {
  it('converts paper to grid and back for 64x64', () => {
    const config = { ...DEFAULT_GRID_CONFIG, divisionsX: 64, divisionsY: 64 };
    const paper = { x: 17 / 64, y: 9 / 16 };
    const grid = paperToGridCoords(paper, config);

    expect(grid.x).toBeCloseTo(17, 4);
    expect(grid.y).toBeCloseTo(36, 4);

    const back = gridToPaperCoords(grid, config);
    expect(back.x).toBeCloseTo(17 / 64, 4);
    expect(back.y).toBeCloseTo(9 / 16, 4);
  });

  it('converts paper to grid and back for 56x56 and 80x80', () => {
    const config56 = { ...DEFAULT_GRID_CONFIG, divisionsX: 56, divisionsY: 56 };
    const paper56 = { x: 21 / 56, y: 7 / 56 };
    const grid56 = paperToGridCoords(paper56, config56);
    expect(grid56.x).toBeCloseTo(21, 4);
    expect(grid56.y).toBeCloseTo(7, 4);
    const back56 = gridToPaperCoords(grid56, config56);
    expect(back56.x).toBeCloseTo(21 / 56, 4);
    expect(back56.y).toBeCloseTo(7 / 56, 4);

    const config80 = { ...DEFAULT_GRID_CONFIG, divisionsX: 80, divisionsY: 80 };
    const paper80 = { x: 35 / 80, y: 23 / 80 };
    const grid80 = paperToGridCoords(paper80, config80);
    expect(grid80.x).toBeCloseTo(35, 4);
    expect(grid80.y).toBeCloseTo(23, 4);
    const back80 = gridToPaperCoords(grid80, config80);
    expect(back80.x).toBeCloseTo(35 / 80, 4);
    expect(back80.y).toBeCloseTo(23 / 80, 4);
  });

  it('verifies ORIGAMI_GRID_PRESETS and getOptimalMajorSubdivisions', () => {
    expect(ORIGAMI_GRID_PRESETS).toContain(56);
    expect(ORIGAMI_GRID_PRESETS).toContain(80);
    expect(getOptimalMajorSubdivisions(56)).toBe(8);
    expect(getOptimalMajorSubdivisions(80)).toBe(8);
    expect(getOptimalMajorSubdivisions(48)).toBe(8);
    expect(getOptimalMajorSubdivisions(36)).toBe(6);
    expect(getOptimalMajorSubdivisions(20)).toBe(5);
    expect(getOptimalMajorSubdivisions(28)).toBe(4);
    expect(getOptimalMajorSubdivisions(12)).toBe(6);
  });
});

describe('Symmetry', () => {
  it('reflects point across vertical axis x = 0.5', () => {
    const axis = {
      id: 'sym1',
      type: 'vertical' as const,
      p1: { x: 0.5, y: 0 },
      p2: { x: 0.5, y: 1 },
      active: true,
    };
    const p = { x: 0.25, y: 0.4 };
    const mirrored = reflectPoint(p, axis);
    expect(mirrored.x).toBeCloseTo(0.75, 4);
    expect(mirrored.y).toBeCloseTo(0.4, 4);
  });
});

describe('Origami Angles', () => {
  it('identifies 45 degree diagonal', () => {
    const match = matchOrigamiAngle(45.2, 1.0);
    expect(match).not.toBeNull();
    expect(match?.standardAngle).toBe(45);
  });

  it('identifies 22.5 degree bisector', () => {
    const match = matchOrigamiAngle(22.4, 1.0);
    expect(match).not.toBeNull();
    expect(match?.standardAngle).toBe(22.5);
  });
});

describe('Snap Target Engine', () => {
  const grid64 = { ...DEFAULT_GRID_CONFIG, divisionsX: 64, divisionsY: 64, enabled: true };

  it('fits arbitrary cursor position to the nearest origami grid intersection', () => {
    const scene = {
      referencePoints: [],
      intersections: [],
      creases: [],
      gridConfig: grid64,
    };
    const cursor = { x: 44.2 / 64, y: 13.1 / 64 };
    const snap = findSnapTarget(cursor, scene, DEFAULT_SNAP_OPTIONS, 1000, 1000);
    expect(snap).not.toBeNull();
    expect(snap?.kind).toBe('grid');
    expect(snap?.point.x).toBeCloseTo(44 / 64, 5);
    expect(snap?.point.y).toBeCloseTo(13 / 64, 5);
    expect(snap?.label).toBe('Grid (44, 13)');
  });

  it('aligns CV vectorized reference point slightly off-grid directly to the exact grid intersection', () => {
    // 41/64 = 0.640625, rasterized point at 0.6401 (offset ~0.5px on 1000px paper)
    const scene = {
      referencePoints: [{ id: 'p1', x: 0.6401, y: 24 / 64, label: 'Vertex' }],
      intersections: [],
      creases: [],
      gridConfig: grid64,
    };
    const cursor = { x: 0.6402, y: 24 / 64 };
    const snap = findSnapTarget(cursor, scene, DEFAULT_SNAP_OPTIONS, 1000, 1000);
    expect(snap).not.toBeNull();
    expect(snap?.kind).toBe('reference-point');
    // Perfectly snapped to 41/64:
    expect(snap?.point.x).toBeCloseTo(41 / 64, 5);
    expect(snap?.point.y).toBeCloseTo(24 / 64, 5);
    expect(snap?.label).toContain('(41, 24)');
  });
});

