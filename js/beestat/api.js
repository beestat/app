beestat.api = function() {
  this.api_calls_ = [];
};

/**
 * Stores cached responses statically across all API calls.
 *
 * @type {Object}
 */
beestat.api.cache = {};

/**
 * Beestat's local API key.
 *
 * @type {string}
 */
beestat.api.api_key = 'ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2';

/**
 * Send an API call. If the api_call parameter is specified it will send that.
 * If not, it will check the cache, then construct and send the appropriate
 * API call if necessary.
 *
 * @param {Object=} opt_api_call The API call object.
 *
 * @return {beestat.api} This.
 */
beestat.api.prototype.send = function(opt_api_call) {
  var self = this;

  this.xhr_ = new XMLHttpRequest();

  // If passing an actual API call, fire it off!
  if (opt_api_call !== undefined) {
    // Add in the API key
    opt_api_call.api_key = beestat.api.api_key;

    // Build the query string
    var query_string = Object.keys(opt_api_call)
      .map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(opt_api_call[k]);
      })
      .join('&');

    this.xhr_.addEventListener('load', function() {
      self.load_(this.responseText);
    });

    this.xhr_.open('POST', 'api/?' + query_string);
    this.xhr_.send();
  } else {
    if (this.api_calls_.length === 0) {
      throw new Error('Must add at least one API call.');
    }

    if (this.is_batch_() === true) {
      // Only run uncached API calls.
      var uncached_batch_api_calls = [];
      this.cached_batch_api_calls_ = {};
      this.api_calls_.forEach(function(api_call) {
        var cached = self.get_cached_(api_call);
        if (cached === undefined) {
          uncached_batch_api_calls.push(api_call);
        } else {
          self.cached_batch_api_calls_[api_call.alias] = cached.data;
        }
      });

      if (uncached_batch_api_calls.length === 0) {
        /**
         * If no API calls left, just fire off the callback with the data.
         * Timeout makes this behave like an actual API call in terms of
         * program flow. Without this, if there is a rerender() inside a
         * callback, the rerender can happen during a render which causes
         * problems.
         */
        if (this.callback_ !== undefined) {
          setTimeout(function() {
            self.callback_(self.cached_batch_api_calls_);
          }, 0);
        }
      } else {
        // If more than one API call left, fire off a batch API call.
        this.send({'batch': JSON.stringify(uncached_batch_api_calls)});
      }
    } else {
      var single_api_call = this.api_calls_[0];
      var cached = this.get_cached_(single_api_call);
      if (cached !== undefined) {
        if (this.callback_ !== undefined) {
          /**
           * Timeout makes this behave like an actual API call in terms of
           * program flow. Without this, if there is a rerender() inside a
           * callback, the rerender can happen during a render which causes
           * problems.
           */
          setTimeout(function() {
            self.callback_(cached.data);
          }, 0);
        }
      } else {
        this.send(single_api_call);
      }
    }
  }

  return this;
};

/**
 * Add an API call.
 *
 * @param {string} resource The resource.
 * @param {string} method The method.
 * @param {Object=} opt_args Optional arguments.
 * @param {string=} opt_alias Optional alias (required for batch API calls).
 *
 * @return {beestat.api} This.
 */
beestat.api.prototype.add_call = function(resource, method, opt_args, opt_alias) {
  var api_call = {
    'resource': resource,
    'method': method,
    'arguments': JSON.stringify(beestat.default_value(opt_args, {}))
  };
  if (opt_alias !== undefined) {
    api_call.alias = opt_alias;
  }

  this.api_calls_.push(api_call);

  return this;
};

/**
 * Set a callback function to be called once the API call completes.
 *
 * @param {Function} callback The callback function.
 *
 * @return {beestat.api} This.
 */
beestat.api.prototype.set_callback = function(callback) {
  this.callback_ = callback;

  return this;
};

/**
 * Fires after an XHR request returns.
 *
 * @param {string} response_text Whatever the XHR request returned.
 */
beestat.api.prototype.load_ = function(response_text) {
  var response;
  try {
    response = window.JSON.parse(response_text);
  } catch (e) {
    var detail = response_text;
    if (detail === '') {
      detail = this.xhr_.status + ' ' + this.xhr_.statusText;
    }

    beestat.error('API returned invalid response.', detail);
    return;
  }

  // Special handling for these error codes.
  const error_codes = {
    'log_out': [
      1505,  // Session is expired.
      10000, // Could not get first token.
      10001, // Could not refresh ecobee token; no token found.
      10002, // Could not refresh ecobee token; ecobee returned no token.
      10500, // Ecobee access was revoked by user.
      10501  // No ecobee access for this user.
    ],
    'ignore': [
      10601  // Failed to subscribe.
    ]
  };

  // Error handling
  if (
    response.data &&
    error_codes.log_out.includes(response.data.error_code) === true
  ) {
    window.location.href = '/';
    return;
  } else if (
    response.success !== true &&
    error_codes.ignore.includes(response.data.error_code) === false
  ) {
    beestat.error(
      'API call failed: ' + response.data.error_message,
      JSON.stringify(response, null, 2)
    );
    return;
  }

  // Cache responses
  var cached_until_header = this.xhr_.getResponseHeader('beestat-cached-until');

  if (this.is_batch_() === true) {
    var cached_untils = window.JSON.parse(cached_until_header);
    for (var alias in cached_untils) {
      for (var i = 0; i < this.api_calls_.length; i++) {
        if (this.api_calls_[i].alias === alias) {
          this.cache_(
            this.api_calls_[i],
            response.data[alias],
            cached_untils[alias]
          );
        }
      }
    }
  } else {
    if (cached_until_header !== null) {
      this.cache_(this.api_calls_[0], response.data, cached_until_header);
    }
  }

  /*
   * For batch API calls, add in any responses that were pulled out earlier
   * because they were cached.
   */
  if (this.is_batch_() === true) {
    for (var cached_alias in this.cached_batch_api_calls_) {
      response.data[cached_alias] =
        this.cached_batch_api_calls_[cached_alias];
    }
  }

  // Callback
  if (this.callback_ !== undefined) {
    this.callback_(response.data);
  }
};

/**
 * Is this a batch API call? Determined by looking at the number of API calls
 * added. If more than one, batch.
 *
 * @return {boolean} Whether or not this is a batch API call.
 */
beestat.api.prototype.is_batch_ = function() {
  return this.api_calls_.length > 1;
};

/**
 * Cache an API call.
 *
 * @param {Object} api_call The API call object.
 * @param {*} data The data to cache.
 * @param {string} until Timestamp to cache until.
 */
beestat.api.prototype.cache_ = function(api_call, data, until) {
  var server_date = moment(this.xhr_.getResponseHeader('date'));
  var duration = moment.duration(moment.utc(until).diff(server_date));

  beestat.api.cache[this.get_key_(api_call)] = {
    'data': data,
    'until': moment().add(duration.asSeconds(), 'seconds')
  };
};

/**
 * Look for cached data for an API call and return it if not expired.
 *
 * @param {Object} api_call The API call object.
 *
 * @return {*} The cached data, or undefined if none.
 */
beestat.api.prototype.get_cached_ = function(api_call) {
  var cached = beestat.api.cache[this.get_key_(api_call)];
  if (
    cached !== undefined &&
    moment().isAfter(cached.until) === false
  ) {
    return cached;
  }
  return undefined;
};

/**
 * Get a cache key for an API call. There's a lack of hash options in
 * JavaScript so this just concatenates a bunch of stuff together.
 *
 * @param {Object} api_call The API call object.
 *
 * @return {string} The cache key.
 */
beestat.api.prototype.get_key_ = function(api_call) {
  return api_call.resource + '.' + api_call.method + '.' + api_call.arguments;
};
