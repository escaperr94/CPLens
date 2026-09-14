/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#F5F5F5',
          canvas: '#EBEBEB',
          panel: '#FFFFFF',
          toolbar: '#FFFFFF',
          hover: '#F0F0F0',
          active: '#E5F4FF',
          border: '#E5E5E5',
          borderSubtle: '#F0F0F0',
          blue: '#0D99FF',
          blueHover: '#007BE5',
          text: '#1E1E1E',
          textSecondary: '#666666',
          textMuted: '#999999',
          danger: '#F24822',
          success: '#14AE5C',
          warning: '#FFCD29',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', 'Inconsolata', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'figma-menu': '0 4px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'figma-card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'figma-paper': '0 8px 30px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        'figma-handle': '0 1px 2px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
