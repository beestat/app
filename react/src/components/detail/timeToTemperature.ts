import { legacyDurationParts } from '../../pages/analyzeSummary';

// Port of legacy card/system.js decorate_time_to_temperature_.

// beestat.thermostat.get_operating_mode: the highest-priority running stage.
export const operatingModes = ['auxiliary_heat_2', 'auxiliary_heat_1', 'heat_2', 'heat_1', 'cool_2', 'cool_1'] as const;
export type OperatingMode = typeof operatingModes[number];

export function operatingMode(running: string[]): OperatingMode | undefined {
  return operatingModes.find((mode) => running.some((item) => item.replace(/^compressor_/, '') === mode));
}

type Input = {
  running: string[];
  temperature: number;
  setpointHeat: number;
  setpointCool: number;
  outdoorTemperature?: number | null;
  profile?: { temperature?: Record<string, { linear_trendline?: { slope: number; intercept: number } } | null> } | null;
};

// "h:mm a" from Moment, e.g. "3:05 pm".
function clock(date: Date) {
  const hours = date.getHours() % 12 || 12;
  return `${hours}:${String(date.getMinutes()).padStart(2, '0')} ${date.getHours() < 12 ? 'am' : 'pm'}`;
}

/** Returns undefined when legacy hides the box; otherwise the header mode, the °F/h rate if known, and the text. */
export function timeToTemperature({ running, temperature, setpointHeat, setpointCool, outdoorTemperature, profile }: Input, now = new Date()) {
  const mode = operatingMode(running);
  if (!mode) return undefined;
  const simplified = mode.includes('cool') ? 'cool' : 'heat';
  if ((simplified === 'heat' && temperature >= setpointHeat) || (simplified === 'cool' && temperature <= setpointCool)) return undefined;

  const trendline = profile?.temperature?.[mode]?.linear_trendline;
  if (!trendline || outdoorTemperature == null) return { mode: simplified, text: 'Unknown' };

  const rate = trendline.slope * outdoorTemperature + trendline.intercept;
  if ((simplified === 'heat' && rate < 0.05) || (simplified === 'cool' && rate > -0.05)) return { mode: simplified, rate, text: 'Never' };

  const hoursToGo = simplified === 'heat' ? (setpointHeat - temperature) / rate : (temperature - setpointCool) / rate * -1;
  const duration = legacyDurationParts(hoursToGo);
  let text = `${duration.hours.toLocaleString()}h ${duration.minutes}m`.replace(/^0h /, '');
  if (hoursToGo <= 12) text += ` (${clock(new Date(now.getTime() + hoursToGo * 3_600_000))})`;
  return { mode: simplified, rate, text };
}
