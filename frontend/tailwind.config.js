/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d1ff',
          300: '#9ab2ff',
          400: '#6a87ff',
          500: '#4361f4',
          600: '#2f44e8',
          700: '#2533d4',
          800: '#242cac',
          900: '#232b88',
          950: '#161952',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fc',
          100: '#f0f2f8',
          200: '#e2e6f0',
          800: '#1e2235',
          900: '#141828',
          950: '#0d1020',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 4px 16px -2px rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 10px 32px -4px rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
}
