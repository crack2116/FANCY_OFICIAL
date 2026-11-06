/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff9f0",
          100: "#feeedb",
          200: "#fddcb4",
          300: "#f7b77b",
          400: "#f99c32",
          500: "#f99c32",
          600: "#e4821a",
          700: "#a3510f",
          800: "#974d16",
          900: "#7b4016",
        },
        accent: {
          50: "#fef3f2",
          100: "#fee4e2",
          300: "#fda29b",
          500: "#f24534",
          600: "#dc2616",
          700: "#b91c10",
        },
        surface: {
          DEFAULT: "#fff",
          warm: "#fbf7f0",
          cream: "#fff8ea",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fredoka", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        none: "0",
        soft: "2",
        base: "4",
        rounded: "8",
        large: "16",
        circle: "9999",
      },
    },
  },
  plugins: [],
}
