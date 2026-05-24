"use client";

import type { CoopPlayerSession } from "./types";

const STORAGE_PREFIX = "blackout-raid:coop-session:";

export function getStoredRoomSession(code: string): CoopPlayerSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${code}`);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CoopPlayerSession;

    if (
      typeof parsed.playerId === "string" &&
      typeof parsed.nickname === "string" &&
      typeof parsed.roomCode === "string" &&
      typeof parsed.roomId === "string" &&
      typeof parsed.isHost === "boolean"
    ) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${code}`);
  }

  return null;
}

export function storeRoomSession(session: CoopPlayerSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${STORAGE_PREFIX}${session.roomCode}`,
    JSON.stringify(session),
  );
}

export function clearRoomSession(code: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(`${STORAGE_PREFIX}${code}`);
}
