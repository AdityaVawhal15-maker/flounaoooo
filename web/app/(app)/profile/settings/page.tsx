"use client";

import { useEffect, useState } from "react";
import { Wallet, Bell, Languages } from "lucide-react";
import { api } from "@/lib/api";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  disablePush,
  enablePush,
  getSubscriptionState,
} from "@/lib/push";
import { useI18n } from "@/components/i18n/I18nContext";
import { LANGUAGES } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/cn";

// Local-only preferences (no server effect yet).
const LOCAL_SETTINGS = [
  { key: "email", label: "Email updates", subtitle: "Receipts and announcements" },
  { key: "tips", label: "Smart suggestions", subtitle: "AI picks based on your orders" },
];

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [values, setValues] = useState<Record<string, boolean>>({
    email: true,
    tips: true,
  });
  const [pushState, setPushState] = useState<
    "loading" | "unsupported" | "denied" | "subscribed" | "default"
  >("loading");
  const [pushBusy, setPushBusy] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetSaved, setBudgetSaved] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ budgetPaise: number | null }>("/api/users/budget")
      .then((d) => {
        if (d.budgetPaise !== null) setBudgetInput(String(d.budgetPaise / 100));
      })
      .catch(() => {});
    getSubscriptionState()
      .then(setPushState)
      .catch(() => setPushState("unsupported"));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    try {
      if (pushState === "subscribed") {
        await disablePush();
        setPushState("default");
      } else {
        const result = await enablePush();
        setPushState(result === "subscribed" ? "subscribed" : result === "denied" ? "denied" : pushState);
      }
    } finally {
      setPushBusy(false);
    }
  }

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
    <SubPage title={t("profile.settings")}>
      {/* Language */}
      <Card className="mb-4">
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <Languages size={15} className="text-accent" /> {t("settings.language")}
        </p>
        <p className="mt-1 text-[12px] text-cocoa">{t("settings.languageSub")}</p>
        <div className="mt-3 flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={
                l.code === lang
                  ? "flex-1 rounded-pill border border-accent bg-accent-soft px-3 py-2 text-[13px] font-semibold text-accent"
                  : "flex-1 rounded-pill border border-line bg-card px-3 py-2 text-[13px] text-cocoa hover:bg-beige/40"
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Budget Guardian */}
      <Card className="mb-4">
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
          <Wallet size={15} className="text-accent" /> {t("settings.budgetTitle")}
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

      {/* Push notifications — real Web Push subscription */}
      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-beige/70">
            <Bell size={16} className="text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink">{t("settings.pushTitle")}</p>
            <p className="text-[12px] text-cocoa">
              {pushState === "unsupported"
                ? "Not supported in this browser"
                : pushState === "denied"
                  ? "Blocked — enable in browser settings"
                  : "Order updates and live offers"}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={pushState === "subscribed"}
            aria-label="Push notifications"
            disabled={
              pushBusy || pushState === "unsupported" || pushState === "denied" || pushState === "loading"
            }
            onClick={togglePush}
            className={cn(
              "h-6 w-11 rounded-full p-0.5 transition-colors disabled:opacity-50",
              pushState === "subscribed" ? "bg-accent" : "bg-line",
            )}
          >
            <span
              className={cn(
                "block size-5 rounded-full bg-white shadow transition-transform",
                pushState === "subscribed" && "translate-x-5",
              )}
            />
          </button>
        </div>
      </Card>

      <Card className="p-0">
        {LOCAL_SETTINGS.map((s, i) => (
          <div
            key={s.key}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5",
              i < LOCAL_SETTINGS.length - 1 && "border-b border-line/70",
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
