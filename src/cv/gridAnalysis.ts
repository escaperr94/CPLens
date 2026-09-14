export interface GridCandidate {
  divisions: number;
  confidence: number; // 0.0 to 1.0
  score: number;
}

const COMMON_GRID_SIZES = [8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128];

/**
 * Analyzes a rectified canvas to estimate likely origami grid subdivisions
 */
export function analyzeGridCandidates(
  canvas: HTMLCanvasElement,
  candidateSizes: number[] = COMMON_GRID_SIZES
): GridCandidate[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Calculate horizontal & vertical gradient projection profiles
  const gradX = new Float32Array(width);
  const gradY = new Float32Array(height);

  // Luminance helper
  const lum = (idx: number) =>
    0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

  // Downsampled step for speed
  const step = Math.max(1, Math.floor(width / 400));

  for (let y = 1; y < height - 1; y += step) {
    const rowOffset = y * width * 4;
    for (let x = 1; x < width - 1; x += step) {
      const idx = rowOffset + x * 4;

      // Sobel-like simple central difference
      const gx = Math.abs(lum(idx + 4) - lum(idx - 4));
      const gy = Math.abs(lum(idx + width * 4) - lum(idx - width * 4));

      gradX[x] += gx;
      gradY[y] += gy;
    }
  }

  // 2. Score candidate grid sizes against observed gradient peaks
  const results: GridCandidate[] = [];

  for (const N of candidateSizes) {
    let matchScore = 0;
    let totalSamples = 0;

    // Check vertical grid lines (x-coordinates)
    for (let k = 1; k < N; k++) {
      const targetX = Math.round((k / N) * (width - 1));
      // Window around targetX
      let peak = 0;
      for (let dx = -2; dx <= 2; dx++) {
        const sampleX = targetX + dx;
        if (sampleX >= 0 && sampleX < width) {
          if (gradX[sampleX] > peak) peak = gradX[sampleX];
        }
      }
      matchScore += peak;
      totalSamples++;
    }

    // Check horizontal grid lines (y-coordinates)
    for (let k = 1; k < N; k++) {
      const targetY = Math.round((k / N) * (height - 1));
      let peak = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const sampleY = targetY + dy;
        if (sampleY >= 0 && sampleY < height) {
          if (gradY[sampleY] > peak) peak = gradY[sampleY];
        }
      }
      matchScore += peak;
      totalSamples++;
    }

    const avgScore = totalSamples > 0 ? matchScore / totalSamples : 0;
    results.push({
      divisions: N,
      score: avgScore,
      confidence: 0,
    });
  }

  // Normalize scores to [0.2, 0.98] confidence
  const maxScore = Math.max(...results.map((r) => r.score), 1e-6);
  const minScore = Math.min(...results.map((r) => r.score));
  const range = maxScore - minScore || 1;

  for (const r of results) {
    // Origami power of two prior bonus
    const isPow2 = (r.divisions & (r.divisions - 1)) === 0;
    const prior = isPow2 ? 1.1 : 1.0;
    const rawConf = ((r.score - minScore) / range) * prior;
    r.confidence = Math.min(0.98, Math.max(0.15, Number((rawConf * 0.7 + 0.25).toFixed(2))));
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

