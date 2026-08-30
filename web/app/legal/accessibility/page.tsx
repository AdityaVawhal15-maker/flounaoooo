import type { Metadata } from "next";
import { LegalPage, H2 } from "@/components/legal/LegalPage";
import { CONTACTS, POLICY_EFFECTIVE } from "@/lib/legal/meta";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "Where Flouna meets WCAG 2.1 Level AA today, where it does not yet, and how to tell us about a barrier.",
};

// Written by hand rather than generated, because the accessibility policy is a
// statement of intent and this is a statement of fact. The policy says what we
// aim for; this says where we actually are, including the parts we fail.
//
// Publishing the failures is the point. An accessibility statement that lists
// only successes tells a disabled user nothing they can act on, and WCAG's own
// guidance on statements asks for known limitations. Someone who cannot read
// low-contrast text needs to know that before they hit it in the middle of
// paying for food, not after.

export default function AccessibilityPage() {
  return (
    <LegalPage title="Accessibility Statement" updated={POLICY_EFFECTIVE}>
      <p>
        Algorithec wants Flouna to be usable by everyone, including people who
        use a screen reader, navigate by keyboard, need larger text, or cannot
        rely on colour. We build to{" "}
        <b>WCAG 2.1 Level AA</b> as our target standard.
      </p>
      <p>
        We are <b>not fully conformant</b> with that standard today. This page
        says where we stand, because a statement that lists only what works is
        not useful to anyone deciding whether they can rely on this app.
      </p>

      <H2>What works today</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li>Every screen can be operated by keyboard, with a visible focus ring and no keyboard traps.</li>
        <li>Interactive controls meet the 44 by 44 pixel minimum touch target.</li>
        <li>Text resizes to 200 per cent without loss of content or function, and the layout reflows to a single column.</li>
        <li>Form fields have real labels and error messages tied to the field they belong to, not only to a summary at the foot of the form.</li>
        <li>Images that carry meaning have alternative text, and decorative ones are hidden from assistive technology.</li>
        <li>Colour is never the only way information is conveyed. Order states, price changes and errors all carry text or an icon as well.</li>
        <li>A dark theme is available, and the app follows the setting your device already has.</li>
        <li>Motion is limited, and nothing moves or auto-advances without your input.</li>
      </ul>

      <H2>Known gaps</H2>
      <p>
        These are the barriers we know about. Each one is being worked on, and
        this list is updated as they close rather than when a release ships.
      </p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <b>Contrast on the brand accent.</b> Our orange sits below the 4.5 to 1
          minimum against white for body-sized text. It is used mainly for
          large text, icons and buttons, where the threshold is lower, but there
          are places it falls short. Resolving it means either changing the
          brand colour or restricting where it may be used, and that decision is
          in progress.
        </li>
        <li>
          <b>The map.</b> Live tracking is a visual map. Every trip detail it
          shows, driver, vehicle, status and estimated arrival, is also written
          out in text beside it, but the map itself is not usable by screen
          reader and panning it needs a pointer.
        </li>
        <li>
          <b>Voice input.</b> Speech recognition uses the browser engine and is
          far more accurate in English than in the other five languages we
          support. Every voice control has a typed equivalent.
        </li>
        <li>
          <b>Charts.</b> Savings and price history are drawn as charts. The
          underlying numbers are available as text, but the charts themselves
          carry no structured description yet.
        </li>
        <li>
          <b>Language coverage.</b> The app is available in six languages, but
          some newer screens are English only. Where a translation is missing
          the English is shown rather than a blank.
        </li>
        <li>
          <b>No formal audit.</b> We test accessibility on every release across
          three screen widths and both themes, but no independent accessibility
          audit has been carried out.
        </li>
      </ul>

      <H2>How we test</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li>Keyboard-only walkthrough of every screen before a release.</li>
        <li>Automated contrast checking across all screens in both themes.</li>
        <li>Screen reader spot checks using the platform reader on iOS and Android.</li>
        <li>Layout checks at 320, 768 and 1280 pixels wide, and at 200 per cent zoom.</li>
      </ul>

      <H2>Tell us about a barrier</H2>
      <p>
        If something here stopped you, we want to hear about it, and we would
        rather hear about it early than not at all. Tell us what you were trying
        to do and what got in the way.
      </p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          Email{" "}
          <a href={`mailto:${CONTACTS.accessibility}`} className="font-medium text-accent">
            {CONTACTS.accessibility}
          </a>
        </li>
        <li>
          Phone{" "}
          <a href={`tel:${CONTACTS.phone.replace(/\s/g, "")}`} className="font-medium text-accent">
            {CONTACTS.phone}
          </a>
          , Monday to Friday, 10am to 6pm IST
        </li>
        <li>Or open Help in the app and choose Accessibility</li>
      </ul>
      <p>
        We aim to reply within two working days. If a barrier is stopping you
        from completing an order, say so and we will complete it for you while
        the underlying problem is fixed.
      </p>
    </LegalPage>
  );
}
