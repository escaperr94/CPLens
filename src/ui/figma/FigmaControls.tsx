import React from 'react';

export interface FigmaInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  prefixLabel?: React.ReactNode;
  containerClassName?: string;
}

export const FigmaInput = React.forwardRef<HTMLInputElement, FigmaInputProps>(
  ({ prefixLabel, className = '', containerClassName = '', ...props }, ref) => {
    return (
      <div
        className={`h-6 bg-white border border-[#E5E5E5] rounded-[4px] px-1.5 flex items-center gap-1 focus-within:border-[#18A0FB] focus-within:ring-1 focus-within:ring-[#18A0FB]/20 transition-colors ${containerClassName}`}
      >
        {prefixLabel && (
          <span className="text-[10px] font-mono font-medium text-[#6B7280] select-none shrink-0">
            {prefixLabel}
          </span>
        )}
        <input
          ref={ref}
          className={`h-full w-full bg-transparent font-mono text-xs text-[#111827] outline-none border-none p-0 focus:outline-none focus:ring-0 placeholder-[#9CA3AF] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
          {...props}
        />
      </div>
    );
  }
);
FigmaInput.displayName = 'FigmaInput';

export interface FigmaSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
}

export const FigmaSelect = React.forwardRef<HTMLSelectElement, FigmaSelectProps>(
  ({ className = '', containerClassName = '', children, ...props }, ref) => {
    return (
      <div
        className={`h-6 bg-white border border-[#E5E5E5] rounded-[4px] relative flex items-center focus-within:border-[#18A0FB] focus-within:ring-1 focus-within:ring-[#18A0FB]/20 transition-colors ${containerClassName}`}
      >
        <select
          ref={ref}
          className={`h-full w-full bg-transparent text-xs text-[#111827] pl-1.5 pr-4 py-0 appearance-none outline-none border-none cursor-pointer focus:outline-none focus:ring-0 ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-1 pointer-events-none text-[#6B7280]">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }
);
FigmaSelect.displayName = 'FigmaSelect';

export interface FigmaCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const FigmaCheckbox: React.FC<FigmaCheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
}) => {
  return (
    <label
      id={id}
      className={`flex w-full items-center gap-2 cursor-pointer select-none text-xs text-[#111827] group py-0.5 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      onClick={(e) => {
        if (!disabled) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div
        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors shrink-0 ${
          checked
            ? 'bg-[#18A0FB] border-[#18A0FB] text-white'
            : 'bg-white border-[#D1D5DB] group-hover:border-[#9CA3AF]'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 stroke-current stroke-[2.5]" fill="none" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      {label && <span className="leading-tight">{label}</span>}
    </label>
  );
};

export interface FigmaToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export const FigmaToggle: React.FC<FigmaToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
  title,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer flex items-center p-0.5 outline-none focus:ring-1 focus:ring-[#18A0FB] ${
        checked ? 'bg-[#18A0FB]' : 'bg-[#D1D5DB]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <div
        className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-150 ${
          checked ? 'translate-x-3' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const FigmaDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`border-t border-[#E5E5E5] my-2.5 ${className}`} />
);
