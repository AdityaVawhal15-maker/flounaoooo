import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/tokens.js";
import { ApiError } from "./error.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return next(new ApiError(401, "Not authenticated"));
  req.userId = payload.sub;
  next();
}
