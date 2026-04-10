import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm sunrise sky — deep rose-purples replacing cold navy
        dawn: {
          950: "#180a22",   // deep warm purple-black (page bg)
          900: "#251038",   // warm plum (panel bg)
          800: "#3d1650",   // rich rose-purple (cards, AI bubbles)
          700: "#6d2860",   // warm rose-border (dividers, outlines)
        },
        // Sunrise warm accent scale — orange → gold → rose
        sunrise: {
          100: "#ffe4c4",   // pale gold (timestamps, muted text)
          300: "#fbbf24",   // warm gold (star ratings, subtle highlights)
          400: "#f59e0b",   // amber (hover states)
          500: "#f97316",   // core orange (primary CTA, logo)
          600: "#ea580c",   // deep orange (user bubbles)
          700: "#c2410c",   // burnt orange (pressed states)
        },
        // Rose-magenta for sky highlights (mid-palette accents)
        rose: {
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
        },
        // Warm gold for prices and data callouts
        gold: {
          300: "#fde68a",
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
