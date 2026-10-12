import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ISAT U seal colors
        navy: {
          50: '#eef0fb', 100: '#d9ddf6', 200: '#b3bbed', 300: '#8590e0', 400: '#5862cf',
          500: '#3a40bb', 600: '#2a2ea1', 700: '#222581', 800: '#1c1e66', 900: '#14154a', 950: '#0c0d2e',
        },
        gold: {
          50: '#fffbea', 100: '#fff3c4', 200: '#ffe685', 300: '#ffd546', 400: '#f9c80e',
          500: '#e6ad00', 600: '#bf8600', 700: '#986203', 800: '#7d4e0b', 900: '#6a400f',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(16 18 60 / 0.04), 0 4px 16px -4px rgb(16 18 60 / 0.08)',
      },
    },
  },
  plugins: [],
};
export default config;
