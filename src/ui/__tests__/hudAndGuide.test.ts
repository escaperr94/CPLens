import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CanvasHUD } from '../CanvasHUD';
import { ToolGuideModal } from '../ToolGuideModal';
import { useAppStore } from '../../store/projectStore';
describe('CanvasHUD and ToolGuideModal', () => {
  it('renders CanvasHUD with active tool information', () => {
    const html = renderToString(React.createElement(CanvasHUD, { tool: 'ruler' }));
    expect(html).toContain('Crosshair Ruler');
    expect(html).toContain('Click paper to place horizontal &amp; vertical guidelines');
    expect(html).toContain('Add Center Crosshair');
    expect(html).toContain('Origami CAD Demystified Guide');
  });

  it('updates CanvasHUD when active tool changes to point', () => {
    const html = renderToString(React.createElement(CanvasHUD, { tool: 'point' }));
    expect(html).toContain('Reference Point');
    expect(html).toContain('Click paper to pin a landmark');
    expect(html).toContain('Open 22.5° Solver');
  });

  it('updates CanvasHUD when active tool changes to grid', () => {
    const html = renderToString(React.createElement(CanvasHUD, { tool: 'grid' }));
    expect(html).toContain('Grid Overlay');
    expect(html).toContain('Displays box-pleat lattice overlay');
    expect(html).toContain('Grid Snap');
  });

  it('renders instructions for all studio tools correctly', () => {
    const measureHtml = renderToString(React.createElement(CanvasHUD, { tool: 'measure' }));
    expect(measureHtml).toContain('Two-Point Measure');
    expect(measureHtml).toContain('Click two points to measure exact Euclidean distance and origami rational ratio');

    const lineHtml = renderToString(React.createElement(CanvasHUD, { tool: 'line' }));
    expect(lineHtml).toContain('Crease Line');
    expect(lineHtml).toContain('Click and drag to draw a crease. Choose Mountain (red), Valley (blue), or Edge in toolbar');

    const calibrateHtml = renderToString(React.createElement(CanvasHUD, { tool: 'calibrate' }));
    expect(calibrateHtml).toContain('Paper Calibration');
    expect(calibrateHtml).toContain('Click 4 paper corners (TL, TR, BR, BL) to rectify perspective distortion from a photo');

    const symmetryHtml = renderToString(React.createElement(CanvasHUD, { tool: 'symmetry' }));
    expect(symmetryHtml).toContain('Symmetry Reflection');
    expect(symmetryHtml).toContain('Reflect creases across horizontal, vertical, or diagonal fold axes');

    const selectHtml = renderToString(React.createElement(CanvasHUD, { tool: 'select' }));
    expect(selectHtml).toContain('Select &amp; Inspect');
    expect(selectHtml).toContain('Click creases, points, or crosshairs to inspect exact geometry and angles');

    const panHtml = renderToString(React.createElement(CanvasHUD, { tool: 'pan' }));
    expect(panHtml).toContain('Hand Tool (Pan)');
    expect(panHtml).toContain('Click and drag to pan the paper canvas. Scroll to zoom');
  });

  it('renders Keyboard Shortcuts tab with all required keybindings', () => {
    const html = renderToString(
      React.createElement(ToolGuideModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'shortcuts',
      })
    );
    expect(html).toContain('Studio Keyboard Shortcuts');
    expect(html).toContain('⌘K / Ctrl+K');
    expect(html).toContain('⌘Z / Ctrl+Z');
    expect(html).toContain('⌘⇧Z / Ctrl+Y');
  });
  it('renders ToolGuideModal with all 5 core tabs', () => {
    const html = renderToString(
      React.createElement(ToolGuideModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'crosshairs',
      })
    );
    expect(html).toContain('CP Lens Tool Guide • Origami CAD Demystified');
    expect(html).toContain('Crosshair Rulers &amp; Guidelines');
    expect(html).toContain('22.5° Reference Finder');
    expect(html).toContain('Rational Snapping &amp; Grids');
    expect(html).toContain('Mountain &amp; Valley Assignment');
    expect(html).toContain('Keyboard Shortcuts');
    expect(html).toContain('√2−1');
  });

  it('renders 22.5° Reference Finder tab with Robert J. Lang explanation', () => {
    const html = renderToString(
      React.createElement(ToolGuideModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'reference-finder',
      })
    );
    expect(html).toContain("Robert J. Lang&#x27;s");
    expect(html).toContain('Huzita-Hatori Axioms in CAD');
    expect(html).toContain('Find folding sequences');
  });

  it('renders Mountain & Valley tab with Maekawa-Justin theorem', () => {
    const html = renderToString(
      React.createElement(ToolGuideModal, {
        isOpen: true,
        onClose: () => {},
        initialTab: 'mountain-valley',
      })
    );
    expect(html).toContain('Maekawa-Justin Theorem');
    expect(html).toContain('M − V = ±2');
    expect(html).toContain('Kawasaki&#x27;s Theorem');
  });
});
