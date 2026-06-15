import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../lib/tokens.js";

// Minimal cookie-header parser (avoids an extra typed dependency).
function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

let io: SocketIOServer | null = null;

// Each user gets their own room ("user:<id>") so we can target events to the
// owner only. Auth reuses the httpOnly access-token cookie — no separate token.
export function initRealtime(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.use((socket: Socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, "access_token");
      const payload = token ? verifyAccessToken(token) : null;
      if (!payload) return next(new Error("unauthorized"));
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    void socket.join(`user:${userId}`);
  });

  return io;
}

// Push a real-time event to a single user's open tabs (no-op if realtime is off).
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
