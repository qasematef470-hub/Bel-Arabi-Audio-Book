const { nextui } = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            background: "#F8FAFC", // لون الخلفية الهادئ
            foreground: "#1E293B", // لون النصوص
            primary: {
              DEFAULT: "#0B355F", // الكحلي الداكن من اللوجو
              foreground: "#FFFFFF",
            },
            secondary: {
              DEFAULT: "#00B4D8", // الفيروزي المضيء من اللوجو
              foreground: "#FFFFFF",
            },
            focus: "#00B4D8",
          },
        },
      },
    }),
  ],
};