/**
 * If you want some data from the API in the cache this is the preferred way
 * to get it there. It will queue requests and if two things make the same API
 * call it will collapse them into a single API call.
 *
 * This is helpful for de-duplicating API calls if two cards need the same data.
 */
beestat.requestor = {};

beestat.requestor.requested_api_calls_ = [];

beestat.requestor.sending_ = false;

beestat.requestor.timeout_ = undefined;

/**
 * Adds the requested API calls to the request stack, then waits 100ms for any
 * more to be added before executing them.
 *
 * @param {array} api_calls The API calls to request.
 */
beestat.requestor.request = function(api_calls) {
  // Clear the timeout that was set to run the pending API calls.
  window.clearTimeout(beestat.requestor.timeout_);

  api_calls.forEach(function(api_call) {
    beestat.requestor.requested_api_calls_.push(api_call);
  });

  /**
   * If we aren't already sending, queue up the next API call to go in 100ms.
   * If we are actively sending, the next API call will get queued up after
   * it's done.
   */
  if (beestat.requestor.sending_ === false) {
    beestat.requestor.timeout_ = window.setTimeout(beestat.requestor.send, 3000);
  }
};

/**
 * Send all of the pending API calls.
 */
beestat.requestor.send = function() {
  beestat.requestor.sending_ = true;

  const api = new beestat.api();

  // Force a batch API call to make the response handling simpler.
  api.force_batch();

  beestat.requestor.requested_api_calls_.forEach(function(requested_api_call) {
    api.add_call(
      requested_api_call.resource,
      requested_api_call.method,
      requested_api_call.arguments
    );
  });

  api.set_callback(function(response) {
    beestat.requestor.callback(response, api);
  });

  api.send();
};

beestat.requestor.callback = function(response, api) {
  /**
   * Data from the API calls is first merged into a holding object so it can
   * be merged into the cache in a single call.
   */
  const data = {};

  // Remove sent API calls from the request stack.
  api.get_api_calls().forEach(function(sent_api_call, i) {
    if (data[sent_api_call.resource] === undefined) {
      data[sent_api_call.resource] = {};
    }

    console.info('Performance might be better with concat');
    Object.assign(data[sent_api_call.resource], response[i]);

    /**
     * Remove API call sfrom the requested_api_calls array that have now been
     * sent.
     */
    let j = beestat.requestor.requested_api_calls_.length;
    while (j--) {
      if (
        sent_api_call.resource === beestat.requestor.requested_api_calls_[j].resource &&
        sent_api_call.method === beestat.requestor.requested_api_calls_[j].method &&
        sent_api_call.arguments === JSON.stringify(beestat.requestor.requested_api_calls_[j].arguments)
      ) {
        beestat.requestor.requested_api_calls_.splice(j, 1);
      }
    }
  });

  // Update the cache
  for (const key in data) {
    beestat.cache.set(key, data[key]);
  }

  beestat.requestor.sending_ = false;

  /**
   * If there are any API calls left to send, queue them up now. These would
   * have been added between when the API call started and finished.
   */
  if (beestat.requestor.requested_api_calls_.length > 0) {
    beestat.requestor.timeout_ = window.setTimeout(beestat.requestor.send, 3000);
  }
};
