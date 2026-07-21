"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, Mail, LifeBuoy, CheckCircle2, Send } from "lucide-react";
import { api, ApiClientError } from "@/lib/api";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const FAQS = [
  {
    q: "How does Radiues pick the best option?",
    a: "We compare the final effective price (item + delivery − offers), delivery or pickup time, and ratings across platforms, then recommend the single best choice — with alternatives if you'd rather optimise for speed.",
  },
  {
    q: "Where do my orders actually get placed?",
    a: "Right inside Radiues — you order and pay here, and we route it to the restaurant or mobility partner fulfilling it. You never leave the app.",
  },
  {
    q: "How do refunds work?",
    a: "Payments are processed securely via Cashfree. Refunds for cancelled orders return to your original payment method within 5–7 business days.",
  },
  {
    q: "Is my data safe?",
    a: "Yes — your password is stored hashed, sessions use secure cookies, and we never sell your personal data.",
  },
];

const CATEGORIES = [
  { key: "order", label: "Order issue" },
  { key: "payment", label: "Payment" },
  { key: "refund", label: "Refund" },
  { key: "account", label: "Account" },
  { key: "other", label: "Other" },
] as const;

type Ticket = {
  id: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderSummary = { id: string; title: string; createdAt: string };

const STATUS_BADGE: Record<Ticket["status"], { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-accent-soft text-accent" },
  in_progress: { label: "In progress", cls: "bg-beige text-cocoa" },
  resolved: { label: "Resolved", cls: "bg-success/10 text-success" },
  closed: { label: "Closed", cls: "bg-line text-muted" },
};

export default function HelpPage() {
  return (
    <Suspense fallback={null}>
      <HelpInner />
    </Suspense>
  );
}

function HelpInner() {
  const prefillOrder = useSearchParams().get("order") ?? "";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openTicket, setOpenTicket] = useState<string | null>(null);

  // Form state. When arriving via "Report an issue" on an order, the order is
  // pre-linked and the category defaults to "order".
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["key"]>(
    prefillOrder ? "order" : "other",
  );
  const [orderId, setOrderId] = useState(prefillOrder);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function loadTickets() {
    api<{ tickets: Ticket[] }>("/api/users/tickets")
      .then((d) => setTickets(d.tickets))
      .catch(() => setTickets([]));
  }

  useEffect(() => {
    loadTickets();
    api<{ orders: OrderSummary[] }>("/api/orders")
      .then(async (d) => {
        let list = d.orders.slice(0, 10);
        // Deep-linked from "Report an issue" on an order that's older than the
        // top-10 slice: resolve it so the dropdown shows it as selected instead
        // of silently displaying the placeholder.
        if (prefillOrder && !list.some((o) => o.id === prefillOrder)) {
          const linked = await api<{ order: OrderSummary }>(`/api/orders/${prefillOrder}`)
            .then((r) => r.order)
            .catch(() => null);
          if (linked) list = [linked, ...list];
        }
        setOrders(list);
      })
      .catch(() => setOrders([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await api("/api/users/tickets", {
        method: "POST",
        json: {
          category,
          subject,
          body,
          ...(orderId ? { orderId } : {}),
        },
      });
      setSent(true);
      setSubject("");
      setBody("");
      loadTickets();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't send — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubPage title="Help & support">
      {/* Raise a ticket */}
      <Card>
        <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <LifeBuoy size={15} className="text-accent" /> Raise a ticket
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-cocoa">
          Tell us what went wrong — refund and payment issues are treated as high
          priority. You&apos;ll see replies here.
        </p>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3.5">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  "rounded-pill px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                  category === c.key
                    ? "bg-cocoa text-white"
                    : "border border-line bg-card text-cocoa hover:bg-beige/40",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Optional order link */}
          {orders.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-cocoa">
                About an order (optional)
              </span>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="h-12 w-full rounded-pill border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-accent"
              >
                <option value="">Not about a specific order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title} · {new Date(o.createdAt).toLocaleDateString("en-IN")}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Input
            label="Subject"
            placeholder="Short summary, e.g. Wrong item delivered"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            minLength={3}
            maxLength={140}
            required
          />

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-cocoa">
              What happened?
            </span>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Give us the details so we can fix it fast."
              className="w-full resize-none rounded-card border border-line bg-card px-4 py-3 text-[14px] leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
            />
          </label>

          {error && <p className="text-[13px] text-danger">{error}</p>}
          {sent && (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-success">
              <CheckCircle2 size={15} /> Ticket raised — we&apos;ll get back to you here.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || subject.trim().length < 3 || body.trim().length < 5}
            className="flex h-12 items-center justify-center gap-2 rounded-pill bg-cocoa text-[14px] font-semibold text-white transition-colors hover:bg-ink disabled:opacity-50"
          >
            <Send size={15} /> {busy ? "Sending…" : "Submit ticket"}
          </button>
        </form>
      </Card>

      {/* My tickets */}
      {tickets.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2.5 text-[14px] font-bold text-ink">My tickets</h2>
          <div className="flex flex-col gap-2.5">
            {tickets.map((t) => {
              const badge = STATUS_BADGE[t.status] ?? STATUS_BADGE.open;
              const expanded = openTicket === t.id;
              return (
                <Card key={t.id} className="p-0">
                  <button
                    onClick={() => setOpenTicket(expanded ? null : t.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">
                        {t.subject}
                      </p>
                      <p className="mt-0.5 text-[11px] capitalize text-muted">
                        {t.category} ·{" "}
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold",
                        badge.cls,
                      )}
                    >
                      {badge.label}
                    </span>
                    <ChevronDown
                      size={15}
                      className={cn(
                        "shrink-0 text-cocoa transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>
                  {expanded && (
                    <div className="border-t border-line px-4 py-3.5">
                      {t.resolution ? (
                        <>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-success">
                            Support reply
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-ink">
                            {t.resolution}
                          </p>
                        </>
                      ) : (
                        <p className="text-[13px] text-cocoa">
                          Our team is on it — the reply will appear here.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* FAQs */}
      <h2 className="mb-2.5 mt-6 text-[14px] font-bold text-ink">FAQs</h2>
      <div className="flex flex-col gap-2.5">
        {FAQS.map((f, i) => (
          <Card key={i} className="p-0">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex-1 text-[14px] font-semibold text-ink">{f.q}</span>
              <ChevronDown
                size={16}
                className={cn(
                  "shrink-0 text-cocoa transition-transform",
                  openFaq === i && "rotate-180",
                )}
              />
            </button>
            {openFaq === i && (
              <p className="px-4 pb-4 text-[13px] leading-relaxed text-cocoa">{f.a}</p>
            )}
          </Card>
        ))}
      </div>

      <a
        href="mailto:support@radiues.app"
        className="mt-5 flex items-center justify-center gap-2 rounded-pill border border-line bg-card py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-beige/40"
      >
        <Mail size={16} className="text-accent" /> Contact support
      </a>
    </SubPage>
  );
}
