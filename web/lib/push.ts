// Browser-side Web Push helpers: register the service worker, subscribe the
// user, and tear down. All no-ops gracefully where push is unsupported.
import { api } from "./api";

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  // Allocate a plain ArrayBuffer-backed view so it satisfies BufferSource.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getSubscriptionState(): Promise<
  "unsupported" | "denied" | "subscribed" | "default"
> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "subscribed" : "default";
}

export async function enablePush(): Promise<
  "subscribed" | "denied" | "unsupported" | "unavailable"
> {
  if (!pushSupported()) return "unsupported";

  const { enabled, publicKey } = await api<{
    enabled: boolean;
    publicKey: string | null;
  }>("/api/notifications/vapid");
  if (!enabled || !publicKey) return "unavailable";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToBytes(publicKey),
  });

  const json = sub.toJSON();
  await api("/api/notifications/subscribe", {
    method: "POST",
    json: { endpoint: sub.endpoint, keys: json.keys },
  });
  return "subscribed";
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/api/notifications/unsubscribe", {
    method: "POST",
    json: { endpoint: sub.endpoint },
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
