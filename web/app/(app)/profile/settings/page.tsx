"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

// Stored locally for now; moves to user preferences on the API when
// notifications ship.
const SETTINGS = [
  { key: "push", label: "Push notifications", subtitle: "Order updates and offers" },
  { key: "email", label: "Email updates", subtitle: "Receipts and announcements" },
  { key: "tips", label: "Smart suggestions", subtitle: "AI picks based on your orders" },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, boolean>>({
    push: true,
    email: true,
    tips: true,
  });
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaved, setBudgetSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ budgetPaise: number | null }>("/api/users/budget")
      .then((d) => {
        if (d.budgetPaise !== null) setBudgetInput(String(d.budgetPaise / 100));
      })
      .catch(() => {});
  }, []);

  async function saveBudget(clear: boolean) {
    setBusy(true);
    setBudgetSaved("");
    try {
      const value = clear ? null : Number(budgetInput);
      if (!clear && (!Number.isInteger(value) || value! < 100)) {
        setBudgetSaved("Enter at least ₹100");
        return;
      }
      await api("/api/users/budget", {
        method: "PUT",
        json: { weeklyBudgetRupees: value },
      });
      if (clear) setBudgetInput("");
      setBudgetSaved(clear ? "Budget cleared" : "Budget saved");
    } catch (e) {
      setBudgetSaved(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubPage title="Settings">
      {/* Budget Guardian */}
      <Card className="mb-4">
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <Wallet size={15} className="text-accent" /> Weekly food budget
        </p>
        <p className="mt-1 text-[12px] text-cocoa">
          Radiues tracks your food spend Monday–Sunday and warns you before an
          order takes you over.
        </p>
        <div className="mt-3 flex items-end gap-2">
          <Input
            label="Budget (₹ per week)"
            inputMode="numeric"
            placeholder="e.g. 1500"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <Button size="md" disabled={busy || !budgetInput} onClick={() => saveBudget(false)}>
            Save
          </Button>
          <Button size="md" variant="secondary" disabled={busy} onClick={() => saveBudget(true)}>
            Clear
          </Button>
        </div>
        {budgetSaved && (
          <p className="mt-2 text-[12px] font-medium text-success">{budgetSaved}</p>
        )}
      </Card>

      <Card className="p-0">
        {SETTINGS.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5",
              i < SETTINGS.length - 1 && "border-b border-line/70",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">{s.label}</p>
              <p className="text-[12px] text-cocoa">{s.subtitle}</p>
            </div>
            <button
              role="switch"
              aria-checked={values[s.key]}
              aria-label={s.label}
              onClick={() => setValues((v) => ({ ...v, [s.key]: !v[s.key] }))}
              className={cn(
                "h-6 w-11 rounded-full p-0.5 transition-colors",
                values[s.key] ? "bg-accent" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "block size-5 rounded-full bg-white shadow transition-transform",
                  values[s.key] && "translate-x-5",
                )}
              />
            </button>
          </div>
        ))}
      </Card>
    </SubPage>
  );
}
