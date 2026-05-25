// Read-only triage of lint.json — does not modify code.
import fs from "node:fs";
import path from "node:path";

const data = JSON.parse(fs.readFileSync("lint.json", "utf8"));

const byRule = new Map();
const byFile = new Map();
const ruleFilePairs = new Map(); // rule -> Map(file -> count)
const fileRules = new Map(); // file -> Map(rule -> count)

let totalWarnings = 0;
let totalErrors = 0;

for (const result of data) {
  if (!result.messages || result.messages.length === 0) continue;
  const rel = path.relative(process.cwd(), result.filePath).replace(/\\/g, "/");
  for (const msg of result.messages) {
    const rule = msg.ruleId || "(no-rule)";
    const sev = msg.severity; // 1 = warn, 2 = error
    if (sev === 2) totalErrors++;
    else totalWarnings++;

    byRule.set(rule, (byRule.get(rule) || 0) + 1);
    byFile.set(rel, (byFile.get(rel) || 0) + 1);

    if (!ruleFilePairs.has(rule)) ruleFilePairs.set(rule, new Map());
    const fileMap = ruleFilePairs.get(rule);
    fileMap.set(rel, (fileMap.get(rel) || 0) + 1);

    if (!fileRules.has(rel)) fileRules.set(rel, new Map());
    const ruleMap = fileRules.get(rel);
    ruleMap.set(rule, (ruleMap.get(rule) || 0) + 1);
  }
}

const sortDesc = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);

console.log(`Total warnings: ${totalWarnings}`);
console.log(`Total errors:   ${totalErrors}`);
console.log("");
console.log("== By rule ==");
for (const [rule, n] of sortDesc(byRule)) {
  console.log(`  ${n.toString().padStart(4)}  ${rule}`);
}
console.log("");
console.log("== Top 15 files by warning count ==");
for (const [file, n] of sortDesc(byFile).slice(0, 15)) {
  console.log(`  ${n.toString().padStart(4)}  ${file}`);
  const ruleMap = fileRules.get(file);
  for (const [rule, count] of sortDesc(ruleMap)) {
    console.log(`        ${count.toString().padStart(3)}  ${rule}`);
  }
}
console.log("");
console.log("== Files per rule (top 5 each) ==");
for (const [rule, fileMap] of sortDesc(ruleFilePairs)) {
  console.log(`-- ${rule} (${byRule.get(rule)} total)`);
  for (const [file, n] of sortDesc(fileMap).slice(0, 5)) {
    console.log(`    ${n.toString().padStart(3)}  ${file}`);
  }
}
