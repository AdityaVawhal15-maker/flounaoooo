"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Copy,
  Check,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { GroupCart } from "@/components/food/GroupCartTypes";
import type { FoodQuote } from "@/components/chat/types";

const REFRESH_MS = 5000;

export default function GroupCartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [cart, setCart] = useState<GroupCart | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodQuote[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<GroupCart>(`/api/groups/${id}`)
      .then(setCart)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  // Poll so members see each other's additions live.
  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Dish search scoped to the cart's platform.
  const platform = cart?.platform;
  useEffect(() => {
    const term = query.trim();
    const t = setTimeout(
      () => {
        if (!term || !platform) {
          setResults([]);
          return;
        }
        api<{ quotes: FoodQuote[] }>(`/api/food/search?q=${encodeURIComponent(term)}`)
          .then((d) => setResults(d.quotes.filter((q) => q.platform === platform)))
          .catch(() => setResults([]));
      },
      term ? 250 : 0,
    );
    return () => clearTimeout(t);
  }, [query, platform]);

  async function addItem(dishId: string) {
    setBusy(true);
    try {
      const updated = await api<GroupCart>(`/api/groups/${id}/items`, {
        method: "POST",
        json: { dishId },
      });
      setCart(updated);
      setQuery("");
      setResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add item");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    const updated = await api<GroupCart>(`/api/groups/${id}/items/${itemId}`, {
      method: "DELETE",
    }).catch(() => null);
    if (updated) setCart(updated);
  }

  async function checkout() {
    setBusy(true);
    try {
      const { orderId } = await api<{ orderId: string }>(
        `/api/groups/${id}/checkout`,
        { method: "POST" },
      );
      router.push(`/pay/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order");
      setBusy(false);
    }
  }

  async function shareCode() {
    if (!cart) return;
    const text = `Join my Radiues group order — code ${cart.code}`;
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(cart.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!cart) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-[14px] text-cocoa">{error || "Loading…"}</p>
      </div>
    );
  }

  const ordered = cart.status === "ordered";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 lg:px-6">
      <button
        onClick={() => router.push("/food")}
        className="flex items-center gap-1 text-[13px] font-medium text-cocoa hover:text-ink"
      >
        <ChevronLeft size={16} /> Food
      </button>

      <h1 className="mt-3 flex items-center gap-2 text-[20px] font-bold text-ink">
        <Users size={20} className="text-accent" /> Group order
      </h1>

      {/* Join code */}
      <Card className="mt-4 bg-accent-soft/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-cocoa">Share this code to invite friends</p>
            <p className="mt-0.5 font-mono text-[26px] font-bold tracking-[0.3em] text-ink">
              {cart.code}
            </p>
          </div>
          <button
            onClick={shareCode}
            className="flex items-center gap-1.5 rounded-pill bg-accent px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#d4570f]"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </Card>

      {/* Add items */}
      {!ordered && (
        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-pill border border-line bg-card px-4 py-2.5">
            <Search size={16} className="text-cocoa/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add your items…"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-cocoa/50"
            />
          </div>
          {results.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {results.map((q) => (
                <Card key={`${q.dishId}-${q.platform}`} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink">{q.name}</p>
                      <p className="text-[12px] text-cocoa">{rupees(q.effectivePaise)}</p>
                    </div>
                    <button
                      onClick={() => addItem(q.dishId)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-pill bg-accent px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#d4570f] disabled:opacity-50"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live cart */}
      <h2 className="mt-6 text-[14px] font-bold text-ink">
        Everyone&apos;s items ({cart.items.length})
      </h2>
      <div className="mt-2 flex flex-col gap-2">
        {cart.items.length === 0 && (
          <p className="py-4 text-center text-[13px] text-cocoa">
            No items yet — add yours above.
          </p>
        )}
        {cart.items.map((item) => (
          <Card key={item.id} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">
                  {item.name}
                  {item.qty > 1 && <span className="text-cocoa"> ×{item.qty}</span>}
                </p>
                <p className="text-[12px] text-cocoa">
                  {item.isYou ? "You" : item.memberName} · {rupees(item.pricePaise * item.qty)}
                </p>
              </div>
              {item.isYou && !ordered && (
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  className="rounded-full p-1.5 text-cocoa/60 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Split summary */}
      {cart.members.length > 0 && (
        <Card className="mt-5">
          <p className="text-[14px] font-bold text-ink">Split equally</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {cart.members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-[13px]">
                <span className="text-cocoa">
                  {m.isYou ? "You" : m.name}
                </span>
                <span className="text-ink">{rupees(m.subtotalPaise)} ordered</span>
              </div>
            ))}
          </div>
          <div className="my-2 h-px bg-line" />
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-cocoa">Total</span>
            <span className="font-bold text-ink">{rupees(cart.totalPaise)}</span>
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="font-semibold text-ink">
              Each pays ({cart.members.length} people)
            </span>
            <span className="font-bold text-accent">{rupees(cart.equalSplitPaise)}</span>
          </div>
        </Card>
      )}

      {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

      {/* Host checkout */}
      {ordered ? (
        <Button
          onClick={() => cart.orderId && router.push(`/orders/${cart.orderId}`)}
          className="mt-5 w-full"
        >
          View order
        </Button>
      ) : cart.isHost ? (
        <Button
          onClick={checkout}
          disabled={busy || cart.items.length === 0}
          className="mt-5 w-full"
        >
          Place group order · {rupees(cart.totalPaise)}
        </Button>
      ) : (
        <p className="mt-5 text-center text-[13px] text-cocoa">
          Waiting for the host to place the order…
        </p>
      )}
    </div>
  );
}
