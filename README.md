# CP Lens — Origami Crease Pattern Reference Inspector

<div align="center">
  <img src="public/logo_ori.png" alt="CP Lens Logo" width="96" height="96" />
  <p><strong>A Figma-like geometric workspace & CAD inspector for origami crease patterns.</strong></p>
</div>

---

## 🎯 Overview

**CP Lens** is a local-first web application designed specifically for origami artists, designers, and folders. Instead of manually eyeballing and squinting at blurry raster crease patterns, CP Lens acts as a **geometric OCR and CAD workspace**:

1. **Drop / Paste**: Drag & drop or paste any crease pattern screenshot.
2. **Perspective Rectification**: Automatically detect paper boundaries and rectify perspective distortion into normalized $[0, 1]^2$ unit-square coordinates.
3. **Lattice & Crease Inference**: Infer the underlying grid lattice (e.g. 32×32, 64×64) and vectorize anti-aliased raster strokes into clean, continuous vector creases.
4. **Interactive Figma-style CAD**: Inspect exact rational coordinates (e.g. $17/64$, $3/16$), measure angles and distances, place reference points, and export directly to folding software.

---

## ✨ Features

- **⚡ Butter-Smooth Performance (60–120 FPS)**:
  - Batched Konva `<Shape>` rendering merges thousands of creases into single-pass GPU/canvas draw calls.
  - Multi-canvas layer isolation separates static vector creases from interactive overlays.
  - Accelerated bounding-box early exit spatial snapping for real-time responsiveness without lag.

- **🎨 Pure Figma Light Mode Aesthetic**:
  - Clean light interface matching Figma's design language.
  - Floating 2D toolbar, property inspector, and contextual cursor hints.
  - Segmented view mode switcher: **Vector CP**, **Overlay** (with opacity blending), and **Image**.

- **📐 Accurate Crease Rendering**:
  - Thick, continuous solid lines without dashed breaks.
  - Standard origami color coding:
    - **Mountain**: Solid Red (`#DC2626`)
    - **Valley**: Solid Blue (`#2563EB`)
    - **Boundary / Edge**: Solid Charcoal (`#18181B`)

- **🧮 Rational Coordinate Inspector**:
  - Live cursor inspection showing closest dyadic and rational fractions ($/16, /32, /64, /128$).
  - Candidate approximation table with exact error margins.

- **💾 Comprehensive Export Formats**:
  - **Oridieta / Orihime (`.cp` & `.ori`)**: Directly openable in Oridieta, Orihime, and Oripa.
  - **Layered Vector SVG**: Crisp vector graphic with colored solid strokes.
  - **Project JSON (v1)**: Full project state preservation.
  - **CSV**: Reference points and measurements with rational fractions.

- **⌨️ Cross-Platform Keyboard Shortcuts**:
  - Platform-aware: Supports Windows (`Ctrl`) and macOS (`⌘`).
  - `Ctrl/⌘ + K`: Command Palette search.
  - `Ctrl/⌘ + Z` / `Ctrl + Y`: Undo / Redo.
  - `Ctrl/⌘ + 0`: Fit paper to viewport.
  - `Ctrl/⌘ + 1`: 100% zoom.
  - `Ctrl/⌘ + +` / `Ctrl/⌘ + -`: Zoom in / out.
  - `V`: Select, `H`: Pan (Hand), `P`: Point, `L`: Crease, `R`: Ruler, `G`: Grid, `S`: Snap toggle.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/cp-lens.git
cd cp-lens

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:5173/`.

### Building for Production

```bash
# Typecheck & build with Vite
npm run build

# Preview production build locally
npm run preview
```

### Running Unit Tests

```bash
# Run Vitest test suite
npm run test
```

---

## 🛠️ Architecture & Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Canvas / 2D Engine**: Konva & React-Konva
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Testing**: Vitest

---

## 📄 License

MIT License. Feel free to use, modify, and distribute for personal and origami research projects.
