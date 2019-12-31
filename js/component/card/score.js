/**
 * Parent score card.
 */
beestat.component.card.score = function() {
  var self = this;

  /*
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var data_change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    'cache.data.comparison_scores_' + this.type_,
    data_change_function
  );

  beestat.component.card.apply(this, arguments);

  this.layer_.register_loader(beestat.home_comparisons.get_comparison_scores);
};
beestat.extend(beestat.component.card.score, beestat.component.card);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.score.prototype.decorate_contents_ = function(parent) {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[
    thermostat.thermostat_group_id
  ];

  if (
    beestat.cache.data['comparison_scores_' + this.type_] === undefined
  ) {
    // Height buffer so the cards don't resize after they load.
    parent.appendChild($.createElement('div')
      .style('height', '166px')
      .innerHTML('&nbsp;'));
    this.show_loading_('Calculating');
  } else {
    var percentile;
    if (
      thermostat_group.temperature_profile[this.type_] !== undefined &&
      beestat.cache.data['comparison_scores_' + this.type_].length > 2
    ) {
      percentile = this.get_percentile_(
        thermostat_group.temperature_profile[this.type_].score,
        beestat.cache.data['comparison_scores_' + this.type_]
      );
    } else {
      percentile = null;
    }

    var color;
    if (percentile > 70) {
      color = beestat.style.color.green.base;
    } else if (percentile > 50) {
      color = beestat.style.color.yellow.base;
    } else if (percentile > 25) {
      color = beestat.style.color.orange.base;
    } else if (percentile !== null) {
      color = beestat.style.color.red.base;
    } else {
      color = '#fff';
    }

    var container = $.createElement('div')
      .style({
        'text-align': 'center',
        'position': 'relative',
        'margin-top': beestat.style.size.gutter
      });
    parent.appendChild(container);

    var percentile_text;
    var percentile_font_size;
    var percentile_color;
    if (percentile !== null) {
      percentile_text = '';
      percentile_font_size = 48;
      percentile_color = '#fff';
    } else if (
      thermostat_group['system_type_' + this.type_] === null ||
      thermostat_group['system_type_' + this.type_] === 'none'
    ) {
      percentile_text = 'None';
      percentile_font_size = 16;
      percentile_color = beestat.style.color.gray.base;
    } else {
      percentile_text = 'Insufficient data';
      percentile_font_size = 16;
      percentile_color = beestat.style.color.yellow.base;
    }

    var percentile_div = $.createElement('div')
      .innerText(percentile_text)
      .style({
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'transform': 'translate(-50%, -50%)',
        'font-size': percentile_font_size,
        'font-weight': beestat.style.font_weight.light,
        'color': percentile_color
      });
    container.appendChild(percentile_div);

    var stroke = 3;
    var size = 150;
    var diameter = size - stroke;
    var radius = diameter / 2;
    var circumference = Math.PI * diameter;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('height', size);
    svg.setAttribute('width', size);
    svg.style.transform = 'rotate(-90deg)';
    container.appendChild(svg);

    var background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    background.setAttribute('cx', (size / 2));
    background.setAttribute('cy', (size / 2));
    background.setAttribute('r', radius);
    background.setAttribute('stroke', beestat.style.color.bluegray.dark);
    background.setAttribute('stroke-width', stroke);
    background.setAttribute('fill', 'none');
    svg.appendChild(background);

    var stroke_dasharray = circumference;
    var stroke_dashoffset_initial = stroke_dasharray;
    var stroke_dashoffset_final = stroke_dasharray * (1 - (percentile / 100));

    var foreground = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    foreground.style.transition = 'stroke-dashoffset 1s ease';
    foreground.setAttribute('cx', (size / 2));
    foreground.setAttribute('cy', (size / 2));
    foreground.setAttribute('r', radius);
    foreground.setAttribute('stroke', color);
    foreground.setAttribute('stroke-width', stroke);
    foreground.setAttribute('stroke-linecap', 'round');
    foreground.setAttribute('stroke-dasharray', stroke_dasharray);
    foreground.setAttribute('stroke-dashoffset', stroke_dashoffset_initial);
    foreground.setAttribute('fill', 'none');
    svg.appendChild(foreground);

    /*
     * For some reason the render event (which is timeout 0) doesn't work well
     * here.
     */
    setTimeout(function() {
      foreground.setAttribute('stroke-dashoffset', stroke_dashoffset_final);

      if (percentile !== null) {
        $.step(
          function(percentage, sine) {
            var calculated_percentile = Math.round(percentile * sine);
            percentile_div.innerText(calculated_percentile);
          },
          1000,
          null,
          30
        );
      }
    }, 100);
  }
};

/**
 * Get the percentile rank of a score in a set of scores.
 *
 * @param {number} score
 * @param {array} scores
 *
 * @return {number} The percentile rank.
 */
beestat.component.card.score.prototype.get_percentile_ = function(score, scores) {
  var n = scores.length;
  var below = 0;
  scores.forEach(function(s) {
    if (s < score) {
      below++;
    }
  });

  return Math.round(below / n * 100);
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.score.prototype.decorate_top_right_ = function(parent) {
  var self = this;

  var menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://www.notion.so/Comparison-Scores-144d5dafbc6c43f7bc72341120717d8a');
    }));
};

/**
 * Get subtitle.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.score.prototype.get_subtitle_ = function() {
  var thermostat = beestat.cache.thermostat[beestat.setting('thermostat_id')];
  var thermostat_group = beestat.cache.thermostat_group[
    thermostat.thermostat_group_id
  ];

  if (
    beestat.cache.data['comparison_scores_' + this.type_] !== undefined &&
    beestat.cache.data['comparison_scores_' + this.type_].length > 2 &&
    thermostat_group.temperature_profile[this.type_] !== null
  ) {
    return 'Comparing to ' + Number(beestat.cache.data['comparison_scores_' + this.type_].length).toLocaleString() + ' Homes';
  }

  return 'N/A';

};
