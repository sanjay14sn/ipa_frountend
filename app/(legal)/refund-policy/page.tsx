import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY_LEGAL_NAME } from "@/lib/legal";
import {
  LegalArticle,
  LegalContactSection,
} from "../_components/legal-article";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Refund Policy for payments made through the IPA Portal — franchise fees, training fees and orders for educational materials.",
};

export default function RefundPolicyPage() {
  return (
    <LegalArticle title="Refund Policy">
      <p>
        This Refund Policy describes the circumstances in which payments made
        through the IPA Portal (the &ldquo;Service&rdquo;) are eligible for a
        refund, and how refunds are processed. It applies to all payments
        collected through the Service, including franchise fees, renewal fees,
        training fees and payments for orders of educational materials.
      </p>
      <p>
        In this policy, &ldquo;We&rdquo;, &ldquo;Us&rdquo; and
        &ldquo;Our&rdquo; refer to {COMPANY_LEGAL_NAME}, and &ldquo;You&rdquo;
        refers to the franchisee or course instructor making a payment through
        the Service. This policy should be read together with Our{" "}
        <Link href="/terms-and-conditions">Terms and Conditions</Link> and Our{" "}
        <Link href="/cancellation-policy">Cancellation Policy</Link>.
      </p>

      <section>
        <h2>Franchise Fees and Renewal Fees</h2>
        <p>
          Franchise fees and renewal fees are payable on execution of the
          corresponding franchise agreement. Once the agreement has been
          activated, these fees are non-refundable, except where the executed
          franchise agreement expressly provides otherwise.
        </p>
        <p>
          If a fee is collected against an agreement that is not subsequently
          activated by Us, or a payment is collected from You in error, the
          amount will be refunded in full.
        </p>
      </section>

      <section>
        <h2>Training Fees</h2>
        <p>
          Fees paid by course instructors towards training are non-refundable
          once the corresponding training has commenced or the training
          materials have been made available. If a scheduled training is
          cancelled by Us and not rescheduled, the fee paid will be refunded in
          full.
        </p>
      </section>

      <section>
        <h2>Orders for Educational Materials</h2>
        <p>
          Orders placed through the Service are for physical educational
          materials — such as abacus kits, books and student kits — dispatched
          to Your registered address. You are eligible for a replacement or a
          refund if:
        </p>
        <ul>
          <li>the materials You receive are damaged or defective;</li>
          <li>
            the materials You receive do not match Your order (a wrong item or
            a short quantity); or
          </li>
          <li>Your order is cancelled by Us for any reason after payment.</li>
        </ul>
        <p>
          To raise a claim, You must notify Us within 7 days of delivery,
          quoting Your order reference and attaching photographs of the items
          received where applicable. Once We have verified the claim, We will,
          at Your option, dispatch replacement materials at no additional cost
          or refund the amount paid for the affected items.
        </p>
        <p>
          As the materials supplied are specific to Our curriculum, refunds
          are not available for change of mind after an order has been
          dispatched.
        </p>
      </section>

      <section>
        <h2>Failed, Duplicate and Excess Payments</h2>
        <p>
          If an amount is debited from Your account but the corresponding
          payment is not confirmed on the Service, the transaction will either
          be confirmed automatically on reconciliation with the payment
          gateway or the debited amount will be refunded to You. Duplicate
          payments made against the same order or fee will be refunded in
          full.
        </p>
        <p>
          If You believe You have made a failed, duplicate or excess payment,
          please contact Us with the payment reference and We will investigate
          and resolve it.
        </p>
      </section>

      <section>
        <h2>Refund Processing</h2>
        <p>
          Approved refunds are processed through Razorpay to the original
          method of payment used for the transaction. Once initiated, refunds
          are typically credited within 5–7 working days, depending on Your
          bank or payment provider. We will notify You when a refund has been
          initiated.
        </p>
      </section>

      <LegalContactSection intro="To request a refund, or if you have any questions about this Refund Policy, You can contact us:" />
    </LegalArticle>
  );
}
