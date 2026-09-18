import React from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixLabel?: string;
  suffixLabel?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefixLabel, suffixLabel, ...props }, ref) => {
    if (!prefixLabel && !suffixLabel) {
      return (
        <input
          ref={ref}
          className={cn(
            'w-full h-7 bg-white border border-[#E5E5EA] rounded-lg px-2 text-xs font-mono text-[#1D1D1F]',
            'placeholder:text-neutral-400 focus:outline-none focus:border-[#4F6BA6] focus:ring-1 focus:ring-[#4F6BA6]/30',
            'transition-colors disabled:opacity-40 disabled:pointer-events-none select-text',
            className
          )}
          {...props}
        />
      );
    }

    return (
      <div className={cn('relative flex items-center w-full', className)}>
        {prefixLabel && (
          <span className="absolute left-2 text-[10px] font-mono text-[#86868B] select-none pointer-events-none">
            {prefixLabel}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-7 bg-white border border-[#E5E5EA] rounded-lg text-xs font-mono text-[#1D1D1F]',
            prefixLabel ? 'pl-6 pr-2' : 'px-2',
            suffixLabel ? 'pr-8' : '',
            'placeholder:text-neutral-400 focus:outline-none focus:border-[#4F6BA6] focus:ring-1 focus:ring-[#4F6BA6]/30',
            'transition-colors disabled:opacity-40 disabled:pointer-events-none select-text'
          )}
          {...props}
        />
        {suffixLabel && (
          <span className="absolute right-2 text-[10px] font-mono text-[#86868B] select-none pointer-events-none">
            {suffixLabel}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
