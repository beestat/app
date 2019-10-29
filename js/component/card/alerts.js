/**
 * Alerts
 */
beestat.component.card.alerts = function() {
  beestat.component.card.apply(this, arguments);
  this.alert_components_ = [];
};
beestat.extend(beestat.component.card.alerts, beestat.component.card);

/**
 * Decorate all of the individual alert components.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.alerts.prototype.decorate_contents_ = function(parent) {
  var self = this;

  parent.style({
    'transition': 'background 200ms ease',
    'position': 'relative',
    'min-height': '100px' // Gives the thumbs up a bit of space
  });
  this.parent_ = parent;

  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];

  // No alerts
  this.no_alerts_ = $.createElement('div')
    .style({
      'position': 'absolute',
      'top': '50%',
      'left': '50%',
      'transform': 'translate(-50%, -50%) scale(0)',
      'transition': 'transform 200ms ease'
    });
  parent.appendChild(this.no_alerts_);

  (new beestat.component.icon('thumb_up')
    .set_size(64)
    .set_color(beestat.style.color.bluegray.light)
  ).render(this.no_alerts_);

  thermostat.alerts.forEach(function(alert) {
    var alert_component = new beestat.component.alert(alert);

    alert_component.addEventListener('click', function() {
      self.pin_(alert_component);
    });

    alert_component.addEventListener('dismiss', function() {
      if (beestat.setting('show_dismissed_alerts') === false) {
        this.hide();
      }
      self.back_();
    });

    alert_component.addEventListener('restore', function() {
      self.back_();
    });

    alert_component.render(parent);
    self.alert_components_.push(alert_component);
  });

  self.show_or_hide_();

  // Back handler
  this.addEventListener('back', function() {
    self.unpin_();
  });
};

/**
 * Expand the passed alert component, then hide the rest.
 *
 * @param {beestat.component.alert} alert_component
 */
beestat.component.card.alerts.prototype.pin_ = function(alert_component) {
  var self = this;

  this.show_back_();

  this.pinned_alert_component_ = alert_component;
  this.pinned_alert_component_.expand();

  this.alert_components_.forEach(function(this_alert_component) {
    if (this_alert_component !== self.pinned_alert_component_) {
      this_alert_component.hide();
    }
  });
};

/**
 * Collapse the open alert component, then show the hidden ones.
 */
beestat.component.card.alerts.prototype.unpin_ = function() {
  var self = this;

  if (this.pinned_alert_component_ !== undefined) {
    this.pinned_alert_component_.collapse();
  }

  this.alert_components_.forEach(function(this_alert_component) {
    if (this_alert_component !== self.pinned_alert_component_) {
      this_alert_component.show();
    }
  });

  this.show_or_hide_();

  delete this.pinned_alert_component_;
};

/**
 * Get the title of the card.
 *
 * @return {string}
 */
beestat.component.card.alerts.prototype.get_title_ = function() {
  return 'Alerts';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.alerts.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  var menu_item_show = new beestat.component.menu_item()
    .set_text('Show dismissed')
    .set_icon('bell')
    .set_callback(function() {
      menu_item_hide.show();
      menu_item_show.hide();

      beestat.setting('show_dismissed_alerts', true);

      self.show_or_hide_();
      self.unpin_();
    });
  menu.add_menu_item(menu_item_show);

  var menu_item_hide = new beestat.component.menu_item()
    .set_text('Hide dismissed')
    .set_icon('bell_off')
    .set_callback(function() {
      menu_item_hide.hide();
      menu_item_show.show();

      beestat.setting('show_dismissed_alerts', false);

      self.show_or_hide_();
      self.unpin_();
    });
  menu.add_menu_item(menu_item_hide);

  if (beestat.setting('show_dismissed_alerts') === true) {
    menu_item_hide.show();
    menu_item_show.hide();
  } else {
    menu_item_hide.hide();
    menu_item_show.show();
  }

  var menu_item_help = new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      (new beestat.component.modal.help_alerts()).render();
    });
  menu.add_menu_item(menu_item_help);
};

/**
 * Look at all of the existing alerts and determine if any UI changes need to
 * be made (show/hide, background colors, etc).
 */
beestat.component.card.alerts.prototype.show_or_hide_ = function() {
  var has_alerts = false;

  this.alert_components_.forEach(function(alert_component) {
    var should_show = alert_component.should_show();

    has_alerts = has_alerts || should_show;

    if (should_show === true) {
      alert_component.show();
    } else {
      alert_component.hide();
    }
  });

  if (has_alerts === true) {
    this.parent_.style('background', beestat.style.color.red.base);
    this.no_alerts_.style('transform', 'translate(-50%, -50%) scale(0)');
  } else {
    this.parent_.style('background', beestat.style.color.bluegray.base);
    this.no_alerts_.style('transform', 'translate(-50%, -50%) scale(1)');
  }
};
