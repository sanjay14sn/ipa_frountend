import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-fira-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        // Custom brand colors
        brand: {
          green: {
            50: "#f0f9f3",
            100: "#dcf0e3",
            200: "#bbe1cb",
            300: "#8bcaa7",
            400: "#55ad7d",
            500: "#064e3b", // Updated to new green
            600: "#064e3b",
            700: "#064e3b",
            800: "#064e3b",
            900: "#064e3b",
          },
          yellow: {
            50: "#fafafa",
            100: "#fafafa",
            200: "#fafafa",
            300: "#fafafa",
            400: "#fafafa", // Updated to white
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
        background: "#fafafa",
        foreground: "#064e3b",
        card: {
          DEFAULT: "#fafafa",
          foreground: "#064e3b",
        },
        popover: {
          DEFAULT: "#fafafa",
          foreground: "#064e3b",
        },
        primary: {
          DEFAULT: "#064e3b",
          foreground: "#fafafa",
        },
        secondary: {
          DEFAULT: "#a3a3a3",
          foreground: "#064e3b",
        },
        muted: {
          DEFAULT: "#a3a3a3",
          foreground: "#064e3b",
        },
        accent: {
          DEFAULT: "#a3a3a3",
          foreground: "#064e3b",
        },
        destructive: {
          DEFAULT: "#064e3b",
          foreground: "#fafafa",
        },
        border: "#a3a3a3",
        input: "#a3a3a3",
        ring: "#064e3b",
        chart: {
          "1": "#064e3b",
          "2": "#a3a3a3",
          "3": "#064e3b",
          "4": "#a3a3a3",
          "5": "#064e3b",
        },
        sidebar: {
          DEFAULT: "#fafafa",
          foreground: "#064e3b",
          primary: "#a3a3a3",
          "primary-foreground": "#064e3b",
          accent: "#a3a3a3",
          "accent-foreground": "#064e3b",
          border: "#a3a3a3",
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
            background: "#064e3b",
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
export default config;
