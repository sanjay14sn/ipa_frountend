import type { Metadata } from "next";
import {
  COMPANY_ADDRESS,
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  MARKETING_SITE_URL,
} from "@/lib/legal";
import { LegalArticle } from "../_components/legal-article";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "How to reach Ideal Play Abacus India Pvt. Ltd. — registered office, phone and email for support with the IPA Portal, payments and orders.",
};

export default function ContactUsPage() {
  return (
    <LegalArticle title="Contact Us" showLastUpdated={false}>
      <p>
        We are here to help with anything related to the IPA Portal — your
        account, franchise or training agreements, payments, orders and
        deliveries, or our policies. Reach us through any of the channels
        below and our team will get back to you as soon as possible.
      </p>

      <section>
        <h2>Registered Office</h2>
        <p>
          <strong>{COMPANY_LEGAL_NAME}</strong>
        </p>
        <p>{COMPANY_ADDRESS}</p>
      </section>

      <section>
        <h2>Phone</h2>
        <p>
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}>
            {CONTACT_PHONE}
          </a>
        </p>
      </section>

      <section>
        <h2>Email</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          For queries about a payment or a refund, please include the payment
          reference or order reference in your message so we can locate the
          transaction quickly.
        </p>
      </section>

      <section>
        <h2>Website</h2>
        <p>
          To know more about our programmes and franchise opportunities, visit{" "}
          <a href={MARKETING_SITE_URL}>{MARKETING_SITE_URL}</a>
        </p>
      </section>
    </LegalArticle>
  );
}
