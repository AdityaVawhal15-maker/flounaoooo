import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env.js";
import { captureError } from "../lib/monitoring.js";
import { captureToErrorLog } from "../modules/backoffice/errorLog.service.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/**
 * A body-parser failure: too large, malformed, or the wrong encoding.
 *
 * Identified by shape rather than by class, because body-parser's error types
 * are not exported and instanceof against them is a version-coupling waiting to
 * break silently.
 */
function isClientBodyError(
  err: unknown,
): err is { status?: number; statusCode?: number; type?: string } {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { type?: unknown; status?: unknown; statusCode?: unknown };
  const status = typeof e.status === "number" ? e.status : e.statusCode;
  if (typeof status !== "number" || status < 400 || status >= 500) return false;
  return (
    typeof e.type === "string" &&
    [
      "entity.too.large",
      "entity.parse.failed",
      "entity.verify.failed",
      "request.aborted",
      "request.size.invalid",
      "parameters.too.many",
      "charset.unsupported",
      "encoding.unsupported",
    ].includes(e.type)
  );
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  // Body-parser rejections are the client's doing, not ours: a payload over the
  // limit, or malformed JSON. They arrive here carrying their own status, and
  // treating them as internal errors did real damage — the caller got a 500 it
  // could not act on, and every oversized request was written to the developer
  // error log and to monitoring, so anyone could flood both by POSTing junk.
  if (isClientBodyError(err)) {
    const status = err.status ?? err.statusCode ?? 400;
    return res.status(status).json({
      error:
        status === 413
          ? "That request was too large"
          : "That request body could not be read",
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  // Genuine unexpected error (500) — report to monitoring with request context
  // and persist to the developer console's error log (best-effort, non-blocking).
  captureError(err, { method: req.method, path: req.path });
  void captureToErrorLog({
    err,
    route: `${req.method} ${req.path}`,
    statusCode: 500,
    userId: req.userId ?? null,
  });
  // Never leak stack traces or internals to clients in production.
  return res
    .status(500)
    .json({ error: isProd ? "Internal server error" : String(err) });
}
