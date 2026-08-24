import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsAndConditionsPage from "@/app/(legal)/terms-and-conditions/page";
import PrivacyPolicyPage from "@/app/(legal)/privacy-policy/page";
import RefundPolicyPage from "@/app/(legal)/refund-policy/page";
import CancellationPolicyPage from "@/app/(legal)/cancellation-policy/page";
import { CONTACT_EMAIL, LEGAL_PAGES } from "@/lib/legal";

/**
 * The four public legal pages exist for Razorpay merchant verification —
 * these tests pin the pieces the verification depends on: the document
 * heading, the contact channel, and the cross-links between policies.
 */
describe("legal pages", () => {
  const pages = [
    { Page: TermsAndConditionsPage, title: "Terms and Conditions" },
    { Page: PrivacyPolicyPage, title: "Privacy Policy" },
    { Page: RefundPolicyPage, title: "Refund Policy" },
    { Page: CancellationPolicyPage, title: "Cancellation Policy" },
  ] as const;

  it.each(pages)("$title renders its heading and contact email", ({
    Page,
    title,
  }) => {
    render(<Page />);
    expect(
      screen.getByRole("heading", { level: 1, name: title }),
    ).toHaveTextContent(title);
    expect(screen.getByText(CONTACT_EMAIL)).toBeInTheDocument();
  });

  it("terms link to the privacy, refund and cancellation policies", () => {
    render(<TermsAndConditionsPage />);
    const article = screen.getByTestId("legal-article");
    for (const href of [
      "/privacy-policy",
      "/refund-policy",
      "/cancellation-policy",
    ]) {
      const links = within(article)
        .getAllByRole("link")
        .filter((a) => a.getAttribute("href") === href);
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it("LEGAL_PAGES covers the four routes Razorpay verifies", () => {
    expect(LEGAL_PAGES.map((p) => p.href)).toEqual([
      "/terms-and-conditions",
      "/privacy-policy",
      "/refund-policy",
      "/cancellation-policy",
    ]);
  });
});
