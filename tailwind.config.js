/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        quiet: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          primary: '#1D1D1F',
          secondary: '#86868B',
          accent: '#4F6BA6',
          accentHover: '#5D7BB8',
          accentMuted: '#E1E8F5',
          divider: 'rgba(210, 210, 215, 0.4)',
          border: '#E5E5EA',
          borderGradientEnd: '#7C95C8',
          skeletal: '#F5F5F7',
        },
        figma: {
          bg: '#F7F7F7',
          canvas: '#F7F7F7',
          panel: '#FFFFFF',
          toolbar: '#FFFFFF',
          hover: '#F5F5F5',
          active: '#EBF5FF',
          border: '#E5E5E5',
          borderSubtle: '#F0F0F0',
          borderInput: '#D1D5DB',
          blue: '#18A0FB',
          blueHover: '#0D90EE',
          text: '#111827',
          textSecondary: '#6B7280',
          textMuted: '#9CA3AF',
          danger: '#DC2626',
          success: '#10B981',
          warning: '#F59E0B',
        },
        crease: {
          mountain: '#2563EB',
          valley: '#DC2626',
          boundary: '#4B5563',
          auxiliary: '#9333EA',
        }
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '6px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Inconsolata', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'quiet-card': '0 2px 8px rgba(0,0,0,0.04), 0 24px 48px -8px rgba(0,0,0,0.06), 0 48px 80px -12px rgba(0,0,0,0.04)',
        'quiet-button': '0 10px 30px -10px rgba(79, 107, 166, 0.4)',
        'quiet-pill': '0 2px 10px rgba(0, 0, 0, 0.04), 0 12px 24px -4px rgba(0, 0, 0, 0.04)',
        'quiet-dropdown': '0 4px 20px -2px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.08)',
        'figma-menu': '0 2px 8px rgba(0,0,0,0.04), 0 24px 48px -8px rgba(0,0,0,0.06), 0 48px 80px -12px rgba(0,0,0,0.04)',
        'figma-card': '0 2px 8px rgba(0,0,0,0.04), 0 24px 48px -8px rgba(0,0,0,0.06)',
        'figma-paper': '0 2px 8px rgba(0,0,0,0.04), 0 24px 48px -8px rgba(0,0,0,0.06), 0 48px 80px -12px rgba(0,0,0,0.04)',
        'figma-handle': '0 1px 2px rgba(0, 0, 0, 0.16)',
      },
      transitionTimingFunction: {
        'reveal': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
