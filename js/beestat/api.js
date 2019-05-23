beestat.api2 = function() {
  this.api_calls_ = [];
};

/**
 * Stores cached responses statically across all API calls.
 *
 * @type {Object}
 */
beestat.api2.cache = {};

// if (window.localStorage.getItem('api_cache') !== null) {
//   beestat.api2.cache = JSON.parse(window.localStorage.getItem('api_cache'));
// }

/**
 * Beestat's local API key.
 *
 * @type {string}
 */
beestat.api2.api_key = 'ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2';

/**
 * Send an API call. If the api_call parameter is specified it will send that.
 * If not, it will check the cache, then construct and send the appropriate
 * API call if necessary.
 *
 * @param {Object=} opt_api_call The API call object.
 *
 * @return {beestat.api2} This.
 */
beestat.api2.prototype.send = function(opt_api_call) {
  var self = this;

  this.xhr_ = new XMLHttpRequest();

  // If passing an actual API call, fire it off!
  if (opt_api_call !== undefined) {
    // Add in the API key
    opt_api_call.api_key = beestat.api2.api_key;

    // Build the query string
    var query_string = Object.keys(opt_api_call)
      .map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(opt_api_call[k]);
      })
      .join('&');

    this.xhr_.addEventListener('load', function() {
      self.load_(this.responseText);
    });
    this.xhr_.open('POST', '../api/?' + query_string);
    this.xhr_.send();
  } else {
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
        // If no API calls left, just fire off the callback with the data.
        if (this.callback_ !== undefined) {
          this.callback_(this.cached_batch_api_calls_);
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
          this.callback_(cached.data);
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
 * @return {beestat.api2} This.
 */
beestat.api2.prototype.add_call = function(resource, method, opt_args, opt_alias) {
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
 * @return {beestat.api2} This.
 */
beestat.api2.prototype.set_callback = function(callback) {
  this.callback_ = callback;

  return this;
};

/**
 * Fires after an XHR request returns.
 *
 * @param {string} response_text Whatever the XHR request returned.
 */
beestat.api2.prototype.load_ = function(response_text) {
  var response;
  try {
    response = window.JSON.parse(response_text);
  } catch (e) {
    beestat.error('API returned invalid response.', response_text);
    return;
  }

  // Error handling
  if (
    response.data &&
    (
      response.data.error_code === 1004 || // Session is expired.
      response.data.error_code === 10001 || // Could not get first token.
      response.data.error_code === 10002 || // Could not refresh ecobee token; no token found.
      response.data.error_code === 10003 // Could not refresh ecobee token; ecobee returned no token.
    )
  ) {
    window.location.href = '/';
    return;
  } else if (response.data && response.data.error_code === 1209) {
    // Could not get lock; safe to ignore as that means sync is running.
  } else if (response.success !== true) {
    beestat.error(
      'API call failed: ' + response.data.error_message,
      JSON.stringify(response, null, 2)
    );
  }

  // Cach responses
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
beestat.api2.prototype.is_batch_ = function() {
  return this.api_calls_.length > 1;
};

/**
 * Cache an API call.
 *
 * @param {Object} api_call The API call object.
 * @param {*} data The data to cache.
 * @param {string} until Timestamp to cache until.
 */
beestat.api2.prototype.cache_ = function(api_call, data, until) {
  var server_date = moment(this.xhr_.getResponseHeader('date'));
  var duration = moment.duration(moment(until).diff(server_date));

  beestat.api2.cache[this.get_key_(api_call)] = {
    'data': data,
    'until': moment().add(duration.asSeconds(), 'seconds')
  };

  /**
   * Save the cache to localStorage to persist across reloads. It just happens
   * to be annoying that localStorage only supports strings so I prefer to
   * deal with myself.
   */
  // window.localStorage.setItem(
  //   'api_cache',
  //   window.JSON.stringify(beestat.api2.cache)
  // );
};

/**
 * Look for cached data for an API call and return it if not expired.
 *
 * @param {Object} api_call The API call object.
 *
 * @return {*} The cached data, or undefined if none.
 */
beestat.api2.prototype.get_cached_ = function(api_call) {
  var cached = beestat.api2.cache[this.get_key_(api_call)];
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
beestat.api2.prototype.get_key_ = function(api_call) {
  return api_call.resource + '.' + api_call.method + '.' + api_call.arguments;
};

// TODO OLD DELETE THIS
beestat.api = function(resource, method, args, callback) {
  var xhr = new XMLHttpRequest();

  var load = function() {
    var response;
    try {
      response = window.JSON.parse(this.responseText);
    } catch (e) {
      beestat.error('API returned invalid response.', this.responseText);
      return;
    }

    if (
      response.data &&
      (
        response.data.error_code === 1004 || // Session is expired.
        response.data.error_code === 10001 || // Could not get first token.
        response.data.error_code === 10002 || // Could not refresh ecobee token; no token found.
        response.data.error_code === 10003 // Could not refresh ecobee token; ecobee returned no token.
      )
    ) {
      window.location.href = '/';
    } else if (response.data && response.data.error_code === 1209) {
      // Could not get lock; safe to ignore as that means sync is running.
    } else if (response.success !== true) {
      beestat.error(
        'API call failed: ' + response.data.error_message,
        JSON.stringify(response, null, 2)
      );
    } else if (callback !== undefined) {
      callback(response.data);
    }
  };
  xhr.addEventListener('load', load);

  var api_key = 'ER9Dz8t05qUdui0cvfWi5GiVVyHP6OB8KPuSisP2';
  if (resource === 'api' && method === 'batch') {
    args.forEach(function(api_call, i) {
      if (args[i].arguments !== undefined) {
        args[i].arguments = JSON.stringify(args[i].arguments);
      }
    });
    xhr.open(
      'POST',
      '../api/?batch=' + JSON.stringify(args) +
      '&api_key=' + api_key
    );
  } else {
    xhr.open(
      'POST',
      '../api/?resource=' + resource +
      '&method=' + method +
      (args === undefined ? '' : '&arguments=' + JSON.stringify(args)) +
      '&api_key=' + api_key
    );
  }

  xhr.send();
};
