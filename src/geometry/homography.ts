import { Point2D } from './point';

/**
 * Homography matrix represented as 9 numbers [h00, h01, h02, h10, h11, h12, h20, h21, h22]
 */
export type Matrix3x3 = number[];

export const IDENTITY_HOMOGRAPHY: Matrix3x3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];

/**
 * Applies a 3x3 homography matrix to a 2D point: (x', y', w') = H * (x, y, 1)
 */
export function applyHomography(p: Point2D, H: Matrix3x3): Point2D {
  const x = p.x;
  const y = p.y;
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-12) {
    return { x: 0, y: 0 };
  }
  return {
    x: (H[0] * x + H[1] * y + H[2]) / w,
    y: (H[3] * x + H[4] * y + H[5]) / w,
  };
}

/**
 * Inverts a 3x3 matrix using standard analytic formula
 */
export function invertHomography(H: Matrix3x3): Matrix3x3 {
  const [
    a, b, c,
    d, e, f,
    g, h, i
  ] = H;

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H_ = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) {
    return IDENTITY_HOMOGRAPHY;
  }

  const invDet = 1 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H_ * invDet,
    C * invDet, F * invDet, I * invDet,
  ];
}

/**
 * Solves 8x8 linear system via Gaussian elimination with partial pivoting
 */
function solve8x8(A: number[][], B: number[]): number[] | null {
  const n = 8;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], B[i]]);
  }

  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    if (Math.abs(M[i][i]) < 1e-12) {
      return null;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const X = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * X[j];
    }
    X[i] = sum / M[i][i];
  }

  return X;
}

/**
 * Finds 3x3 homography mapping 4 source points to 4 destination points
 */
export function findHomography(src: Point2D[], dst: Point2D[]): Matrix3x3 {
  if (src.length !== 4 || dst.length !== 4) {
    return IDENTITY_HOMOGRAPHY;
  }

  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];

    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    B.push(u);

    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    B.push(v);
  }

  const solution = solve8x8(A, B);
  if (!solution) {
    return IDENTITY_HOMOGRAPHY;
  }

  return [
    solution[0], solution[1], solution[2],
    solution[3], solution[4], solution[5],
    solution[6], solution[7], 1.0,
  ];
}

/**
 * Computes forward and inverse homographies mapping 4 corners of paper to unit square [0,1]^2:
 * corners order: [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
 */
export function createUnitSquareHomography(
  quadCorners: [Point2D, Point2D, Point2D, Point2D]
): { toNormalized: Matrix3x3; toImage: Matrix3x3 } {
  const unitSquare: Point2D[] = [
    { x: 0, y: 0 }, // TL
    { x: 1, y: 0 }, // TR
    { x: 1, y: 1 }, // BR
    { x: 0, y: 1 }, // BL
  ];

  const toNormalized = findHomography(quadCorners, unitSquare);
  const toImage = invertHomography(toNormalized);

  return { toNormalized, toImage };
}

