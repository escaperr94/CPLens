import { describe, it, expect } from 'vitest';
import { detectCPRegion } from '../../cv/pipeline';

describe('CP Region Detection', () => {
  it('detects crease pattern bounding region within a canvas', () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);

    // Initialize with white background
    data.fill(255);

    // Draw dark border at x in [10, 89], y in [10, 89]
    for (let y = 10; y <= 89; y++) {
      for (let x = 10; x <= 89; x++) {
        if (x === 10 || x === 89 || y === 10 || y === 89) {
          const idx = (y * width + x) * 4;
          data[idx] = 20;     // r
          data[idx + 1] = 20; // g
          data[idx + 2] = 20; // b
        }
      }
    }

    const res = detectCPRegion(data, width, height);
    expect(res.x0).toBe(10);
    expect(res.y0).toBe(10);
    expect(res.width).toBeGreaterThanOrEqual(50);
  });
});

