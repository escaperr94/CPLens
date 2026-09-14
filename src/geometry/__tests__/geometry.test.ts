import { describe, it, expect } from 'vitest';
import { approximateFraction, approximatePowerOfTwo, getFractionCandidates } from '../rational';
import { createUnitSquareHomography, applyHomography } from '../homography';
import { segmentIntersection, findCreaseIntersections } from '../intersection';
import { paperToGridCoords, gridToPaperCoords, DEFAULT_GRID_CONFIG } from '../grid';
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

