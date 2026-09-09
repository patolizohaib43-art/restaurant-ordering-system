import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Zaiqa-e-Sindh brand system — derived from the restaurant logo
        // (chef emblem in red/orange/gold flames on black). `brand` stays
        // the name used across the app (buttons, links, active states) so
        // this is the single place the whole UI's primary color lives.
        brand: {
          // Deep/strong red — primary actions, header, active states
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#d21f1f',
          700: '#b31818',
          800: '#8f1414',
          900: '#6b1010',
        },
        secondary: {
          // Orange — secondary actions, deal accents, warm highlights
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        accent: {
          // Golden yellow — badges, ratings, small highlight details
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f5a90b',
          600: '#d18a06',
          700: '#a86a05',
          800: '#7a4d08',
          900: '#5c3a08',
        },
        charcoal: {
          // Near-black warm dark — footers, dark sections, admin sidebar
          DEFAULT: '#1a1210',
          50: '#f5f2f1',
          100: '#e6dedb',
          700: '#2a1c18',
          800: '#1f1512',
          900: '#140d0b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
