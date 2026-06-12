"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Smartphone, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { rupees } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Status = {
  orderStatus: string;
  amount: number;
  title: string;
  domain: "food" | "ride";
  payment: { status: string; method: string | null } | null;
};

type Stage = "select" | "processing" | "done";

declare global {
  interface Window {
    Cashfree?: (config: { mode: string }) => {
      checkout: (opts: { paymentSessionId: string; redirectTarget: string }) => void;
    };
  }
}

export default function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [status, setStatus] = useState<Status | null>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Status>(`/api/payments/status/${orderId}`)
      .then((s) => {
        setStatus(s);
        if (s.orderStatus !== "pending_payment") setStage("done");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [orderId]);

  async function pay() {
    setError("");
    setStage("processing");
    try {
      const d = await api<{
        mode: "cashfree" | "simulated";
        paymentSessionId?: string;
        cfEnv?: string;
      }>("/api/payments/checkout", { method: "POST", json: { orderId } });

      if (d.mode === "cashfree" && d.paymentSessionId) {
        // Real gateway: hand off to Cashfree's hosted checkout.
        await loadCashfreeSdk();
        window.Cashfree?.({ mode: d.cfEnv === "production" ? "production" : "sandbox" }).checkout({
          paymentSessionId: d.paymentSessionId,
          redirectTarget: "_self",
        });
        return;
      }

      // Simulated mode: show the processing state, then confirm server-side.
      await new Promise((r) => setTimeout(r, 2200));
      await api("/api/payments/simulate", {
        method: "POST",
        json: { orderId, method },
      });
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
      setStage("select");
    }
  }

  if (!status) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <p className="text-[14px] text-cocoa">{error || "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 lg:py-14">
      {/* Total fare row — per Figma payments sheet */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[12px] text-cocoa">
              {status.domain === "food" ? "Total amount" : "Total fare"}
            </p>
            <p className="truncate text-[13px] text-cocoa">{status.title}</p>
          </div>
          <p className="text-[22px] font-bold text-ink">{rupees(status.amount)}</p>
        </div>
      </Card>

      {stage === "select" && (
        <>
          <h2 className="mt-6 text-[15px] font-bold text-ink">Pay using</h2>
          <div className="mt-3 flex flex-col gap-2">
            <MethodRow
              active={method === "upi"}
              onClick={() => setMethod("upi")}
              icon={<Smartphone size={18} className="text-accent" />}
              title="UPI"
              subtitle="GPay, PhonePe, Paytm & more"
            />
            <MethodRow
              active={method === "card"}
              onClick={() => setMethod("card")}
              icon={<CreditCard size={18} className="text-cocoa" />}
              title="Card"
              subtitle="Credit or debit card"
            />
          </div>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
          <Button onClick={pay} className="mt-6 w-full">
            Pay {rupees(status.amount)}
          </Button>
        </>
      )}

      {stage === "processing" && (
        <div className="mt-14 flex flex-col items-center text-center">
          <span className="size-12 animate-spin rounded-full border-[3px] border-beige border-t-accent" />
          <p className="mt-5 text-[15px] font-semibold text-ink">
            Processing payment…
          </p>
          <p className="mt-1 text-[13px] text-cocoa">
            Don&apos;t close this screen
          </p>
        </div>
      )}

      {stage === "done" && (
        <div className="mt-12 flex flex-col items-center text-center">
          <CheckCircle2 size={56} className="text-success" />
          <p className="mt-4 text-[18px] font-bold text-ink">Payment completed</p>
          <p className="mt-1 text-[13px] text-cocoa">
            {status.domain === "food"
              ? "Your order is confirmed and being prepared."
              : "Your ride is confirmed — driver on the way."}
          </p>
          <div className="mt-8 flex w-full flex-col gap-3">
            <Link href={`/orders/${orderId}`} className="w-full">
              <Button className="w-full">
                {status.domain === "food" ? "Track order" : "Track ride"}
              </Button>
            </Link>
            <Link href={`/orders/${orderId}?invoice=1`} className="w-full">
              <Button variant="secondary" className="w-full">
                View invoice
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MethodRow({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <Card
        className={cn(
          "py-3 transition-colors",
          active && "border-accent/70 ring-1 ring-accent/30",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-beige/70">
            {icon}
          </span>
          <div>
            <p className="text-[14px] font-bold text-ink">{title}</p>
            <p className="text-[12px] text-cocoa">{subtitle}</p>
          </div>
          <span
            className={cn(
              "ml-auto size-4 rounded-full border-2",
              active ? "border-accent bg-accent" : "border-line",
            )}
          />
        </div>
      </Card>
    </button>
  );
}

function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load payment SDK"));
    document.head.appendChild(s);
  });
}
