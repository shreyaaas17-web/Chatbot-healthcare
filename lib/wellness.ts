export const WELLNESS_KEYS = ["medintel-water", "medintel-sleep", "medintel-mood", "medintel-contact", "medintel-prep"] as const;

/** Local calendar date as YYYY-MM-DD (not UTC), so "today" matches the user's clock. */
export const today = () => new Date().toLocaleDateString("en-CA");

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function clearWellnessData() {
  for (const key of WELLNESS_KEYS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}
