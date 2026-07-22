import { cn } from "@/lib/cn";

// Shimmering placeholder for loading states.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[10px] bg-gradient-to-r from-beige/60 via-hairline to-beige/60",
        className,
      )}
    />
  );
}

// A card-shaped skeleton matching the dish/product card layout.
export function CardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-card border border-line/60 bg-card p-4 shadow-soft">
      <Skeleton className="size-12 shrink-0 rounded-tile" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-8 w-16 rounded-pill" />
    </div>
  );
}

// A stack of card placeholders — the shape a list takes while it loads, so the
// screen doesn't jump when real rows replace it.
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
