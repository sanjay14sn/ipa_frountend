import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY_LEGAL_NAME } from "@/lib/legal";
import {
  LegalArticle,
  LegalContactSection,
} from "../_components/legal-article";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "Cancellation Policy for orders and services purchased through the IPA Portal of Ideal Play Abacus India Pvt. Ltd.",
};

export default function CancellationPolicyPage() {
  return (
    <LegalArticle title="Cancellation Policy">
      <p>
        This Cancellation Policy describes when orders and services purchased
        through the IPA Portal (the &ldquo;Service&rdquo;) may be cancelled.
        Refunds arising out of a cancellation are governed by Our{" "}
        <Link href="/refund-policy">Refund Policy</Link>.
      </p>
      <p>
        In this policy, &ldquo;We&rdquo;, &ldquo;Us&rdquo; and
        &ldquo;Our&rdquo; refer to {COMPANY_LEGAL_NAME}, and &ldquo;You&rdquo;
        refers to the franchisee or course instructor transacting through the
        Service.
      </p>

      <section>
        <h2>Cancelling an Order</h2>
        <p>
          Orders for educational materials may be cancelled at any time before
          they are dispatched. To cancel an order, contact Us using the
          details below, quoting Your order reference. If payment has already
          been made, the amount will be refunded in accordance with Our{" "}
          <Link href="/refund-policy">Refund Policy</Link>.
        </p>
        <p>
          Once an order has been dispatched, it can no longer be cancelled. If
          the materials You receive are damaged, defective or incorrect, You
          may instead raise a claim under Our{" "}
          <Link href="/refund-policy">Refund Policy</Link> within 7 days of
          delivery.
        </p>
      </section>

      <section>
        <h2>Cancellation by the Company</h2>
        <p>
          We reserve the right to refuse or cancel an order at any time,
          including for reasons of stock availability, errors in the
          description or prices of items, errors in Your order, or suspected
          fraudulent or unauthorized transactions. If We cancel an order after
          payment has been received, the amount paid will be refunded in
          full.
        </p>
      </section>

      <section>
        <h2>Franchise and Training Agreements</h2>
        <p>
          Franchise agreements and training arrangements are governed by the
          terms of the agreement executed between You and the Company. A
          request to cancel or terminate such an agreement must be made in
          writing to the contact details below and will be handled in
          accordance with the terms of that agreement. Fees already paid are
          refundable only as provided in Our{" "}
          <Link href="/refund-policy">Refund Policy</Link> and the applicable
          agreement.
        </p>
        <p>
          An agreement or renewal that has been issued to You but not yet paid
          does not have to be cancelled — it simply remains inactive, and no
          charge applies until You choose to pay.
        </p>
      </section>

      <section>
        <h2>Failed and Pending Payments</h2>
        <p>
          A payment attempt that fails, or that is abandoned before
          completion, does not create an order or activate a service, and no
          action is needed from You to cancel it. If an amount was debited
          from Your account for such an attempt, it will be handled as a
          failed payment under Our{" "}
          <Link href="/refund-policy">Refund Policy</Link>.
        </p>
      </section>

      <LegalContactSection intro="To cancel an order or service, or if you have any questions about this Cancellation Policy, You can contact us:" />
    </LegalArticle>
  );
}
