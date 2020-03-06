/**
 * Pop up a modal error message.
 *
 * @param {string} message The human-readable message.
 * @param {string} detail Technical error details.
 */
beestat.error = function(message, detail) {
  var exception_modal = new beestat.component.modal.error();
  exception_modal.set_message(message);
  exception_modal.set_detail(detail);
  exception_modal.render();
};
