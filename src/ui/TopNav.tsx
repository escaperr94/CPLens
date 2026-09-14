import React, { useRef, useState } from 'react';
import {
  Download,
  RotateCcw,
  RotateCw,
  Magnet,
  Eye,
  Sparkles,
  Search,
  ChevronDown,
  FileCode,
  Table,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import {
  exportProjectJson,
  exportSvg,
  exportPointsCsv,
  exportMeasurementsCsv,
  exportOriOrCpFile,
} from '../export/exportProject';

interface TopNavProps {
  onOpenCommandPalette: () => void;
  onRunAutoAnalysis: () => void;
  onLoadCP: () => void;
  onLoadDove: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenCommandPalette,
  onRunAutoAnalysis,
  onLoadCP,
  onLoadDove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  const {
    image,
    loadImage,
    camera,
    setCamera,
    fitToPaper,
    snappingEnabled,
    toggleSnapping,
    undo,
    redo,
    past,
    future,
    getProjectData,
    loadProjectData,
    loupe,
    setLoupeActive,
    viewMode,
    setViewMode,
  } = useAppStore();

  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadImage(url, file.name, img.naturalWidth, img.naturalHeight);
        fitToPaper(window.innerWidth - 360, window.innerHeight - 80);
        setTimeout(() => {
          onRunAutoAnalysis();
        }, 150);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        loadProjectData(data);
      } catch (err) {
        alert('Invalid CP Lens project JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-12 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 flex items-center justify-between text-xs text-neutral-800 select-none z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFile}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleJsonFile}
      />

      {/* Left Section: macOS Traffic Lights + Logo + Untitled CP + Sample Pills + Undo/Redo */}
      <div className="flex items-center space-x-2.5">
        {/* macOS Window Controls */}
        <div className="flex items-center space-x-2 mr-1">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/60 shadow-2xs" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/60 shadow-2xs" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/60 shadow-2xs" />
        </div>

        {/* Brand Logo & App Name */}
        <div className="flex items-center space-x-1.5">
          <img src="/logo_ori.png" alt="Logo" className="w-5 h-5 object-contain" />
          <span className="font-semibold text-neutral-900 text-[13px] tracking-tight">CP Lens</span>
        </div>

        {/* File Name Dropdown */}
        <div className="flex items-center space-x-1 text-neutral-600 hover:text-neutral-900 cursor-pointer px-1 py-0.5 rounded hover:bg-neutral-100 transition">
          <span className="font-normal text-xs text-neutral-500 max-w-[110px] truncate">
            {image.fileName || 'Untitled CP'}
          </span>
          <ChevronDown className="w-3 h-3 text-neutral-400" />
        </div>

        <div className="h-4 w-px bg-neutral-200 mx-0.5" />

        {/* Quick Sample Buttons */}
        <button
          onClick={onLoadCP}
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] rounded-xl font-medium text-xs shadow-2xs transition"
          title="Load CP.png (32x32 lattice) and auto-vectorize"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>CP.png</span>
        </button>

        <button
          onClick={onLoadDove}
          className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-xl font-medium text-xs shadow-2xs transition"
          title="Load Dove.png example"
        >
          <FileText className="w-3.5 h-3.5 text-neutral-400" />
          <span>Dove.png</span>
        </button>

        {/* Add File (+) Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 flex items-center justify-center bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-xl text-sm font-medium shadow-2xs transition cursor-pointer"
          title="Open custom crease pattern image"
        >
          +
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-800 disabled:opacity-30 transition"
            title={`Undo (${modKey}+Z)`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-neutral-800 disabled:opacity-30 transition"
            title={`Redo (${isMac ? '⌘+Shift+Z' : 'Ctrl+Y'})`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Section: View Mode (Vector CP / Overlay / Image) & Search Palette */}
      <div className="flex items-center space-x-2">
        {/* View Mode Segmented Control */}
        <div className="flex items-center bg-neutral-100/90 p-0.5 rounded-xl border border-neutral-200/80 shadow-2xs">
          <button
            onClick={() => setViewMode('vector')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${viewMode === 'vector'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
              }`}
            title="Clean Vector Crease Pattern (Orihime / Oridieta style)"
          >
            Vector CP
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${viewMode === 'overlay'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
              }`}
            title="Vector creases overlaid on top of source raster image"
          >
            Overlay
          </button>
          <button
            onClick={() => setViewMode('image')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${viewMode === 'image'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
              }`}
            title="Original raster image only"
          >
            Image
          </button>
        </div>

        {/* Search Palette */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center justify-between w-52 px-3 py-1 bg-neutral-50/80 hover:bg-neutral-100/90 border border-neutral-200/80 rounded-xl text-neutral-400 cursor-pointer shadow-2xs transition"
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs text-neutral-400">Search commands...</span>
          </div>
          <kbd className="text-[10px] font-mono text-neutral-400 bg-white px-1.5 py-0.5 rounded border border-neutral-200/60 shadow-2xs">
            {modKey}K
          </kbd>
        </button>
      </div>

      {/* Right Section: Snap: ON, Loupe, 56% dropdown, Export solid blue */}
      <div className="flex items-center space-x-2">
        {/* Snapping Toggle Pill */}
        <button
          onClick={toggleSnapping}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-2xs ${snappingEnabled
            ? 'bg-blue-50 text-blue-600 border border-blue-200'
            : 'bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50'
            }`}
          title="Toggle Snapping (S)"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap: {snappingEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Loupe Toggle Pill */}
        <button
          onClick={() => setLoupeActive(!loupe.active)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition shadow-2xs ${loupe.active
            ? 'bg-purple-50 text-purple-600 border border-purple-200'
            : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
            }`}
          title="Toggle Loupe Magnifier (Hold Alt)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Loupe</span>
        </button>

        {/* Zoom Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowZoomMenu(!showZoomMenu)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono font-medium text-neutral-700 transition shadow-2xs"
          >
            <span>{(camera.zoom * 100).toFixed(0)}%</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {showZoomMenu && (
            <div
              className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50 text-xs font-sans"
              onClick={() => setShowZoomMenu(false)}
            >
              <button
                onClick={() => fitToPaper(window.innerWidth - 360, window.innerHeight - 80)}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex justify-between"
              >
                <span>Fit Paper</span>
                <kbd className="font-mono text-[10px] text-neutral-400">0</kbd>
              </button>
              <button
                onClick={() => setCamera({ zoom: 1 })}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 flex justify-between"
              >
                <span>Zoom 100%</span>
                <kbd className="font-mono text-[10px] text-neutral-400">1</kbd>
              </button>
              <button
                onClick={() => setCamera({ zoom: 2 })}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100"
              >
                Zoom 200%
              </button>
              <button
                onClick={() => setCamera({ zoom: 4 })}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-100"
              >
                Zoom 400%
              </button>
            </div>
          )}
        </div>

        {/* Export Solid Blue Button */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0D99FF] hover:bg-[#008AE6] text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-white/80 ml-0.5" />
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 text-xs font-sans"
              onClick={() => setShowExportMenu(false)}
            >
              <button
                onClick={() => exportOriOrCpFile(getProjectData(), 'cp')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center space-x-2 text-blue-600 font-medium"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Oridieta / Orihime (.cp)</span>
              </button>
              <button
                onClick={() => exportOriOrCpFile(getProjectData(), 'ori')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center space-x-2 text-blue-600 font-medium"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Oridieta (.ori)</span>
              </button>
              <div className="h-px bg-neutral-100 my-1" />
              <button
                onClick={() => exportSvg(getProjectData())}
                className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center space-x-2 text-neutral-700"
              >
                <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                <span>Layered Vector SVG</span>
              </button>
              <button
                onClick={() => exportProjectJson(getProjectData())}
                className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center space-x-2 text-neutral-700"
              >
                <Download className="w-3.5 h-3.5 text-neutral-400" />
                <span>Project JSON (v1)</span>
              </button>
              <button
                onClick={() => exportPointsCsv(getProjectData())}
                className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center space-x-2 text-neutral-700"
              >
                <Table className="w-3.5 h-3.5 text-neutral-400" />
                <span>Reference Points CSV</span>
              </button>
              <button
                onClick={() => exportMeasurementsCsv(getProjectData())}
                className="w-full text-left px-3.5 py-2 hover:bg-neutral-50 flex items-center space-x-2 text-neutral-700"
              >
                <Table className="w-3.5 h-3.5 text-neutral-400" />
                <span>Measurements CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

