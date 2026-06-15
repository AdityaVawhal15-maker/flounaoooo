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
