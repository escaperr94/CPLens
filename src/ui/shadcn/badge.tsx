import React from 'react';
import { cn } from './utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'accent' | 'success' | 'warning';
  size?: 'default' | 'sm';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';

    const variants = {
      default: 'bg-[#111827] text-white',
      secondary: 'bg-[#F9FAFB] text-[#111827] border border-[#E5E5E5]',
      outline: 'border border-[#E5E5E5] text-[#6B7280]',
      accent: 'bg-[#EBF5FF] text-[#0D99FF] font-semibold border border-[#0D99FF]/20',
      success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
      warning: 'bg-amber-50 text-amber-700 border border-amber-200/70',
    };

  const sizes = {
    default: 'text-[11px] px-2 py-0.5 gap-1',
    sm: 'text-[10px] font-mono px-1.5 py-0.2 gap-0.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
};
