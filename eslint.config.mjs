import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // GitNexus index artifacts (git-ignored; run.cjs is plain CJS that fatals
    // the react-hooks rule scope).
    ".gitnexus/**",
  ]),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/globals": "warn",
    },
  },
  // --- UI-consistency guardrails (docs/fe-revamp/05 Appendix A — Phase 9).
  // Flat-config caveat: later objects REPLACE same-rule entries for matching
  // files, so each rule id appears once here with its full option set.
  {
    files: [
      "app/**/*.{ts,tsx}",
      "components/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
    ],
    ignores: [
      "tests/**",
      "**/*.test.*", // test code exempt (incl. colocated lib/*.test.ts)
      "components/ui/**", // shadcn primitives own their internals
      "components/shared/dialog/**", // the sanctioned dialog wrappers
      "lib/currency-utils.ts",
      "lib/date-utils.ts", // the formatter homes
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "confirm", message: "Use <ConfirmDialog> (components/shared/dialog)." },
        { name: "alert", message: "Use toast (sonner) or a dialog." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "window", property: "confirm", message: "Use <ConfirmDialog>." },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/components/ui/dialog",
              message:
                "Use AppDialog/FormDialog/DetailDialog (components/shared/dialog). Sanctioned raw usage requires eslint-disable + comment.",
            },
            { name: "@/components/ui/alert-dialog", message: "Use ConfirmDialog." },
            {
              name: "date-fns",
              importNames: ["format"],
              message:
                "date-fns is for date math; render dates with formatDate/formatDateTime (lib/date-utils).",
            },
          ],
          patterns: [
            // A12: route-private modules + icon-lib bans (lucide-react only)
            {
              group: ["@/app/*"],
              message:
                "Route-private module: import relatively within the route, or promote to components/.",
            },
            {
              group: [
                "react-icons",
                "react-icons/*",
                "@heroicons/*",
                "@mui/icons-material",
                "@mui/icons-material/*",
              ],
              message: "lucide-react is the only icon library.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='toLocaleDateString']",
          message: "Use formatDate (lib/date-utils).",
        },
        { selector: "JSXText[value=/₹/]", message: "Use formatRupees (lib/currency-utils)." },
        {
          selector: "TemplateElement[value.raw=/₹/]",
          message: "Use formatRupees (lib/currency-utils).",
        },
        { selector: "Literal[value=/₹/]", message: "Use formatRupees (lib/currency-utils)." },
      ],
    },
  },
  // --- PORT-04 kit-boundary lock (docs/fe-revamp/11): L1/L2 are app-agnostic.
  {
    files: ["components/ui/**", "components/shared/**", "components/error/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/services/*", "@/hooks/api/*", "@/context/*", "@/app/*"],
              message:
                "Kit layers (ui/, shared/) are app-agnostic — pass data via props (docs/fe-revamp/11, PORT-01).",
            },
          ],
        },
      ],
    },
  },
]);
