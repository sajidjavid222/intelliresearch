import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        // Primary: teal → emerald. Distinctive, calm, "academic".
        brand: {
          50: "#ecfdf6", 100: "#d1fae9", 200: "#a7f3d6", 300: "#6ee7bd",
          400: "#34d3a1", 500: "#13b886", 600: "#08966d", 700: "#077859",
          800: "#0a5f48", 900: "#0a4e3c", 950: "#022c22",
        },
        // Accent: violet, used sparingly for highlights/AI.
        accent: {
          50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd",
          400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9",
          800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065",
        },
        ink: {
          50: "#f6f8f7", 100: "#eceff0", 200: "#d7dcde", 300: "#b0bbbd",
          400: "#82908f", 500: "#637270", 600: "#4e5b59", 700: "#404a49",
          800: "#374040", 900: "#0e1817", 950: "#070d0c",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(7,13,12,.04), 0 4px 16px rgba(7,13,12,.06)",
        lift: "0 8px 30px rgba(7,13,12,.10)",
        glow: "0 0 0 1px rgba(19,184,134,.25), 0 8px 30px rgba(19,184,134,.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "pulse-ring": {
          "0%": { transform: "scale(.8)", opacity: "0.5" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "gradient-pan": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Liquid-glass morphing blob (border-radius + drift, GPU-friendly).
        blob: {
          "0%,100%": {
            borderRadius: "42% 58% 60% 40% / 45% 45% 55% 55%",
            transform: "translate(0,0) scale(1)",
          },
          "33%": {
            borderRadius: "60% 40% 35% 65% / 55% 60% 40% 45%",
            transform: "translate(24px,-18px) scale(1.06)",
          },
          "66%": {
            borderRadius: "38% 62% 55% 45% / 60% 35% 65% 40%",
            transform: "translate(-18px,14px) scale(0.97)",
          },
        },
        // Slow ambient drift for the page-wide aurora layer.
        aurora: {
          "0%,100%": { transform: "translate(0,0) rotate(0deg) scale(1)" },
          "50%": { transform: "translate(-4%,3%) rotate(8deg) scale(1.08)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-12deg)" },
          "100%": { transform: "translateX(220%) skewX(-12deg)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.2,.8,.2,1) both",
        "fade-in": "fade-in .35s ease both",
        "scale-in": "scale-in .25s cubic-bezier(.2,.8,.2,1) both",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
        float: "float 5s ease-in-out infinite",
        "gradient-pan": "gradient-pan 8s ease infinite",
        blob: "blob 16s ease-in-out infinite",
        "blob-slow": "blob 22s ease-in-out infinite reverse",
        aurora: "aurora 26s ease-in-out infinite",
        "aurora-slow": "aurora 38s ease-in-out infinite reverse",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
