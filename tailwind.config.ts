import type { Config } from "tailwindcss";
import preset from "./tailwind.preset";

// PORT-02: tokens/colors/radius/fonts live in tailwind.preset.ts (portable);
// this file keeps only the app-specific bits — content globs and the
// scrollbar utility plugin.
const config: Config = {
  /* Light-only UI: do not set `dark` on <html>; `dark:` variants never apply. */
  darkMode: "class",
  presets: [preset as Config],
  // Every directory that can contain a class STRING must be listed, not just
  // the ones containing JSX: `lib/payment-details-display.ts` returns Tailwind
  // classes for the payment/agreement/order badges, and while `lib` was missing
  // here those classes were purged from the production bundle — the badges
  // rendered unstyled and nothing failed. Adding a directory later is the same
  // trap, which is why `features` is listed before it exists.
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
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
