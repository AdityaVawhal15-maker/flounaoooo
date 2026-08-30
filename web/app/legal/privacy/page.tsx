import type { Metadata } from "next";
import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Flouna collects, uses and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="20 June 2026">
      <p>
        This Privacy Policy explains how <b>Algorithec Pvt Ltd</b> (&ldquo;Algorithec&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, shares and protects your information
        when you use the <b>Flouna</b> application and website (the &ldquo;Service&rdquo;). By using
        Flouna, you agree to the practices described here.
      </p>

      <H2>1. Information we collect</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li><b>Account information</b>, your name, email address, and (if provided) phone number, created when you sign up.</li>
        <li><b>Order &amp; transaction data</b>, the food, rides and products you order, prices, savings, and order history.</li>
        <li><b>Location data</b>, your device location, used only to set your pickup/delivery point and show nearby options, with your permission. You can deny or revoke this at any time in your device settings.</li>
        <li><b>Saved addresses</b>, addresses you choose to save (e.g. Home, Work).</li>
        <li><b>Payment data</b>, payments are processed by our payment partner (Cashfree). We do <b>not</b> store your full card or UPI credentials; we store only the payment status and a reference.</li>
        <li><b>Chat content</b>, the messages you send to the Flouna AI assistant, to provide recommendations and improve the Service.</li>
        <li><b>Usage &amp; device data</b>, anonymised information about how the app performs and where issues occur, to fix bugs and improve reliability.</li>
      </ul>

      <H2>2. How we use your information</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li>To provide the core Service, find and recommend the best options, place and track orders.</li>
        <li>To process payments and prevent fraud.</li>
        <li>To send you order updates and notifications you have opted into.</li>
        <li>To improve our AI recommendations, fix bugs, and keep the Service secure and reliable.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <H2>3. AI processing</H2>
      <p>
        To understand your requests, your chat messages may be processed by trusted AI providers
        (such as Anthropic Claude, Google Gemini, or DeepSeek). These providers process the message
        to return a result and are bound by their own data terms. We do not send them your payment
        details. The final recommendation logic and pricing are computed by Flouna itself.
      </p>

      <H2>4. How we share information</H2>
      <p>We share information only as needed to run the Service:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li><b>Fulfilment partners</b>, when you place an order, the details needed to fulfil it (e.g. delivery address, items) are shared with the relevant seller, restaurant, driver, or the ONDC network.</li>
        <li><b>Payment processor</b>, to complete your payment.</li>
        <li><b>Service providers</b>, maps, notifications, hosting and error-monitoring providers, under appropriate safeguards.</li>
        <li><b>Legal</b>, where required by law or to protect rights and safety.</li>
      </ul>
      <p>We do <b>not</b> sell your personal information.</p>

      <H2>5. Data security</H2>
      <p>
        We protect your data with industry-standard measures: encrypted secrets, secure
        (httpOnly) authentication cookies, server-side validation, access controls, and audit
        logging. No system is perfectly secure, but we work continually to safeguard your information.
      </p>

      <H2>6. Data retention</H2>
      <p>
        We keep your information for as long as your account is active or as needed to provide the
        Service and meet legal requirements. You may request deletion of your account and associated
        data (see below).
      </p>

      <H2>7. Your rights</H2>
      <p>You may:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Access and update your profile information in the app.</li>
        <li>Revoke location or notification permissions at any time.</li>
        <li>Request a copy of your data, or request that we delete your account and data, by emailing us.</li>
      </ul>

      <H2>8. Children</H2>
      <p>
        Flouna is not directed at children under 13, and we do not knowingly collect their data.
      </p>

      <H2>9. Changes to this policy</H2>
      <p>
        We may update this policy from time to time. We will revise the &ldquo;Last updated&rdquo;
        date above and, for significant changes, notify you in the app.
      </p>

      <H2>10. Contact</H2>
      <p>
        For any privacy questions or requests, contact us at{" "}
        <a href="mailto:support@flouna.app" className="font-medium text-accent">
          support@flouna.app
        </a>
        .
      </p>
    </LegalPage>
  );
}
