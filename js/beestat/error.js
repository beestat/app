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

/*
 * Rollbar
 * Define my own error handler first, then Rollbar's (which will call mine after it does it's thing)
 */
window.onerror = function(message) {
  beestat.error('Script error.', message);
  return false;
};
var _rollbarConfig = {
  'accessToken': '5400fd8650264977a97f3ae7fcd226af',
  'captureUncaught': true,
  'captureUnhandledRejections': true,
  'payload': {
    'environment': window.environment
  }
};

if (window.environment === 'live') {
  !(function(r) {
    function o(n) {
      if (e[n]) {
        return e[n].exports;
      } var t = e[n] = {'exports': {},
        'id': n,
        'loaded': !1}; return r[n].call(t.exports, t, t.exports, o), t.loaded = !0, t.exports;
    } var e = {}; return o.m = r, o.c = e, o.p = '', o(0);
  }([
    function(r, o, e) {
      'use strict'; var n = e(1); var t = e(4); _rollbarConfig = _rollbarConfig || {}, _rollbarConfig.rollbarJsUrl = _rollbarConfig.rollbarJsUrl || 'https://cdnjs.cloudflare.com/ajax/libs/rollbar.js/2.5.2/rollbar.min.js', _rollbarConfig.async = void 0 === _rollbarConfig.async || _rollbarConfig.async; var a = n.setupShim(window, _rollbarConfig); var l = t(_rollbarConfig); window.rollbar = n.Rollbar, a.loadFull(window, document, !_rollbarConfig.async, _rollbarConfig, l);
    },
    function(r, o, e) {
      'use strict'; function n(r) {
        return function() {
          try {
            return r.apply(this, arguments);
          } catch (r) {
            try {
              console.error('[Rollbar]: Internal error', r);
            } catch (r) {}
          }
        };
      } function t(r, o) {
        this.options = r, this._rollbarOldOnError = null; var e = s++; this.shimId = function() {
          return e;
        }, typeof window !== 'undefined' && window._rollbarShims && (window._rollbarShims[e] = {'handler': o,
          'messages': []});
      } function a(r, o) {
        if (r) {
          var e = o.globalAlias || 'Rollbar'; if (typeof r[e] === 'object') {
            return r[e];
          } r._rollbarShims = {}, r._rollbarWrappedError = null; var t = new p(o); return n(function() {
            o.captureUncaught && (t._rollbarOldOnError = r.onerror, i.captureUncaughtExceptions(r, t, !0), i.wrapGlobals(r, t, !0)), o.captureUnhandledRejections && i.captureUnhandledRejections(r, t, !0); var n = o.autoInstrument; return o.enabled !== !1 && (void 0 === n || n === !0 || typeof n === 'object' && n.network) && r.addEventListener && (r.addEventListener('load', t.captureLoad.bind(t)), r.addEventListener('DOMContentLoaded', t.captureDomContentLoaded.bind(t))), r[e] = t, t;
          })();
        }
      } function l(r) {
        return n(function() {
          var o = this; var e = Array.prototype.slice.call(arguments, 0); var n = {'shim': o,
            'method': r,
            'args': e,
            'ts': new Date()}; window._rollbarShims[this.shimId()].messages.push(n);
        });
      } var i = e(2); var s = 0; var d = e(3); var c = function(r, o) {
        return new t(r, o);
      }; var p = function(r) {
        return new d(c, r);
      }; t.prototype.loadFull = function(r, o, e, t, a) {
        var l = function() {
          var o; if (void 0 === r._rollbarDidLoad) {
            o = new Error('rollbar.js did not load'); for (var e, i = 0, l, n, t; e = r._rollbarShims[i++];) {
              for (e = e.messages || []; n = e.shift();) {
                for (t = n.args || [], i = 0; i < t.length; ++i) {
                  if (l = t[i], typeof l === 'function') {
                    l(o); break;
                  }
                }
              }
            }
          } typeof a === 'function' && a(o);
        }; var i = !1; var s = o.createElement('script'); var d = o.getElementsByTagName('script')[0]; var c = d.parentNode; s.crossOrigin = '', s.src = t.rollbarJsUrl, e || (s.async = !0), s.onload = s.onreadystatechange = n(function() {
          if (!(i || this.readyState && this.readyState !== 'loaded' && this.readyState !== 'complete')) {
            s.onload = s.onreadystatechange = null; try {
              c.removeChild(s);
            } catch (r) {}i = !0, l();
          }
        }), c.insertBefore(s, d);
      }, t.prototype.wrap = function(r, o, e) {
        try {
          var n; if (n = typeof o === 'function' ? o : function() {
            return o || {};
          }, typeof r !== 'function') {
            return r;
          } if (r._isWrap) {
            return r;
          } if (!r._rollbar_wrapped && (r._rollbar_wrapped = function() {
            e && typeof e === 'function' && e.apply(this, arguments); try {
              return r.apply(this, arguments);
            } catch (e) {
              var o = e; throw o && (typeof o === 'string' && (o = new String(o)), o._rollbarContext = n() || {}, o._rollbarContext._wrappedSource = r.toString(), window._rollbarWrappedError = o), o;
            }
          }, r._rollbar_wrapped._isWrap = !0, r.hasOwnProperty)) {
            for (var t in r) {
              r.hasOwnProperty(t) && (r._rollbar_wrapped[t] = r[t]);
            }
          } return r._rollbar_wrapped;
        } catch (o) {
          return r;
        }
      }; for (var u = 'log,debug,info,warn,warning,error,critical,global,configure,handleUncaughtException,handleUnhandledRejection,captureEvent,captureDomContentLoaded,captureLoad'.split(','), f = 0; f < u.length; ++f) {
        t.prototype[u[f]] = l(u[f]);
      }r.exports = {'setupShim': a,
        'Rollbar': p};
    },
    function(r, o) {
      'use strict'; function e(r, o, e) {
        if (r) {
          var t; if (typeof o._rollbarOldOnError === 'function') {
            t = o._rollbarOldOnError;
          } else if (r.onerror) {
            for (t = r.onerror; t._rollbarOldOnError;) {
              t = t._rollbarOldOnError;
            }o._rollbarOldOnError = t;
          } var a = function() {
            var e = Array.prototype.slice.call(arguments, 0); n(r, o, t, e);
          }; e && (a._rollbarOldOnError = t), r.onerror = a;
        }
      } function n(r, o, e, n) {
        r._rollbarWrappedError && (n[4] || (n[4] = r._rollbarWrappedError), n[5] || (n[5] = r._rollbarWrappedError._rollbarContext), r._rollbarWrappedError = null), o.handleUncaughtException.apply(o, n), e && e.apply(r, n);
      } function t(r, o, e) {
        if (r) {
          typeof r._rollbarURH === 'function' && r._rollbarURH.belongsToShim && r.removeEventListener('unhandledrejection', r._rollbarURH); var n = function(r) {
            var e; var n; var t; try {
              e = r.reason;
            } catch (r) {
              e = void 0;
            } try {
              n = r.promise;
            } catch (r) {
              n = '[unhandledrejection] error getting `promise` from event';
            } try {
              t = r.detail, !e && t && (e = t.reason, n = t.promise);
            } catch (r) {}e || (e = '[unhandledrejection] error getting `reason` from event'), o && o.handleUnhandledRejection && o.handleUnhandledRejection(e, n);
          }; n.belongsToShim = e, r._rollbarURH = n, r.addEventListener('unhandledrejection', n);
        }
      } function a(r, o, e) {
        if (r) {
          var n; var t; var a = 'EventTarget,Window,Node,ApplicationCache,AudioTrackList,ChannelMergerNode,CryptoOperation,EventSource,FileReader,HTMLUnknownElement,IDBDatabase,IDBRequest,IDBTransaction,KeyOperation,MediaController,MessagePort,ModalWindow,Notification,SVGElementInstance,Screen,TextTrack,TextTrackCue,TextTrackList,WebSocket,WebSocketWorker,Worker,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload'.split(','); for (n = 0; n < a.length; ++n) {
            t = a[n], r[t] && r[t].prototype && l(o, r[t].prototype, e);
          }
        }
      } function l(r, o, e) {
        if (o.hasOwnProperty && o.hasOwnProperty('addEventListener')) {
          for (var n = o.addEventListener; n._rollbarOldAdd && n.belongsToShim;) {
            n = n._rollbarOldAdd;
          } var t = function(o, e, t) {
            n.call(this, o, r.wrap(e), t);
          }; t._rollbarOldAdd = n, t.belongsToShim = e, o.addEventListener = t; for (var a = o.removeEventListener; a._rollbarOldRemove && a.belongsToShim;) {
            a = a._rollbarOldRemove;
          } var l = function(r, o, e) {
            a.call(this, r, o && o._rollbar_wrapped || o, e);
          }; l._rollbarOldRemove = a, l.belongsToShim = e, o.removeEventListener = l;
        }
      }r.exports = {'captureUncaughtExceptions': e,
        'captureUnhandledRejections': t,
        'wrapGlobals': a};
    },
    function(r, o) {
      'use strict'; function e(r, o) {
        this.impl = r(o, this), this.options = o, n(e.prototype);
      } function n(r) {
        for (var o = function(r) {
            return function() {
              var o = Array.prototype.slice.call(arguments, 0); if (this.impl[r]) {
                return this.impl[r].apply(this.impl, o);
              }
            };
          }, e = 'log,debug,info,warn,warning,error,critical,global,configure,handleUncaughtException,handleUnhandledRejection,_createItem,wrap,loadFull,shimId,captureEvent,captureDomContentLoaded,captureLoad'.split(','), n = 0; n < e.length; n++) {
          r[e[n]] = o(e[n]);
        }
      }e.prototype._swapAndProcessMessages = function(r, o) {
        this.impl = r(this.options); for (var e, n, t; e = o.shift();) {
          n = e.method, t = e.args, this[n] && typeof this[n] === 'function' && (n === 'captureDomContentLoaded' || n === 'captureLoad' ? this[n].apply(this, [
            t[0],
            e.ts
          ]) : this[n].apply(this, t));
        } return this;
      }, r.exports = e;
    },
    function(r, o) {
      'use strict'; r.exports = function(r) {
        return function(o) {
          if (!o && !window._rollbarInitialized) {
            r = r || {}; for (var e, n, t = r.globalAlias || 'Rollbar', a = window.rollbar, l = function(r) {
                return new a(r);
              }, i = 0; e = window._rollbarShims[i++];) {
              n || (n = e.handler), e.handler._swapAndProcessMessages(l, e.messages);
            }window[t] = n, window._rollbarInitialized = !0;
          }
        };
      };
    }
  ]));
}
