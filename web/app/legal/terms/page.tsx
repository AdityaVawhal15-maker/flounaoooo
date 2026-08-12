import type { Metadata } from "next";
import { LegalPage, H2 } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Flouna.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="20 June 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the <b>Flouna</b> application
        and website (the &ldquo;Service&rdquo;), operated by <b>Algorithec Pvt Ltd</b>
        (&ldquo;Algorithec&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using
        Flouna, you agree to these Terms.
      </p>

      <H2>1. The Service</H2>
      <p>
        Flouna is an AI decision engine that helps you compare and choose the best options across
        food delivery, rides and shopping, and place orders through partner platforms and the ONDC
        network. Flouna acts as a technology platform that connects you with sellers, restaurants,
        ride providers and logistics partners.
      </p>

      <H2>2. Eligibility &amp; accounts</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li>You must be at least 18 years old (or have a guardian&rsquo;s consent) to use the Service.</li>
        <li>You are responsible for the accuracy of your account information and for keeping your login secure.</li>
        <li>You are responsible for activity that occurs under your account.</li>
      </ul>

      <H2>3. Orders, pricing &amp; payments</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li>Prices shown are computed at the time of your order and may change based on availability, offers and partner pricing.</li>
        <li>All amounts are in Indian Rupees (₹). Payments are processed securely by our payment partner.</li>
        <li>Once an order is confirmed and accepted by a seller/driver, cancellation and refund terms depend on the partner&rsquo;s policy and the stage of fulfilment.</li>
        <li>Flouna strives to show you the best effective price, but final fulfilment and delivery are carried out by the relevant partner.</li>
      </ul>

      <H2>4. Flouna Plus (subscription)</H2>
      <p>
        Flouna Plus is an optional paid subscription that unlocks additional benefits. Live tracking
        and core best-price recommendations remain free for all users. Subscription fees, billing cycle
        and cancellation are described at the point of purchase. You may cancel at any time; access
        continues until the end of the current billing period.
      </p>

      <H2>5. Acceptable use</H2>
      <p>You agree not to:</p>
      <ul className="ml-5 list-disc space-y-1">
        <li>Use the Service for unlawful purposes or to place fraudulent orders.</li>
        <li>Attempt to tamper with pricing, payments, or any part of the Service.</li>
        <li>Abuse offers, referrals or promotions.</li>
        <li>Disrupt, reverse-engineer, or attempt to gain unauthorised access to the Service.</li>
        <li>Misuse the AI assistant to generate harmful, illegal, or off-purpose content.</li>
      </ul>
      <p>We may suspend or terminate accounts that violate these Terms.</p>

      <H2>6. Third-party partners</H2>
      <p>
        Food, rides and products are provided by independent third parties (sellers, restaurants,
        drivers, logistics partners, and ONDC participants). Flouna is not responsible for the quality,
        safety, timing or legality of items and services provided by these partners, though we work to
        surface reliable, well-rated options.
      </p>

      <H2>7. AI recommendations</H2>
      <p>
        Flouna uses AI to understand your requests and present recommendations. Recommendations are
        provided in good faith to help you decide, but the final choice is yours. We do not guarantee
        any particular outcome.
      </p>

      <H2>8. Intellectual property</H2>
      <p>
        The Flouna name, logo, software and content are owned by Algorithec Pvt Ltd. You may not copy,
        modify or distribute them without our permission.
      </p>

      <H2>9. Limitation of liability</H2>
      <p>
        To the maximum extent permitted by law, Algorithec is not liable for indirect or consequential
        damages arising from your use of the Service or from the acts of third-party partners. Our total
        liability for any claim is limited to the amount you paid for the relevant order.
      </p>

      <H2>10. Changes &amp; termination</H2>
      <p>
        We may update these Terms or the Service from time to time. Continued use after changes means
        you accept the updated Terms. You may stop using the Service and close your account at any time.
      </p>

      <H2>11. Governing law</H2>
      <p>
        These Terms are governed by the laws of India. Any disputes are subject to the jurisdiction of
        the competent courts in India.
      </p>

      <H2>12. Contact</H2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href="mailto:support@flouna.app" className="font-medium text-accent">
          support@flouna.app
        </a>
        .
      </p>
    </LegalPage>
  );
}
