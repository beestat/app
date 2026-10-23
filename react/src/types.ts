export type EntityMap<T> = Record<string, T>;

export interface WeatherData {
  temperature: number | null;
  humidity_relative: number | null;
  condition?: string;
  [key: string]: unknown;
}

export interface Thermostat {
  thermostat_id: number;
  ecobee_thermostat_id: number;
  address_id: number | null;
  name: string;
  temperature: number;
  temperature_unit: 'F' | 'C';
  humidity: number;
  setpoint_heat: number;
  setpoint_cool: number;
  running_equipment: string[];
  weather: WeatherData;
  alerts: AlertData[];
  data_begin: string;
  data_end?: string;
  profile?: Record<string, unknown> | null;
  system_type?: Record<string, any>;
  filters?: Record<string, unknown>;
  [key: string]: any;
}

export interface Sensor {
  sensor_id: number;
  thermostat_id: number;
  name: string;
  type: string;
  temperature: number | null;
  occupancy: boolean | null;
  in_use: boolean;
  [key: string]: unknown;
}

export interface AlertData {
  alert_id?: number;
  acknowledgement?: string;
  date?: string;
  message?: string;
  text?: string;
  dismissed?: boolean;
  [key: string]: unknown;
}

export interface EcobeeThermostat {
  ecobee_thermostat_id: number;
  settings?: { hvacMode?: string; [key: string]: unknown };
  program?: Record<string, any>;
  [key: string]: any;
}

export interface DashboardData {
  user: Record<string, any>;
  thermostat: EntityMap<Thermostat>;
  sensor: EntityMap<Sensor>;
  ecobee_thermostat: EntityMap<EcobeeThermostat>;
  ecobee_sensor: EntityMap<Record<string, any>>;
  address: EntityMap<Record<string, any>>;
  floor_plan: EntityMap<Record<string, any>>;
  announcement: EntityMap<Record<string, any>>;
  runtime_thermostat_summary: EntityMap<Record<string, any>>;
  stripe_event: EntityMap<Record<string, any>>;
  session: Record<string, any>;
  profile: Record<string, any>;
}

export interface ApiCall {
  resource: string;
  method: string;
  arguments?: Record<string, unknown>;
  alias?: string;
  bypass_cache_read?: boolean;
  bypass_cache_write?: boolean;
  clear_cache?: boolean;
}
