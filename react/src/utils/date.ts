/** Subtract calendar days in the viewer's time zone, matching Moment's subtract(days, 'day'). */
export function localDaysAgo(value: Date | number, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() - days);
  return result;
}

export function localDaysAgoIso(value: Date | number, days: number) {
  return localDaysAgo(value, days).toISOString();
}

/** Distance between two YYYY-MM-DD calendar dates, independent of DST. */
export function calendarDayDistance(begin: string, end: string) {
  return Math.abs(Date.parse(`${end}T00:00:00Z`) - Date.parse(`${begin}T00:00:00Z`)) / 86_400_000;
}
