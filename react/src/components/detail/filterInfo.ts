// Port of legacy modal/filter_info.js. Each step mirrors the Moment call it replaces
// so "Replace In" reads the same as legacy down to the day.

const DAY = 86_400_000;

// moment().add(n, 'months'): same day of month, clamped to the target month's last day.
function addMonths(date: Date, months: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

// a.diff(b, 'days'): elapsed time corrected for DST offset changes, truncated toward zero.
function diffDays(a: Date, b: Date) {
  const zoneDelta = (a.getTimezoneOffset() - b.getTimezoneOffset()) * 60_000;
  return Math.trunc((a.getTime() - b.getTime() - zoneDelta) / DAY);
}

export function filterReplaceIn(filter: { last_changed: string; life: number | string; life_units: string; runtime: number | string }, now = new Date()) {
  const life = Number(filter.life);
  if (filter.life_units === 'month') {
    const days = diffDays(addMonths(new Date(`${filter.last_changed}T00:00:00`), life), now);
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Now';
    if (days < 35) return `${days}d`;
    // moment.duration(days, 'days'): whole months by 146097 / 4800 days each, and the
    // remaining days after subtracting the ceiling of those months.
    const months = Math.floor(days * 4800 / 146097);
    return `${months}mo ${days - Math.ceil(months * 146097 / 4800)}d`;
  }
  if (filter.life_units === 'hour') {
    const hours = life - Math.round(Number(filter.runtime) / 3600);
    return hours < 0 ? `${Math.abs(hours)}h overdue` : hours === 0 ? 'Now' : `${hours}h`;
  }
  return 'Unknown';
}

export function filterLifespan(filter: { life: number | string; life_units: string }) {
  const life = Number(filter.life);
  return `${life}${filter.life_units === 'hour' ? ' runtime' : ''} ${filter.life_units}${life > 1 ? 's' : ''}`;
}
