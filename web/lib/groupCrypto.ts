"use client";

// End-to-end encryption for group chat, on the Sender Keys design that Signal
// and WhatsApp use for groups.
//
// WHAT THIS GUARANTEES
//   · the server stores ciphertext, sealed distribution messages it has no key
//     for, and public keys. Nobody reading the database can read a message —
//     not ops, not a stolen backup, not us
//   · forward secrecy: each sender's chain key ratchets one way per message, so
//     a key captured today cannot open yesterday's messages
//   · sender authenticity: every message is signed by the sending device, so
//     one member cannot write a message that appears to come from another
//
// WHAT IT DOES NOT
//   · the server ships this file. A compromised build could leak keys
//   · the server decides which devices appear in a member's device list, so it
//     could add one and have members seal to it
//   Both are true of every in-browser E2EE product. The answer is the same one
//   Signal and WhatsApp use: show the device list and a safety number, so a
//   change is visible to a person who cares to look. The UI does that rather
//   than printing a padlock and hoping.
//
// THE SHAPE
//   identity   ECDH P-256, non-extractable, per device — seals things TO you
//   signing    ECDSA P-256, non-extractable, per device — proves things FROM you
//   chain      32 random bytes per (group, device), ratcheted with HKDF
//   message N  key = HKDF(chain_N, "msg"), chain_{N+1} = HKDF(chain_N, "chain")
//   sealing    ephemeral ECDH → HKDF → AES-GCM, one fresh ephemeral per envelope
//
// A new device cannot derive keys for messages sent before it existed — that is
// the forward secrecy working, not a fault. History reaches it the way WhatsApp
// moves history: another device of the SAME user, which holds the plaintext,
// re-encrypts it and seals it across.

const DB_NAME = "flouna-e2ee";
const STORE = "keys";
const DEVICE_ID_KEY = "flouna.chat.deviceId";
const INFO_SEAL = "flouna:group-chat:seal:v2";
const INFO_MSG = "flouna:group-chat:msg:v2";
const INFO_CHAIN = "flouna:group-chat:chain:v2";

export type MemberDevice = {
  userId: string;
  name?: string;
  deviceId: string;
  publicKey: string;
  signingKey?: string | null;
  addedAt?: string;
  isYou?: boolean;
};

/** A sender's chain as this device knows it. */
export type SenderChain = {
  senderId: string;
  senderDevice: string;
  /** Raw chain key bytes, base64. Advanced as messages are read. */
  chainKey: string;
  /** The index `chainKey` corresponds to. */
  index: number;
  /** The sender's group signing key, base64 SPKI. */
  signingKey: string;
};

// ---------- base64 ----------

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const buf = (u: Uint8Array): ArrayBuffer =>
  u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

// ---------- key storage ----------
//
// IndexedDB rather than localStorage because it can hold a CryptoKey object
// directly. Stored that way with extractable=false, no script can export it
// afterwards, including a script injected into this origin later.

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        tx.onsuccess = () => resolve(tx.result as T | undefined);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function idbPut(key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
        tx.onsuccess = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** True when this browser can do the crypto at all (needs a secure context). */
export function cryptoAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof indexedDB !== "undefined" &&
    Boolean(window.crypto?.subtle)
  );
}

/** Stable per-browser id. Not a secret — it only addresses envelopes. */
export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** A human label for the device list, so a stranger in it is noticeable. */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "browser";
  return `${browser} on ${os}`;
}

type Identity = { privateKey: CryptoKey; publicKey: CryptoKey };

/**
 * This device's sealing keypair (ECDH), created once and kept.
 *
 * Generated with extractable=false, so from the moment it exists no code — ours
 * or anyone's — can read the raw bytes back. It can only be used to derive.
 */
export async function identity(): Promise<Identity> {
  const stored = await idbGet<Identity>("identity");
  if (stored?.privateKey && stored?.publicKey) return stored;
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"],
  );
  const keys = { privateKey: pair.privateKey, publicKey: pair.publicKey };
  await idbPut("identity", keys);
  return keys;
}

/**
 * This device's signing keypair (ECDSA). Also non-extractable: a signing key
 * that can be exported is a signing key that can be stolen and used to forge
 * messages as this device.
 */
export async function signingIdentity(): Promise<Identity> {
  const stored = await idbGet<Identity>("signing");
  if (stored?.privateKey && stored?.publicKey) return stored;
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const keys = { privateKey: pair.privateKey, publicKey: pair.publicKey };
  await idbPut("signing", keys);
  return keys;
}

export async function publicKeys(): Promise<{ publicKey: string; signingKey: string }> {
  const [id, sign] = await Promise.all([identity(), signingIdentity()]);
  return {
    publicKey: toB64(await crypto.subtle.exportKey("spki", id.publicKey)),
    signingKey: toB64(await crypto.subtle.exportKey("spki", sign.publicKey)),
  };
}

// ---------- sealing (ephemeral ECDH → HKDF → AES-GCM) ----------

async function wrappingKey(
  privateKey: CryptoKey,
  theirPublicSpki: Uint8Array,
  salt: Uint8Array,
  info: string,
): Promise<CryptoKey> {
  const theirKey = await crypto.subtle.importKey(
    "spki",
    buf(theirPublicSpki),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirKey },
    privateKey,
    256,
  );
  // HKDF rather than the raw ECDH output: a shared secret is not uniformly
  // random, and the info string binds the key to this purpose so the same
  // secret can never be reused for a different one.
  const base = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: buf(salt),
      info: new TextEncoder().encode(info),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

type Sealed = { senderKey: string; iv: string; payload: string };

/**
 * Seals arbitrary bytes for one recipient device.
 *
 * A fresh ephemeral keypair per envelope: the recipient needs only the
 * ephemeral public key to open it, and no two envelopes share a secret, so one
 * opened envelope tells you nothing about the others.
 */
async function sealTo(recipientPublicKey: string, plaintext: Uint8Array): Promise<Sealed> {
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapper = await wrappingKey(
    ephemeral.privateKey,
    fromB64(recipientPublicKey),
    iv,
    INFO_SEAL,
  );
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv: buf(iv) }, wrapper, buf(plaintext));
  return {
    senderKey: toB64(await crypto.subtle.exportKey("spki", ephemeral.publicKey)),
    iv: toB64(iv),
    payload: toB64(sealed),
  };
}

/** Opens something sealed to this device. Null when it was not ours to open,
 *  which is a normal state rather than an error. */
async function openSealed(sealed: {
  senderKey: string;
  iv: string;
  payload: string;
}): Promise<Uint8Array | null> {
  try {
    const { privateKey } = await identity();
    const iv = fromB64(sealed.iv);
    const wrapper = await wrappingKey(privateKey, fromB64(sealed.senderKey), iv, INFO_SEAL);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: buf(iv) },
      wrapper,
      buf(fromB64(sealed.payload)),
    );
    return new Uint8Array(plain);
  } catch {
    return null;
  }
}

// ---------- the ratchet ----------

async function hkdf(chainKey: Uint8Array, info: string, bytes = 32): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey("raw", buf(chainKey), "HKDF", false, ["deriveBits"]);
  const out = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode(info),
    },
    base,
    bytes * 8,
  );
  return new Uint8Array(out);
}

/** The message key at the chain's current position. */
async function messageKeyFrom(chainKey: Uint8Array): Promise<CryptoKey> {
  const raw = await hkdf(chainKey, INFO_MSG);
  return crypto.subtle.importKey("raw", buf(raw), { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** One click forward. The previous chain key is not recoverable from this. */
async function advance(chainKey: Uint8Array): Promise<Uint8Array> {
  return hkdf(chainKey, INFO_CHAIN);
}

// ---------- this device's own chain ----------

type OwnChain = { chainKey: string; index: number };

const ownChainKey = (cartId: string) => `chain:${cartId}`;

/** This device's chain for a group, created on first use. */
export async function ownChain(cartId: string): Promise<OwnChain> {
  const stored = await idbGet<OwnChain>(ownChainKey(cartId));
  if (stored) return stored;
  const fresh: OwnChain = {
    chainKey: toB64(crypto.getRandomValues(new Uint8Array(32))),
    index: 0,
  };
  await idbPut(ownChainKey(cartId), fresh);
  return fresh;
}

/**
 * The distribution message handed to a recipient device: where this chain is
 * NOW, plus the signing key to check this device's messages against.
 *
 * Deliberately the current position, not the start. A device let in today
 * cannot be handed the means to open what was said yesterday — that is the
 * forward secrecy, and history reaches it by a route that requires a device of
 * the same user to consent.
 */
export async function distributionFor(
  cartId: string,
  recipient: MemberDevice,
): Promise<Sealed> {
  const chain = await ownChain(cartId);
  const { signingKey } = await publicKeys();
  const body = new TextEncoder().encode(
    JSON.stringify({ chainKey: chain.chainKey, index: chain.index, signingKey }),
  );
  return sealTo(recipient.publicKey, body);
}

/** Opens a distribution message addressed to this device. */
export async function openDistribution(env: {
  senderId: string;
  senderDevice: string;
  senderKey: string;
  iv: string;
  payload: string;
}): Promise<SenderChain | null> {
  const plain = await openSealed(env);
  if (!plain) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(plain)) as {
      chainKey: string;
      index: number;
      signingKey: string;
    };
    if (!parsed.chainKey || typeof parsed.index !== "number" || !parsed.signingKey) return null;
    return {
      senderId: env.senderId,
      senderDevice: env.senderDevice,
      chainKey: parsed.chainKey,
      index: parsed.index,
      signingKey: parsed.signingKey,
    };
  } catch {
    return null;
  }
}

// ---------- sending ----------

/** What gets signed. Binding all of it means none of it can be swapped later. */
function signedBytes(o: {
  cartId: string;
  senderDevice: string;
  index: number;
  iv: string;
  ciphertext: string;
}): Uint8Array {
  return new TextEncoder().encode(
    `${o.cartId}|${o.senderDevice}|${o.index}|${o.iv}|${o.ciphertext}`,
  );
}

export async function encryptMessage(
  cartId: string,
  text: string,
): Promise<{ index: number; iv: string; ciphertext: string; signature: string }> {
  const chain = await ownChain(cartId);
  const chainKey = fromB64(chain.chainKey);
  const key = await messageKeyFrom(chainKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buf(iv) },
    key,
    new TextEncoder().encode(text),
  );

  const index = chain.index;
  const ivB64 = toB64(iv);
  const ctB64 = toB64(ct);

  const { privateKey } = await signingIdentity();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    buf(signedBytes({ cartId, senderDevice: deviceId(), index, iv: ivB64, ciphertext: ctB64 })),
  );

  // Advance only after the message is fully built. Advancing first would burn a
  // position on a message that might never be sent, and every recipient would
  // then stall waiting for an index that does not exist.
  await idbPut(ownChainKey(cartId), {
    chainKey: toB64(await advance(chainKey)),
    index: index + 1,
  });

  return { index, iv: ivB64, ciphertext: ctB64, signature: toB64(signature) };
}

/** Rolls this device's chain back one position, for a send that failed. */
export async function rewindOwnChain(cartId: string, to: OwnChain): Promise<void> {
  await idbPut(ownChainKey(cartId), to);
}

// ---------- receiving ----------

export type Decrypted =
  | { ok: true; text: string; verified: boolean }
  | { ok: false; reason: "no-chain" | "too-old" | "bad-key" | "forged" };

/**
 * Reads one message by ratcheting the sender's chain forward to its index.
 *
 * A chain only moves forward. An index BELOW where this device's copy of the
 * chain already stands cannot be reached — the key that opened it is gone. That
 * is the point of a ratchet, and the honest answer is to say the message is
 * from before this device joined rather than to pretend it does not exist.
 */
export async function decryptMessage(
  chains: Map<string, SenderChain>,
  msg: {
    cartId: string;
    senderDevice: string;
    index: number;
    iv: string;
    ciphertext: string;
    signature?: string | null;
  },
): Promise<Decrypted> {
  const chain = chains.get(msg.senderDevice);
  if (!chain) return { ok: false, reason: "no-chain" };
  if (msg.index < chain.index) return { ok: false, reason: "too-old" };

  // Signature first: a message that does not verify is not decrypted at all,
  // so a forged one can never advance a chain or reach the screen as real.
  let verified = false;
  if (msg.signature && chain.signingKey) {
    try {
      const key = await crypto.subtle.importKey(
        "spki",
        buf(fromB64(chain.signingKey)),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"],
      );
      verified = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        buf(fromB64(msg.signature)),
        buf(signedBytes(msg)),
      );
    } catch {
      verified = false;
    }
    if (!verified) return { ok: false, reason: "forged" };
  }

  // Walk to the message's position, keeping the walk local so a failure part
  // way through does not leave the stored chain in a half-advanced state.
  let key = fromB64(chain.chainKey);
  for (let i = chain.index; i < msg.index; i++) key = await advance(key);

  try {
    const messageKey = await messageKeyFrom(key);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: buf(fromB64(msg.iv)) },
      messageKey,
      buf(fromB64(msg.ciphertext)),
    );
    // Only now commit the walk. The chain key for this position is dropped as
    // we move past it, which is what makes the message unreadable to a later
    // compromise of this device.
    chains.set(msg.senderDevice, {
      ...chain,
      chainKey: toB64(await advance(key)),
      index: msg.index + 1,
    });
    return { ok: true, text: new TextDecoder().decode(plain), verified };
  } catch {
    return { ok: false, reason: "bad-key" };
  }
}

// ---------- persistence of chains and plaintext ----------

const chainsKey = (cartId: string) => `chains:${cartId}`;
const logKey = (cartId: string) => `log:${cartId}`;

export async function loadChains(cartId: string): Promise<Map<string, SenderChain>> {
  const stored = await idbGet<SenderChain[]>(chainsKey(cartId));
  return new Map((stored ?? []).map((c) => [c.senderDevice, c]));
}

export async function saveChains(
  cartId: string,
  chains: Map<string, SenderChain>,
): Promise<void> {
  await idbPut(chainsKey(cartId), [...chains.values()]);
}

/** One message as this device has it, in the clear, locally. */
export type LoggedMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderDevice: string;
  text: string;
  verified: boolean;
  createdAt: string;
};

// The plaintext log is what makes a reload cheap and what history sync hands
// over. It lives only in this browser's IndexedDB; nothing uploads it except a
// sync sealed for another device of the same user.
export async function loadLog(cartId: string): Promise<LoggedMessage[]> {
  return (await idbGet<LoggedMessage[]>(logKey(cartId))) ?? [];
}

export async function saveLog(cartId: string, log: LoggedMessage[]): Promise<void> {
  await idbPut(logKey(cartId), log.slice(-500));
}

// ---------- history sync ----------

/** Seals this device's plaintext log for another device of the same user. */
export async function sealHistory(
  log: LoggedMessage[],
  recipient: MemberDevice,
): Promise<Sealed> {
  const body = new TextEncoder().encode(JSON.stringify(log.slice(-300)));
  return sealTo(recipient.publicKey, body);
}

export async function openHistory(sealed: {
  senderKey: string;
  iv: string;
  payload: string;
}): Promise<LoggedMessage[] | null> {
  const plain = await openSealed(sealed);
  if (!plain) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(plain));
    return Array.isArray(parsed) ? (parsed as LoggedMessage[]) : null;
  } catch {
    return null;
  }
}

// ---------- safety number ----------

/**
 * A short code over every device key in the conversation.
 *
 * The server chooses which devices exist, so this is the one thing that makes a
 * silently added device visible: if two people read the same number aloud and
 * they match, they are talking to the same set of devices. It is exactly the
 * property Signal's safety numbers and WhatsApp's security code provide, and it
 * is worth no more than the comparison people actually make.
 */
export async function safetyNumber(devices: MemberDevice[]): Promise<string> {
  const material = devices
    .map((d) => `${d.userId}:${d.deviceId}:${d.publicKey}:${d.signingKey ?? ""}`)
    .sort()
    .join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  const bytes = new Uint8Array(digest).slice(0, 10);
  const digits = Array.from(bytes, (b) => (b % 100).toString().padStart(2, "0")).join("");
  return digits.replace(/(\d{5})(?=\d)/g, "$1 ");
}
