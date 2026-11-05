/** Subtract calendar days in the viewer's time zone, matching Moment's subtract(days, 'day'). */
export function localDaysAgo(value: Date | number, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() - days);
  return result;
}

export function localDaysAgoIso(value: Date | number, days: number) {
  return localDaysAgo(value, days).toISOString();
}
