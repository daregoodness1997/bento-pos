/** @type {import('tailwindcss').Config} */
const { nextui } = require('@nextui-org/react');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#0B1012',
        paper: '#F3F1E9',
        signal: '#FFB020',
        mint: '#54D6A0',
        danger: '#FF6B5E',
      },
    },
  },
  darkMode: 'class',

  plugins: [
    nextui({
      defaultTheme: 'dark',
      themes: {
        dark: {
          colors: {
            background: '#0B1012',
            foreground: '#F3F1E9',
            content1: '#11191B',
            content2: '#182326',
            content3: '#0E1517',
            focus: '#FFB020',
            default: {
              DEFAULT: '#182326',
              foreground: '#F3F1E9',
            },
            primary: {
              DEFAULT: '#FFB020',
              foreground: '#0B1012',
            },
            secondary: {
              DEFAULT: '#54D6A0',
              foreground: '#08120E',
            },
            success: {
              DEFAULT: '#54D6A0',
              foreground: '#08120E',
            },
            warning: {
              DEFAULT: '#FFB020',
              foreground: '#0B1012',
            },
            danger: {
              DEFAULT: '#FF6B5E',
              foreground: '#160706',
            },
          },
        },
      },
    }),
  ],
};
