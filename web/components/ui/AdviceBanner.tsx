import { Clock3, TrendingDown, CloudRain } from "lucide-react";
import { cn } from "@/lib/cn";

export type Advice = {
  action: "order_now" | "wait";
  message: string;
  expectedSavingPaise?: number;
  waitMinutes?: number;
  contextNote?: string;
};

// Timing-engine banner: orange "worth waiting" vs green "good time".
export function AdviceBanner({
  advice,
  className,
}: {
  advice: Advice;
  className?: string;
}) {
  const wait = advice.action === "wait";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-card border px-3.5 py-3",
        wait
          ? "border-accent/40 bg-accent-soft/60"
          : "border-success/30 bg-success-soft",
        className,
      )}
    >
      {wait ? (
        <TrendingDown size={16} className="mt-0.5 shrink-0 text-accent" />
      ) : (
        <Clock3 size={16} className="mt-0.5 shrink-0 text-success" />
      )}
      <div className="min-w-0">
        <p
          className={cn(
            "text-[12px] font-bold uppercase tracking-wide",
            wait ? "text-accent" : "text-success",
          )}
        >
          {wait ? "Worth waiting?" : "Good time"}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink">
          {advice.message}
        </p>
        {advice.contextNote && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-cocoa">
            <CloudRain size={13} className="mt-0.5 shrink-0 text-accent" />
            {advice.contextNote}
          </p>
        )}
      </div>
    </div>
  );
}
