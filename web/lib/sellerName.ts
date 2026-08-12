// Consumer-facing seller labels. Users buy inside Flouna from ONDC-registered
// sellers — internal source identifiers never surface as third-party brand
// names. Unknown sources fall back to a generic seller label.
const SELLER_NAMES: Record<string, string> = {
  amazon: "MegaMart",
  flipkart: "ValueKart",
  croma: "TechCorner",
  myntra: "StyleHub",
};

export function sellerName(platform: string): string {
  return SELLER_NAMES[platform] ?? "Flouna seller";
}
