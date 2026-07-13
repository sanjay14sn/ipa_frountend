import { Badge } from "@/components/ui/badge";

export interface ModulePillProps {
  label: string;
}

/** Uppercase module eyebrow pill — slots into PageHeaderCard's eyebrow. */
export function ModulePill({ label }: ModulePillProps) {
  return (
    <Badge
      variant="outline"
      data-testid="module-pill"
      className="rounded-full border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-primary hover:bg-primary/10"
    >
      {label}
    </Badge>
  );
}
