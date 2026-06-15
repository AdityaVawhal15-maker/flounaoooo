import { CardSkeleton } from "@/components/ui/Skeleton";

// Shown while an app route's data loads — a calm skeleton instead of a blank
// screen during navigation.
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-beige/70" />
      <div className="mt-6 flex flex-col gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
