import React, { createContext, useContext } from 'react';
import { cn } from './utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, className, children, ...props }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'sm';
}

export const TabsList: React.FC<TabsListProps> = ({ className, size = 'default', children, ...props }) => {
  return (
    <div
      className={cn(
        'grid grid-flow-col auto-cols-fr items-center rounded-[6px] bg-[#F3F4F6] p-0.5 text-[#6B7280] border border-[#E5E5E5] w-full select-none',
        size === 'sm' ? 'h-7' : 'h-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, className, children, ...props }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => context.onValueChange(value)}
      className={cn(
        'w-full h-full inline-flex items-center justify-center whitespace-nowrap rounded-[4px] px-2 py-0.5 text-xs font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0D99FF]',
        'disabled:pointer-events-none disabled:opacity-40',
        isActive
          ? 'bg-white text-[#111827] font-semibold shadow-xs border border-[#E5E5E5]'
          : 'text-[#6B7280] hover:text-[#111827]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, className, children, ...props }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.value !== value) return null;

  return (
    <div role="tabpanel" className={cn('focus-visible:outline-none mt-2', className)} {...props}>
      {children}
    </div>
  );
};
