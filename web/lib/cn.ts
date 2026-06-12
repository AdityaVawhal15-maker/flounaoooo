// Minimal class-name combiner — keeps us dependency-free for styling logic.
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
