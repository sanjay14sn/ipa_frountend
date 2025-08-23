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
    <div className="pb-4 flex-1 flex flex-col pt-8 ">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 underline">
          {agreementContent.title}
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={onDownloadPDF}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            PDF
          </Button>
          <Button
            onClick={onExpandAll}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Expand
          </Button>
          <Button
            onClick={onCollapseAll}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Collapse
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {agreementContent.description}
      </p>

      <div className="flex-1 max-h-[500px] overflow-y-auto rounded-lg">
        {agreementContent.sections.map((section, index) => (
          <div
            key={section.id}
            className="border-b border-gray-100 last:border-b-0"
          >
            <button
              onClick={() => onToggleSection(section.id)}
              className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
            >
              <div>
                <h4 className="font-medium text-gray-900 text-sm">
                  {index + 1}. {section.title}
                </h4>
                {section.description && (
                  <p className="text-xs text-gray-600 mt-1">
                    {section.description}
                  </p>
                )}
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has(section.id) && (
              <div className="px-3 pb-3 bg-gray-50">
                <ul className="space-y-2 text-xs text-gray-700">
                  {section.points.map((point) => (
                    <li key={point.id} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{point.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Terms Acceptance */}
      <div className="mt-4 p-4 bg-background/20 border border-primary rounded-lg">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreement"
            checked={agreementAccepted}
            onCheckedChange={onAgreementChange}
            className="mt-1"
          />
          <label
            htmlFor="agreement"
            className="text-sm text-gray-700 leading-relaxed"
          >
            I have read and agree to all the terms and conditions mentioned
            above in this franchise agreement document.
          </label>
        </div>
      </div>
    </div>
  );
}
