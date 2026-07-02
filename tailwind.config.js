/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: '#f97316',
        'warm-hover': '#ea580c',
        pink: '#ec4899',
        purple: '#8b5cf6',
        bg: '#fef7f0',
        card: '#ffffff',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        'border-light': '#f1f5f9',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
