"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { LoadingView, ErrorView } from "@/components/ui/StatusView";

type OrderDetail = {
  id: string;
  domain: "food" | "ride";
  status: string;
  provider: string;
  title: string;
  amount: number;
  savedPaise: number;
  createdAt: string;
  details: {
    basePaise?: number;
    deliveryFeePaise?: number;
    convenienceFeePaise?: number;
    offers?: { label: string; discountPaise: number }[];
    farePaise?: number;
    pickup?: string;
    drop?: string;
    restaurant?: string;
    name?: string;
    productName?: string;
  };
  payment: { status: string; method: string | null } | null;
};

// A stable, human invoice number derived from the order id + date — no schema
// change needed, and it's deterministic so the same order always shows the same
// number. Format: INV-YYYYMM-XXXXXX.
function invoiceNumber(order: OrderDetail): string {
  const d = new Date(order.createdAt);
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const tail = order.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `INV-${ym}-${tail}`;
}

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ order: OrderDetail }>(`/api/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (!order) {
    return error ? (
      <ErrorView
        notFound
        title="Invoice not found"
        message="We couldn't find this order's invoice."
        backHref="/history"
        backLabel="Back to History"
      />
    ) : (
      <LoadingView rows={4} />
    );
  }

  const dt = new Date(order.createdAt);
  const discount = order.details.offers?.reduce((s, o) => s + o.discountPaise, 0) ?? 0;
  const paid = order.payment?.status === "success" || order.status !== "pending_payment";
  const seller =
    order.details.restaurant ?? order.details.productName ?? order.provider.toUpperCase();

  // Line items for the itemized table.
  const lines: { label: string; value: number }[] = [];
  if (order.domain === "food") {
    lines.push({ label: order.details.name ?? order.title, value: order.details.basePaise ?? order.amount });
    if (order.details.deliveryFeePaise) lines.push({ label: "Delivery fee", value: order.details.deliveryFeePaise });
    if (order.details.convenienceFeePaise) lines.push({ label: "Convenience fee", value: order.details.convenienceFeePaise });
  } else {
    lines.push({ label: `${order.details.productName ?? "Ride"} · ${order.details.pickup ?? "pickup"} → ${order.details.drop ?? "drop"}`, value: order.details.farePaise ?? order.amount });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 lg:px-6">
      {/* Screen-only controls (hidden when printing) */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/orders/${order.id}`}
          className="flex items-center gap-1 text-[13px] font-medium text-cocoa hover:text-ink"
        >
          <ChevronLeft size={16} /> Order
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-cocoa px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ink"
        >
          <Printer size={15} /> Download / Print
        </button>
      </div>

      {/* The invoice document */}
      <div className="print-document rounded-card border border-line bg-white p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-[20px] font-bold tracking-tight text-ink">Radiues</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-cocoa">
              Algorithec Pvt Ltd
              <br />
              GSTIN: {/* placeholder until live */}—
              <br />
              support@radiues.app
            </p>
          </div>
          <div className="text-right">
            <p className="text-[15px] font-bold uppercase tracking-wide text-accent">
              Tax Invoice
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink">{invoiceNumber(order)}</p>
            <p className="text-[11px] text-cocoa">
              {dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            {paid && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase text-success">
                <CheckCircle2 size={12} /> Paid
              </span>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 py-5 text-[12px]">
          <div>
            <p className="font-semibold uppercase tracking-wide text-cocoa">Fulfilled by</p>
            <p className="mt-1 text-ink">{seller}</p>
            <p className="text-cocoa">
              via {order.provider.toUpperCase()} ·{" "}
              {order.domain === "food" ? "Food" : "Ride"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold uppercase tracking-wide text-cocoa">Order</p>
            <p className="mt-1 break-all font-mono text-[11px] text-ink">{order.id}</p>
            <p className="text-cocoa">
              {order.payment?.method ? order.payment.method.toUpperCase() : "—"}
            </p>
          </div>
        </div>

        {/* Itemized table */}
        <table className="w-full border-t border-line text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-cocoa">
              <th className="py-2 text-left font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-line/60">
                <td className="py-2 pr-3 text-ink">{l.label}</td>
                <td className="py-2 text-right text-ink">{rupees(l.value)}</td>
              </tr>
            ))}
            {discount > 0 && (
              <tr className="border-t border-line/60">
                <td className="py-2 pr-3 text-success">Offers &amp; discounts</td>
                <td className="py-2 text-right text-success">− {rupees(discount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line">
              <td className="py-3 text-[15px] font-bold text-ink">Total paid</td>
              <td className="py-3 text-right text-[15px] font-bold text-ink">
                {rupees(order.amount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {order.savedPaise > 0 && (
          <div className="mt-3 rounded-card bg-accent-soft/60 px-4 py-2.5 text-[12px] font-medium text-accent">
            You saved {rupees(order.savedPaise)} vs the next-best option — Radiues
            picked the smartest choice for you.
          </div>
        )}

        {/* Footer / tax note */}
        <p className="mt-6 border-t border-line pt-4 text-[10px] leading-relaxed text-muted">
          Amounts are inclusive of applicable taxes. This is a computer-generated
          invoice and does not require a signature. Radiues is an aggregator; the
          goods/services are supplied by the seller named above. For help, contact
          support@radiues.app.
        </p>
      </div>
    </div>
  );
}

// Print: show only the document, edge-to-edge, no app chrome.
