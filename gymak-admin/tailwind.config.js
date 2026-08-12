/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4fbe7",
          100: "#e6f7c3",
          400: "#b8e04a",
          500: "#9fce2f",
          600: "#7fa823",
        },
      },
    },
  },
  plugins: [],
};
