/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#EF233C",
        secondary: "#2B2D42",
        accent: "#8D99AE",
        "background-light": "#EDF2F4",
        "background-dark": "#1A1B26",
        navy: "#2D3142",
        steel: "#94A1B2",
        "accent-grey": "#94A3B8", 
        surface: {
          light: "#ffffff",
          dark: "#1e212b"
        }
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"], // Updated to Space Grotesk
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}