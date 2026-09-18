import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'destructive';
  size?: 'default' | 'sm' | 'xs' | 'icon' | 'icon-sm' | 'icon-xs';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-[6px] font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0D99FF] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]';

    const variants = {
      default: 'bg-[#111827] text-white hover:bg-[#1F2937] shadow-2xs',
      primary: 'bg-[#0D99FF] text-white hover:bg-[#0088EE] shadow-2xs font-semibold',
      secondary: 'bg-[#F9FAFB] text-[#111827] hover:bg-[#F3F4F6] border border-[#E5E5E5]',
      outline: 'border border-[#E5E5E5] bg-white text-[#111827] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] shadow-2xs',
      ghost: 'text-[#111827] hover:bg-[#F3F4F6] hover:text-[#111827]',
      accent: 'bg-[#EBF5FF] text-[#0D99FF] hover:bg-[#D8EDFF] font-semibold border border-[#0D99FF]/20',
      destructive: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60',
    };
    const sizes = {
      default: 'h-8 px-3 text-xs gap-1.5',
      sm: 'h-7 px-2.5 text-[11px] gap-1',
      xs: 'h-6 px-2 text-[10px] gap-1',
      icon: 'h-8 w-8 p-0',
      'icon-sm': 'h-7 w-7 p-0',
      'icon-xs': 'h-6 w-6 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
