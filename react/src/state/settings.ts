const PREFIX = 'beestat.react.';

export function getSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSetting<T>(key: string, value: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
