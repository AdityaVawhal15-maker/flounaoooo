"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Phone, Mail, Headset } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

// Figma "Contact Us": a reassurance card, then Get in Touch with three ways to
// reach the team.
//
// Contact details are the real ones from the design frame. The chat card starts
// a genuine conversation rather than linking somewhere — that is the difference
// between this screen working and merely existing.

const SUPPORT_PHONE_DISPLAY = "+91 7396144250";
const SUPPORT_PHONE = "+917396144250";
const SUPPORT_EMAIL = "info@algorithec.com";
const SUPPORT_HOURS = "9:00 AM - 9:00 PM";

export default function ContactUsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [starting, setStarting] = useState(false);

  async function startChat() {
    setStarting(true);
    try {
      const d = await api<{ chat: { id: string } }>("/api/support/chats", {
        method: "POST",
        json: {},
      });
      router.push(`/profile/help/chat/${d.chat.id}`);
    } catch {
      toast("Could not start a chat just now");
      setStarting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-acct-bg">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 lg:max-w-[780px] lg:px-6">
        <div className="flex items-center py-4">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="tap-target flex size-9 shrink-0 items-center justify-center rounded-full bg-card shadow-soft transition-colors hover:bg-acct-bg"
          >
            <ArrowLeft size={18} className="text-acct-ink" />
          </button>
          <h1 className="flex-1 pr-9 text-center text-[17px] font-extrabold text-acct-ink">
            Contact Us
          </h1>
        </div>

        <div className="rounded-[18px] bg-card px-5 py-7 text-center shadow-soft">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-acct-tint">
            <Headset size={30} className="text-acct-accent" />
          </span>
          <p className="mt-4 text-[20px] font-extrabold text-acct-ink">
            We&apos;re here to help!
          </p>
          <p className="mt-1.5 text-[13px] text-acct-muted">
            Reach out to us for any queries or issues.
          </p>
        </div>

        <p className="mb-2 mt-6 px-1 text-[16px] font-extrabold text-acct-ink">
          Get in Touch
        </p>

        <div className="flex flex-col gap-3">
          {/* Chat */}
          <div className="rounded-[18px] bg-card p-5 text-center shadow-soft">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-igm-tint">
              <MessageSquare size={22} className="text-igm-accent" />
            </span>
            <p className="mt-3 text-left text-[15px] font-bold text-acct-ink">
              Chat with us
            </p>
            <p className="text-left text-[12px] text-acct-muted">
              Chat live with our support team
            </p>
            <button
              onClick={startChat}
              disabled={starting}
              className="mt-3 h-10 rounded-pill bg-acct-tint px-6 text-[14px] font-bold text-acct-accent transition-colors hover:bg-acct-accent/15 disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start Chat"}
            </button>
          </div>

          {/* Phone */}
          <div className="rounded-[18px] bg-card p-5 text-center shadow-soft">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
              <Phone size={22} className="text-success" />
            </span>
            <p className="mt-3 text-left text-[15px] font-bold text-acct-ink">Call us</p>
            <p className="text-left text-[13px] font-semibold text-acct-accent">
              {SUPPORT_PHONE_DISPLAY}
            </p>
            <p className="text-left text-[12px] text-acct-muted">{SUPPORT_HOURS}</p>
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="mt-3 inline-flex h-10 items-center rounded-pill bg-success-soft px-6 text-[14px] font-bold text-success transition-opacity hover:opacity-90"
            >
              Call Now
            </a>
          </div>

          {/* Email */}
          <div className="rounded-[18px] bg-card p-5 text-center shadow-soft">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-soft">
              <Mail size={22} className="text-warning" />
            </span>
            <p className="mt-3 text-left text-[15px] font-bold text-acct-ink">Email us</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="block text-left text-[13px] font-semibold text-igm-accent hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="text-left text-[12px] text-acct-muted">
              We&apos;ll reply within 24 hours
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex h-10 items-center rounded-pill bg-warning-soft px-6 text-[14px] font-bold text-warning transition-opacity hover:opacity-90"
            >
              Send Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
