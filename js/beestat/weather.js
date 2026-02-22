beestat.weather = {};

/**
 * Unified weather settings keyed by condition.
 *
 * Field meanings:
 * `condition`: Canonical condition string stored in floor-plan scene data.
 * `icon`: MDI icon id used by weather UI controls/modals.
 * `icon_color`: UI accent color for the weather icon.
 * `cloud_density`: Controls cloud particle count/intensity in the scene.
 * `cloud_darkness`: Controls cloud shading/dimming (0 clear -> 2 very dark).
 * `fog_density`: Controls low-altitude volumetric fog cloud density.
 * `fog_color`: Hex color used to tint low-altitude fog volumes.
 * `rain_density`: Controls rain particle count/intensity.
 * `snow_density`: Controls snow particle count/intensity and snow-cover blend.
 * `lightning_frequency`: Controls frequency/intensity of lightning effects.
 * `wind_speed`: Controls animation strength for wind-affected scene elements.
 *
 * Density/intensity fields are tuned for roughly 0..2 in current scene logic.
 */
beestat.weather.settings_ = {
  'sunny': {
    'condition': 'sunny',
    'icon': 'weather_sunny',
    'icon_color': beestat.style.color.yellow.base,
    'cloud_density': 0.03,
    'cloud_darkness': 0,
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.4
  },
  'few_clouds': {
    'condition': 'few_clouds',
    'icon': 'weather_partly_cloudy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.18,
    'cloud_darkness': 0,
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.45
  },
  'partly_cloudy': {
    'condition': 'partly_cloudy',
    'icon': 'weather_partly_cloudy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.3,
    'cloud_darkness': 0.1,
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.55
  },
  'mostly_cloudy': {
    'condition': 'mostly_cloudy',
    'icon': 'weather_cloudy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.75,
    'cloud_darkness': 0.45,
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.7
  },
  'overcast': {
    'condition': 'overcast',
    'icon': 'weather_cloudy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.5,
    'cloud_darkness': 0.4,
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.8
  },
  'drizzle': {
    'condition': 'drizzle',
    'icon': 'weather_pouring',
    'icon_color': beestat.style.color.blue.light,
    'cloud_density': 0.9,
    'cloud_darkness': 0.7,
    'rain_density': 0.35,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.75
  },
  'rain': {
    'condition': 'rain',
    'icon': 'weather_pouring',
    'icon_color': beestat.style.color.blue.light,
    'cloud_density': 1,
    'cloud_darkness': 1,
    'rain_density': 1,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.8
  },
  'showers': {
    'condition': 'showers',
    'icon': 'weather_pouring',
    'icon_color': beestat.style.color.blue.light,
    'cloud_density': 1.2,
    'cloud_darkness': 1.1,
    'rain_density': 1.2,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 1
  },
  'freezing_rain': {
    'condition': 'freezing_rain',
    'icon': 'weather_hail',
    'icon_color': beestat.style.color.lightblue.base,
    'cloud_density': 1.2,
    'cloud_darkness': 1.2,
    'rain_density': 1.1,
    'snow_density': 0.2,
    'lightning_frequency': 0,
    'wind_speed': 1
  },
  'hail': {
    'condition': 'hail',
    'icon': 'weather_hail',
    'icon_color': beestat.style.color.lightblue.base,
    'cloud_density': 1.25,
    'cloud_darkness': 1.25,
    'rain_density': 1.2,
    'snow_density': 0.15,
    'lightning_frequency': 0.1,
    'wind_speed': 1.1
  },
  'pellets': {
    'condition': 'pellets',
    'icon': 'weather_hail',
    'icon_color': beestat.style.color.lightblue.base,
    'cloud_density': 1.25,
    'cloud_darkness': 1.25,
    'rain_density': 1.2,
    'snow_density': 0.15,
    'lightning_frequency': 0.1,
    'wind_speed': 1.1
  },
  'snow': {
    'condition': 'snow',
    'icon': 'weather_snowy',
    'icon_color': beestat.style.color.lightblue.light,
    'cloud_density': 1,
    'cloud_darkness': 1,
    'rain_density': 0,
    'snow_density': 1,
    'lightning_frequency': 0,
    'wind_speed': 0.4
  },
  'flurries': {
    'condition': 'flurries',
    'icon': 'weather_snowy',
    'icon_color': beestat.style.color.lightblue.light,
    'cloud_density': 0.85,
    'cloud_darkness': 0.7,
    'rain_density': 0,
    'snow_density': 0.55,
    'lightning_frequency': 0,
    'wind_speed': 0.65
  },
  'freezing_snow': {
    'condition': 'freezing_snow',
    'icon': 'weather_snowy',
    'icon_color': beestat.style.color.lightblue.light,
    'cloud_density': 1.1,
    'cloud_darkness': 1,
    'rain_density': 0.05,
    'snow_density': 1.1,
    'lightning_frequency': 0,
    'wind_speed': 0.7
  },
  'blizzard': {
    'condition': 'blizzard',
    'icon': 'weather_snowy_heavy',
    'icon_color': beestat.style.color.lightblue.light,
    'cloud_density': 1.4,
    'cloud_darkness': 1.5,
    'rain_density': 0.1,
    'snow_density': 1.8,
    'lightning_frequency': 0,
    'wind_speed': 1.6
  },
  'thunderstorm': {
    'condition': 'thunderstorm',
    'icon': 'weather_lightning_rainy',
    'icon_color': beestat.style.color.red.base,
    'cloud_density': 1.5,
    'cloud_darkness': 2,
    'rain_density': 2,
    'snow_density': 0,
    'lightning_frequency': 1,
    'wind_speed': 1.6
  },
  'windy': {
    'condition': 'windy',
    'icon': 'weather_windy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.55,
    'cloud_darkness': 0.3,
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 1.5
  },
  'tornado': {
    'condition': 'tornado',
    'icon': 'weather_tornado',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 1.35,
    'cloud_darkness': 1.6,
    'rain_density': 1.3,
    'snow_density': 0,
    'lightning_frequency': 0.5,
    'wind_speed': 2
  },
  'fog': {
    'condition': 'fog',
    'icon': 'weather_fog',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.6,
    'cloud_darkness': 0.2,
    'fog_density': 1.2,
    'fog_color': '#d6dde8',
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.25
  },
  'haze': {
    'condition': 'haze',
    'icon': 'weather_hazy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.45,
    'cloud_darkness': 0.35,
    'fog_density': 0.8,
    'fog_color': '#d9d4c8',
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.6
  },
  'smoke': {
    'condition': 'smoke',
    'icon': 'weather_hazy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.45,
    'cloud_darkness': 0.35,
    'fog_density': 1.05,
    'fog_color': '#cbc7c3',
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.6
  },
  'dust': {
    'condition': 'dust',
    'icon': 'weather_hazy',
    'icon_color': beestat.style.color.gray.base,
    'cloud_density': 0.45,
    'cloud_darkness': 0.35,
    'fog_density': 0.95,
    'fog_color': '#d9c7a8',
    'rain_density': 0,
    'snow_density': 0,
    'lightning_frequency': 0,
    'wind_speed': 0.6
  }
};

/**
 * Fallback settings for unknown conditions.
 * Used when a condition string is missing or unsupported.
 */
beestat.weather.default_settings_ = {
  'condition':'sunny',
  'icon': 'cloud_question',
  'icon_color': beestat.style.color.gray.base,
  'cloud_density': 0.03,
  'cloud_darkness': 0,
  'fog_density': 0,
  'fog_color': '#d6dde8',
  'rain_density': 0,
  'snow_density': 0,
  'lightning_frequency': 0,
  'wind_speed': 0.4
};

/**
 * Find weather settings by condition.
 * Returns a full weather row; falls back to `default_settings_`.
 *
 * @param {string} condition
 */
beestat.weather.get_settings_ = function(condition) {
  if (beestat.weather.settings_[condition] !== undefined) {
    return beestat.weather.settings_[condition];
  }

  return beestat.weather.default_settings_;
};

/**
 * Get UI icon id for a weather condition.
 *
 * @param {string} condition
 *
 * @return {string}
 */
beestat.weather.get_icon = function(condition) {
  return beestat.weather.get_settings_(condition).icon;
};

/**
 * Get UI icon color for a weather condition.
 *
 * @param {string} condition
 *
 * @return {string}
 */
beestat.weather.get_icon_color = function(condition) {
  return beestat.weather.get_settings_(condition).icon_color;
};

/**
 * Get cloud density for a condition.
 * Higher values increase cloud population and perceived overcast coverage.
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_cloud_density = function(condition) {
  return beestat.weather.get_settings_(condition).cloud_density;
};

/**
 * Get cloud darkness for a condition.
 * Higher values darken clouds and dim overall sky illumination.
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_cloud_darkness = function(condition) {
  return beestat.weather.get_settings_(condition).cloud_darkness;
};

/**
 * Get fog density for a condition.
 * Higher values increase low-altitude volumetric fog presence.
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_fog_density = function(condition) {
  const fog_density = beestat.weather.get_settings_(condition).fog_density;
  if (fog_density !== undefined) {
    return fog_density;
  }
  return beestat.weather.default_settings_.fog_density;
};

/**
 * Get fog color tint for a condition.
 *
 * @param {string} condition
 *
 * @return {string}
 */
beestat.weather.get_fog_color = function(condition) {
  const fog_color = beestat.weather.get_settings_(condition).fog_color;
  if (typeof fog_color === 'string' && fog_color.length > 0) {
    return fog_color;
  }
  return beestat.weather.default_settings_.fog_color;
};

/**
 * Get rain density for a condition.
 * Higher values increase rain particle count and rainfall intensity.
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_rain_density = function(condition) {
  return beestat.weather.get_settings_(condition).rain_density;
};

/**
 * Get snow density for a condition.
 * Higher values increase snow particle count and snow-cover blending.
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_snow_density = function(condition) {
  return beestat.weather.get_settings_(condition).snow_density;
};

/**
 * Get lightning frequency for a condition.
 * Higher values produce more frequent/intense lightning events.
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_lightning_frequency = function(condition) {
  return beestat.weather.get_settings_(condition).lightning_frequency;
};

/**
 * Get wind speed for a condition.
 * Higher values increase wind-driven animation (trees/precipitation behavior).
 *
 * @param {string} condition
 *
 * @return {number}
 */
beestat.weather.get_wind_speed = function(condition) {
  return beestat.weather.get_settings_(condition).wind_speed;
};

/**
 * Convert condition into a title-case label.
 *
 * @param {string} condition
 *
 * @return {string}
 */
beestat.weather.get_condition_label = function(condition) {
  const value = typeof condition === 'string' && condition.length > 0
    ? condition
    : 'unknown';

  return value
    .split('_')
    .map(function(part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
};
