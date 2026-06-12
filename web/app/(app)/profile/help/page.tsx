"use client";

import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const FAQS = [
  {
    q: "How does Radiues pick the best option?",
    a: "We compare the final effective price (item + delivery − offers), delivery or pickup time, and ratings across platforms, then recommend the single best choice — with alternatives if you'd rather optimise for speed.",
  },
  {
    q: "Where do my orders actually get placed?",
    a: "ONDC orders are placed directly inside Radiues. For partner platforms, we hand you over to their checkout with the offers pre-applied.",
  },
  {
    q: "How do refunds work?",
    a: "Payments are processed securely via Cashfree. Refunds for cancelled orders return to your original payment method within 5–7 business days.",
  },
  {
    q: "Is my data safe?",
    a: "Yes — your password is stored hashed, sessions use secure cookies, and we never sell your personal data.",
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SubPage title="Help desk">
      <div className="flex flex-col gap-2.5">
        {FAQS.map((f, i) => (
          <Card key={i} className="p-0">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex-1 text-[14px] font-semibold text-ink">{f.q}</span>
              <ChevronDown
                size={16}
                className={cn("shrink-0 text-cocoa transition-transform", open === i && "rotate-180")}
              />
            </button>
            {open === i && (
              <p className="px-4 pb-4 text-[13px] leading-relaxed text-cocoa">{f.a}</p>
            )}
          </Card>
        ))}
      </div>

      <a
        href="mailto:support@radiues.app"
        className="mt-5 flex items-center justify-center gap-2 rounded-pill border border-line bg-card py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-beige/40"
      >
        <Mail size={16} className="text-accent" /> Contact support
      </a>
    </SubPage>
  );
}
