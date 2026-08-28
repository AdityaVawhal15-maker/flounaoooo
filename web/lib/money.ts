// en-IN groups by lakh/crore (12,34,567), not western thousands
// (1,234,567) — the two diverge above 99,999, so a generic formatter would
// get amounts like a laptop's price wrong for exactly the market this app
// targets.
const formatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function rupees(paise: number): string {
  return `₹${formatter.format(paise / 100)}`;
}
