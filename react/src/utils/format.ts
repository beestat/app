export function convertTemperature(value: number, outputUnit = '°F', inputUnit = '°F', delta = false) {
  const outputCelsius = outputUnit.includes('C');
  const inputCelsius = inputUnit.includes('C');
  if (outputCelsius === inputCelsius) return value;
  if (outputCelsius) return delta ? value * 5 / 9 : (value - 32) * 5 / 9;
  return delta ? value * 9 / 5 : value * 9 / 5 + 32;
}

export function formatTemperature(value: number | null | undefined, unit = '°F', digits = 1, inputUnit = '°F', delta = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const suffix = unit.startsWith('°') ? unit : `°${unit}`;
  return `${convertTemperature(value, unit, inputUnit, delta).toFixed(digits)}${suffix}`;
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
