#!/usr/bin/env node
/**
 * check-env.mjs — Required-environment-variable guard.
 *
 * Run before `next build` (or in CI after install) to fail fast when a
 * required env var is missing rather than discovering the problem at runtime.
 *
 * Usage:
 *   node scripts/check-env.mjs
 *
 * In CI (GitHub Actions example):
 *   - name: Validate environment variables
 *     run: node scripts/check-env.mjs
 *
 * Exit codes:
 *   0 — all required vars are present and non-empty
 *   1 — one or more vars are missing
 */

/** @type {string[]} */
const REQUIRED_VARS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
];

let missing = 0;
for (const name of REQUIRED_VARS) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    console.error(`[check-env] MISSING: ${name} is not set or empty.`);
    missing++;
  }
}

if (missing > 0) {
  console.error(
    `\n[check-env] ${missing} required environment variable${missing === 1 ? " is" : "s are"} missing.`,
  );
  console.error(
    "[check-env] Copy .env.local.example to .env.local and fill in the values.\n",
  );
  process.exit(1);
} else {
  console.log("[check-env] All required environment variables are present. ✓");
  process.exit(0);
}
