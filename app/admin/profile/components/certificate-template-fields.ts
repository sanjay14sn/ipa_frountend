/**
 * Registry of the data fields the backend certificate renderer can print.
 * The object key inside `fieldCoordinates` IS the data binding — the backend
 * looks up each key in its fields map when generating the PDF, so only keys
 * listed here will ever receive a value.
 */

export interface CertificateFieldDef {
  key: string;
  label: string;
  /** Sample value rendered inside the placement box as a live preview. */
  sample: string;
  /** Human description of what data prints here. */
  description: string;
  /** The franchisee signature image — placed, not typed. */
  signature?: boolean;
  /** Only filled on stream-completion certificates. */
  streamOnly?: boolean;
  /** Only filled on level certificates. */
  levelOnly?: boolean;
}

export const CERTIFICATE_FIELDS: CertificateFieldDef[] = [
  {
    key: "student_name",
    label: "Student Name",
    sample: "Aarav Kumar",
    description: "Student's full name",
  },
  {
    key: "student_level",
    label: "Student Level",
    sample: "3",
    description: "Completed level number",
    levelOnly: true,
  },
  {
    key: "student_stream",
    label: "Student Stream",
    sample: "Junior Abacus",
    description: "Completed stream name",
    streamOnly: true,
  },
  {
    key: "student_program",
    label: "Student Program",
    sample: "Junior Abacus",
    description: "Programme (stream) name",
  },
  {
    key: "franchise_name",
    label: "Franchise Name",
    sample: "IPA Chennai Centre",
    description: "Franchise centre name",
  },
  {
    key: "year",
    label: "Year",
    sample: String(new Date().getFullYear()),
    description: "Year of issue",
  },
  {
    key: "franchisee",
    label: "Franchisee",
    sample: "Signature",
    description: "Franchisee signature image (from the franchisee profile)",
    signature: true,
  },
];

export function getFieldDef(key: string): CertificateFieldDef | undefined {
  return CERTIFICATE_FIELDS.find((f) => f.key === key);
}

/**
 * Fonts supported end-to-end: each value maps to a pdf-lib standard font in
 * the backend renderer (FONT_MAP in certificate-pdf-renderer.service.ts) and
 * to a CSS approximation for the on-canvas preview.
 */
export const FONT_OPTIONS = [
  {
    value: "helvetica-bold",
    label: "Helvetica Bold",
    css: "Helvetica, Arial, sans-serif",
    weight: 700,
    style: "normal" as const,
  },
  {
    value: "helvetica",
    label: "Helvetica",
    css: "Helvetica, Arial, sans-serif",
    weight: 400,
    style: "normal" as const,
  },
  {
    value: "times",
    label: "Times Roman",
    css: "'Times New Roman', Times, serif",
    weight: 400,
    style: "normal" as const,
  },
  {
    value: "times-bold",
    label: "Times Bold",
    css: "'Times New Roman', Times, serif",
    weight: 700,
    style: "normal" as const,
  },
  {
    value: "times-italic",
    label: "Times Italic",
    css: "'Times New Roman', Times, serif",
    weight: 400,
    style: "italic" as const,
  },
  {
    value: "courier",
    label: "Courier",
    css: "'Courier New', Courier, monospace",
    weight: 400,
    style: "normal" as const,
  },
];

export const DEFAULT_FONT = "helvetica-bold";
export const DEFAULT_FONT_SIZE = 13;

export function getFontOption(value?: string) {
  return FONT_OPTIONS.find((f) => f.value === value) ?? FONT_OPTIONS[0];
}
