import Link from "next/link";
import { Loader2, TriangleAlert, SearchX } from "lucide-react";
import { CardSkeleton } from "@/components/ui/Skeleton";

// A small, consistent screen-state view: loading, error, or empty/not-found.
// Replaces ad-hoc `{error || "Loading…"}` patterns that can get stuck showing
// "Loading…" forever when a request actually failed.

export function LoadingView({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 lg:px-6">
      <div className="flex items-center gap-2 text-[13px] text-cocoa">
        <Loader2 size={15} className="animate-spin text-accent" /> Loading…
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ErrorView({
  title = "Something went wrong",
  message,
  backHref = "/home",
  backLabel = "Back to home",
  notFound = false,
}: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
  notFound?: boolean;
}) {
  const Icon = notFound ? SearchX : TriangleAlert;
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-[18px] bg-accent-soft">
        <Icon size={26} className="text-accent" />
      </span>
      <h1 className="mt-5 text-[18px] font-bold text-ink">{title}</h1>
      {message && (
        <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-cocoa">
          {message}
        </p>
      )}
      <Link
        href={backHref}
        className="mt-6 rounded-pill bg-ink px-6 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#2c1500]"
      >
        {backLabel}
      </Link>
    </div>
  );
}
