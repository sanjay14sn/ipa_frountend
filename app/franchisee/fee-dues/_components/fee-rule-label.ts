export function getFeeRuleLabel(rule?: string | null): string {
  if (!rule) return "Not Configured";
  switch (rule) {
    case "REG_PLUS_FIRST_MONTH":
      return "Reg + 1st Month";
    case "REG_ONLY":
      return "Registration Only";
    case "CUSTOM":
      return "Custom Plan";
    case "REG_PLUS_FULL_COURSE":
      return "Reg + Full Course";
    default:
      return rule;
  }
}
