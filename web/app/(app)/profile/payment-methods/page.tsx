"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  CreditCard,
  Smartphone,
  Wallet,
  Trash2,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/Toast";

// Figma "Payment Methods" (2195:~1000): saved methods list, each row an icon
// tile, a label/detail pair, and either a Default badge or a chevron; a
// trailing "Add Payment Method" row; a security reassurance line at the foot.
//
// Deliberately not a card vault — see the PaymentMethod model's own comment.
// This never asks for a full card number or CVV, only what's needed to
// recognise a saved method in a list: brand, last 4, expiry. A UPI ID is a
// real identifier, so that one actually authenticates as entered.

type Method = {
  id: string;
  type: "card" | "upi" | "wallet";
  label: string;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  vpa: string | null;
  isDefault: boolean;
};

const CARD_BRANDS = ["Visa", "Mastercard", "Rupay", "Amex"] as const;
const BRAND_COLOR: Record<string, string> = {
  Visa: "bg-[#1a1f71]",
  Mastercard: "bg-gradient-to-br from-[#eb001b] to-[#f79e1b]",
  Rupay: "bg-[#0f7a3d]",
  Amex: "bg-[#2e77bc]",
};

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<"card" | "upi">("card");
  const [brand, setBrand] = useState<(typeof CARD_BRANDS)[number]>("Visa");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState(""); // MM/YY
  const [vpa, setVpa] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api<{ methods: Method[] }>("/api/users/payment-methods")
      .then((d) => setMethods(d.methods))
      .catch(() => setMethods([]));
  }
  useEffect(load, []);

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body =
        type === "card"
          ? (() => {
              const [mm, yy] = expiry.split("/").map((s) => s.trim());
              const expiryMonth = Number(mm);
              const expiryYear = Number(yy) < 100 ? 2000 + Number(yy) : Number(yy);
              if (!expiryMonth || !expiryYear || last4.length !== 4) {
                throw new Error("Enter the last 4 digits and expiry as MM/YY");
              }
              return { type, label: brand, last4, expiryMonth, expiryYear };
            })()
          : { type, label: "UPI ID", vpa: vpa.trim() };
      const d = await api<{ method: Method }>("/api/users/payment-methods", {
        method: "POST",
        json: body,
      });
      setMethods((m) => [...(m ?? []), d.method]);
      setAdding(false);
      setLast4("");
      setExpiry("");
      setVpa("");
      toast("Payment method added");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that method");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const prev = methods;
    setMethods((m) => m?.filter((x) => x.id !== id) ?? null);
    try {
      await api(`/api/users/payment-methods/${id}`, { method: "DELETE" });
    } catch {
      setMethods(prev ?? null);
      toast("Could not remove that method");
    }
  }

  async function setDefault(id: string) {
    const prev = methods;
    setMethods((m) => m?.map((x) => ({ ...x, isDefault: x.id === id })) ?? null);
    try {
      await api(`/api/users/payment-methods/${id}/default`, { method: "PATCH" });
    } catch {
      setMethods(prev ?? null);
      toast("Could not set that as default");
    }
  }

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center gap-3 py-5">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="rounded-full p-2 text-acct-ink transition-colors hover:bg-acct-ink/5"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-[18px] font-extrabold text-acct-ink">
            Payment Methods
          </h1>
          <button
            onClick={() => setAdding(true)}
            aria-label="Add payment method"
            className="rounded-full p-2 text-acct-accent transition-colors hover:bg-acct-accent/10"
          >
            <Plus size={22} />
          </button>
        </div>

        <p className="mb-2 px-1 text-[13px] font-semibold text-acct-muted">
          Saved Payment Methods
        </p>

        <div className="overflow-hidden rounded-[18px] bg-card shadow-soft">
          {methods === null ? (
            <div className="px-4 py-6 text-center text-[13px] text-acct-muted">
              Loading…
            </div>
          ) : methods.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-acct-muted">
              No payment methods saved yet
            </div>
          ) : (
            methods.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5",
                  i < methods.length - 1 && "border-b border-line",
                )}
              >
                {m.type === "card" ? (
                  <span
                    className={cn(
                      "flex h-8 w-11 shrink-0 items-center justify-center rounded-[6px] text-[9px] font-bold uppercase tracking-wide text-white",
                      BRAND_COLOR[m.label] ?? "bg-acct-accent",
                    )}
                  >
                    {m.label.slice(0, 4)}
                  </span>
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acct-tint text-acct-accent">
                    {m.type === "upi" ? <Smartphone size={17} /> : <Wallet size={17} />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-acct-ink">
                    {m.type === "card" ? `${m.label} •••• ${m.last4}` : m.label}
                  </span>
                  <span className="block truncate text-[12px] text-acct-muted">
                    {m.type === "card"
                      ? `Expires ${String(m.expiryMonth).padStart(2, "0")}/${String(m.expiryYear).slice(-2)}`
                      : m.vpa}
                  </span>
                </span>
                {m.isDefault ? (
                  <span className="shrink-0 rounded-pill bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => setDefault(m.id)}
                    className="shrink-0 text-[12px] font-semibold text-acct-accent hover:underline"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => remove(m.id)}
                  aria-label={`Remove ${m.label}`}
                  className="shrink-0 rounded-full p-1.5 text-acct-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}

          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-3 border-t border-line px-4 py-3.5 text-left transition-colors hover:bg-acct-bg"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acct-tint text-acct-accent">
              <Plus size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-acct-accent">
                Add Payment Method
              </span>
              <span className="block text-[12px] text-acct-muted">
                Add new card, UPI or wallet
              </span>
            </span>
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 px-1 text-center text-[12px] text-acct-muted">
          <ShieldCheck size={14} className="shrink-0 text-success" />
          Your payment information is secure
        </p>
      </div>

      {/* Add method sheet */}
      {adding && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center"
          onClick={() => !busy && setAdding(false)}
        >
          <div
            role="dialog"
            aria-label="Add payment method"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 lg:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-[16px] font-bold text-acct-ink">Add Payment Method</p>
              <button
                onClick={() => setAdding(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-acct-muted hover:bg-acct-bg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setType("card")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-pill border py-2 text-[13px] font-semibold",
                  type === "card"
                    ? "border-acct-accent bg-acct-tint text-acct-accent"
                    : "border-line text-acct-muted",
                )}
              >
                <CreditCard size={15} /> Card
              </button>
              <button
                type="button"
                onClick={() => setType("upi")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-pill border py-2 text-[13px] font-semibold",
                  type === "upi"
                    ? "border-acct-accent bg-acct-tint text-acct-accent"
                    : "border-line text-acct-muted",
                )}
              >
                <Smartphone size={15} /> UPI
              </button>
            </div>

            <form onSubmit={addMethod} className="mt-4 flex flex-col gap-3">
              {type === "card" ? (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] text-acct-muted">Card brand</span>
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value as (typeof CARD_BRANDS)[number])}
                      className="h-12 rounded-[12px] border border-line bg-acct-bg px-3.5 text-[15px] text-acct-ink outline-none focus:border-acct-accent"
                    >
                      {CARD_BRANDS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                  {/* Last 4 digits only, never a full PAN — this list exists
                      to recognise a method, not to charge it. */}
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] text-acct-muted">Last 4 digits</span>
                    <input
                      inputMode="numeric"
                      maxLength={4}
                      value={last4}
                      onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="4242"
                      className="h-12 rounded-[12px] border border-line bg-acct-bg px-3.5 text-[15px] text-acct-ink outline-none focus:border-acct-accent"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[12px] text-acct-muted">Expiry (MM/YY)</span>
                    <input
                      value={expiry}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d/]/g, "").slice(0, 5);
                        setExpiry(v);
                      }}
                      placeholder="12/28"
                      className="h-12 rounded-[12px] border border-line bg-acct-bg px-3.5 text-[15px] text-acct-ink outline-none focus:border-acct-accent"
                      required
                    />
                  </label>
                </>
              ) : (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-acct-muted">UPI ID</span>
                  <input
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    placeholder="name@bank"
                    className="h-12 rounded-[12px] border border-line bg-acct-bg px-3.5 text-[15px] text-acct-ink outline-none focus:border-acct-accent"
                    required
                  />
                </label>
              )}

              {error && (
                <p role="alert" className="text-[13px] text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 h-[52px] w-full rounded-pill bg-acct-accent text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Adding…" : "Add Payment Method"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
