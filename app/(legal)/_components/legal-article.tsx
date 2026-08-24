import {
  COMPANY_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LEGAL_LAST_UPDATED,
} from "@/lib/legal";

export interface LegalArticleProps {
  title: string;
  children: React.ReactNode;
  /** Contact page is not a versioned policy — it hides the updated line. */
  showLastUpdated?: boolean;
}

/**
 * Typography wrapper for the public legal documents. Pages author plain
 * semantic HTML (h2/h3/p/ul/strong/a) and this component styles the whole
 * subtree via descendant variants, so the long documents stay readable
 * markup instead of per-paragraph components.
 */
export function LegalArticle({
  title,
  children,
  showLastUpdated = true,
}: LegalArticleProps) {
  return (
    <article
      data-testid="legal-article"
      className={[
        "text-sm leading-6 text-card-foreground",
        "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-primary",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_p]:mb-3",
        "[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_strong]:font-semibold",
      ].join(" ")}
    >
      <h1 className="text-2xl font-semibold text-primary">{title}</h1>
      {showLastUpdated ? (
        <p className="mt-2 mb-8 text-xs text-muted-foreground">
          Last updated on {LEGAL_LAST_UPDATED}
        </p>
      ) : (
        <div className="mb-8" />
      )}
      {children}
    </article>
  );
}

/**
 * Standard "Contact Us" block closing every legal document — same channels
 * the marketing site publishes.
 */
export function LegalContactSection({ intro }: { intro: string }) {
  return (
    <section>
      <h2>Contact Us</h2>
      <p>{intro}</p>
      <ul>
        <li>
          By email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
        <li>
          By phone number:{" "}
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}>
            {CONTACT_PHONE}
          </a>
        </li>
        <li>By post: {COMPANY_ADDRESS}</li>
      </ul>
    </section>
  );
}
