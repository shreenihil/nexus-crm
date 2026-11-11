/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-bg-canvas)",
        surface: "var(--color-bg-surface)",
        subtle: "var(--color-bg-subtle)",
        elevated: "var(--color-bg-elevated)",
        overlay: "var(--color-bg-overlay)",
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        inverse: "var(--color-text-inverse)",
        "border-default": "var(--color-border-default)",
        "border-muted": "var(--color-border-muted)",
        "border-strong": "var(--color-border-strong)",
        "border-focus": "var(--color-border-focus)",
        accent: {
          primary: "var(--color-accent-primary)",
          hover: "var(--color-accent-hover)",
          active: "var(--color-accent-active)",
          muted: "var(--color-accent-muted)",
          text: "var(--color-accent-text)",
        },
      },
    },
  },
  plugins: [],
};
