import type { Config } from "tailwindcss";
import preset from "./tailwind.preset";

// PORT-02: tokens/colors/radius/fonts live in tailwind.preset.ts (portable);
// this file keeps only the app-specific bits — content globs and the
// scrollbar utility plugin.
const config: Config = {
  /* Light-only UI: do not set `dark` on <html>; `dark:` variants never apply. */
  darkMode: "class",
  presets: [preset as Config],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [
    function ({ addUtilities }: any) {
      const newUtilities = {
        ".scrollbar-thin": {
          "scrollbar-width": "thin",
          "scrollbar-color": "hsl(var(--input)) hsl(var(--background))",
        },
        ".scrollbar-none": {
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        // DEPRECATED name kept for existing call sites — renders the same
        // neutral slate scrollbar as the globals; do not use in new code.
        ".scrollbar-green": {
          "scrollbar-color": "hsl(var(--input)) hsl(var(--background))",
          "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "hsl(var(--background))",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "hsl(var(--input))",
            borderRadius: "3px",
            transition: "background-color 0.2s ease",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "hsl(var(--muted-foreground))",
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
export default config;
