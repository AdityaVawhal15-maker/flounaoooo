import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env.js";
import { captureError } from "../lib/monitoring.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
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
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  // Genuine unexpected error (500) — report to monitoring with request context.
  captureError(err, { method: req.method, path: req.path });
  // Never leak stack traces or internals to clients in production.
  return res
    .status(500)
    .json({ error: isProd ? "Internal server error" : String(err) });
}
