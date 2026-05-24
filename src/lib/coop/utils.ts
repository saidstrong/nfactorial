const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6): string {
  let code = "";
  const buffer = new Uint32Array(length);

  crypto.getRandomValues(buffer);

  for (let index = 0; index < length; index += 1) {
    code += ROOM_CODE_ALPHABET[buffer[index] % ROOM_CODE_ALPHABET.length];
  }

  return code;
}

export function sanitizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function sanitizeNickname(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 24);
}

export function formatSupabaseError(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}
