/**
 * Single alert.
 */
beestat.component.alert = function(alert) {
  this.alert_ = alert;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.alert, beestat.component);

beestat.component.alert.prototype.rerender_on_breakpoint_ = false;

beestat.component.alert.prototype.decorate_ = function(parent) {
  this.decorate_main_(parent);
  this.decorate_detail_(parent);
};

/**
 * Decorate the main alert icon and text.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.alert.prototype.decorate_main_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  this.alert_main_ = $.createElement('div')
    .style({
      'display': 'flex',
      'cursor': 'pointer',
      'transition': 'all 200ms ease',
      'margin': '0 -' + beestat.style.size.gutter + 'px',
      'padding-left': beestat.style.size.gutter,
      'padding-right': beestat.style.size.gutter,
      'overflow': 'hidden'
    });
  parent.appendChild(this.alert_main_);

  if (this.should_show() === true) {
    this.show();
  } else {
    /*
     * This causes flicker but ensures that everything actually gets a height.
     * Not perfect but trying it for now.
     */
    this.hide();
  }

  this.add_event_listeners_();

  var icon_name;
  switch (this.alert_.code) {
  case 100000:
  case 100001:
    icon_name = 'tune';
    break;
  case 611: //  Invalid registration password
    icon_name = 'key';
    break;
  case 1000: //  Cold temp alert
  case 1006: //  Problem with cooling
  case 1013: //  Sensor activated disabling AC
    icon_name = 'snowflake';
    break;
  case 1001: //  Hot temp alert
  case 1003: //  Problem with furnace/boiler heating
  case 1004: //  Problem with heatpump heating
  case 1005: //  Problem with heatpump heating
  case 1009: //  Problem with aux heat, running too much
  case 1010: //  Aux heat used with high outdoor temp
  case 1018: //  Sensor activated shutting down aux heat
  case 1022: //  Sensor activated shutting down heat
    icon_name = 'fire';
    break;
  case 1007: //  Communication to EI failed
  case 1028: //  Remote sensor not communicating
    icon_name = 'wifi_strength_1_alert';
    break;
  case 6301: //  Network join failed
    icon_name = 'close_network';
    break;
  case 1002: //  Sensor activated shutting down compressor
  case 1011: //  Sensor activated switching to occupied
    icon_name = 'eye';
    break;
  case 1012: //  Sensor activated switching to unoccupied
    icon_name = 'eye_off';
    break;
  case 1017: //  Sensor activated turning on fan
    icon_name = 'fan';
    break;
  case 1020: //  Low humidity alert
  case 1021: //  High humidity alert
  case 1024: //  Sensor activated humidifier
  case 1032: //  Faulty humidity sensor
  case 1033: //  Faulty humidity sensor
  case 1025: //  Sensor activated dehumidifier
    icon_name = 'water_percent';
    break;
  case 1026: //  Low battery
    icon_name = 'battery_10';
    break;
  case 1029: //  Remote sensor re-established
  case 6300: //  Network join successful
    icon_name = 'wifi_strength_4';
    break;
  case 3130: //  Furnace maintenance reminder
  case 3131: //  Humidifier maintenance reminder
  case 3132: //  Ventilator maintenance reminder
  case 3133: //  Dehumidifier maintenance reminder
  case 3134: //  Economizer maintenance reminder
  case 3135: //  UV maintenance reminder
  case 3136: //  AC maintenance reminder
  case 3137: //  Air filter reminder (ClimateMaster only)
  case 3138: //  Air cleaner reminder (ClimateMaster only)
  case 3140: //  Hvac maintenance reminder
    icon_name = 'calendar_alert';
    break;
  case 6200: //  Monthly cost exceeded
  case 6201: //  Monthly projected cost exceeded
    icon_name = 'cash';
    break;
  case 1034: // Incorrect Zigbee module installed
    icon_name = 'zigbee';
    break;
  case 7002: // Web initiated messages - such as Utility welcome message or similar
    icon_name = 'message';
    break;
  default:

    /*
     * 1014        Sensor activated setting temp up/down
     * 1015        Sensor activated
     * 1016        Sensor activated opening/closing relay
     * 1019        Sensor activated shutting down heating/cooling
     * 1027        Remote sensor detected
     * 1030        Invalid current temp reading
     * 1031        Current temp reading restored
     * 4000        ClimateTalk
     * 6000        DR voluntary alert
     * 6001        DR voluntary utility message
     * 6100        DR mandatory alert
     * 6101        DR mandatory message
     * 6102        DR mandatory alert
     * 7000        Registration confirmation
     * 7001        Registration Remind me alert
     * 9000        ClimateMaster fault
     * 9255        ClimateMaster fault max
     * 9500        ClimateMaster disconnected
     * 9755        ClimateMaster disconnected max
     * 8300 - 8599 ClimateMaster Heatpump/hardware Unit Alerts
     * 4100 - 4199 ClimateTalk device alert major/minor fault codes
     * 4200 - 4299 ClimateTalk device lost communications
     * 4300 - 4399 ClimateTalk system message from device
     * 6002 - 6005 DR voluntary alerts
     * 8000 - 8299 Daikin Indoor/Outdoor Unit Alerts
     */
    icon_name = 'bell';
    break;
  }

  (new beestat.component.icon(icon_name)).render(this.alert_main_);

  /*
   * Since all other temperature conversions are done client-side, do this one
   * here too...
   */
  if (thermostat.temperature_unit === '°C') {
    if (this.alert_.code === 100000 || this.alert_.code === 100001) {
      this.alert_.text = this.alert_.text.replace('0.5°F', '0.3°C');
      this.alert_.text = this.alert_.text.replace('1.0°F', '0.8°C');
    }
  }

  var text = $.createElement('div')
    .style({
      'padding-left': (beestat.style.size.gutter / 2)
    })
    .innerHTML(this.alert_.text);
  this.alert_main_.appendChild(text);
};

/**
 * Decorate the detail that appears when you click on an alert.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.alert.prototype.decorate_detail_ = function(parent) {
  var self = this;

  // Detail
  this.alert_detail_ = $.createElement('div')
    .style({
      'max-height': '0',
      'overflow': 'hidden'
    });
  parent.appendChild(this.alert_detail_);

  var row;

  row = $.createElement('div').style({
    'display': 'flex',
    'margin-top': (beestat.style.size.gutter / 2),
    'margin-bottom': (beestat.style.size.gutter / 2)
  });
  this.alert_detail_.appendChild(row);

  var source = $.createElement('div').style('width', '50%');
  row.appendChild(source);
  source.appendChild($.createElement('div')
    .innerHTML('Source')
    .style('font-weight', beestat.style.font_weight.bold));
  source.appendChild($.createElement('div').innerHTML(this.alert_.source));

  var date = $.createElement('div').style('width', '50%');
  row.appendChild(date);
  date.appendChild($.createElement('div')
    .innerHTML('Date')
    .style('font-weight', beestat.style.font_weight.bold));
  var timestamp = moment(this.alert_.timestamp);
  date.appendChild($.createElement('div').innerHTML(timestamp.format('MMM M')));
  // date.appendChild($.createElement('div').innerHTML(timestamp.format('MMM M @ h:mm a')));

  var details = $.createElement('div');
  this.alert_detail_.appendChild(details);
  details.appendChild($.createElement('div')
    .innerHTML('Details')
    .style('font-weight', beestat.style.font_weight.bold));
  details.appendChild(
    $.createElement('div')
      .style('margin-bottom', beestat.style.size.gutter)
      .innerText(this.alert_.details)
  );

  // Actions
  var button_container = $.createElement('div')
    .style({
      'text-align': 'center'
    });
  details.appendChild(button_container);

  // Dismiss
  var dismiss_container = $.createElement('div')
    .style({
      'display': 'inline-block'
    });
  button_container.appendChild(dismiss_container);

  (new beestat.component.button())
    .set_icon('bell_off')
    .set_text('Dismiss')
    .set_background_color(beestat.style.color.red.dark)
    .set_background_hover_color(beestat.style.color.red.light)
    .render(dismiss_container)
    .addEventListener('click', function() {
      new beestat.api()
        .add_call(
          'thermostat',
          'dismiss_alert',
          {
            'thermostat_id': beestat.setting('thermostat_id'),
            'guid': self.alert_.guid
          }
        )
        .send();

      beestat.cache.thermostat[beestat.setting('thermostat_id')].json_alerts.forEach(function(alert) {
        if (alert.guid === self.alert_.guid) {
          alert.dismissed = true;
        }
      });

      restore_container.style('display', 'inline-block');
      dismiss_container.style('display', 'none');

      self.dispatchEvent('dismiss');
    });

  // Restore
  var restore_container = $.createElement('div')
    .style({
      'display': 'inline-block'
    });
  button_container.appendChild(restore_container);

  (new beestat.component.button())
    .set_icon('bell')
    .set_text('Restore')
    .set_background_color(beestat.style.color.red.dark)
    .set_background_hover_color(beestat.style.color.red.light)
    .render(restore_container)
    .addEventListener('click', function() {
      new beestat.api()
        .add_call(
          'thermostat',
          'restore_alert',
          {
            'thermostat_id': beestat.setting('thermostat_id'),
            'guid': self.alert_.guid
          }
        )
        .send();

      beestat.cache.thermostat[beestat.setting('thermostat_id')].json_alerts.forEach(function(alert) {
        if (alert.guid === self.alert_.guid) {
          alert.dismissed = false;
        }
      });

      restore_container.style('display', 'none');
      dismiss_container.style('display', 'inline-block');

      self.dispatchEvent('restore');
    });

  if (this.alert_.dismissed === true) {
    dismiss_container.style('display', 'none');
  } else {
    restore_container.style('display', 'none');
  }
};

/**
 * Add the appropriate event listeners.
 */
beestat.component.alert.prototype.add_event_listeners_ = function() {
  var self = this;

  this.alert_main_.addEventListener('mouseover', function() {
    self.alert_main_.style({
      'background': beestat.style.color.red.dark
    });
  });

  this.alert_main_.addEventListener('mouseout', function() {
    self.alert_main_.style({
      'background': ''
    });
  });

  this.alert_main_.addEventListener('click', function() {
    self.dispatchEvent('click');
  });
};

/**
 * Show the alert. After the transition runs to restore the original height,
 * the height gets set to auto to fix any problems. For example, if you
 * collapse all the elements, then shrink your browser, then go back,
 * everything will get restored to the original (now wrong) heights.
 */
beestat.component.alert.prototype.show = function() {
  var self = this;

  if (
    this.should_show() === true
  ) {
    this.alert_main_.style({
      'height': this.height_,
      'padding-top': (beestat.style.size.gutter / 2),
      'padding-bottom': (beestat.style.size.gutter / 2)
    });

    setTimeout(function() {
      self.alert_main_.style('height', 'auto');
    }, 200);
  }
};

/**
 * Whether or not this alert is marked as dismissed.
 *
 * @return {boolean}
 */
/*
 * beestat.component.alert.prototype.is_dismissed = function() {
 *   return this.alert_.dismissed;
 * };
 */

/**
 * Whether or not the alert should be shown based on it's properties and the
 * current settings.
 *
 * @return {boolean}
 */
beestat.component.alert.prototype.should_show = function() {
  return (
    this.alert_.dismissed === false ||
    beestat.setting('show_dismissed_alerts') === true
  );
};

/**
 * Hide the alert. This gets the element's current height, sets that height,
 * then changes the height to 0. This is because you can't run a transition on
 * a height of auto and I don't have a fixed height for this element.
 */
beestat.component.alert.prototype.hide = function() {
  var self = this;

  this.height_ = this.alert_main_.getBoundingClientRect().height;
  this.alert_main_.style('height', this.height_);

  setTimeout(function() {
    self.alert_main_.style({
      'height': '0',
      'padding-top': '0',
      'padding-bottom': '0'
    });
  }, 0);
};

/**
 * Expand the alert; removes event listeners basically so it's static. Also
 * changes the transition speed on alert detail. When pinning something want
 * the expand to go slower to help prevent a jumpy resize of the parent.
 */
beestat.component.alert.prototype.expand = function() {
  this.alert_main_
    .style({
      'background': beestat.style.color.red.dark,
      'cursor': 'default'
    })
    .removeEventListener('mouseover')
    .removeEventListener('mouseout')
    .removeEventListener('click');

  this.alert_detail_.style({
    'transition': 'all 400ms ease',
    'max-height': '250px'
  });
};

/**
 * Collapse the alert; re-adds the event listeners. Also changes the
 * transition speed on alert detail. When unpinning something want the
 * collapse to go faster to help prevent a jumpy resize of the parent.
 */
beestat.component.alert.prototype.collapse = function() {
  this.alert_main_
    .style({
      'background': '',
      'cursor': 'pointer'
    });
  this.add_event_listeners_();

  this.alert_detail_.style({
    'transition': 'all 100ms ease',
    'max-height': '0'
  });
};
