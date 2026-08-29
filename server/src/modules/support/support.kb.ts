// The Help Centre's knowledge base.
//
// Every entry is an issue this product can genuinely have — they were written
// against what the code actually does (cancellation windows, refund timelines,
// the complaint flow, the wallet ledger), not lifted from a generic support
// template. Anything the app cannot do yet says so plainly rather than
// promising a resolution that will never arrive.
//
// `match` is the intent detector. It is deliberately keyword-based rather than
// a model: a support surface must give the same answer to the same question
// every time, must work with no API key configured, and must never be
// steerable by a customer typing instructions at it.

export type SupportTopic = {
  slug: string;
  /** Section on the Help Centre screen. */
  group: "orders" | "rides" | "payments" | "account" | "offers";
  title: string;
  summary: string;
  /** Full answer shown on the article screen. */
  article: string[];
  /** Lower-cased keywords; any hit selects this topic. */
  keywords: string[];
  /**
   * Whether answering this well needs the customer's own data. The bot pulls
   * the relevant order/refund/complaint when true.
   */
  needsOrder?: boolean;
  /** Issues that always end with a human, however the chat goes. */
  alwaysEscalate?: boolean;
};

export const SUPPORT_TOPICS: SupportTopic[] = [
  // ---------- orders ----------
  {
    slug: "order-late",
    group: "orders",
    title: "My order is late",
    summary: "Track a delayed order and see what to do next",
    keywords: ["late", "delay", "delayed", "slow", "taking long", "not arrived yet", "where is my order", "where's my order", "eta"],
    needsOrder: true,
    article: [
      "Open the order from History to see its live stage. Once a delivery partner picks it up, the tracking screen shows their position and a revised arrival time.",
      "Deliveries run late most often at peak hours and in heavy rain. If the order has not moved for more than 15 minutes past the estimate, raise a complaint from the order screen and the seller has to respond.",
      "If the order never arrives at all, use \"Order not received\" in Need Help. That opens a formal complaint with a tracked resolution time, which a chat message alone does not.",
    ],
  },
  {
    slug: "order-not-received",
    group: "orders",
    title: "My order never arrived",
    summary: "Report a missing delivery and start a refund",
    keywords: ["never arrived", "not received", "didn't arrive", "did not arrive", "missing order", "no delivery", "marked delivered"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "Report it from the order's Need Help screen using \"Order not received\". That raises a complaint with an ID you can track, and the seller is required to respond.",
      "If the order was marked delivered but nothing reached you, say so in the description. Photographs of the door or gate help, and you can attach one.",
      "Where a refund is agreed, it goes back to the original payment method. Bank timelines are 3 to 5 working days once processed.",
    ],
  },
  {
    slug: "wrong-or-missing-items",
    group: "orders",
    title: "Wrong or missing items",
    summary: "Something in the bag was wrong or absent",
    keywords: ["wrong item", "missing item", "wrong order", "items missing", "incomplete", "not what i ordered", "different item"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "Use \"Wrong item delivered\" from the order's Need Help screen and attach a photo of what arrived. Photographs settle these fastest because the seller can see the mistake immediately.",
      "Partial refunds are possible: a resolution can cover only the items affected rather than the whole order.",
      "Report it the same day. Sellers routinely decline claims raised days later because the evidence is gone.",
    ],
  },
  {
    slug: "food-quality",
    group: "orders",
    title: "Food quality or spillage",
    summary: "The food arrived damaged, cold or spoiled",
    keywords: ["spilled", "spilt", "cold food", "stale", "quality", "damaged", "leaked", "bad food", "spoiled", "smell"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "Raise \"Item damaged\" from the order's Need Help screen with a photo. Quality claims without a photo are usually refused by the seller.",
      "Do not eat anything you suspect is spoiled. If you have already fallen ill, say so in the complaint, since that changes how it is prioritised.",
      "Repeat quality problems from one restaurant affect its standing in Flouna's recommendations, so reporting them changes what you get shown later.",
    ],
  },
  {
    slug: "cancel-order",
    group: "orders",
    title: "Cancel an order",
    summary: "When you can cancel and what it costs",
    keywords: ["cancel", "cancellation", "stop my order", "cancel order", "cancel my order"],
    needsOrder: true,
    article: [
      "Food orders can be cancelled up until the delivery partner picks them up. After that the restaurant has already cooked and packed, so the app refuses the cancellation.",
      "Rides can be cancelled while the driver is still on the way.",
      "A cancellation fee may apply once the restaurant has started cooking. Where money has already been taken, cancelling starts the refund automatically.",
    ],
  },
  {
    slug: "cancellation-fee",
    group: "orders",
    title: "I was charged a cancellation fee",
    summary: "Dispute a fee you think is wrong",
    keywords: ["cancellation fee", "charged for cancelling", "cancel charge", "penalty", "why was i charged"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "A fee applies when the restaurant had already begun preparing your food, or when a driver had already travelled to the pickup.",
      "If you cancelled because the restaurant or driver was unreachable, or the wait had already run far past the estimate, the fee is disputable.",
      "Raise it as a complaint against the order so the fee and the timeline are examined together.",
    ],
  },

  // ---------- rides ----------
  {
    slug: "book-a-ride",
    group: "rides",
    title: "How to book a ride",
    summary: "Booking, comparing fares and confirming a trip",
    keywords: ["book a ride", "book ride", "how to book", "cab", "auto", "bike ride", "taxi"],
    article: [
      "Open Rides, set your pickup and destination, and Flouna compares fares across the providers it supports before you commit.",
      "Pick the option you want and confirm. The driver's details and vehicle number appear once the trip is assigned.",
      "Turning on Share My Location in Privacy and Security lets the pickup fill itself in; without it you set the pickup by hand.",
    ],
  },
  {
    slug: "ride-fare-dispute",
    group: "rides",
    title: "I was overcharged for a ride",
    summary: "Fare higher than the estimate",
    keywords: ["overcharged", "fare", "too expensive", "charged more", "wrong fare", "surge", "meter"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "Estimates move with distance, waiting time and demand. A longer route than quoted, or a long wait at pickup, both raise the final fare.",
      "If the gap is large or the route makes no sense, raise a complaint against the trip and attach what you expected to pay.",
      "The invoice on the trip breaks down the fare, which is the fastest way to see where the difference came from.",
    ],
  },
  {
    slug: "lost-item-in-ride",
    group: "rides",
    title: "I left something in the vehicle",
    summary: "Recover a lost item from a trip",
    keywords: ["lost", "left my", "forgot my", "left behind", "lost item", "phone in cab", "bag in cab"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "Report it as soon as you notice. The sooner the driver is contacted, the more likely the item is still in the vehicle.",
      "Flouna does not publish drivers' phone numbers. Support passes the request on rather than handing over their contact details.",
      "Have the trip and a description of the item ready, since that is what the driver is asked to check for.",
    ],
  },
  {
    slug: "driver-behaviour",
    group: "rides",
    title: "A problem with my driver",
    summary: "Report unsafe or unacceptable behaviour",
    keywords: ["driver", "rude", "unsafe", "behaviour", "behavior", "harassment", "misconduct", "dangerous driving", "drunk"],
    needsOrder: true,
    alwaysEscalate: true,
    article: [
      "Report it against the specific trip. Safety reports are prioritised above everything else in the queue.",
      "If you are in immediate danger, contact the police on 112 first. Support is not an emergency service.",
      "Reports are recorded against the driver with the provider, and repeated reports affect whether they keep taking trips.",
    ],
  },

  // ---------- payments ----------
  {
    slug: "payment-failed-money-deducted",
    group: "payments",
    title: "Payment failed but money was deducted",
    summary: "Money left your account and no order appeared",
    keywords: ["payment failed", "money deducted", "debited", "deducted but", "no order", "money gone", "failed payment"],
    alwaysEscalate: true,
    article: [
      "This is almost always a hold rather than a charge. When a payment does not complete, the bank releases the amount on its own, typically within 3 to 5 working days.",
      "Check History first. If an order was in fact created, the payment did go through and there is nothing to recover.",
      "If the money has not returned after 5 working days, raise it with the bank reference from your statement and it will be traced with the gateway.",
    ],
  },
  {
    slug: "double-charge",
    group: "payments",
    title: "I was charged twice",
    summary: "Two debits for one order",
    keywords: ["charged twice", "double charge", "duplicate", "two payments", "charged 2 times", "twice"],
    alwaysEscalate: true,
    article: [
      "Compare the two entries in your statement. A pending hold and a settled charge often look identical for a day or two but only one will settle.",
      "If both settle and only one order exists, the duplicate is refunded to the original method.",
      "Have both reference numbers ready, since the gateway is traced on those rather than on the order number.",
    ],
  },
  {
    slug: "refund-status",
    group: "payments",
    title: "Where is my refund?",
    summary: "Check a refund and how long it takes",
    keywords: ["refund", "money back", "refund status", "not refunded", "refund pending", "when will i get"],
    needsOrder: true,
    article: [
      "Refunds go back to the method you paid with. Flouna releases them immediately; the bank then takes 3 to 5 working days to post the credit.",
      "A refund agreed through a complaint appears on that complaint's tracking screen, with its own status.",
      "Card refunds are slower than UPI as a rule. If nothing has arrived after 5 working days, it is worth raising.",
    ],
  },
  {
    slug: "invoice-gst",
    group: "payments",
    title: "I need an invoice or GST bill",
    summary: "Download the bill for an order",
    keywords: ["invoice", "bill", "gst", "receipt", "tax", "reimbursement"],
    needsOrder: true,
    article: [
      "Every completed order has an invoice on its order screen, which you can save or share.",
      "The invoice shows the full breakdown: items, delivery, taxes and any discount applied.",
      "GST details belong to the restaurant or the mobility provider rather than to Flouna, so their number appears on the invoice, not ours.",
    ],
  },

  // ---------- offers ----------
  {
    slug: "coupon-not-applied",
    group: "offers",
    title: "My coupon did not apply",
    summary: "A code was refused at checkout",
    keywords: ["coupon", "promo", "code not working", "offer not applied", "discount not applied", "voucher", "promo code"],
    article: [
      "Most refusals are the minimum order value. The offer card states the minimum, and the subtotal has to clear it before delivery and taxes.",
      "Some codes are first-order only, and some only apply to food or only to rides.",
      "Applying a code from Offers and Rewards saves it for your next checkout, where the discount is recalculated on the server before the order is placed.",
    ],
  },
  {
    slug: "cashback-missing",
    group: "offers",
    title: "My cashback has not arrived",
    summary: "Rewards balance looks wrong",
    keywords: ["cashback", "wallet", "balance", "reward", "points", "credit missing", "rewards"],
    article: [
      "Cashback is credited when an order completes, not when you pay for it. An order still in progress has not earned anything yet.",
      "Reward History lists every credit and debit, and the balance is the sum of exactly those lines, so anything unexpected can be traced to the order that caused it.",
      "Cancelled orders earn nothing.",
    ],
  },

  // ---------- account ----------
  {
    slug: "otp-not-received",
    group: "account",
    title: "I did not get my code",
    summary: "The sign-in or verification code never arrived",
    keywords: ["otp", "code not received", "verification code", "didn't get code", "no code", "cant login", "can't log in", "login"],
    article: [
      "Check spam and promotions. Codes expire after 10 minutes, so request a fresh one rather than reusing an old message.",
      "Codes go to the address on the account. If that address is wrong, support has to change it after verifying who you are.",
      "Too many wrong attempts locks sign-in briefly. Waiting a few minutes clears it.",
    ],
  },
  {
    slug: "change-contact",
    group: "account",
    title: "Change my email or phone",
    summary: "Update the contact details on your account",
    keywords: ["change email", "change phone", "update number", "wrong email", "new number", "change mobile"],
    article: [
      "Your phone number can be changed under Personal Information. Changing it clears its verified status until you confirm the new one.",
      "The sign-in email cannot be changed in the app yet, because it needs re-verification the profile screen cannot perform. Support changes it after confirming your identity.",
      "Keep at least one contact route current, since account recovery depends on it.",
    ],
  },
  {
    slug: "delete-account",
    group: "account",
    title: "Delete my account",
    summary: "Close the account and remove your data",
    keywords: ["delete account", "close account", "remove my data", "deactivate", "erase", "gdpr"],
    alwaysEscalate: true,
    article: [
      "Deletion is permanent. Order history, saved addresses, payment methods and any rewards balance go with it and cannot be restored.",
      "Anything owed to you should be settled first, since a deleted account cannot receive a refund.",
      "Records that tax or consumer protection law requires us to retain are kept for the statutory period, then deleted.",
    ],
  },
  {
    slug: "privacy-and-security",
    group: "account",
    title: "Privacy and security settings",
    summary: "Two-factor, biometric lock, blocking and sessions",
    keywords: ["privacy", "security", "two factor", "2fa", "biometric", "fingerprint", "block", "sessions", "logged in", "password"],
    article: [
      "Two-Factor Authentication adds an emailed code to every password sign-in. Turning it on proves you control the mailbox first.",
      "Biometric Lock holds the app behind your device's own fingerprint or face check, on that device.",
      "Login Activity lists every active session and can end any of them, which is the first thing to do if you think someone else has your password.",
    ],
  },
];

export function topicBySlug(slug: string) {
  return SUPPORT_TOPICS.find((t) => t.slug === slug) ?? null;
}

/**
 * Picks the best topic for a free-text message.
 *
 * Scores on how much of the keyword actually appears, so a specific phrase
 * ("payment failed") outranks a single loose word ("payment") that several
 * topics share.
 */
export function matchTopic(text: string): SupportTopic | null {
  const hay = text.toLowerCase();
  let best: { topic: SupportTopic; score: number } | null = null;

  for (const topic of SUPPORT_TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (hay.includes(kw)) score = Math.max(score, kw.length);
    }
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  return best?.topic ?? null;
}

/** Free-text search for the Help Centre's search field. */
export function searchTopics(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return SUPPORT_TOPICS;
  return SUPPORT_TOPICS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.includes(q) || q.includes(k)),
  );
}
