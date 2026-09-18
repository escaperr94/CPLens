import { it, expect } from 'vitest';
import fs from 'fs';
import zlib from 'zlib';
import { analyzePixels } from '../pipeline';

function readPNGtoRGBA(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bpp = 4;
  let pos = 8;
  const idatChunks: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const out = new Uint8ClampedArray(width * height * 4);
  const stride = 1 + width * bpp;
  const prevRow = new Uint8Array(width * bpp);
  const currRow = new Uint8Array(width * bpp);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * stride];
    const rowOffset = y * stride + 1;
    for (let i = 0; i < width * bpp; i++) {
      const val = raw[rowOffset + i];
      const a = i >= bpp ? currRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;
      let r = val;
      if (filter === 1) r = (val + a) & 0xff;
      else if (filter === 2) r = (val + b) & 0xff;
      else if (filter === 3) r = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        let pr = a;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
        r = (val + pr) & 0xff;
      }
      currRow[i] = r;
    }
    out.set(currRow, y * width * 4);
    prevRow.set(currRow);
  }
  return { width, height, data: out };
}

it('verifies CP.png vectorization: clean, smooth, non-jagged lines on grid', async () => {
  const { width, height, data } = readPNGtoRGBA('CP.png');
  const result = await analyzePixels(data, width, height);

  expect(result.report.cpRegionDetected).toBe(true);
  expect(result.report.paperBoundaryDetected).toBe(true);
  expect(result.gridDivisions).toBe(64);

  // Creases should be clean and continuous (~700 - 950), NOT fragmented into 5,000+ pieces
  expect(result.creases.length).toBeGreaterThan(600);
  expect(result.creases.length).toBeLessThan(1200);

  // Exactly 4 paper boundary edges
  const boundaryEdges = result.creases.filter((c) => c.type === 'edge');
  expect(boundaryEdges.length).toBeGreaterThanOrEqual(4);

  // Mountain and Valley both detected with high count
  const mountains = result.creases.filter((c) => c.type === 'mountain');
  const valleys = result.creases.filter((c) => c.type === 'valley');
  expect(mountains.length).toBeGreaterThan(200);
  expect(valleys.length).toBeGreaterThan(150);

  // Angle distribution: almost all creases must have canonical origami angles
  let canonicalCount = 0;
  const canonicalTargets = [0, 22.5, 26.565, 45, 63.435, 67.5, 90, 112.5, 116.565, 135, 153.435, 157.5, 180];
  for (const c of result.creases) {
    const dx = c.p2.x - c.p1.x;
    const dy = c.p2.y - c.p1.y;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 180) % 180;
    const isCanonical = canonicalTargets.some((target) => Math.abs(angle - target) < 1.0);
    if (isCanonical) canonicalCount++;
  }
  const canonicalRatio = canonicalCount / result.creases.length;
  console.log(`CP.png canonical angle ratio: ${(canonicalRatio * 100).toFixed(1)}% (${canonicalCount}/${result.creases.length})`);
  expect(canonicalRatio).toBeGreaterThan(0.98);

  // Reference points: cleanly computed without thousands of noise points
  expect(result.referencePoints.length).toBeGreaterThan(400);
  expect(result.referencePoints.length).toBeLessThan(2000);
});

it('verifies Dove.png vectorization: grid lattice inferred and vector lines clean', async () => {
  const { width, height, data } = readPNGtoRGBA('public/Dove.png');
  const result = await analyzePixels(data, width, height);

  expect(result.report.cpRegionDetected).toBe(true);
  expect(result.gridDivisions).toBeGreaterThanOrEqual(32);
  expect(result.creases.length).toBeGreaterThan(200);
  expect(result.creases.length).toBeLessThan(1500);
});
