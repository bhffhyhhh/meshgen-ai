import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
        // Iron Man HUD custom colors
        navy: {
          DEFAULT: "#001f3f",
          light: "#002952",
          dark: "#001029",
        },
        charcoal: {
          DEFAULT: "#1a1a2e",
          light: "#22223d",
          dark: "#12121f",
        },
        gold: {
          DEFAULT: "#ffd700",
          light: "#ffe44d",
          dark: "#ccac00",
          muted: "#b8960a",
        },
        amber: {
          DEFAULT: "#ffb700",
          light: "#ffc933",
          dark: "#cc9200",
        },
        "hud-blue": {
          DEFAULT: "#0a4fa0",
          light: "#1a6fd4",
          dark: "#072f60",
          glow: "#1e90ff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        "gold-glow": "0 0 16px oklch(var(--primary) / 0.7), 0 0 32px oklch(var(--primary) / 0.3)",
        "gold-border": "0 0 8px oklch(var(--primary) / 0.5), inset 0 0 8px oklch(var(--primary) / 0.1)",
        "hud-border": "0 0 6px oklch(0.60 0.18 240 / 0.3), inset 0 1px 0 oklch(var(--primary) / 0.05)",
        "hud-panel": "0 0 20px oklch(0.60 0.18 240 / 0.15), 0 4px 24px oklch(0 0 0 / 0.4)",
        subtle: "0 1px 3px oklch(0 0 0 / 0.3)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "reactor-pulse": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "hud-flicker": {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.85" },
          "94%": { opacity: "1" },
          "96%": { opacity: "0.9" },
          "97%": { opacity: "1" },
        },
        "text-glow": {
          "0%, 100%": {
            textShadow: "0 0 8px oklch(var(--primary) / 0.6), 0 0 20px oklch(var(--primary) / 0.3)",
          },
          "50%": {
            textShadow: "0 0 16px oklch(var(--primary) / 0.9), 0 0 40px oklch(var(--primary) / 0.6)",
          },
        },
        "ring-rotate": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "ring-rotate-reverse": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(-360deg)" },
        },
        "voice-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "reactor-pulse": "reactor-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "hud-flicker": "hud-flicker 4s linear infinite",
        "text-glow": "text-glow 3s ease-in-out infinite alternate",
        "ring-rotate": "ring-rotate 8s linear infinite",
        "ring-rotate-reverse": "ring-rotate-reverse 5s linear infinite",
        "voice-pulse": "voice-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
