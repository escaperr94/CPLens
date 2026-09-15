import { ProjectState } from '../store/types';
import { approximateFraction } from '../geometry/rational';
import { distance } from '../geometry/point';

/**
 * Exports project state as JSON file
 */
export function exportProjectJson(state: ProjectState) {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cplens_${state.image.fileName || 'project'}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports standard Origami CP file (.cp / .ori compatible with Oridieta, Orihime, Oripa)
 * Format: [type] [x1] [y1] [x2] [y2]
 * 1: Boundary/Edge, 2: Mountain, 3: Valley, 4: Auxiliary
 * Coordinates scaled to [0, 400] standard Orihime coordinate space
 */
export function exportOriOrCpFile(state: ProjectState, extension: 'cp' | 'ori' = 'cp', scale: number = 400) {
  const lines: string[] = [];

  // Add 4 paper boundary lines if not already present
  const hasBoundary = state.creases.some((c) => c.type === 'edge');
  if (!hasBoundary) {
    lines.push(`1 0 0 ${scale} 0`);
    lines.push(`1 ${scale} 0 ${scale} ${scale}`);
    lines.push(`1 ${scale} ${scale} 0 ${scale}`);
    lines.push(`1 0 ${scale} 0 0`);
  }

  for (const c of state.creases) {
    let typeCode = 4; // auxiliary
    if (c.type === 'edge') typeCode = 1;
    else if (c.type === 'mountain') typeCode = 2;
    else if (c.type === 'valley') typeCode = 3;

    const x1 = (c.p1.x * scale).toFixed(3);
    const y1 = (c.p1.y * scale).toFixed(3);
    const x2 = (c.p2.x * scale).toFixed(3);
    const y2 = (c.p2.y * scale).toFixed(3);

    lines.push(`${typeCode} ${x1} ${y1} ${x2} ${y2}`);
  }

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cplens_${state.image.fileName || 'crease_pattern'}.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports reference points as CSV
 */
export function exportPointsCsv(state: ProjectState) {
  const rows = [
    ['Label', 'x_normalized', 'y_normalized', 'x_fraction', 'y_fraction', 'grid_32_x', 'grid_32_y'],
  ];

  for (const p of state.points) {
    const fx = approximateFraction(p.x, { maxDenominator: state.grid.divisionsX || 32 });
    const fy = approximateFraction(p.y, { maxDenominator: state.grid.divisionsY || 32 });
    const gx = Math.round(p.x * state.grid.divisionsX);
    const gy = Math.round(p.y * state.grid.divisionsY);
    rows.push([p.label, p.x.toFixed(6), p.y.toFixed(6), fx.formatted, fy.formatted, `${gx}`, `${gy}`]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const a = document.createElement('a');
  a.href = encodedUri;
  a.download = `cplens_points_${Date.now()}.csv`;
  a.click();
}

/**
 * Exports measurements as CSV
 */
export function exportMeasurementsCsv(state: ProjectState) {
  const rows = [
    ['ID', 'p1_x', 'p1_y', 'p2_x', 'p2_y', 'distance', 'delta_x', 'delta_y', 'angle_deg'],
  ];

  for (const m of state.measurements) {
    const d = distance(m.p1, m.p2);
    const dx = Math.abs(m.p2.x - m.p1.x);
    const dy = Math.abs(m.p2.y - m.p1.y);
    let deg = (Math.atan2(m.p2.y - m.p1.y, m.p2.x - m.p1.x) * 180) / Math.PI;
    if (deg < 0) deg += 180;

    rows.push([
      m.id,
      m.p1.x.toFixed(6),
      m.p1.y.toFixed(6),
      m.p2.x.toFixed(6),
      m.p2.y.toFixed(6),
      d.toFixed(6),
      dx.toFixed(6),
      dy.toFixed(6),
      deg.toFixed(2),
    ]);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const a = document.createElement('a');
  a.href = encodedUri;
  a.download = `cplens_measurements_${Date.now()}.csv`;
  a.click();
}

/**
 * Exports clean vector SVG of the crease pattern, grid, and reference points
 */
export function exportSvg(state: ProjectState, svgSize: number = 1000) {
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">`
  );

  // Background unit square
  lines.push(
    `  <rect x="0" y="0" width="${svgSize}" height="${svgSize}" fill="#ffffff" stroke="#18181b" stroke-width="2"/>`
  );

  // Grid layer (optional in SVG)
  if (state.layers.grid && state.grid.enabled) {
    lines.push(`  <g id="grid" stroke="${state.grid.color}" stroke-width="0.5" opacity="${state.grid.opacity}">`);
    for (let i = 1; i < state.grid.divisionsX; i++) {
      const x = (i / state.grid.divisionsX) * svgSize;
      lines.push(`    <line x1="${x}" y1="0" x2="${x}" y2="${svgSize}" />`);
    }
    for (let j = 1; j < state.grid.divisionsY; j++) {
      const y = (j / state.grid.divisionsY) * svgSize;
      lines.push(`    <line x1="0" y1="${y}" x2="${svgSize}" y2="${y}" />`);
    }
    lines.push(`  </g>`);
  }

  // Creases
  lines.push(`  <g id="creases">`);
  for (const c of state.creases) {
    const x1 = c.p1.x * svgSize;
    const y1 = c.p1.y * svgSize;
    const x2 = c.p2.x * svgSize;
    const y2 = c.p2.y * svgSize;

    let stroke = '#DC2626'; // mountain red
    if (c.type === 'valley') {
      stroke = '#2563EB'; // valley blue
    } else if (c.type === 'mountain') {
      stroke = '#DC2626';
    } else if (c.type === 'edge') {
      stroke = '#18181B';
    } else {
      stroke = c.type === 'unknown' ? '#52525B' : '#9333EA';
    }

    lines.push(
      `    <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`
    );
  }
  lines.push(`  </g>`);

  // Reference points
  lines.push(`  <g id="reference-points">`);
  for (const p of state.points) {
    const x = p.x * svgSize;
    const y = p.y * svgSize;
    const fx = approximateFraction(p.x, { maxDenominator: state.grid.divisionsX || 32 }).formatted;
    const fy = approximateFraction(p.y, { maxDenominator: state.grid.divisionsY || 32 }).formatted;

    lines.push(
      `    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.5" fill="#ffffff" stroke="#0D99FF" stroke-width="1.5" />`
    );
    lines.push(
      `    <text x="${(x + 5).toFixed(2)}" y="${(y - 4).toFixed(2)}" font-family="monospace" font-size="10" fill="#1E1E1E">${p.label} (${fx}, ${fy})</text>`
    );
  }
  lines.push(`  </g>`);

  lines.push(`</svg>`);

  const svgContent = lines.join('\n');
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cplens_vector_${Date.now()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
