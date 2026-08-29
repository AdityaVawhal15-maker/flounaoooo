// Biometric Lock (Privacy & Security).
//
// This is an APP LOCK, not a login factor, and the distinction decides the
// whole design. The fingerprint or face check is performed by the device's own
// platform authenticator through WebAuthn; a successful assertion means "the
// person holding this device passed its biometric check", which is exactly what
// a screen lock needs to know. It is deliberately NOT treated as authentication
// to the server: the session cookie still does that, and nothing here can grant
// access that the password and session did not already grant.
//
// What the server stores is only which devices have the lock armed, so the
// setting survives a reinstall and can be switched off from another device. The
// credential id also lives here in localStorage, because unlocking has to work
// before any network call and the credential is meaningless on another device.

const CREDENTIAL_KEY = "flouna.deviceLock.credentialId";
const UNLOCKED_KEY = "flouna.deviceLock.unlockedAt";

/** How long one unlock lasts before the app asks again. */
const UNLOCK_TTL_MS = 15 * 60 * 1000;

function bufferToBase64Url(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage — the lock simply won't persist.
  }
}

export function isDeviceLockSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    !!navigator.credentials
  );
}

/** Is this specific device armed? */
export function hasDeviceLock() {
  return !!safeGet(CREDENTIAL_KEY);
}

/**
 * Registers this device's platform authenticator and returns the credential id
 * to store server-side. The challenge is random and never verified server-side
 * on purpose: see the note at the top — a signature check would only matter if
 * this were authenticating to the server, which it explicitly is not.
 */
export async function registerDeviceLock(userEmail: string, userName: string) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Flouna" },
      user: { id: userId, name: userEmail, displayName: userName },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        // The point of the feature: the lock must be this device's own
        // fingerprint/face, not a roaming security key.
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("No credential was created");

  const credentialId = bufferToBase64Url(credential.rawId);
  safeSet(CREDENTIAL_KEY, credentialId);
  safeSet(UNLOCKED_KEY, String(Date.now()));
  return credentialId;
}

/**
 * Asks the device to verify the person. Resolves true only on a successful
 * assertion; a cancel or a failure resolves false so the caller keeps the app
 * locked rather than treating an error as permission.
 */
export async function verifyDeviceLock() {
  const credentialId = safeGet(CREDENTIAL_KEY);
  if (!credentialId || !isDeviceLockSupported()) return false;

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          { type: "public-key", id: base64UrlToBuffer(credentialId) },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    if (!assertion) return false;
    safeSet(UNLOCKED_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/** True while a recent unlock is still valid. */
export function isUnlocked() {
  const at = Number(safeGet(UNLOCKED_KEY) ?? 0);
  return Number.isFinite(at) && Date.now() - at < UNLOCK_TTL_MS;
}

export function lockNow() {
  try {
    localStorage.removeItem(UNLOCKED_KEY);
  } catch {
    // Nothing to do — an unreadable store means nothing was remembered.
  }
}

export function forgetDeviceLock() {
  try {
    localStorage.removeItem(CREDENTIAL_KEY);
    localStorage.removeItem(UNLOCKED_KEY);
  } catch {
    // As above.
  }
}
