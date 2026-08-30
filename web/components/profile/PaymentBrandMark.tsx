// Brand marks for the saved-methods list.
//
// Drawn as inline SVG rather than shipped as logo files: the real trademarks
// aren't ours to bundle, and a vector stand-in stays sharp at any size and
// recolours with the theme. Each one keeps the brand's own colour so a card is
// recognisable at a glance, which is the entire job of this list.
export function PaymentBrandMark({
  type,
  label,
}: {
  type: "card" | "upi" | "wallet";
  label: string;
}) {
  const frame =
    "flex h-9 w-12 shrink-0 items-center justify-center rounded-[7px] border border-line bg-white";

  if (type === "card") {
    const brand = label.toLowerCase();
    if (brand === "mastercard") {
      return (
        <span className={frame} aria-hidden>
          <svg viewBox="0 0 40 24" className="h-5 w-8">
            <circle cx="16" cy="12" r="9" fill="#eb001b" />
            <circle cx="24" cy="12" r="9" fill="#f79e1b" fillOpacity="0.85" />
          </svg>
        </span>
      );
    }
    if (brand === "rupay") {
      return (
        <span className={frame} aria-hidden>
          <span className="text-[10px] font-extrabold tracking-tight">
            <span style={{ color: "#097d3e" }}>Ru</span>
            <span style={{ color: "#0d4a8f" }}>Pay</span>
          </span>
        </span>
      );
    }
    if (brand === "amex") {
      return (
        <span className={frame} aria-hidden>
          <span
            className="rounded-[3px] px-1.5 py-0.5 text-[8px] font-extrabold text-white"
            style={{ background: "#2e77bc" }}
          >
            AMEX
          </span>
        </span>
      );
    }
    return (
      <span className={frame} aria-hidden>
        <span
          className="text-[12px] font-extrabold italic tracking-tight"
          style={{ color: "#1a1f71" }}
        >
          VISA
        </span>
      </span>
    );
  }

  if (type === "upi") {
    // NPCI's mark: a heavy slanted grey wordmark with the arrowhead to its
    // RIGHT, not a navy wordmark with a device on the left. The head is two
    // overlapping right-pointing triangles, saffron behind green.
    return (
      <span className={frame} aria-hidden>
        <svg viewBox="0 0 62 22" className="h-4 w-10" role="img" aria-label="UPI">
          <text
            x="0"
            y="17.5"
            fontSize="19"
            fontWeight="800"
            fontFamily="Inter, Arial, system-ui, sans-serif"
            fill="#6D6E71"
            transform="skewX(-12)"
            style={{ letterSpacing: "-0.5px" }}
          >
            UPI
          </text>
          <polygon points="38,2 49,11 38,20" fill="#F58220" />
          <polygon points="44,2 55,11 44,20" fill="#0F9D58" />
        </svg>
      </span>
    );
  }

  // Wallets — the brand's own colour on a rounded tile.
  const wallet = label.toLowerCase();
  const bg = wallet.includes("phonepe")
    ? "#5f259f"
    : wallet.includes("amazon")
      ? "#ff9900"
      : wallet.includes("mobikwik")
        ? "#00509d"
        : "#00baf2"; // Paytm
  return (
    <span
      className="flex h-9 w-12 shrink-0 items-center justify-center rounded-[7px]"
      style={{ background: bg }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#fff" strokeWidth="2">
        <rect x="2" y="6" width="20" height="13" rx="2.5" />
        <path d="M2 10h20" />
        <circle cx="17.5" cy="14.5" r="1.4" fill="#fff" stroke="none" />
      </svg>
    </span>
  );
}
