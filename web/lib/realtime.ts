"use client";

import { io, type Socket } from "socket.io-client";

// Mirror the same normalization as lib/api.ts:
// - "/" or empty means same-origin proxy mode — connect to window.location.origin
//   so the WebSocket upgrade goes to the web host which proxies it to the API.
// - anything else is the explicit full API URL (local dev or direct).
const configured = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_URL =
  configured === "/" || configured === ""
    ? typeof window !== "undefined"
      ? window.location.origin
      : ""
    : configured.replace(/\/$/, "");

let socket: Socket | null = null;

// Single shared connection. Auth rides on the httpOnly cookie (withCredentials),
// so there's no token to pass. Safe to call repeatedly.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
