import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LegalPage } from "@/components/legal/LegalPage";
import {
  CONTACTS,
  POLICY_EFFECTIVE,
  POLICY_INDEX,
  POLICY_VERSION,
  REGISTERED_ADDRESS,
} from "@/lib/legal/meta";

export const metadata: Metadata = {
  title: "Policies",
  description: "Every Algorithec policy that applies when you use Flouna.",
};

// The index the policies themselves point at, both from the app and from the
// site footer. Its job is to make sure that "where do I read the terms" never
// ends at a search box.

export default function LegalIndexPage() {
  return (
    <LegalPage title="Policies" updated={POLICY_EFFECTIVE}>
      <p>
        These are the policies that apply when you use Flouna. All of them apply
        together. Where two of them disagree, the stricter one governs, and
        nothing in any of them removes a right that Indian consumer or data
        protection law gives you.
      </p>

      <nav className="mt-6 space-y-2.5">
        {POLICY_INDEX.map((doc) => (
          <Link
            key={doc.slug}
            href={`/legal/${doc.slug}`}
            className="tap-target flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3.5 transition-colors hover:bg-beige/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-ink">{doc.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                {doc.blurb}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </Link>
        ))}
      </nav>

      <h2 className="mt-9 text-[18px] font-bold text-ink">Who to contact</h2>
      <div className="mt-3 -mx-1 overflow-x-auto pb-1">
        <table className="w-full min-w-[380px] border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-line px-2.5 py-2 text-left font-bold text-ink">
                What it is about
              </th>
              <th className="border-b border-line px-2.5 py-2 text-left font-bold text-ink">
                Where to write
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Anything at all", CONTACTS.support],
              ["A formal grievance", CONTACTS.grievance],
              ["Your data, or a privacy right", CONTACTS.privacy],
              ["A security problem", CONTACTS.security],
              ["An accessibility barrier", CONTACTS.accessibility],
              ["Legal notices", CONTACTS.legal],
            ].map(([what, where]) => (
              <tr key={where}>
                <td className="border-b border-line/60 px-2.5 py-2 align-top text-cocoa">
                  {what}
                </td>
                <td className="border-b border-line/60 px-2.5 py-2 align-top">
                  <a href={`mailto:${where}`} className="font-medium text-accent">
                    {where}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-9 text-[18px] font-bold text-ink">Registered office</h2>
      <address className="mt-2 not-italic text-[14px] leading-[1.7] text-cocoa">
        {REGISTERED_ADDRESS.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>

      <p className="mt-8 text-[12px] text-muted">
        Policy set version {POLICY_VERSION}, effective {POLICY_EFFECTIVE}. We
        give 30 days notice before a material change takes effect.
      </p>
    </LegalPage>
  );
}
