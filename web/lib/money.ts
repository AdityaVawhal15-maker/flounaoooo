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

/**
 * An estimate, to the nearest rupee.
 *
 * A predicted saving is not a price: it comes from a forecast, and "save
 * ₹276.36" claims a precision the forecast does not have. Exact amounts, an
 * invoice line or a fare, keep their paise through `rupees`.
 */
export function rupeesApprox(paise: number): string {
  return `₹${formatter.format(Math.round(paise / 100))}`;
}
