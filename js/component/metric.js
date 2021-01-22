/**
 * Generic customizable metric.
 */
beestat.component.metric = function() {
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.metric, beestat.component);

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.metric.prototype.decorate_ = function(parent) {
  if (beestat.cache.data.metrics === undefined) { // todo
    parent.appendChild($.createElement('div').innerText('Loading...'));
    return;
  }

  var outer_container = $.createElement('div').style({
    'background': beestat.style.color.bluegray.dark,
    'padding': (beestat.style.size.gutter / 2)
  });

  outer_container.appendChild(
    $.createElement('div').innerText(this.get_title_())
  );

  var inner_container = $.createElement('div').style({
    'position': 'relative',
    'margin-top': '50px',
    'margin-bottom': '20px',
    'margin-left': '25px'
  });

  var icon = $.createElement('div').style({
    'position': 'absolute',
    'top': '-12px',
    'left': '-28px'
  });

  (new beestat.component.icon(this.get_icon_()))
    .set_color(this.get_color_())
    .render(icon);

  var line = $.createElement('div').style({
    'background': this.get_color_(),
    'height': '5px',
    'border-radius': '5px'
  });

  var min = $.createElement('div')
    .innerText(this.get_min_(true))
    .style({
      'position': 'absolute',
      'top': '10px',
      'left': '0px'
    });

  var max = $.createElement('div')
    .innerText(this.get_max_(true))
    .style({
      'position': 'absolute',
      'top': '10px',
      'right': '0px'
    });

  var label = $.createElement('div')
    .innerText(this.get_value_())
    .style({
      'position': 'absolute',
      'top': '-25px',
      'left': this.get_marker_position_() + '%',
      'width': '100px',
      'text-align': 'center',
      'margin-left': '-50px',
      'font-weight': beestat.style.font_weight.bold
    });

  var circle = $.createElement('div').style({
    'background': this.get_color_(),
    'position': 'absolute',
    'top': '-4px',
    'left': this.get_marker_position_() + '%',
    'margin-left': '-7px',
    'width': '14px',
    'height': '14px',
    'border-radius': '50%'
  });

  var chart = $.createElement('div').style({
    'position': 'absolute',
    'top': '-40px',
    'left': '0px',
    'width': '100%',
    'height': '40px'
  });

  var histogram = this.get_histogram_();
  var histogram_max = this.get_histogram_max_();
  var column_width = (100 / histogram.length) + '%';
  histogram.forEach(function(data) {
    var column = $.createElement('div').style({
      'display': 'inline-block',
      'background': 'rgba(255, 255, 255, 0.1)',
      'width': column_width,
      'height': (data.count / histogram_max * 100) + '%'
    });
    chart.appendChild(column);
  });

  inner_container.appendChild(icon);
  inner_container.appendChild(line);
  inner_container.appendChild(min);
  inner_container.appendChild(max);
  inner_container.appendChild(label);
  inner_container.appendChild(circle);
  inner_container.appendChild(chart);

  outer_container.appendChild(inner_container);

  parent.appendChild(outer_container);
};

beestat.component.metric.prototype.get_marker_position_ = function() {
  return 100 * (this.get_value_() - this.get_min_()) / (this.get_max_() - this.get_min_());
};

beestat.component.metric.prototype.get_histogram_max_ = function() {
  var max = -Infinity;
  this.get_histogram_().forEach(function(data) {
    max = Math.max(max, data.count);
  });
  return max;
};
