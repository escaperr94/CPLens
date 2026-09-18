import React, { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  MousePointer2,
  MapPin,
  Minus,
  Square,
  Circle,
  Crosshair,
  Ruler,
  Compass,
  Sparkles,
  Eye,
  EyeOff,
  MoreHorizontal,
  Plus,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  Layers as LayersIcon,
  Search,
  Folder,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../store/projectStore';
import { ToolType } from '../store/types';
import { CreaseType } from '../geometry/line';

interface LeftSidebarProps {
  onLoadCP: () => void;
  onLoadDove: () => void;
  onLoadSchwarz: () => void;
  onOpenToolGuide?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onLoadCP,
  onLoadDove,
  onLoadSchwarz,
  onOpenToolGuide,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    image,
    loadImage,
    fitToPaper,
    activeTool,
    setActiveTool,
    creaseType,
    setCreaseType,
    grid,
    layers,
    rulers,
    setLayerVisibility,
    sheets,
    activeSheetId,
    setActiveSheetId,
    addSheet,
    canvasImages,
    selectedImageId,
    selectCanvasImage,
    removeCanvasImage,
    removeSheet,
    setReferenceImageFromCropped,
  } = useAppStore(
    useShallow((state) => ({
      image: state.image,
      loadImage: state.loadImage,
      fitToPaper: state.fitToPaper,
      activeTool: state.activeTool,
      setActiveTool: state.setActiveTool,
      creaseType: state.creaseType,
      setCreaseType: state.setCreaseType,
      grid: state.grid,
      layers: state.layers,
      rulers: state.rulers,
      setLayerVisibility: state.setLayerVisibility,
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
      setActiveSheetId: state.setActiveSheetId,
      addSheet: state.addSheet,
      canvasImages: state.canvasImages,
      selectedImageId: state.selectedImageId,
      selectCanvasImage: state.selectCanvasImage,
      removeCanvasImage: state.removeCanvasImage,
      removeSheet: state.removeSheet,
      setReferenceImageFromCropped: state.setReferenceImageFromCropped,
    }))
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const store = useAppStore.getState();
        if (!store.image.url) {
          store.loadImage(url, file.name, img.naturalWidth, img.naturalHeight);
          fitToPaper(window.innerWidth - 540, window.innerHeight - 80);
        } else {
          const paperPos = store.paperPosition;
          const allRightEdges = [
            paperPos.x + 1000,
            ...store.sheets.map((s) => s.x + s.width),
            ...store.canvasImages.map((i) => i.x + i.width),
          ];
          const newX = Math.max(...allRightEdges) + 80;
          const newId = store.addCanvasImage({
            url,
            name: file.name,
            x: newX,
            y: paperPos.y,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 800,
          });
          store.selectCanvasImage(newId);
          store.setActiveSheetId(null);
        }
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const tools: Array<{
    id: ToolType | 'folding-seq';
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
  }> = [
    { id: 'select', label: 'Select', icon: <MousePointer2 className="w-3.5 h-3.5" />, shortcut: 'V' },
    { id: 'point', label: 'Point', icon: <MapPin className="w-3.5 h-3.5" />, shortcut: 'P' },
    { id: 'line', label: 'Line', icon: <Minus className="w-3.5 h-3.5" />, shortcut: 'L' },
    { id: 'crop', label: 'Rectangle', icon: <Square className="w-3.5 h-3.5" />, shortcut: 'C' },
    { id: 'symmetry', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" />, shortcut: 'Y' },
    { id: 'ruler', label: 'Ruler', icon: <Crosshair className="w-3.5 h-3.5" />, shortcut: 'R' },
    { id: 'measure', label: 'Measure', icon: <Ruler className="w-3.5 h-3.5" />, shortcut: 'M' },
    { id: 'calibrate', label: 'Reference Finder', icon: <Compass className="w-3.5 h-3.5" />, shortcut: 'K' },
    { id: 'folding-seq', label: 'Folding Sequences', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  const fileName = image.fileName || '';
  const isCP = fileName === 'CP.png' || fileName.includes('CP.png');
  const isDove = fileName.includes('Dove');
  const isSchwarz = fileName.includes('Schwarz');

  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-[#E5E5E5] flex flex-col h-full overflow-y-auto text-xs select-none">
      {/* Hidden file input for custom CP upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* SECTION 1: PAGES (Matching Figma Left Sidebar) */}
      <div className="pt-2 pb-1 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between px-3 pt-1 pb-1">
          <span className="text-[11px] font-semibold text-gray-500">Pages</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
              title="Search pages"
            >
              <Search className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onLoadCP}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
              title="Add page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="space-y-0.5 px-2 pb-1">
          <div className="px-2 py-1.5 rounded-md bg-[#F0F7FF] text-[#0D99FF] font-medium text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0D99FF]" />
              <span>Page 1</span>
            </div>
            <span className="text-[10px] text-[#0D99FF]/70 font-mono">1 CP</span>
          </div>
        </div>
      </div>
      {/* SECTION 3: LAYERS */}
      <div className="py-1 flex-1">
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-[11px] font-semibold text-gray-400">
            Layers
          </span>
          <button
            type="button"
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Layer options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5 mt-0.5">
          {/* Grid Layer */}
          <div className="flex items-center justify-between px-2 py-1.5 mx-2 rounded-md hover:bg-gray-50 text-gray-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLayerVisibility('grid', !layers.grid)}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
                title={layers.grid ? 'Hide Grid' : 'Show Grid'}
              >
                {layers.grid ? (
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
              <span className={layers.grid ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                Grid
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono shrink-0">
              {grid.divisionsX}×{grid.divisionsY}
            </span>
          </div>

          {/* Crease Lines Layer Parent */}
          <div className="flex items-center justify-between px-2 py-1.5 mx-2 rounded-md hover:bg-gray-50 text-gray-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLayerVisibility('creases', !layers.creases)}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
                title={layers.creases ? 'Hide Crease Lines' : 'Show Crease Lines'}
              >
                {layers.creases ? (
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
              <span className={layers.creases ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                Crease Lines
              </span>
            </div>
          </div>

          {/* Crease Lines Sub-items */}
          <div className="pl-6 pr-2 space-y-0.5">
            {/* Mountain */}
            <button
              type="button"
              onClick={() => {
                setCreaseType('mountain');
                setActiveTool('line');
              }}
              className={`w-full text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                activeTool === 'line' && creaseType === 'mountain'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#2563EB] rounded-full inline-block" />
                <span>Mountain</span>
              </div>
            </button>

            {/* Valley */}
            <button
              type="button"
              onClick={() => {
                setCreaseType('valley');
                setActiveTool('line');
              }}
              className={`w-full text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                activeTool === 'line' && creaseType === 'valley'
                  ? 'bg-red-50 text-red-700 font-medium'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#DC2626] rounded-full inline-block" />
                <span>Valley</span>
              </div>
            </button>

            {/* Boundary */}
            <button
              type="button"
              onClick={() => {
                setCreaseType('edge');
                setActiveTool('line');
              }}
              className={`w-full text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                activeTool === 'line' && creaseType === 'edge'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#4B5563] rounded-full inline-block" />
                <span>Boundary</span>
              </div>
            </button>

            {/* Auxiliary */}
            <button
              type="button"
              onClick={() => {
                setCreaseType('auxiliary');
                setActiveTool('line');
              }}
              className={`w-full text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                activeTool === 'line' && creaseType === 'auxiliary'
                  ? 'bg-purple-50 text-purple-700 font-medium'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#9333EA] rounded-full inline-block" />
                <span>Auxiliary</span>
              </div>
            </button>
          </div>

          {/* Reference Image Layer */}
          <div
            onClick={() => {
              setActiveSheetId(null);
              selectCanvasImage(null);
            }}
            className={`flex items-center justify-between px-2 py-1.5 mx-2 rounded-md cursor-pointer transition-colors ${
              activeSheetId === null && selectedImageId === null
                ? 'bg-[#EBF5FF] text-[#0D99FF] font-medium'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLayerVisibility('image', !layers.image);
                }}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
                title={layers.image ? 'Hide Reference Image' : 'Show Reference Image'}
              >
                {layers.image ? (
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
              <ImageIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate font-medium">
                Reference Image
              </span>
              {image.fileName && (
                <span className="text-[10px] text-gray-400 font-mono truncate">
                  ({image.fileName})
                </span>
              )}
            </div>
            {image.url && (
              <span className="text-[10px] text-gray-400 font-mono shrink-0">1000×1000</span>
            )}
          </div>

          {/* Rulers & Guidelines Layer */}
          <div className="flex items-center justify-between px-2 py-1.5 mx-2 rounded-md hover:bg-gray-50 text-gray-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLayerVisibility('rulers', !layers.rulers)}
                className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
                title={layers.rulers ? 'Hide Rulers & Guides' : 'Show Rulers & Guides'}
              >
                {layers.rulers ? (
                  <Eye className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
              <Crosshair className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className={layers.rulers ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                Rulers & Guides
              </span>
            </div>
            {rulers.length > 0 && (
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {rulers.length} active
              </span>
            )}
          </div>

          {/* Additional Sheets if present */}
          {/* CP Sheets / Layers Section */}
          <div className="pt-2 border-t border-[#E5E5E5] mx-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">
              <span>CP Layers ({sheets.length + 1})</span>
              <button
                type="button"
                onClick={() => {
                  const newId = addSheet({
                    name: `CP Layer ${sheets.length + 1}`,
                  });
                  setActiveSheetId(newId);
                }}
                className="hover:text-[#0D99FF] p-0.5 rounded transition-colors"
                title="Add new CP Sheet Layer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Main CP Layer (Left) */}
            <div
              onClick={() => {
                setActiveSheetId(null);
                selectCanvasImage(null);
                const stageW = window.innerWidth - 500;
                const stageH = window.innerHeight - 110;
                const zoom = useAppStore.getState().camera.zoom;
                const newPanX = (stageW - 1000 * zoom) / 2;
                const newPanY = (stageH - 1000 * zoom) / 2;
                useAppStore.getState().setCamera({ panX: newPanX, panY: newPanY });
              }}
              className={`w-full px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                activeSheetId === null && selectedImageId === null
                  ? 'bg-[#EBF5FF] text-[#0D99FF] font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate flex-1">
                <Square className="w-3.5 h-3.5 text-[#0D99FF] shrink-0" />
                <span className="truncate">{image.fileName || 'Main CP (Left)'}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {activeSheetId === null ? `${grid.divisionsX}×${grid.divisionsY}` : '1000×1000'}
              </span>
            </div>

            {/* Secondary CP Sheets */}
            {sheets.map((s, i) => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveSheetId(s.id);
                  selectCanvasImage(null);
                  const stageW = window.innerWidth - 500;
                  const stageH = window.innerHeight - 110;
                  const zoom = useAppStore.getState().camera.zoom;
                  const newPanX = (stageW - s.width * zoom) / 2 - s.x * zoom;
                  const newPanY = (stageH - s.height * zoom) / 2 - s.y * zoom;
                  useAppStore.getState().setCamera({ panX: newPanX, panY: newPanY });
                }}
                className={`w-full px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                  activeSheetId === s.id
                    ? 'bg-[#EBF5FF] text-[#0D99FF] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate flex-1">
                  <Square className="w-3.5 h-3.5 text-[#0D99FF] shrink-0" />
                  <span className="truncate">{s.name || `CP Sheet ${i + 1}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    {s.grid?.divisionsX ?? 64}×{s.grid?.divisionsY ?? 64}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSheet(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 rounded text-gray-400 transition-opacity"
                    title="Delete Sheet"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pasted Images on Canvas */}
          {canvasImages.length > 0 && (
            <div className="pt-2 border-t border-[#E5E5E5] mx-2">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 pb-1">
                Images on Canvas ({canvasImages.length})
              </div>
              {canvasImages.map((img) => (
                <div
                  key={img.id}
                  onClick={() => {
                    selectCanvasImage(img.id);
                    setActiveSheetId(null);
                    const stageW = window.innerWidth - 500;
                    const stageH = window.innerHeight - 110;
                    const zoom = useAppStore.getState().camera.zoom;
                    const newPanX = (stageW - img.width * zoom) / 2 - img.x * zoom;
                    const newPanY = (stageH - img.height * zoom) / 2 - img.y * zoom;
                    useAppStore.getState().setCamera({ panX: newPanX, panY: newPanY });
                  }}
                  className={`w-full px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                    selectedImageId === img.id
                      ? 'bg-[#EBF5FF] text-[#0D99FF] font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1">
                    <ImageIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{img.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">{img.width}×{img.height}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCanvasImage(img.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 rounded text-gray-400 transition-opacity"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* + | Image button */}
          <div className="pt-2 px-2 mx-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1.5 px-2.5 border border-dashed border-[#D1D5DB] hover:border-gray-400 rounded-md text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              <Plus className="w-3.5 h-3.5 text-gray-400" />
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium">Image</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
