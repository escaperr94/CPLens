import { it, expect } from 'vitest';
import fs from 'fs';
import zlib from 'zlib';
import { extractRasterLines, analyzeRasterGrid, snapCreasesToOrigamiGrid } from '../../cv/rasterLines';
import { splitCreaseJunctions } from '../../geometry/mountainValley';

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

it('vectorizes Dove CP and infers grid', () => {
  const { width, height, data } = readPNGtoRGBA('public/Dove.png');
  const region = { x0: 31, y0: 80, width: 611, height: 611 };
  const rawLines = extractRasterLines(data, width, height, region);
  const grid = analyzeRasterGrid(rawLines, region.width);
  console.log('Dove raster lines:', rawLines.length, 'Grid inference:', grid);

  const snapped = grid.isGrid ? snapCreasesToOrigamiGrid(rawLines, grid.n, region.width) : rawLines;
  const creases = splitCreaseJunctions(snapped, {
    tolerance: grid.isGrid ? 3.5 / region.width : 6.5 / region.width,
    gridN: grid.isGrid ? grid.n : undefined,
    size: region.width,
  });
  console.log('Dove final creases:', creases.length);
  expect([32, 64]).toContain(grid.n);
  expect(creases.length).toBeGreaterThan(100);
});

