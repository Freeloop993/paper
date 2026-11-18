/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // 墨色界面 + 一处亮色：蓝用于可操作与选中，信号橙只用于电机轴心与“当前位置”。
        ink: { DEFAULT: '#0b1220', soft: '#5b6472', faint: '#98a1ae' },
        canvas: '#f3f4f7',
        line: '#e5e8ee',
        primary: { 50: '#eef4ff', 100: '#dce8ff', 200: '#bcd2ff', 500: '#3b7cff', 600: '#1f62f0', 700: '#184fca' },
        signal: { 50: '#fff3ea', 100: '#ffe2cc', 500: '#ff6a1a', 600: '#e85a0c' },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(11,18,32,.04), 0 8px 24px -12px rgba(11,18,32,.12)',
        float: '0 2px 6px rgba(11,18,32,.06), 0 18px 40px -18px rgba(11,18,32,.28)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
