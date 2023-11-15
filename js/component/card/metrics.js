/**
 * Metrics card.
 *
 * @param {number} thermostat_id The thermostat_id this card is displaying
 * data for.
 */
beestat.component.card.metrics = function(thermostat_id) {
  this.thermostat_id_ = thermostat_id;

  var self = this;

  /*
   * Debounce so that multiple setting changes don't re-trigger the same
   * event. This fires on the trailing edge so that all changes are accounted
   * for when rerendering.
   */
  var change_function = beestat.debounce(function() {
    self.rerender();
  }, 10);

  beestat.dispatcher.addEventListener(
    [
      'cache.data.metrics',
      'cache.thermostat'
    ],
    change_function
  );

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.metrics, beestat.component.card);

beestat.component.card.metrics.prototype.rerender_on_resize_ = true;

/**
 * Decorate
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.metrics.prototype.decorate_contents_ = function(parent) {
  if (beestat.cache.data.metrics === undefined) {
    parent.appendChild($.createElement('div').style('height', '100px'));
    this.show_loading_('Fetching');
  } else {
    /**
     * An entry for every possible metric is always returned for clarity.
     * Remove the children with no data and then the parents with no children.
     */
    this.filtered_metrics_ = {};
    let metric_count = 0;
    for (const parent_metric_name in beestat.cache.data.metrics) {
      for (const child_metric_name in beestat.cache.data.metrics[parent_metric_name]) {
        if (beestat.cache.data.metrics[parent_metric_name][child_metric_name] !== null) {
          if (this.filtered_metrics_[parent_metric_name] === undefined) {
            this.filtered_metrics_[parent_metric_name] = {};
          }
          this.filtered_metrics_[parent_metric_name][child_metric_name] = beestat.cache.data.metrics[parent_metric_name][child_metric_name];
          metric_count++;
        }
      }
    }

    if (metric_count === 0) {
      this.decorate_empty_(parent);
    } else {
      let column_count = 1;
      if (window.innerWidth > 1000) {
        column_count = 3;
      } else if (window.innerWidth > 800) {
        column_count = 2;
      }
      const column_span = 12 / column_count;

      const columns = [];
      const row = $.createElement('div').addClass('row');
      parent.appendChild(row);

      for (let i = 0; i < column_count; i++) {
        const column = $.createElement('div')
          .addClass([
            'column',
            'column_' + column_span
          ]);
        row.appendChild(column);
        columns.push({
          'size': 0,
          'element': column
        });
      }

      const get_smallest_column = function() {
        let smallest_column = columns[0];
        columns.forEach(function(column) {
          if (column.size < smallest_column.size) {
            smallest_column = column;
          }
        });

        return smallest_column;
      };

      for (const parent_metric_name in this.filtered_metrics_) {
        const group_size = Object.keys(this.filtered_metrics_[parent_metric_name]).length;
        const smallest_column = get_smallest_column();
        this.decorate_group_(smallest_column.element, parent_metric_name);
        smallest_column.size += group_size;
      }
    }
  }
};

/**
 * Put a message in there if no data is present.
 *
 * @param {rocket.Elements} parent Parent
 */
beestat.component.card.metrics.prototype.decorate_empty_ = function(parent) {
  parent.appendChild($.createElement('p').innerText('We couldn\'t generate any metrics for your system. Try broadening your comparison settings and ensuring your system type and thermostat address are properly set.'));
};

/**
 * Decorate a group of metrics.
 *
 * @param {rocket.Elements} parent Parent
 * @param {string} parent_metric_name The name of the group.
 */
beestat.component.card.metrics.prototype.decorate_group_ = function(parent, parent_metric_name) {
  const parent_metric = this.filtered_metrics_[parent_metric_name];

  const title = parent_metric_name
    .replace(/_/g, ' ')
    .replace(/^(.)|\s+(.)/g, function($1) {
      return $1.toUpperCase();
    });

  parent.appendChild($.createElement('p').innerText(title));

  const metric_container = $.createElement('div');
  parent.appendChild(metric_container);

  for (const child_metric_name in parent_metric) {
    const div = $.createElement('div')
      .style({
        'background': beestat.style.color.bluegray.dark,
        'margin-bottom': beestat.style.size.gutter / 4
      });
    metric_container.appendChild(div);
    (new beestat.component.metric[parent_metric_name][child_metric_name](this.thermostat_id_)).render(div);
  }
};

/**
 * Get the title of the card.
 *
 * @return {string} The title of the card.
 */
beestat.component.card.metrics.prototype.get_title_ = function() {
  return 'Metrics';
};

/**
 * Decorate the menu.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.metrics.prototype.decorate_top_right_ = function(parent) {
  const menu = (new beestat.component.menu()).render(parent);

  menu.add_menu_item(new beestat.component.menu_item()
    .set_text('Help')
    .set_icon('help_circle')
    .set_callback(function() {
      window.open('https://doc.beestat.io/ebfdf00f7f34436c980cd6344a767a12');
    }));
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.metrics.prototype.get_subtitle_ = function() {
  const thermostat = beestat.cache.thermostat[this.thermostat_id_];

  // If the profile has not yet been generated.
  if (thermostat.profile === null) {
    return null;
  }

  const generated_at_m = moment(
    thermostat.profile.metadata.generated_at
  );

  let duration_text = '';

  // How much data was used to generate this.
  const duration_weeks = Math.round(thermostat.profile.metadata.duration / 7);
  duration_text += ' from the past';
  if (duration_weeks === 0) {
    duration_text += ' few days';
  } else if (duration_weeks === 1) {
    duration_text += ' week';
  } else if (duration_weeks >= 52) {
    duration_text += ' year';
  } else {
    duration_text += ' ' + duration_weeks + ' weeks';
  }
  duration_text += ' of data';

  return 'Generated ' + generated_at_m.format('MMM Do @ h a') + duration_text + ' (updated weekly).';
};
