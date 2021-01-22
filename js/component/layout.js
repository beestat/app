/**
 * Takes a bunch of rows/columns and lays them out nicely on the page.
 *
 * @param {Array} rows
 */
beestat.component.layout = function(rows) {
  this.rows_ = rows;
  beestat.component.apply(this, arguments);
};
beestat.extend(beestat.component.layout, beestat.component);

/**
 * Decorate. Not much thinking to be done here; all the grid layout stuff is
 * built in CSS.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.layout.prototype.decorate_ = function(parent) {
  this.rows_.forEach(function(row) {
    var row_element = $.createElement('div').addClass('row');
    parent.appendChild(row_element);

    // Create the columns
    row.forEach(function(column) {
      var column_element = $.createElement('div')
        .addClass('column')
        .addClass('column_' + column.size);
      row_element.appendChild(column_element);

      column.card.render(column_element);
    });
  });
};
