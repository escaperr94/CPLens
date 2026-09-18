export interface FractionApproximation {
  numerator: number;
  denominator: number;
  value: number;
  error: number;
  formatted: string;
}

export interface RationalOptions {
  maxDenominator?: number;
  preferPowerOfTwo?: boolean;
  tolerance?: number;
}

/**
 * Computes greatest common divisor
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Approximates a floating point number using power-of-two denominators:
 * e.g. 2, 4, 8, 16, 32, 64, 128, 256
 */
export function approximatePowerOfTwo(
  x: number,
  maxDenominator: number = 256
): FractionApproximation {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  // Find the largest power of 2 <= maxDenominator
  let denom = 1;
  while (denom * 2 <= maxDenominator) {
    denom *= 2;
  }

  // Find closest numerator
  let num = Math.round(absX * denom);
  
  // Reduce fraction if possible
  const common = gcd(num, denom);
  num = (num / common) * sign;
  denom = denom / common;

  const value = num / denom;
  const error = Math.abs(x - value);

  return {
    numerator: num,
    denominator: denom,
    value,
    error,
    formatted: denom === 1 ? `${num}` : `${num}/${denom}`,
  };
}

/**
 * Continued fraction approximation to find best rational p/q with q <= maxDenominator
 */
export function approximateContinuedFraction(
  x: number,
  maxDenominator: number = 256,
  tolerance: number = 1e-6
): FractionApproximation {
  if (isNaN(x) || !isFinite(x)) {
    return { numerator: 0, denominator: 1, value: 0, error: 0, formatted: '0' };
  }

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  if (Math.abs(absX - Math.round(absX)) < tolerance) {
    const intVal = Math.round(absX) * sign;
    return {
      numerator: intVal,
      denominator: 1,
      value: intVal,
      error: 0,
      formatted: `${intVal}`,
    };
  }

  let m00 = 1, m01 = 0;
  let m10 = 0, m11 = 1;
  let currentVal = absX;

  let bestNum = Math.round(absX);
  let bestDenom = 1;
  let minError = Math.abs(absX - bestNum);

  for (let iter = 0; iter < 50; iter++) {
    const a = Math.floor(currentVal);
    const nextM00 = a * m00 + m01;
    const nextM10 = a * m10 + m11;

    if (nextM10 > maxDenominator) {
      // Check semiconvergents
      const maxK = Math.floor((maxDenominator - m11) / m10);
      if (maxK > 0) {
        const kNum = maxK * m00 + m01;
        const kDenom = maxK * m10 + m11;
        const kErr = Math.abs(absX - kNum / kDenom);
        if (kErr < minError) {
          bestNum = kNum;
          bestDenom = kDenom;
          minError = kErr;
        }
      }
      break;
    }

    m01 = m00;
    m00 = nextM00;
    m11 = m10;
    m10 = nextM10;

    const approxVal = m00 / m10;
    const err = Math.abs(absX - approxVal);

    if (err < minError) {
      bestNum = m00;
      bestDenom = m10;
      minError = err;
    }

    if (err <= tolerance) break;

    const fracPart = currentVal - a;
    if (fracPart < 1e-10) break;
    currentVal = 1 / fracPart;
  }

  bestNum = bestNum * sign;
  return {
    numerator: bestNum,
    denominator: bestDenom,
    value: bestNum / bestDenom,
    error: minError,
    formatted: bestDenom === 1 ? `${bestNum}` : `${bestNum}/${bestDenom}`,
  };
}

/**
 * Main approximation function combining general and power-of-two preferences
 */
export function approximateFraction(
  value: number,
  options: RationalOptions = {}
): FractionApproximation {
  const { maxDenominator = 64, preferPowerOfTwo = true, tolerance = 1e-6 } = options;

  if (preferPowerOfTwo) {
    const pow2Approx = approximatePowerOfTwo(value, maxDenominator);
    // If pow2 is very close (< 0.005), prefer it for origami reference patterns
    if (pow2Approx.error < 0.005) {
      return pow2Approx;
    }
  }

  return approximateContinuedFraction(value, maxDenominator, tolerance);
}

/**
 * Generates a list of likely candidates (e.g. power-of-2 and arbitrary close fractions)
 */
export function getFractionCandidates(
  value: number,
  maxDenominator: number = 64
): FractionApproximation[] {
  const candidates: FractionApproximation[] = [];
  const seen = new Set<string>();

  // Try standard origami powers of 2
  for (const denom of [8, 16, 32, 64, 128, 256]) {
    if (denom <= maxDenominator) {
      const p2 = approximatePowerOfTwo(value, denom);
      if (!seen.has(p2.formatted)) {
        seen.add(p2.formatted);
        candidates.push(p2);
      }
    }
  }

  // Try continued fractions with varying denominators
  for (const maxD of [8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 112, 120, 128]) {
    if (maxD <= maxDenominator) {
      const cf = approximateContinuedFraction(value, maxD);
      if (!seen.has(cf.formatted)) {
        seen.add(cf.formatted);
        candidates.push(cf);
      }
    }
  }

  return candidates.sort((a, b) => a.error - b.error);
}

/**
 * Formats a coordinate fraction respecting the grid division if close to a grid line.
 * E.g. with grid 32, 0.625 -> "20/32" (does not reduce to "5/8").
 */
export function formatGridFraction(
  value: number,
  gridDivisions: number = 32
): string {
  if (isNaN(value) || !isFinite(value)) return '0';

  const div = Math.max(1, Math.round(gridDivisions || 32));
  const gridIndex = Math.round(value * div);
  const gridExpected = gridIndex / div;

  // If close to a grid line (tolerance ~10% of a grid cell or min 0.004)
  const tol = Math.min(0.005, 0.25 / div);
  if (Math.abs(value - gridExpected) <= tol) {
    return `${gridIndex}/${div}`;
  }

  // If not on a grid line, approximate with standard fractions
  const approx = approximateFraction(value, { maxDenominator: Math.max(64, div * 2) });
  if (approx.error < 0.005) {
    return approx.formatted;
  }

  return value.toFixed(3);
}

