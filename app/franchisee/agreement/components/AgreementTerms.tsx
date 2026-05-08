import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { AgreementContent } from "@/lib/agreementContent";

interface AgreementTermsProps {
  agreementContent: AgreementContent;
  expandedSections: Set<string>;
  agreementAccepted: boolean;
  onToggleSection: (sectionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onDownloadPDF: () => void;
  onAgreementChange: (checked: boolean | "indeterminate") => void;
}

export default function AgreementTerms({
  agreementContent,
  expandedSections,
  agreementAccepted,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onDownloadPDF,
  onAgreementChange,
}: AgreementTermsProps) {
  return (
    <div className="flex flex-1 flex-col pb-2">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-medium text-card-foreground">
          {agreementContent.title}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onDownloadPDF}
            variant="outline"
            size="sm"
            className="rounded-lg border-border text-xs"
          >
            <Download className="mr-1 h-3 w-3" />
            PDF
          </Button>
          <Button
            onClick={onExpandAll}
            variant="outline"
            size="sm"
            className="rounded-lg border-border text-xs"
          >
            Expand
          </Button>
          <Button
            onClick={onCollapseAll}
            variant="outline"
            size="sm"
            className="rounded-lg border-border text-xs"
          >
            Collapse
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {agreementContent.description}
      </p>

      <div className="max-h-[min(60vh,520px)] flex-1 overflow-y-auto rounded-xl border border-border bg-card">
        {agreementContent.sections.map((section, index) => (
          <div
            key={section.id}
            className="border-b border-border last:border-b-0"
          >
            <button
              type="button"
              onClick={() => onToggleSection(section.id)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-accent/60"
            >
              <div>
                <h4 className="text-sm font-medium text-card-foreground">
                  {index + 1}. {section.title}
                </h4>
                {section.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {section.description}
                  </p>
                )}
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
            {expandedSections.has(section.id) && (
              <div className="bg-accent/30 px-3 pb-3">
                <ul className="space-y-2 text-xs text-card-foreground">
                  {section.points.map((point) => (
                    <li key={point.id} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreement"
            checked={agreementAccepted}
            onCheckedChange={onAgreementChange}
            className="mt-1"
          />
          <label
            htmlFor="agreement"
            className="text-sm leading-relaxed text-card-foreground"
          >
            I have read and agree to all the terms and conditions mentioned
            above in this franchise agreement document.
          </label>
        </div>
      </div>
    </div>
  );
}
