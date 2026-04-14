/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      borderRadius: {
        '2xl': '1rem',
      },
      fontFamily: {
        headline: ["Public Sans", "sans-serif"],
        body: ["Public Sans", "sans-serif"],
        label: ["Public Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
}
