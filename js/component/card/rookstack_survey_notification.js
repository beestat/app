/**
 * Blue banner asking people to check out a research opportunity.
 */
beestat.component.card.rookstack_survey_notification = function() {
  var self = this;

  beestat.dispatcher.addEventListener([
    'setting.display_2024_equipment_sizing_study_rookstack'
  ], function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.rookstack_survey_notification, beestat.component.card);

beestat.component.card.rookstack_survey_notification.prototype.decorate_contents_ = function(parent) {
  var self = this;

  // Don't render anything if the user is an active Patron.
  if (beestat.component.card.rookstack_survey_notification.should_show() === false) {
    window.setTimeout(function() {
      self.dispose();
    }, 0);
    return;
  }

  parent.style('background', beestat.style.color.blue.base);


  new beestat.component.tile()
    .set_icon('microscope')
    .set_size('large')
    .set_text([
      'I am interested in participating',
      'Learn more'
    ])
    .set_background_color(beestat.style.color.blue.dark)
    .set_background_hover_color(beestat.style.color.blue.light)
    .addEventListener('click', function() {
      beestat.setting('clicked_2024_equipment_sizing_study_rookstack', moment().utc().format('YYYY-MM-DD HH:mm:ss'));
      window.open('https://docs.google.com/presentation/d/1OY8RR6hMeL86ODH5LdxfrZ_es7nnRDq3cG-1qIfS7XI/present#slide=id.p', '_blank');
    })
    .render(parent);
};

/**
 * Get the title of the card.
 *
 * @return {string} The title.
 */
beestat.component.card.rookstack_survey_notification.prototype.get_title_ = function() {
  return 'Research Opportunity';
};

/**
 * Get the subtitle of the card.
 *
 * @return {string} The subtitle.
 */
beestat.component.card.rookstack_survey_notification.prototype.get_subtitle_ = function() {
  return 'Purdue University is looking for participants in a U.S. Department of Energy funded study that aims to develop and Artificial Intelligence solution to residential heating and cooling equipment sizing.';
};

/**
 * Decorate the close button.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.rookstack_survey_notification.prototype.decorate_top_right_ = function(parent) {
  new beestat.component.tile()
    .set_type('pill')
    .set_shadow(false)
    .set_icon('close')
    .set_text_color('#fff')
    .set_background_hover_color(beestat.style.color.blue.light)
    .addEventListener('click', function() {
      beestat.setting('display_2024_equipment_sizing_study_rookstack', false);
    })
    .render(parent);
};

/**
 * Determine whether or not this card should be shown.
 *
 * @return {boolean} Whether or not to show the card.
 */
beestat.component.card.rookstack_survey_notification.should_show = function() {
  return beestat.setting('display_2024_equipment_sizing_study_rookstack') === true;
};
