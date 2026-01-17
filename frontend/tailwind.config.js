/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vim-bg': '#1e1e2e',
        'vim-surface': '#313244',
        'vim-overlay': '#45475a',
        'vim-text': '#cdd6f4',
        'vim-subtext': '#a6adc8',
        'vim-green': '#a6e3a1',
        'vim-yellow': '#f9e2af',
        'vim-red': '#f38ba8',
        'vim-blue': '#89b4fa',
        'vim-purple': '#cba6f7',
        'vim-teal': '#94e2d5',
        'vim-cursor': '#f5e0dc',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
