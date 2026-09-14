import { CreaseLine } from '../store/types';
import { lineFromPoints } from '../geometry/line';

type Region = { x0: number; y0: number; width: number; height: number };

/** Extract straight center-lines without snapping endpoints to a guessed lattice. */
export function extractRasterLines(data: Uint8ClampedArray, width: number, height: number, region: Region): CreaseLine[] {
  const pixels: { x: number; y: number; type: number }[] = [];
  const mask = new Uint8Array(width * height);
  for (let y = Math.ceil(region.y0); y <= Math.min(height - 1, region.y0 + region.height); y++) {
    for (let x = Math.ceil(region.x0); x <= Math.min(width - 1, region.x0 + region.width); x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (data[i + 3] < 80) continue;
      // The screenshots may contain a pale blue construction grid. Requiring
      // low luminance keeps that grid out of the CP vector while retaining the
      // darker antialiased crease centre pixels.
      // CP strokes are chromatic. Dark pixels are deliberately ignored here:
      // they are usually borders, text annotations, or cursor labels rather
      // than fold lines and would otherwise create convincing false vectors.
      const type = r - Math.max(g, b) > 18 && r + g + b < 570 ? 1 :
        b - Math.max(r, g) > 18 && r + g + b < 570 ? 2 : 0;
      if (!type) continue;
      mask[y * width + x] = type;
      pixels.push({ x: x - region.x0, y: y - region.y0, type });
    }
  }
  const lines: CreaseLine[] = [];
  const size = Math.max(region.width, region.height);
  const at = (x: number, y: number, type: number) => {
    const px = Math.round(region.x0 + x), py = Math.round(region.y0 + y);
    return px >= 0 && px < width && py >= 0 && py < height && mask[py * width + px] === type;
  };

  // Reject directions that only contain incidental pixels from crossings or
  // annotations. The threshold is relative, so a page containing only a
  // 22.5° stroke still keeps that direction while a normal orthogonal CP does
  // not turn every corner into a diagonal vector.
  const radius = Math.ceil(size * 1.42) + 3;
  const directionStrength = new Float32Array(8);
  for (let direction = 0; direction < 8; direction++) {
    const angle = direction * Math.PI / 8;
    const nx = -Math.sin(angle), ny = Math.cos(angle);
    for (const type of [1, 2]) {
      const votes = new Float32Array(radius * 2 + 1);
      for (const p of pixels) if (p.type === type) votes[Math.round(p.x * nx + p.y * ny) + radius]++;
      for (let i = 0; i < votes.length; i++) directionStrength[direction] = Math.max(directionStrength[direction], votes[i]);
    }
  }
  const strongestDirection = Math.max(...directionStrength);
  const activeDirectionThreshold = Math.max(24, strongestDirection * 0.22);

  // Scan eight directions, including 22.5°/67.5°, and build supported runs.
  for (let direction = 0; direction < 8; direction++) {
    const weakDirection = directionStrength[direction] < activeDirectionThreshold;
    const angle = direction * Math.PI / 8;
    const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
    const radius = Math.ceil(size * 1.42) + 3;
    for (const type of [1, 2]) {
      const votes = new Float32Array(radius * 2 + 1);
      for (const p of pixels) if (p.type === type) votes[Math.round(p.x * nx + p.y * ny) + radius]++;
      const peaks: number[] = [];
      // A short accumulator peak is usually an anti-aliased corner or a
      // label/grid artefact. Keep peaks with enough ink to represent a real
      // crease; short one-cell creases are still retained by the length rule
      // below.
      for (let i = 2; i < votes.length - 2; i++) if (votes[i] >= 12 && votes[i] >= votes[i - 1] && votes[i] > votes[i + 1]) peaks.push(i);
      peaks.sort((a, b) => votes[b] - votes[a]);
      const used = new Set<number>();
      for (const peak of peaks) {
        if (used.has(peak)) continue;
        for (let d = -2; d <= 2; d++) used.add(peak + d);
        let weight = 0, sum = 0;
        for (let d = -1; d <= 1; d++) { weight += votes[peak + d]; sum += (peak + d - radius) * votes[peak + d]; }
        const rho = sum / weight;
        let start = NaN, last = NaN, hits = 0;
        const flush = () => {
          const span = last - start;
          const confidence = hits / (span + 1);
          if (Number.isNaN(start) || span < Math.max(14, size / 44) || confidence < 0.72) return;
          // A weak direction is commonly produced by a crossing. Preserve it
          // only when it forms a long, nearly continuous stroke, which keeps
          // genuine isolated 22.5° lines without reintroducing corner noise.
          if (weakDirection && (span < Math.max(36, size / 8) || confidence < 0.86)) return;
          const p1 = { x: (nx * rho + ux * start) / region.width, y: (ny * rho + uy * start) / region.height };
          const p2 = { x: (nx * rho + ux * last) / region.width, y: (ny * rho + uy * last) / region.height };
          for (const p of [p1, p2]) { p.x = Math.max(0, Math.min(1, p.x)); p.y = Math.max(0, Math.min(1, p.y)); }
          lines.push({ id: `raster_${lines.length + 1}`, p1, p2, type: type === 1 ? 'mountain' : type === 2 ? 'valley' : 'unknown', confirmed: false, confidence, equation: lineFromPoints(p1, p2) });
        };
        for (let t = -radius; t <= radius * 2; t++) {
          const x = nx * rho + ux * t, y = ny * rho + uy * t;
          let supported = false;
          if (x >= 0 && x <= region.width && y >= 0 && y <= region.height) {
            for (const off of [-1, 0, 1]) if (at(x + nx * off, y + ny * off, type)) { supported = true; break; }
          }
          if (supported) { if (Number.isNaN(start)) start = t; last = t; hits++; }
          else if (!Number.isNaN(start) && t - last > 16) { flush(); start = NaN; hits = 0; }
        }
        flush();
      }
    }
  }

  // Deduplicate parallel passes and merge fragments with a small genuine gap.
  lines.sort((a, b) => Math.hypot(b.p2.x - b.p1.x, b.p2.y - b.p1.y) - Math.hypot(a.p2.x - a.p1.x, a.p2.y - a.p1.y));
  const merged: CreaseLine[] = [];
  const parallelTolerance = 0.006, distanceTolerance = 8 / size, gapTolerance = 18 / size;
  for (const line of lines) {
    const eq = line.equation!;
    let joined = false;
    for (const other of merged) {
      if (other.type !== line.type) continue;
      const oe = other.equation!;
      if (Math.abs(eq.a * oe.b - eq.b * oe.a) > parallelTolerance) continue;
      if (Math.max(Math.abs(oe.a * line.p1.x + oe.b * line.p1.y + oe.c), Math.abs(oe.a * line.p2.x + oe.b * line.p2.y + oe.c)) > distanceTolerance) continue;
      const dx = other.p2.x - other.p1.x, dy = other.p2.y - other.p1.y, length = Math.hypot(dx, dy);
      if (!length) continue;
      const ux = dx / length, uy = dy / length;
      const t1 = (line.p1.x - other.p1.x) * ux + (line.p1.y - other.p1.y) * uy;
      const t2 = (line.p2.x - other.p1.x) * ux + (line.p2.y - other.p1.y) * uy;
      const lo = Math.min(t1, t2), hi = Math.max(t1, t2);
      if (lo > length + gapTolerance || hi < -gapTolerance) continue;
      const start = Math.min(0, lo), end = Math.max(length, hi), origin = { ...other.p1 };
      other.p1 = { x: origin.x + ux * start, y: origin.y + uy * start };
      other.p2 = { x: origin.x + ux * end, y: origin.y + uy * end };
      other.equation = lineFromPoints(other.p1, other.p2);
      joined = true;
      break;
    }
    if (!joined) merged.push(line);
  }
  merged.sort((a, b) => Math.hypot(b.p2.x - b.p1.x, b.p2.y - b.p1.y) - Math.hypot(a.p2.x - a.p1.x, a.p2.y - a.p1.y));
  const kept: CreaseLine[] = [];
  for (const line of merged) {
    const eq = line.equation!;
    const duplicate = kept.some((other) => {
      if (other.type !== line.type) return false;
      const oe = other.equation!;
      if (Math.abs(eq.a * oe.b - eq.b * oe.a) > 0.004) return false;
      if (Math.max(Math.abs(oe.a * line.p1.x + oe.b * line.p1.y + oe.c), Math.abs(oe.a * line.p2.x + oe.b * line.p2.y + oe.c)) > 3 / size) return false;
      const dx = other.p2.x - other.p1.x, dy = other.p2.y - other.p1.y, length = Math.hypot(dx, dy);
      if (!length) return false;
      const ux = dx / length, uy = dy / length;
      const t1 = (line.p1.x - other.p1.x) * ux + (line.p1.y - other.p1.y) * uy;
      const t2 = (line.p2.x - other.p1.x) * ux + (line.p2.y - other.p1.y) * uy;
      return Math.min(t1, t2) >= -0.02 && Math.max(t1, t2) <= length + 0.02;
    });
    if (!duplicate) kept.push(line);
  }
  const claimed = new Uint8Array(width * height);
  const unique: CreaseLine[] = [];
  for (const line of kept) {
    const x1 = region.x0 + line.p1.x * region.width, y1 = region.y0 + line.p1.y * region.height;
    const x2 = region.x0 + line.p2.x * region.width, y2 = region.y0 + line.p2.y * region.height;
    const length = Math.hypot(x2 - x1, y2 - y1), samples = Math.max(2, Math.ceil(length));
    const type = line.type === 'mountain' ? 1 : 2;
    const footprint = new Set<number>();
    let supported = 0, fresh = 0;
    for (let i = 0; i <= samples; i++) {
      const x = Math.round(x1 + (x2 - x1) * i / samples), y = Math.round(y1 + (y2 - y1) * i / samples);
      let hit = false, unused = false;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const px = x + ox, py = y + oy;
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        const index = py * width + px;
        if (mask[index] === type) { hit = true; footprint.add(index); if (!claimed[index]) unused = true; }
      }
      if (hit) supported++;
      if (unused) fresh++;
    }
    if (supported / (samples + 1) < 0.35 || fresh / Math.max(1, supported) < 0.55) continue;
    for (const index of footprint) claimed[index] = 1;
    unique.push(line);
  }
  return unique;
}

export function inferRasterGrid(lines: CreaseLine[], size: number): number {
  const values: number[] = [];
  for (const crease of lines) {
    if (Math.abs(crease.p1.x - crease.p2.x) < 2 / size && Math.abs(crease.p1.y - crease.p2.y) > 10 / size) values.push((crease.p1.x + crease.p2.x) / 2);
    if (Math.abs(crease.p1.y - crease.p2.y) < 2 / size && Math.abs(crease.p1.x - crease.p2.x) > 10 / size) values.push((crease.p1.y + crease.p2.y) / 2);
  }
  const unique = [...new Set(values.filter((value) => value > 0.01 && value < 0.99).map((value) => Math.round(value * size) / size))];
  const ranked = [8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128].map((n) => ({
    n,
    score: unique.length ? unique.reduce((sum, value) => sum + Math.min(5, Math.abs(value - Math.round(value * n) / n) * size), 0) / unique.length + 0.015 * n : n,
  }));
  return ranked.sort((a, b) => a.score - b.score)[0].n;
}
