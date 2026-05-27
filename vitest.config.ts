/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Vitest configuration for the IPA-frontend project.
 *
 * Run tests with: `pnpm test`
 * Run with coverage: `pnpm test:coverage`
 *
 * Test file locations:
 *   - Unit/util tests co-located as `*.test.ts` or in `tests/unit/`
 *   - Hook tests in `tests/hooks/`
 *   - Component tests in `tests/components/`
 *
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/tests/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/e2e/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
