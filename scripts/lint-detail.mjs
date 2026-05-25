// Print short message detail for the top-N files.
import fs from "node:fs";
import path from "node:path";

const data = JSON.parse(fs.readFileSync("lint.json", "utf8"));

const targets = new Set([
  "app/franchisee/agreement/page.tsx",
  "components/procurement/ProcurementBulkLinePicker.tsx",
  "app/admin/franchise/components/AgreementKitItemsDialog.tsx",
  "app/admin/profile/components/CertificateTemplateEditor.tsx",
  "app/admin/profile/components/LevelManagement.tsx",
  "app/admin/profile/components/ProgramManagement.tsx",
  "app/franchisee/course-instructors/components/RequestMaterialsModal.tsx",
  "app/franchisee/course-instructors/components/RequestTrainingModal.tsx",
  "hooks/useNotificationSse.ts",
  "app/admin/course-instructor-approvals/components/ApproveCIModal.tsx",
  "app/admin/course-instructor-approvals/components/SetupExistingCIDialog.tsx",
  "app/admin/course-instructor-approvals/components/TrainingSection.tsx",
]);

// Just take the first short sentence of each message, no code snippet.
const shorten = (raw) => {
  if (!raw) return "";
  // Cut at the first "(" or "Effects are" or after first newline / period.
  const oneline = raw.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  const firstPeriod = oneline.indexOf(".");
  const firstParen = oneline.indexOf("(http");
  const firstAvoid = oneline.indexOf("Avoid calling");
  let cut = oneline.length;
  for (const p of [firstPeriod, firstParen, firstAvoid]) {
    if (p > 0 && p < cut) cut = p;
  }
  return oneline.slice(0, cut).trim();
};

for (const result of data) {
  if (!result.messages || result.messages.length === 0) continue;
  const rel = path.relative(process.cwd(), result.filePath).replace(/\\/g, "/");
  if (!targets.has(rel)) continue;
  console.log(`\n=== ${rel} ===`);
  for (const msg of result.messages) {
    const loc = `${msg.line}:${msg.column}`;
    console.log(`  [${msg.ruleId}] ${loc}  ${shorten(msg.message)}`);
  }
}
