const PREFIX = 'beestat.react.';

export function getSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Storage can be unavailable or full (private browsing, blocked site data); settings are a convenience, so ignore that.
export function setSetting<T>(key: string, value: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not persisted; the server-side setting still applies.
  }
}
