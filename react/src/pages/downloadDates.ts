const pad = (value: number) => String(value).padStart(2, '0');

export const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Match moment().format(): local wall time plus the offset for that specific date. */
export function localTimestamp(date: string, hour: number, minute: number) {
  const [year, month, dateOfMonth] = date.split('-').map(Number);
  const value = new Date(year, month - 1, dateOfMonth, hour, minute, 0, 0);
  const offset = -value.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${isoDate(value)}T${pad(hour)}:${pad(minute)}:00${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}
