/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg': {
          DEFAULT: '#323437',
          secondary: '#2c2e31',
          tertiary: '#1e1f21',
        },
        'text': {
          DEFAULT: '#d1d0c5',
          secondary: '#646669',
        },
        'main': '#e2b714',
        'caret': '#e2b714',
        'sub': '#646669',
        'error': '#ca4754',
        'correct': '#d1d0c5',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
