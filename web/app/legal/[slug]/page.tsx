import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/LegalPage";
import { PolicyBody } from "@/components/legal/PolicyBody";
import { POLICY_DOCUMENTS } from "@/lib/legal/documents";
import { correct } from "@/lib/legal/corrections";
import { POLICY_EFFECTIVE } from "@/lib/legal/meta";

// One route for the whole published policy set.
//
// Written as a single dynamic route rather than five near-identical pages so
// that adding a policy is a matter of adding the document, and so no policy can
// end up with a page that renders differently from its neighbours. Every one is
// prerendered, so this is still static HTML at request time.

export function generateStaticParams() {
  return POLICY_DOCUMENTS.map((d) => ({ slug: d.slug }));
}

// Nothing outside the generated set can be requested into existence.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = POLICY_DOCUMENTS.find((d) => d.slug === slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.description };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = POLICY_DOCUMENTS.find((d) => d.slug === slug);
  if (!found) notFound();

  const doc = correct(found);
  return (
    <LegalPage title={doc.title} updated={POLICY_EFFECTIVE}>
      <PolicyBody blocks={doc.blocks} />
    </LegalPage>
  );
}
