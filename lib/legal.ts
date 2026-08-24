/**
 * lib/legal.ts — Company identity constants for the public legal pages
 * (`app/(legal)/…`) and the auth-page footer.
 *
 * Single source of truth: Razorpay merchant verification checks these pages
 * against the registered business details, so edits here must match the
 * details on the Razorpay dashboard.
 */

export const COMPANY_LEGAL_NAME = "Ideal Play Abacus India Pvt. Ltd.";

export const COMPANY_ADDRESS =
  "No. 14, Thiruvika 3rd Street, Royapettah High Road, Mylapore, Chennai - 600 004, Tamil Nadu, India";

export const CONTACT_EMAIL = "contact@playabacusindia.com";

export const CONTACT_PHONE = "+91 99404 16989";

/** Public origin of this portal, as registered with Razorpay. */
export const PORTAL_URL = "https://app.idealplayabacusindia.com";

/** Marketing website of the company. */
export const MARKETING_SITE_URL = "https://www.playabacusindia.com";

/** Shown as "Last updated" on every legal page. */
export const LEGAL_LAST_UPDATED = "August 24, 2026";

/** The public compliance pages, in display order (auth footer + legal-page footer). */
export const LEGAL_PAGES = [
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
  { href: "/contact-us", label: "Contact Us" },
] as const;
