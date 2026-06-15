"use client";

import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
