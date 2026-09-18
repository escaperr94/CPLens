import React, { useState } from 'react';
import { cn } from './utils';

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  side = 'top',
  children,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const sidePositions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 bg-[#1D1D1F] text-white rounded-md text-[10px] font-sans font-medium whitespace-nowrap shadow-md pointer-events-none transition-opacity duration-150 flex items-center gap-1.5',
            sidePositions[side],
            className
          )}
        >
          <span>{content}</span>
          {shortcut && (
            <span className="text-neutral-400 font-mono text-[9px]">[{shortcut}]</span>
          )}
        </div>
      )}
    </div>
  );
};
