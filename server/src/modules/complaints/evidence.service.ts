import { randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/error.js";

// Evidence for ONDC IGM complaints — the photo the walkthrough attaches at
// step 3.
//
// Two rules from the integration guide shape this:
//
//   1. Store file metadata and a secure reference; never expose private storage
//      URLs. So the database holds an opaque key, the app is handed an evidence
//      id, and bytes come back only through an authenticated route that
//      re-checks ownership.
//   2. Files are not served statically. There is no public path to the upload
//      directory at all.
//
// Uploads arrive as a data URL rather than multipart, which avoids adding a
// parser dependency for one endpoint. The trade-off is base64's ~33% overhead,
// which the route's body limit accounts for.

/** What a customer may attach. Anything else is refused. */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** 5 MB of actual file. Phone photos land well under this. */
const MAX_BYTES = 5 * 1024 * 1024;

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "complaints");

/**
 * Decode a `data:<mime>;base64,<payload>` URL.
 *
 * The declared mime is checked against the allowlist and the extension is
 * derived from that allowlist — never from a client-supplied filename, so
 * there is nothing here for a crafted name to traverse or smuggle.
 */
function decodeDataUrl(dataUrl: string) {
  const match = /^data:([a-z0-9/+.-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new ApiError(400, "Expected a base64 data URL");

  const [, mime, payload] = match as unknown as [string, string, string];
  const ext = ALLOWED[mime.toLowerCase()];
  if (!ext) {
    throw new ApiError(415, "Attach a JPEG, PNG, WebP or PDF");
  }

  const bytes = Buffer.from(payload, "base64");
  if (bytes.length === 0) throw new ApiError(400, "That file is empty");
  if (bytes.length > MAX_BYTES) {
    throw new ApiError(413, "That file is larger than 5 MB");
  }

  return { mime: mime.toLowerCase(), ext, bytes };
}

/** Attach evidence to one of the caller's own complaints. */
export async function addEvidence(input: {
  userId: string;
  complaintId: string;
  dataUrl: string;
}) {
  const complaint = await prisma.complaint.findFirst({
    where: { id: input.complaintId, userId: input.userId },
    select: { id: true, status: true },
  });
  if (!complaint) throw new ApiError(404, "Complaint not found");
  if (complaint.status === "CLOSED") {
    throw new ApiError(400, "This complaint is closed");
  }

  const { mime, ext, bytes } = decodeDataUrl(input.dataUrl);

  // Random name: the key is never derived from anything the client sent.
  const storageKey = `${complaint.id}/${randomBytes(16).toString("hex")}.${ext}`;
  const target = path.join(UPLOAD_ROOT, storageKey);

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);

  const evidence = await prisma.complaintEvidence.create({
    data: {
      complaintId: complaint.id,
      storageKey,
      mimeType: mime,
      sizeBytes: bytes.length,
      uploadedBy: "CONSUMER",
    },
    // Deliberately not returning storageKey — the app has no use for it and
    // the guide says storage references stay server-side.
    select: { id: true, mimeType: true, sizeBytes: true, createdAt: true },
  });

  return evidence;
}

/**
 * Read evidence bytes back for a caller who owns the complaint.
 *
 * The stored key is joined and then re-checked against the upload root, so even
 * if a key were ever corrupted it cannot escape the directory.
 */
export async function readEvidence(userId: string, evidenceId: string) {
  const evidence = await prisma.complaintEvidence.findFirst({
    where: { id: evidenceId, complaint: { userId } },
    select: { storageKey: true, mimeType: true },
  });
  if (!evidence) throw new ApiError(404, "Evidence not found");

  const target = path.resolve(UPLOAD_ROOT, evidence.storageKey);
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new ApiError(400, "Invalid evidence reference");
  }

  try {
    return { bytes: await readFile(target), mimeType: evidence.mimeType };
  } catch {
    throw new ApiError(404, "That file is no longer available");
  }
}
