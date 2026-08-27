/**
 * Clean, white, brand-forward card advertising Songstead, a totally
 * unrelated side project. Deliberately breaks from the standard beestat
 * card look so it reads as its own thing rather than a beestat feature.
 */
beestat.component.card.songstead_promo = function() {
  var self = this;

  beestat.dispatcher.addEventListener([
    'setting.songstead.promo_dismissed'
  ], function() {
    self.rerender();
  });

  beestat.component.card.apply(this, arguments);
};
beestat.extend(beestat.component.card.songstead_promo, beestat.component.card);

// Rerender on resize so the CTA button width can respond to the viewport.
beestat.component.card.songstead_promo.prototype.rerender_on_resize_ = true;

beestat.component.card.songstead_promo.prototype.decorate_contents_ = function(parent) {
  var self = this;

  // Don't render anything if this user isn't in the test group or already dismissed it.
  if (beestat.component.card.songstead_promo.should_show() === false) {
    window.setTimeout(function() {
      self.dispose();
    }, 0);
    return;
  }

  parent.style({
    'background': '#fff',
    'color': beestat.style.color.bluegray.dark
  });

  var is_mobile = window.innerWidth <= 600;

  var row = document.createElement('div');
  Object.assign(row.style, {
    'clear': 'both',
    'display': 'grid',
    'grid-template-columns': '1fr',
    'gap': beestat.style.size.gutter + 'px'
  });
  parent.appendChild(row);

  // Copy
  var copy = document.createElement('div');
  copy.style.minWidth = '0';
  row.appendChild(copy);

  var eyebrow = document.createElement('div');
  eyebrow.innerText = 'A note from the developer';
  Object.assign(eyebrow.style, {
    'font-size': beestat.style.font_size.small,
    'font-weight': beestat.style.font_weight.bold,
    'letter-spacing': '1px',
    'text-transform': 'uppercase',
    'color': beestat.style.color.gray.dark,
    'margin-bottom': '4px'
  });
  copy.appendChild(eyebrow);

  var headline = document.createElement('div');
  headline.innerText = 'Introducing Songstead';
  Object.assign(headline.style, {
    'font-size': '18px',
    'font-weight': beestat.style.font_weight.bold,
    'color': beestat.style.color.bluegray.dark,
    'margin-bottom': '4px'
  });
  copy.appendChild(headline);

  var body = document.createElement('div');
  body.innerText = 'Are you a musician, taking lessons, or just curious what else I\'ve been up to? Check out my latest app: Songstead! I built it as a musician, for musicians. It\'s got chord charts, setlists, and sharing tools to keep your band or team organized, plus a generous free tier (best in the space, no credit card needed). It would mean a lot if you tried it out!';
  Object.assign(body.style, {
    'font-size': beestat.style.font_size.normal,
    'font-weight': beestat.style.font_weight.normal,
    'color': beestat.style.color.bluegray.light,
    'line-height': '1.5'
  });
  copy.appendChild(body);

  // CTA
  var cta_container = document.createElement('div');
  cta_container.style.justifySelf = is_mobile === true ? 'stretch' : 'start';
  row.appendChild(cta_container);

  var cta_tile = new beestat.component.tile()
    .set_size('large')
    .set_text('Check it out at songstead.app')
    .set_text_color('#fff')
    .set_background_color(beestat.style.color.lightblue.base)
    .set_background_hover_color(beestat.style.color.lightblue.light)
    .addEventListener('click', function() {
      beestat.setting(
        'songstead.promo_clicked_at',
        moment().utc()
          .format('YYYY-MM-DD HH:mm:ss')
      );
      window.open('https://songstead.app', '_blank');
    });
  cta_tile.render($(cta_container));

  if (is_mobile === true) {
    Object.assign(cta_tile.get_container().style, {
      'width': '100%',
      'justify-content': 'center'
    });
  }
};

/**
 * Decorate the close button. Styled dark-on-light since this card breaks
 * from the standard beestat color scheme.
 *
 * @param {rocket.Elements} parent
 */
beestat.component.card.songstead_promo.prototype.decorate_top_right_ = function(parent) {
  new beestat.component.tile()
    .set_type('pill')
    .set_shadow(false)
    .set_icon('close')
    .set_text_color(beestat.style.color.gray.dark)
    .set_background_hover_color('rgba(0, 0, 0, 0.06)')
    .addEventListener('click', function() {
      beestat.setting('songstead.promo_dismissed', true);
    })
    .render(parent);
};

/**
 * Date the rollout begins at 0%.
 *
 * @type {string}
 */
beestat.component.card.songstead_promo.rollout_start_date = '2026-08-27';

/**
 * Date the rollout reaches 100% of eligible users.
 *
 * @type {string}
 */
beestat.component.card.songstead_promo.rollout_end_date = '2026-09-04';

/**
 * Minimum number of days a user must have been using beestat before they're
 * eligible to see this card. Brand new users are still figuring beestat out;
 * don't hit them with a promo for something else on day one.
 *
 * @type {number}
 */
beestat.component.card.songstead_promo.minimum_user_age_days = 7;

/**
 * Get the current percent of eligible users (0-100) this card is rolled out
 * to. Ramps linearly from 0% on rollout_start_date to 100% on
 * rollout_end_date. User membership is deterministic based on user_id, so
 * this ramps up the rollout over time without reshuffling who already has
 * the card.
 *
 * @return {number} The current rollout percent.
 */
beestat.component.card.songstead_promo.get_rollout_percent = function() {
  var start = moment.utc(
    beestat.component.card.songstead_promo.rollout_start_date
  );
  var end = moment.utc(
    beestat.component.card.songstead_promo.rollout_end_date
  );

  var days_total = end.diff(start, 'days');
  var days_elapsed = moment().utc()
    .diff(start, 'days');

  if (days_elapsed <= 0 || days_total <= 0) {
    return 0;
  }

  if (days_elapsed >= days_total) {
    return 100;
  }

  return Math.round(100 * (days_elapsed / days_total));
};

/**
 * Determine whether or not the current user has been using beestat long
 * enough to be eligible for this card. Users created before the created_at
 * column existed have no date; those accounts are ancient so they qualify.
 *
 * @return {boolean} Whether or not the user is old enough.
 */
beestat.component.card.songstead_promo.user_is_old_enough = function() {
  var created_at = beestat.user.get().created_at;

  if (created_at === null || created_at === undefined) {
    return true;
  }

  return moment.utc(created_at).isSameOrBefore(
    moment().utc()
      .subtract(
        beestat.component.card.songstead_promo.minimum_user_age_days,
        'days'
      )
  );
};

/**
 * Determine whether or not this card should be shown. Shows for a
 * deterministic rollout_percent of users who have been using beestat for at
 * least minimum_user_age_days, and never again once dismissed.
 *
 * @return {boolean} Whether or not to show the card.
 */
beestat.component.card.songstead_promo.should_show = function() {
  if (
    window.is_demo === true ||
    beestat.setting('songstead.promo_dismissed') === true
  ) {
    return false;
  }

  var user_id = beestat.user.get().user_id;

  return (user_id % 100) < beestat.component.card.songstead_promo.get_rollout_percent() &&
    beestat.component.card.songstead_promo.user_is_old_enough() === true;
};
