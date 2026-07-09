import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  /* Light-only UI: do not set `dark` on <html>; `dark:` variants never apply. */
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Fonts are self-hosted via next/font in app/layout.tsx (DM Sans,
        // JetBrains Mono, Caveat); these stacks provide the fallbacks.
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Courier New",
          "monospace",
        ],
        signature: ["var(--font-caveat)", "cursive"],
      },
      colors: {
        brand: {
          green: {
            50: "#ecfdf5",
            100: "#d1fae5",
            200: "#a7f3d0",
            300: "#6ee7b7",
            400: "#34d399",
            500: "#10b981",
            600: "#059669",
            700: "#047857",
            800: "#065f46",
            900: "#064e3b",
          },
          yellow: {
            50: "#fafafa",
            100: "#fafafa",
            200: "#fafafa",
            300: "#fafafa",
            400: "#fafafa",
            500: "#fafafa",
            600: "#fafafa",
            700: "#fafafa",
            800: "#fafafa",
            900: "#fafafa",
          },
          white: {
            50: "#fafafa",
            100: "#fafafa",
            200: "#fafafa",
            300: "#fafafa",
            400: "#fafafa",
            500: "#fafafa",
            600: "#fafafa",
            700: "#fafafa",
            800: "#fafafa",
            900: "#fafafa",
          },
        },
        surface: {
          DEFAULT: "var(--surface)",
          green: "var(--surface-green)",
        },
        background: "#fafafa",
        foreground: "#064e3b",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#111827",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#111827",
        },
        primary: {
          DEFAULT: "#064e3b",
          foreground: "#fafafa",
        },
        secondary: {
          DEFAULT: "#f3f4f6",
          foreground: "#064e3b",
        },
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#ecfdf5",
          foreground: "#064e3b",
        },
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#fafafa",
        },
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#064e3b",
        chart: {
          "1": "#064e3b",
          "2": "#6b7280",
          "3": "#047857",
          "4": "#9ca3af",
          "5": "#065f46",
        },
        sidebar: {
          DEFAULT: "#fafafa",
          foreground: "#064e3b",
          primary: "#ecfdf5",
          "primary-foreground": "#064e3b",
          accent: "#f0fdf4",
          "accent-foreground": "#064e3b",
          border: "#e5e7eb",
          ring: "#064e3b",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }: any) {
      const newUtilities = {
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
          "scrollbar-color": "#064e3b #fafafa",
        },
        ".scrollbar-none": {
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        ".scrollbar-green": {
          "scrollbar-color": "#064e3b #fafafa",
          "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#fafafa",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#064e3b",
            borderRadius: "3px",
            transition: "background-color 0.2s ease",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#047857",
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
export default config;
