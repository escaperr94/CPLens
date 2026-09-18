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
          bg: '#FAFAFA',
          canvas: '#FAFAFA',
          panel: '#FFFFFF',
          toolbar: '#FFFFFF',
          hover: '#F5F5F7',
          active: '#E1E8F5',
          border: '#E5E5EA',
          borderSubtle: '#F0F0F2',
          blue: '#4F6BA6',
          blueHover: '#5D7BB8',
          text: '#1D1D1F',
          textSecondary: '#86868B',
          textMuted: '#A1A1A6',
          danger: '#D75B50',
          success: '#34A853',
          warning: '#E29B24',
        }
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
