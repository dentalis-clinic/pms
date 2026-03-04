import { randomBytes } from "crypto";

const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

interface TokenEntry {
  patientId: string; // Internal UUID
  expiresAt: number;
}

const tokenStore = new Map<string, TokenEntry>();

// Reverse lookup: patientId → token (to reuse existing tokens)
const patientToToken = new Map<string, string>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of tokenStore) {
      if (now >= entry.expiresAt) {
        patientToToken.delete(entry.patientId);
        tokenStore.delete(token);
      }
    }
    if (tokenStore.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Generate an opaque short-lived token for a patient ID.
 * Returns the same token if one already exists and is still valid.
 */
export function generatePatientToken(patientId: string): string {
  // Reuse existing valid token
  const existing = patientToToken.get(patientId);
  if (existing) {
    const entry = tokenStore.get(existing);
    if (entry && Date.now() < entry.expiresAt) {
      return existing;
    }
    // Expired — clean up
    tokenStore.delete(existing);
    patientToToken.delete(patientId);
  }

  const token = randomBytes(16).toString("hex");
  tokenStore.set(token, {
    patientId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  patientToToken.set(patientId, token);
  ensureCleanup();
  return token;
}

/**
 * Resolve an opaque token back to a patient UUID.
 * Returns null if the token is invalid or expired.
 */
export function resolvePatientToken(token: string): string | null {
  const entry = tokenStore.get(token);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    patientToToken.delete(entry.patientId);
    tokenStore.delete(token);
    return null;
  }

  return entry.patientId;
}
