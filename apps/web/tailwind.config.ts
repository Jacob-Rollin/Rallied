import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          DEFAULT: "var(--color-slate)",
          elevated: "var(--color-slate-elevated)",
        },
        coral: "var(--color-coral)",
        lime: "var(--color-ghostless-lime)",
        muted: "var(--color-muted)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        brand: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
