import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Inspector } from '../Inspector';

describe('Inspector Guidelines & Crosshairs', () => {
  it('renders Guidelines & Crosshairs manager card with preset buttons and active list', () => {
    const rulers = [
      { id: 'r1', point: { x: 0.5, y: 0.5 }, orientation: 'both' as const },
      { id: 'r2', point: { x: 0.375, y: 0.375 }, orientation: 'both' as const },
    ];

    const html = renderToString(
      React.createElement(Inspector, { onRunAutoAnalysis: () => {}, rulers })
    );

    expect(html).toContain('Crosshairs &amp; Guidelines');
    expect(html).toContain('+ Center (1/2)');
    expect(html).toContain('+ Quarters (1/4, 3/4)');
    expect(html).toContain('1/2');
    expect(html).toContain('3/8');
    expect(html).toContain('Clear all');
  });

  it('renders empty guidelines hint when no rulers are active', () => {
    const html = renderToString(
      React.createElement(Inspector, { onRunAutoAnalysis: () => {}, rulers: [] })
    );

    expect(html).toContain('No active guidelines');
    expect(html).toContain('Press [R] and click anywhere on paper');
  });
});
