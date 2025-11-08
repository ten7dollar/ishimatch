/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#E0F7FF",  // いちばん明るい背景用
          100: "#BAE6FD",
          200: "#7DD3FC",
          300: "#38BDF8",
          400: "#0EA5E9",
          500: "#0077B6",  // ← メイン
          600: "#005E99",  // hoverや強調
          700: "#004B80",
          800: "#003566",  // 最も濃い、選択強調色
          900: "#00264D",
        },
        background: {
          DEFAULT: "#F9FAFB", // ページ背景
          card: "#FFFFFF", // カード背景
        },
        text: {
          DEFAULT: "#1E293B", // 通常テキスト
          muted: "#64748B", // 補助テキスト
          light: "#FFFFFF", // 反転時
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans JP", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.05)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};