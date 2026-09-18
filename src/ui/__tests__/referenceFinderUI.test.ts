import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ReferenceFinderPanel } from '../ReferenceFinderPanel';
import { FoldingSolutions } from '../FoldingSolutions';

describe('ReferenceFinderPanel and FoldingSolutions', () => {
  it('renders ReferenceFinderPanel with badge, subtitle, and presets', () => {
    const html = renderToString(
      React.createElement(ReferenceFinderPanel, { point: { x: 0.375, y: 0.375 } })
    );

    // 1. Header with clear badge & explanatory subtitle
    expect(html).toContain('22.5° Reference Finder');
    // 3. Origami Presets
    expect(html).toContain('Origami Presets');
    expect(html).toContain('Center');
    expect(html).toContain('Silver');
    expect(html).toContain('3/8');
    expect(html).toContain('1/3');
    expect(html).toContain('5/8');
    expect(html).toContain('1/4');

    // 4. Candidate badge
    expect(html).toContain('X ≈ 3/8');
    expect(html).toContain('Y ≈ 3/8');

    // 5. Follow Canvas Cursor toggle
    expect(html).toContain('Follow Canvas Cursor');

    // 6. Action tools
    expect(html).toContain('Crosshair Guidelines');
    expect(html).toContain('Places orthogonal guide rulers through this point');
    expect(html).toContain('Measure from here');
    expect(html).toContain('Pin Reference');

    // 7. Paper dimension & offsets
    expect(html).toContain('Paper Dimension');
    expect(html).toContain('112.50'); // 0.375 * 300 = 112.5
    expect(html).toContain('mm');
  });

  it('renders FoldingSolutions controls, depth selector, and search button', () => {
    const html = renderToString(
      React.createElement(FoldingSolutions, { point: { x: 0.5, y: 0.5 }, side: 300 })
    );

    // Search depth selector
    expect(html).toContain('Search Depth');
    expect(html).toContain('Rank 4 (Fast)');
    expect(html).toContain('Rank 5 (Deep)');

    // Primary search button
    expect(html).toContain('Find Folding Sequences');

    // Coordinate export and external reference
    expect(html).toContain('Robert J. Lang Engine Coordinates');
    expect(html).toContain('Copy Coordinates');
    expect(html).toContain('Open ReferenceFinder Online');
  });

  it('correctly calculates candidates for silver proportion', () => {
    const silver = Math.SQRT2 - 1;
    const html = renderToString(
      React.createElement(ReferenceFinderPanel, { point: { x: silver, y: silver } })
    );

    expect(html).toContain('√2 − 1');
  });
});
