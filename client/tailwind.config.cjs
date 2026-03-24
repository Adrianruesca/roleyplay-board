import { defineConfig } from "tailwindcss";

export default defineConfig({
  darkMode: "class", // <- importante
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bgLight: "#f3f4f6",
        textLight: "#1f2937",
        bgDark: "#0f172a",
        textDark: "#f1f5f9",
        primary: "#4f46e5",
      },
    },
  },
});
