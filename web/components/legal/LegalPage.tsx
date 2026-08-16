import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FlounaLogo } from "@/components/brand/FlounaLogo";

// Shared shell for public legal pages (privacy, terms). Clean, readable,
// no auth required.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
          <Link
            href="/"
            aria-label="Home"
            className="rounded-full p-1.5 text-ink hover:bg-beige"
          >
            <ChevronLeft size={20} />
          </Link>
          <FlounaLogo size={28} className="text-ink" />
          <span className="text-[16px] font-bold text-ink">Flouna</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[12px] text-muted">Last updated: {updated}</p>
        <div className="legal mt-6 text-[14px] leading-relaxed text-cocoa">
          {children}
        </div>
        <footer className="mt-12 border-t border-line pt-5 text-[12px] text-muted">
          <p>Algorithec Pvt Ltd · Flouna</p>
          <p className="mt-1">
            Questions? Email{" "}
            <a href="mailto:support@flouna.app" className="font-medium text-accent">
              support@flouna.app
            </a>
          </p>
          <div className="mt-3 flex gap-4">
            <Link href="/legal/privacy" className="font-medium text-accent hover:underline">
              Privacy Policy
            </Link>
            <Link href="/legal/terms" className="font-medium text-accent hover:underline">
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

// Small heading + paragraph helpers so the pages read cleanly.
export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-7 text-[17px] font-bold text-ink">{children}</h2>;
}
