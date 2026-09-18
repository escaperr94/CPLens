import React, { useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  Lock,
  ChevronDown,
  MousePointer2,
  Hand,
  Grid,
  Square,
  Minus,
  Type,
  PenTool,
  Component,
  MoreHorizontal,
  Share2,
  Play,
  RotateCcw,
  RotateCw,
  FileCode,
  Download,
  Table,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { ToolType } from '../store/types';
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
  onLoadSchwarz: () => void;
  onOpenLanding?: () => void;
  onOpenToolGuide?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onOpenCommandPalette,
  onRunAutoAnalysis,
  onLoadCP,
  onLoadDove,
  onLoadSchwarz,
  onOpenLanding,
  onOpenToolGuide,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [showMoreToolsMenu, setShowMoreToolsMenu] = useState(false);

  const {
    image,
    loadImage,
    camera,
    setCamera,
    fitToPaper,
    activeTool,
    setActiveTool,
    undo,
    redo,
    past,
    future,
    getProjectData,
    loadProjectData,
  } = useAppStore(
    useShallow((state) => ({
      image: state.image,
      loadImage: state.loadImage,
      camera: state.camera,
      setCamera: state.setCamera,
      fitToPaper: state.fitToPaper,
      activeTool: state.activeTool,
      setActiveTool: state.setActiveTool,
      undo: state.undo,
      redo: state.redo,
      past: state.past,
      future: state.future,
      getProjectData: state.getProjectData,
      loadProjectData: state.loadProjectData,
    }))
  );

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
        fitToPaper(window.innerWidth - 500, window.innerHeight - 110);
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

  const docTitle = image.fileName || 'CP.png';
  const zoomPercent = Math.round(camera.zoom * 100);

  return (
    <header className="h-[44px] bg-white border-b border-[#E5E5E5] px-3 flex items-center justify-between text-xs text-[#111827] select-none z-30 shrink-0 relative">
      {/* Hidden File Inputs */}
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

      {/* LEFT GROUP: Logo + Menu Chevron + Divider + Lock Doc Title + Status */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Origami Bird Logo Button (NO CPLens text) */}
        <button
          type="button"
          onClick={() => setShowFileMenu((prev) => !prev)}
          className="p-1 rounded hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          title="CP Lens Menu"
        >
          <img src="/logo_ori.png" alt="Logo" className="w-5 h-5 object-contain" />
        </button>

        {/* Menu chevron button */}
        <button
          type="button"
          onClick={() => setShowFileMenu((prev) => !prev)}
          className="w-5 h-5 rounded hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
          title="Document actions"
        >
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </button>

        {/* Thin vertical divider */}
        <div className="h-4 w-px bg-[#E5E5E5] mx-1 shrink-0" />

        {/* Document Title with Lock Icon & Dropdown */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setShowFileMenu((prev) => !prev)}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer max-w-[200px]"
            title="Switch or rename document"
          >
            <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-xs text-gray-900 truncate">{docTitle}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
          </button>

          {/* Document / Main Menu Dropdown */}
          {showFileMenu && (
            <div
              className="absolute left-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-[#E5E5E5] py-1 z-50 text-xs font-sans"
              onClick={() => setShowFileMenu(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Sample Files
              </div>
              <button
                type="button"
                onClick={onLoadCP}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>CP.png (Default CP)</span>
              </button>
              <button
                type="button"
                onClick={onLoadDove}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <span>Dove.png</span>
              </button>
              <button
                type="button"
                onClick={onLoadSchwarz}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <span>Schwarz CP.png</span>
              </button>

              <div className="h-px bg-[#E5E5E5] my-1" />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700"
              >
                Open Image File...
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700"
              >
                Open Project JSON...
              </button>

              <div className="h-px bg-[#E5E5E5] my-1" />

              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between text-gray-700"
              >
                <span>Command Palette</span>
                <span className="font-mono text-[10px] text-gray-400">⌘K</span>
              </button>

              {onOpenToolGuide && (
                <button
                  type="button"
                  onClick={onOpenToolGuide}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span>Origami Tool Guide</span>
                </button>
              )}

              {onOpenLanding && (
                <button
                  type="button"
                  onClick={onOpenLanding}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  <span>Overview & Landing</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Text: "Edited just now" */}
        <span className="text-[11px] text-gray-400 ml-1 hidden sm:inline-block shrink-0">
          Edited just now
        </span>

      </div>


      {/* RIGHT GROUP: Avatar + Share + Play + Zoom */}
      <div className="flex items-center gap-2">
        {/* User 1 Avatar ("E") */}
        <div
          className="w-6 h-6 rounded-full bg-[#E0E7FF] text-[#4338CA] text-[10px] font-semibold flex items-center justify-center shrink-0 cursor-default select-none border border-indigo-200"
          title="User E"
        >
          E
        </div>

        {/* User 2 Avatar (Purple Gradient) */}
        <div
          className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-400 text-white text-[9px] font-semibold flex items-center justify-center shrink-0 cursor-default select-none shadow-2xs"
          title="Collaborator"
        >
          ✦
        </div>

        {/* Share Button (Figma Blue) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowShareMenu((prev) => !prev)}
            className="h-7 px-3 bg-[#18A0FB] hover:bg-[#0D90EE] text-white text-xs font-medium rounded-md flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Share & Export Crease Pattern"
          >
            <span>Share</span>
          </button>

          {/* Share & Export Dropdown */}
          {showShareMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-52 bg-white rounded-md shadow-lg border border-[#E5E5E5] py-1.5 z-50 text-xs font-sans"
              onClick={() => setShowShareMenu(false)}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Export Options
              </div>
              <button
                type="button"
                onClick={() => exportOriOrCpFile(getProjectData(), 'cp')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-blue-600 font-medium"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Oridieta / Orihime (.cp)</span>
              </button>
              <button
                type="button"
                onClick={() => exportOriOrCpFile(getProjectData(), 'ori')}
                className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center gap-2 text-blue-600 font-medium"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Oridieta (.ori)</span>
              </button>
              <div className="h-px bg-[#E5E5E5] my-1" />
              <button
                type="button"
                onClick={() => exportSvg(getProjectData())}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Download className="w-3.5 h-3.5 text-gray-400" />
                <span>Layered Vector SVG</span>
              </button>
              <button
                type="button"
                onClick={() => exportProjectJson(getProjectData())}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Download className="w-3.5 h-3.5 text-gray-400" />
                <span>Project JSON (v1)</span>
              </button>
              <button
                type="button"
                onClick={() => exportPointsCsv(getProjectData())}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Table className="w-3.5 h-3.5 text-gray-400" />
                <span>Reference Points CSV</span>
              </button>
              <button
                type="button"
                onClick={() => exportMeasurementsCsv(getProjectData())}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
              >
                <Table className="w-3.5 h-3.5 text-gray-400" />
                <span>Measurements CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* Present / Play Button */}
        <button
          type="button"
          onClick={onRunAutoAnalysis}
          className="w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
          title="Run Computer Vision Auto-Analysis (Present / Play)"
        >
          <Play className="w-3.5 h-3.5 fill-current text-gray-600" />
        </button>

        {/* Zoom Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowZoomMenu((prev) => !prev)}
            className="h-7 px-2 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1 font-mono text-xs transition-colors cursor-pointer"
            title="Change zoom level"
          >
            <span>{zoomPercent}%</span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {showZoomMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-[#E5E5E5] py-1 z-50 text-xs font-sans"
              onClick={() => setShowZoomMenu(false)}
            >
              <button
                type="button"
                onClick={() => fitToPaper(window.innerWidth - 500, window.innerHeight - 110)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex justify-between text-gray-700"
              >
                <span>Fit Paper</span>
                <span className="font-mono text-[10px] text-gray-400">0</span>
              </button>
              <button
                type="button"
                onClick={() => setCamera({ zoom: 0.5 })}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setCamera({ zoom: 1 })}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex justify-between text-gray-700"
              >
                <span>100%</span>
                <span className="font-mono text-[10px] text-gray-400">1</span>
              </button>
              <button
                type="button"
                onClick={() => setCamera({ zoom: 2 })}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700"
              >
                200%
              </button>
              <button
                type="button"
                onClick={() => setCamera({ zoom: 4 })}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700"
              >
                400%
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
