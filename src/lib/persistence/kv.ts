import type { ZodType } from "zod";

/**
 * Small versioned key-value adapter over localStorage. Reads are validated, so a corrupt or
 * outdated entry falls back cleanly instead of breaking the page. Swappable for a server store.
 */
export function readJson<T>(key: string, schema: ZodType<T>, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}
