import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY_ADDRESS, COMPANY_LEGAL_NAME, PORTAL_URL } from "@/lib/legal";
import {
  LegalArticle,
  LegalContactSection,
} from "../_components/legal-article";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms and Conditions governing the use of the IPA Portal, the franchise-management service of Ideal Play Abacus India Pvt. Ltd.",
};

export default function TermsAndConditionsPage() {
  return (
    <LegalArticle title="Terms and Conditions">
      <p>
        Please read these terms and conditions carefully before using Our
        Service.
      </p>

      <section>
        <h2>Interpretation and Definitions</h2>
        <h3>Interpretation</h3>
        <p>
          The words of which the initial letter is capitalized have meanings
          defined under the following conditions. The following definitions
          shall have the same meaning regardless of whether they appear in
          singular or in plural.
        </p>
        <h3>Definitions</h3>
        <p>For the purposes of these Terms and Conditions:</p>
        <ul>
          <li>
            <strong>&ldquo;Account&rdquo;</strong> means a unique account
            created for You to access our Service or parts of our Service.
          </li>
          <li>
            <strong>&ldquo;Company&rdquo;</strong> (referred to as either
            &ldquo;the Company&rdquo;, &ldquo;We&rdquo;, &ldquo;Us&rdquo; or
            &ldquo;Our&rdquo; in this Agreement) refers to {COMPANY_LEGAL_NAME}
            , {COMPANY_ADDRESS}.
          </li>
          <li>
            <strong>&ldquo;Country&rdquo;</strong> refers to: India, and in
            specific, the State of Tamil Nadu.
          </li>
          <li>
            <strong>&ldquo;Device&rdquo;</strong> means any device that can
            access the Service such as a computer, a cellphone or a digital
            tablet.
          </li>
          <li>
            <strong>&ldquo;Goods&rdquo;</strong> refer to the items offered
            for sale on the Service, such as abacus kits, books, student
            materials and other educational materials.
          </li>
          <li>
            <strong>&ldquo;Orders&rdquo;</strong> mean a request by You to
            purchase Goods from Us.
          </li>
          <li>
            <strong>&ldquo;Service&rdquo;</strong> refers to the Website.
          </li>
          <li>
            <strong>&ldquo;Terms and Conditions&rdquo;</strong> (also referred
            as &ldquo;Terms&rdquo;) mean these Terms and Conditions that form
            the entire agreement between You and the Company regarding the use
            of the Service.
          </li>
          <li>
            <strong>&ldquo;Website&rdquo;</strong> refers to the IPA Portal,
            accessible from <a href={PORTAL_URL}>{PORTAL_URL}</a>
          </li>
          <li>
            <strong>&ldquo;You&rdquo;</strong> means the individual accessing
            or using the Service, or the company, or other legal entity on
            behalf of which such individual is accessing or using the Service,
            as applicable.
          </li>
        </ul>
      </section>

      <section>
        <h2>Acknowledgment</h2>
        <p>
          These are the Terms and Conditions governing the use of this Service
          and the agreement that operates between You and the Company. These
          Terms and Conditions set out the rights and obligations of all users
          regarding the use of the Service.
        </p>
        <p>
          Your access to and use of the Service is conditioned on Your
          acceptance of and compliance with these Terms and Conditions. These
          Terms and Conditions apply to all visitors, users and others who
          access or use the Service.
        </p>
        <p>
          By accessing or using the Service You agree to be bound by these
          Terms and Conditions. If You disagree with any part of these Terms
          and Conditions then You may not access the Service.
        </p>
        <p>
          You represent that you are over the age of 18. The Company does not
          permit those under 18 to use the Service.
        </p>
        <p>
          Your access to and use of the Service is also conditioned on Your
          acceptance of and compliance with the{" "}
          <Link href="/privacy-policy">Privacy Policy</Link> of the Company.
          Our Privacy Policy describes Our policies and procedures on the
          collection, use and disclosure of Your personal information when You
          use the Application or the Website and tells You about Your privacy
          rights and how the law protects You. Please read Our Privacy Policy
          carefully before using Our Service.
        </p>
      </section>

      <section>
        <h2>The Service</h2>
        <p>
          The Service is the franchise-management portal of the Company. It is
          used by the Company&apos;s administrators and by approved franchisees
          and course instructors of the Ideal Play Abacus network to manage
          franchise agreements, student enrolment and progress records,
          instructor training, certificate and ID card requests, and Orders for
          educational materials, and to make the payments connected with them.
          Access to the Service is restricted to persons to whom the Company
          has issued credentials; the Service is not offered to the general
          public.
        </p>
      </section>

      <section>
        <h2>User Accounts</h2>
        <p>
          Accounts on the Service are issued by the Company to approved
          franchisees and course instructors. When You are provided an account
          with Us, You must provide Us information that is accurate, complete,
          and current at all times. Failure to do so constitutes a breach of
          the Terms, which may result in immediate termination of Your account
          on Our Service.
        </p>
        <p>
          You are responsible for safeguarding the password that You use to
          access the Service and for any activities or actions under Your
          password.
        </p>
        <p>
          You agree not to disclose Your password to any third party. You must
          notify Us immediately upon becoming aware of any breach of security
          or unauthorized use of Your account.
        </p>
      </section>

      <section>
        <h2>Placing Orders for Goods</h2>
        <p>
          By placing an Order for Goods through the Service, You warrant that
          You are legally capable of entering into binding contracts.
        </p>
        <h3>Your Information</h3>
        <p>
          If You wish to place an Order for Goods available on the Service, You
          may be asked to supply certain information relevant to Your Order
          including, without limitation, Your name, Your email, Your phone
          number and Your shipping information.
        </p>
        <p>
          You represent and warrant that: (i) You have the legal right to use
          any payment method(s) in connection with any Order; and that (ii)
          the information You supply to us is true, correct and complete.
        </p>
        <h3>Order Cancellation</h3>
        <p>
          We reserve the right to refuse or cancel Your Order at any time for
          certain reasons including but not limited to:
        </p>
        <ul>
          <li>Goods availability</li>
          <li>Errors in the description or prices for Goods</li>
          <li>Errors in Your Order</li>
        </ul>
        <p>
          We reserve the right to refuse or cancel Your Order if fraud or an
          unauthorized or illegal transaction is suspected. Your right to
          cancel an Order is described in Our{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link>.
        </p>
        <h3>Availability, Errors and Inaccuracies</h3>
        <p>
          We are constantly updating Our offerings of Goods on the Service. The
          Goods available on Our Service may be mispriced, described
          inaccurately, or unavailable, and We may experience delays in
          updating information regarding our Goods on the Service.
        </p>
        <p>
          We cannot and do not guarantee the accuracy or completeness of any
          information, including prices, product images, specifications and
          availability. We reserve the right to change or update information
          and to correct errors, inaccuracies, or omissions at any time without
          prior notice.
        </p>
        <h3>Prices Policy</h3>
        <p>
          The Company reserves the right to revise its prices at any time
          prior to accepting an Order.
        </p>
        <h3>Payments</h3>
        <p>
          Payments due to the Company through the Service — including franchise
          fees, renewal fees, training fees and payments for Orders — are
          collected through Razorpay, a third-party payment gateway, and can be
          made through the payment methods it supports, such as UPI, credit or
          debit cards and net banking.
        </p>
        <p>
          Payment cards (credit cards or debit cards) are subject to validation
          checks and authorization by Your card issuer. If we do not receive
          the required authorization, We will not be liable for any delay or
          non-delivery of Your Order.
        </p>
        <p>
          All fees and prices are stated in Indian Rupees (INR). Applicable
          taxes, including GST, are charged as indicated at the time of
          payment.
        </p>
      </section>

      <section>
        <h2>Franchise and Training Fees</h2>
        <p>
          Franchise fees, renewal fees and training fees payable through the
          Service are governed by the franchise agreement or training terms
          executed between You and the Company. Except as expressly provided in
          Our <Link href="/refund-policy">Refund Policy</Link> or the
          applicable agreement, such fees are non-refundable once the
          corresponding agreement has been activated or training access has
          been granted.
        </p>
      </section>

      <section>
        <h2>Refunds and Cancellations</h2>
        <p>
          Refunds of payments made through the Service are governed by Our{" "}
          <Link href="/refund-policy">Refund Policy</Link>, and cancellation of
          Orders and services by Our{" "}
          <Link href="/cancellation-policy">Cancellation Policy</Link>. Both
          form part of these Terms.
        </p>
      </section>

      <section>
        <h2>Content You Provide</h2>
        <p>
          Our Service allows You to submit documents, photographs, signatures
          and other materials (&ldquo;Content&rdquo;) in connection with
          franchise applications, agreements, student records and related
          requests. You are responsible for the Content that You submit to the
          Service, including its legality, reliability, and appropriateness.
        </p>
        <p>
          By submitting Content to the Service, You grant Us the right and
          license to use, reproduce, store and display such Content on and
          through the Service for the purpose of operating and providing the
          Service. You retain any and all of Your rights to any Content You
          submit on or through the Service and You are responsible for
          protecting those rights.
        </p>
        <p>
          You represent and warrant that: (i) the Content is Yours (You own
          it) or You have the right to use it and grant Us the rights and
          license as provided in these Terms, and (ii) the submission of Your
          Content on or through the Service does not violate the privacy
          rights, publicity rights, copyrights, contract rights or any other
          rights of any person.
        </p>
      </section>

      <section>
        <h2>Content Backups</h2>
        <p>
          Although regular backups of Content are performed, the Company does
          not guarantee there will be no loss or corruption of data.
        </p>
        <p>
          Corrupt or invalid backup points may be caused by, without
          limitation, Content that is corrupted prior to being backed up or
          that changes during the time a backup is performed.
        </p>
        <p>
          The Company will provide support and attempt to troubleshoot any
          known or discovered issues that may affect the backups of Content.
          But You acknowledge that the Company has no liability related to the
          integrity of Content or the failure to successfully restore Content
          to a usable state.
        </p>
        <p>
          You agree to maintain a complete and accurate copy of any Content in
          a location independent of the Service.
        </p>
      </section>

      <section>
        <h2>Intellectual Property</h2>
        <p>
          The Service and its original content (excluding Content provided by
          You or other users), features and functionality are and will remain
          the exclusive property of the Company and its licensors. The Service
          is protected by copyright, trademark, and other laws of both the
          Country and foreign countries. Our trademarks and trade dress may not
          be used in connection with any product or service without the prior
          written consent of the Company.
        </p>
        <p>
          Course curricula, training materials, certificates, kit designs and
          other materials made available through the Service are the property
          of the Company and may be used only as permitted under Your agreement
          with the Company.
        </p>
      </section>

      <section>
        <h2>Links to Other Websites</h2>
        <p>
          Our Service may contain links to third-party web sites or services
          that are not owned or controlled by the Company.
        </p>
        <p>
          The Company has no control over, and assumes no responsibility for,
          the content, privacy policies, or practices of any third party web
          sites or services. You further acknowledge and agree that the
          Company shall not be responsible or liable, directly or indirectly,
          for any damage or loss caused or alleged to be caused by or in
          connection with the use of or reliance on any such content, goods or
          services available on or through any such web sites or services.
        </p>
        <p>
          We strongly advise You to read the terms and conditions and privacy
          policies of any third-party web sites or services that You visit.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          We may terminate or suspend Your Account immediately, without prior
          notice or liability, for any reason whatsoever, including without
          limitation if You breach these Terms and Conditions.
        </p>
        <p>
          Upon termination, Your right to use the Service will cease
          immediately. Termination of a franchise agreement or training
          arrangement is governed by the terms of that agreement.
        </p>
      </section>

      <section>
        <h2>Limitation of Liability</h2>
        <p>
          Notwithstanding any damages that You might incur, the entire
          liability of the Company and any of its suppliers under any provision
          of these Terms and Your exclusive remedy for all of the foregoing
          shall be limited to the amount actually paid by You through the
          Service in respect of the transaction giving rise to the claim.
        </p>
        <p>
          To the maximum extent permitted by applicable law, in no event shall
          the Company or its suppliers be liable for any special, incidental,
          indirect, or consequential damages whatsoever (including, but not
          limited to, damages for loss of profits, loss of data or other
          information, for business interruption, for personal injury, loss of
          privacy arising out of or in any way related to the use of or
          inability to use the Service, third-party software and/or third-party
          hardware used with the Service, or otherwise in connection with any
          provision of these Terms), even if the Company or any supplier has
          been advised of the possibility of such damages and even if the
          remedy fails of its essential purpose.
        </p>
      </section>

      <section>
        <h2>&ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; Disclaimer</h2>
        <p>
          The Service is provided to You &ldquo;AS IS&rdquo; and &ldquo;AS
          AVAILABLE&rdquo; and with all faults and defects without warranty of
          any kind. To the maximum extent permitted under applicable law, the
          Company, on its own behalf and on behalf of its affiliates and its
          and their respective licensors and service providers, expressly
          disclaims all warranties, whether express, implied, statutory or
          otherwise, with respect to the Service, including all implied
          warranties of merchantability, fitness for a particular purpose,
          title and non-infringement, and warranties that may arise out of
          course of dealing, course of performance, usage or trade practice.
        </p>
        <p>
          Without limitation to the foregoing, the Company provides no
          warranty or undertaking, and makes no representation of any kind
          that the Service will meet Your requirements, achieve any intended
          results, be compatible or work with any other software,
          applications, systems or services, operate without interruption,
          meet any performance or reliability standards or be error free or
          that any errors or defects can or will be corrected.
        </p>
      </section>

      <section>
        <h2>Governing Law</h2>
        <p>
          The laws of the Country, excluding its conflicts of law rules, shall
          govern these Terms and Your use of the Service. Subject to the
          Disputes Resolution section below, the courts at Chennai, Tamil Nadu
          shall have exclusive jurisdiction over any dispute arising out of or
          in connection with these Terms.
        </p>
      </section>

      <section>
        <h2>Disputes Resolution</h2>
        <p>
          If You have any concern or dispute about the Service, You agree to
          first try to resolve the dispute informally by contacting the
          Company.
        </p>
      </section>

      <section>
        <h2>Severability and Waiver</h2>
        <h3>Severability</h3>
        <p>
          If any provision of these Terms is held to be unenforceable or
          invalid, such provision will be changed and interpreted to
          accomplish the objectives of such provision to the greatest extent
          possible under applicable law and the remaining provisions will
          continue in full force and effect.
        </p>
        <h3>Waiver</h3>
        <p>
          Except as provided herein, the failure to exercise a right or to
          require performance of an obligation under these Terms shall not
          affect a party&apos;s ability to exercise such right or require such
          performance at any time thereafter nor shall the waiver of a breach
          constitute a waiver of any subsequent breach.
        </p>
      </section>

      <section>
        <h2>Changes to These Terms and Conditions</h2>
        <p>
          We reserve the right, at Our sole discretion, to modify or replace
          these Terms at any time. If a revision is material We will make
          reasonable efforts to provide at least 30 days&apos; notice prior to
          any new terms taking effect. What constitutes a material change will
          be determined at Our sole discretion.
        </p>
        <p>
          By continuing to access or use Our Service after those revisions
          become effective, You agree to be bound by the revised terms. If You
          do not agree to the new terms, in whole or in part, please stop
          using the website and the Service.
        </p>
      </section>

      <LegalContactSection intro="If you have any questions about these Terms and Conditions, You can contact us:" />
    </LegalArticle>
  );
}
