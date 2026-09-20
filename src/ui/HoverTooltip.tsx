import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/projectStore';
import { paperToScreen, BASE_PAPER_SIZE } from '../canvas/transforms';

export const HoverTooltip: React.FC = () => {
  const { hoveredPoint, camera, activeSheetId, sheets, paperPosition, paperInsets, paper } = useAppStore(
    useShallow((state) => ({
      hoveredPoint: state.hoveredPoint,
      camera: state.camera,
      activeSheetId: state.activeSheetId,
      sheets: state.sheets,
      paperPosition: state.paperPosition,
      paperInsets: state.paperInsets,
      paper: state.paper,
    }))
  );

  if (!hoveredPoint) return null;

  const activeSheet = sheets.find((s) => s.id === (activeSheetId || null));
  const insets = activeSheet
    ? (activeSheet.insets || { top: 0, right: 0, bottom: 0, left: 0 })
    : ((activeSheetId === null || activeSheetId === 'main_cp') ? paperInsets : { top: 0, right: 0, bottom: 0, left: 0 });
  const origin = activeSheet
    ? { x: activeSheet.x + insets.left, y: activeSheet.y + insets.top }
    : { x: paperPosition.x + insets.left, y: paperPosition.y + insets.top };
  const paperAspect = paper.aspectRatio || 1;
  const paperW = activeSheet ? Math.max(20, activeSheet.width - insets.left - insets.right) : Math.max(20, BASE_PAPER_SIZE - insets.left - insets.right);
  const paperH = activeSheet ? Math.max(20, activeSheet.height - insets.top - insets.bottom) : Math.max(20, (BASE_PAPER_SIZE / paperAspect) - insets.top - insets.bottom);

  const screenPos = paperToScreen({ x: hoveredPoint.x, y: hoveredPoint.y }, camera, paperW, paperH, origin);

  const fx = hoveredPoint.xGrid ? hoveredPoint.xGrid.formatted : `${hoveredPoint.x.toFixed(4)}`;
  const fy = hoveredPoint.yGrid ? hoveredPoint.yGrid.formatted : `${hoveredPoint.y.toFixed(4)}`;

  const confPercent = hoveredPoint.confidence
    ? Math.round(hoveredPoint.confidence * 100)
    : 95;

  const residual = hoveredPoint.residualPx !== undefined ? hoveredPoint.residualPx : 0.35;

  return (
    <div
      className="pointer-events-none fixed z-50 bg-white rounded-xl shadow-quiet-card border border-[#E5E5EA]/70 p-2.5 w-48 text-[11px] font-sans text-neutral-800 animate-fade-in"
      style={{
        left: screenPos.x + 16,
        top: Math.max(50, screenPos.y - 70),
      }}
    >
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100 font-semibold">
        <span className="text-[#4F6BA6]">{hoveredPoint.label}</span>
        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-600 rounded font-mono">
          {confPercent}%
        </span>
      </div>

      <div className="space-y-1 font-mono">
        <div className="flex justify-between items-center text-xs font-semibold text-neutral-900">
          <span>x = {fx}</span>
          <span>y = {fy}</span>
        </div>

        <div className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-50 flex justify-between">
          <span>raw:</span>
          <span>
            {hoveredPoint.xRaw !== undefined ? hoveredPoint.xRaw.toFixed(5) : hoveredPoint.x.toFixed(5)},{' '}
            {hoveredPoint.yRaw !== undefined ? hoveredPoint.yRaw.toFixed(5) : hoveredPoint.y.toFixed(5)}
          </span>
        </div>

        <div className="flex justify-between text-[10px] text-neutral-500">
          <span>grid error:</span>
          <span>{residual} px</span>
        </div>
      </div>
    </div>
  );
};
