beestat.style = function() {};

beestat.style.color = {
  'red': {
    'light': '#fc5c65',
    'base': '#eb3b5a',
    'dark': '#d63652'
  },
  'orange': {
    'light': '#fd9644',
    'base': '#fa8231',
    'dark': '#f97218'
  },
  'yellow': {
    'light': '#fed330',
    'base': '#f7b731',
    'dark': '#f6ae18'
  },
  'green': {
    'light': '#26de81',
    'base': '#20bf6b',
    'dark': '#20b364'
  },
  'bluegreen': {
    'light': '#2bcbba',
    'base': '#0fb9b1',
    'dark': ''
  },
  'lightblue': {
    'light': '#45aaf2',
    'base': '#2d98da',
    'dark': ''
  },
  'blue': {
    'light': '#4b7bec',
    'base': '#3867d6',
    'dark': ''
  },
  'purple': {
    'light': '#a55eea',
    'base': '#8854d0',
    'dark': ''
  },
  'gray': {
    'light': '#d1d8e0',
    'base': '#a5b1c2',
    'dark': '#8c9bb1'
  },
  'bluegray': {
    'light': '#37474f',
    'base': '#2f3d44',
    'dark': '#263238'
  }
};

beestat.style.size = {
  'gutter': 16,
  'border_radius': 4
};

beestat.style.font_weight = {
  'light': '200',
  'normal': '300',
  'bold': '400'
};

beestat.style.font_size = {
  'small': '10px',
  'normal': '13px',
  'large': '14px',
  'extra_large': '16px'
};

/**
 * Style an element with media queries. This is limited to a single media
 * query per element; multiple breakpoints are not yet supported. This is also
 * very inefficient as it adds an event listener/handler for every element. It
 * would be more efficient to combine matching media query handlers.
 *
 * @param {rocket.Elements} element The element to style.
 * @param {Object} base_style The base style to apply.
 * @param {Object} media_style The media styles to apply.
 */
beestat.style.set = function(element, base_style, media_style) {
  element.style(base_style);

  for(var media in media_style) {
    var media_query_list = window.matchMedia(media);

    var handler = function(e) {
      if(e.matches === true) {
        element.style(media_style[e.media]);
      }
      else {
        element.style(base_style);
      }
    };
    handler(media_query_list);

    media_query_list.addListener(handler);
  }
};

/**
 * Convert a hex string to RGB components.
 *
 * @param {string} hex
 *
 * @return {object} RGB
 */
beestat.style.hex_to_rgb = function(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
  } : null;
};

// Can't put these in beestat.js because of the dependency issues with color.
beestat.series = {
  'compressor_cool_1': {
    'name': 'Cool 1',
    'color': beestat.style.color.lightblue.light
  },
  'compressor_cool_2': {
    'name': 'Cool 2',
    'color': beestat.style.color.lightblue.base
  },
  'compressor_heat_1': {
    'name': 'Heat 1',
    'color': beestat.style.color.orange.light
  },
  'compressor_heat_2': {
    'name': 'Heat 2',
    'color': beestat.style.color.orange.dark
  },
  'auxiliary_heat_1': {
    'name': 'Aux',
    'color': beestat.style.color.red.dark
  },
  'auxiliary_heat_2': {
    'name': 'Aux 2',
    'color': beestat.style.color.red.dark
  },
  'auxiliary_heat_3': {
    'name': 'Aux 3',
    'color': beestat.style.color.red.dark
  },
  'fan': {
    'name': 'Fan',
    'color': beestat.style.color.gray.base
  },

  'dehumidifier': {
    'name': 'Dehumidifier',
    'color': beestat.style.color.gray.light
  },
  'economizer': {
    'name': 'Economizer',
    'color': beestat.style.color.gray.light
  },
  'humidifier': {
    'name': 'Humidifier',
    'color': beestat.style.color.gray.light
  },
  'ventilator': {
    'name': 'Ventilator',
    'color': beestat.style.color.gray.light
  },

  'indoor_temperature': {
    'name': 'Indoor Temp',
    'color': beestat.style.color.gray.light
  },
  'outdoor_temperature': {
    'name': 'Outdoor Temp',
    'color': beestat.style.color.gray.light
  },
  'setpoint_heat': {
    'name': 'Setpoint',
    'color': beestat.style.color.orange.light
  },
  'setpoint_cool': {
    'name': 'Setpoint',
    'color': beestat.style.color.lightblue.light
  },
  'indoor_humidity': {
    'name': 'Indoor Humidity',
    'color': beestat.style.color.bluegreen.base
  },
  'outdoor_humidity': {
    'name': 'Outdoor Humidity',
    'color': beestat.style.color.green.light
  },

  'calendar_event_home': {
    'name': 'Home',
    'color': beestat.style.color.green.dark
  },
  'calendar_event_smarthome': {
    'name': 'Smart Home',
    'color': beestat.style.color.green.dark
  },
  'calendar_event_smartrecovery': {
    'name': 'Smart Recovery',
    'color': beestat.style.color.green.dark
  },
  'calendar_event_away': {
    'name': 'Away',
    'color': beestat.style.color.gray.dark
  },
  'calendar_event_smartaway': {
    'name': 'Smart Away',
    'color': beestat.style.color.gray.dark
  },
  'calendar_event_vacation': {
    'name': 'Vacation',
    'color': beestat.style.color.gray.dark
  },
  'calendar_event_sleep': {
    'name': 'Sleep',
    'color': beestat.style.color.purple.light
  },
  'calendar_event_hold': {
    'name': 'Hold',
    'color': beestat.style.color.gray.base
  },
  'calendar_event_quicksave': {
    'name': 'QuickSave',
    'color': beestat.style.color.gray.base
  },
  'calendar_event_other': {
    'name': 'Other',
    'color': beestat.style.color.gray.base
  }
};
