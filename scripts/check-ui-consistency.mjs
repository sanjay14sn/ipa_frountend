#!/usr/bin/env node
/**
 * UI-consistency checks eslint can't express (docs/fe-revamp/05 Appendix B).
 * Greps the tree and diffs against scripts/ui-consistency-allowlist.json:
 * offenders already in the snapshot warn; NEW offenders fail the run.
 *
 *   npm run check:ui            — check (CI mode)
 *   npm run check:ui -- --update  — rewrite the snapshot from the current tree
 *
 * Checks:
 *  1. window.confirm             (expected 0 — SW-P6)
 *  2. <table outside ui/ + data-table  (SW-P8 ban)
 *  3. palette residue (bg|text|border)-(red|green|blue|amber|emerald|sky|yellow)-N
 *  4. hex-in-className [#xxxxxx] and brand-* scale classes (color hygiene)
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ALLOWLIST_PATH = new URL("./ui-consistency-allowlist.json", import.meta.url);
const update = process.argv.includes("--update");

/**
 * Roots are filtered to those that exist, because grep exits 2 on a missing
 * directory and the catch below cannot tell that apart from "no matches" — so
 * naming a directory before it exists would silently return zero hits for
 * EVERY check and report a clean tree. `features` is listed here so the
 * vertical-slice migration is covered the moment the directory appears.
 */
const ROOTS = ["app", "components", "features", "hooks", "lib"].filter((d) =>
  existsSync(new URL(`../${d}`, import.meta.url)),
);

if (ROOTS.length === 0) {
  console.error("check:ui — no source roots found; refusing to report a pass.");
  process.exit(1);
}

function grep(pattern, { extra = "" } = {}) {
  try {
    const out = execSync(
      `grep -rn --include='*.tsx' --include='*.ts' -E ${JSON.stringify(pattern)} ${ROOTS.join(" ")} ${extra}`,
      { encoding: "utf8" },
    );
    return out.trim().split("\n").filter(Boolean);
  } catch {
    return []; // grep exits 1 on no matches
  }
}

const stripLineNo = (hit) => hit.replace(/^([^:]+):\d+:/, "$1:");

const checks = [
  {
    id: "window-confirm",
    hits: grep("window\\.confirm").filter((h) => !h.includes(".test.")),
  },
  {
    id: "raw-table",
    hits: grep("<table").filter(
      (h) =>
        !h.startsWith("components/ui/") &&
        !h.includes("data-table.tsx") &&
        !h.includes(".test."),
    ),
  },
  {
    id: "palette-residue",
    hits: grep("(bg|text|border)-(red|green|blue|amber|emerald|sky|yellow)-[0-9]{2,3}").filter(
      (h) => !h.startsWith("components/ui/") && !h.includes(".test."),
    ),
  },
  {
    id: "hex-or-brand-class",
    hits: [
      ...grep("className=[^\\n]*\\[#[0-9a-fA-F]{3,8}\\]"),
      ...grep("(bg|text|border)-brand-(green|navy|red|yellow)-[0-9]"),
    ].filter((h) => !h.startsWith("components/ui/") && !h.includes(".test.")),
  },
];

const current = {};
for (const c of checks) current[c.id] = [...new Set(c.hits.map(stripLineNo))].sort();

if (update) {
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(current, null, 2) + "\n");
  console.log("allowlist snapshot updated:");
  for (const c of checks) console.log(`  ${c.id}: ${current[c.id].length}`);
  process.exit(0);
}

let allowlist = {};
try {
  allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
} catch {
  console.error("No allowlist snapshot — run `npm run check:ui -- --update` once.");
  process.exit(1);
}

let newOffenders = 0;
for (const c of checks) {
  const allowed = new Set(allowlist[c.id] ?? []);
  const fresh = current[c.id].filter((h) => !allowed.has(h));
  const stale = (allowlist[c.id] ?? []).filter((h) => !current[c.id].includes(h));
  console.log(
    `${c.id}: ${current[c.id].length} present, ${fresh.length} NEW, ${stale.length} burned down`,
  );
  for (const h of fresh) console.log(`  NEW  ${h}`);
  newOffenders += fresh.length;
}

if (newOffenders) {
  console.error(`\n${newOffenders} new offender(s) — fix them or (deliberately) update the snapshot.`);
  process.exit(1);
}
console.log("\nui-consistency: no new offenders.");
