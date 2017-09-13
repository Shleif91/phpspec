(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var format = require('./format.js'),
    CompareModel = require('./CompareModel.js');

function CompareButton(dispatcher) {
    this.dispatcher = dispatcher;

    this.compareModel = new CompareModel(dispatcher);

    this.link = ko.observable();
    this.count = ko.observable(0);
    this.text = ko.computed(function () {
        var count = this.count();

        return count + '&nbsp;' + format.pluralForm(count, ['товар', 'товара', 'товаров']);
    }, this);

    this.states = {
        visible: ko.observable(false),
        hidden: ko.observable(false),
        animated: ko.observable(false),
        moved: ko.observable(false),
        poof: ko.observable(false)
    };

    this.timers = {
        visible: null,
        animated: null,
        moved: null
    };

    this.updateTimer = null;

    this.updateLink();
    this.updateCount();
    this.count() && this.states.visible(true);

    this.subscribe();
    this.restartUpdateTimer();
}

CompareButton.prototype.subscribe = function () {
    var self = this,
        dispatcher = this.dispatcher;

    dispatcher.subscribe('compare:add', function (items) {
        self.restartUpdateTimer();

        self.updateLink();
        self.updateCount();
        items.length && self.updateStates();
    });

    dispatcher.subscribe('compare:remove', function (items) {
        self.restartUpdateTimer();

        self.updateLink();
        self.updateCount();
        items.length && self.updateStates();
    });

    dispatcher.subscribe('compare:clear', function (items) {
        self.restartUpdateTimer();

        self.updateLink();
        self.updateCount();
        self.doPoof();
    });
};

CompareButton.prototype.restartUpdateTimer = function () {
    var self = this;

    clearTimeout(this.updateTimer);

    this.updateTimer = setTimeout(function () {
        self.updateLink();
        self.updateCount();
        self.states.visible(!!self.count());

        self.restartUpdateTimer();
    }, 20000);
};

CompareButton.prototype.updateLink = function () {
    var link = this.compareModel.getPageAddress();

    this.link(link);
};

CompareButton.prototype.updateCount = function () {
    var count = this.compareModel.getCount();

    this.count(count);
};

CompareButton.prototype.updateStates = _.debounce(function () {
    var states = this.states;

    states.visible() ? this.doAnimate() : this.doVisible();
}, 100);

CompareButton.prototype.doVisible = function () {
    var self = this,
        states = this.states,
        timers = this.timers;

    clearTimeout(timers.visible);

    states.visible(true);

    timers.visible = setTimeout(function () {
        self.doAnimate();
    }, 300);
};

CompareButton.prototype.doAnimate = function () {
    var states = this.states,
        timers = this.timers,
        count = this.count();

    clearTimeout(timers.animated);
    clearTimeout(timers.visible);

    states.animated(true);
    states.moved(false);

    timers.animated = setTimeout(function () {
        states.animated(false);

        if (!count) {
            timers.visible = setTimeout(function () {
                states.visible(false);
            }, 100);
        }
    }, 500);
};

CompareButton.prototype.doMoved = function () {
    var states = this.states,
        timers = this.timers;

    states.moved(true);

    if ('ontouchstart' in window) {
        timers.moved = setTimeout(function () {
            states.moved(false);
        }, 1500);
    }
};

CompareButton.prototype.doPoof = function () {
    var states = this.states;

    states.hidden(true);
    states.visible(false);
    states.poof(true);

    setTimeout(function () {
        states.hidden(false);
        states.moved(false);
        states.poof(false);
    }, 450);
};

CompareButton.prototype.toggleVisible = function (doVisible) {
    var isVisible = doVisible && this.count();

    this.states.visible(isVisible);
};

CompareButton.prototype.onMouseout = function () {
    var states = this.states,
        timers = this.timers;

    if (!states.moved()) {
        return true;
    }

    timers.moved = setTimeout(function () {
        states.moved(false);
    }, 1500);

    return true;
};

CompareButton.prototype.onMouseover = function () {
    var states = this.states,
        timers = this.timers;

    if (!states.moved()) {
        return true;
    }

    clearTimeout(timers.moved);

    return true;
};

CompareButton.prototype.clear = function () {
    this.compareModel.clear();
};

module.exports = CompareButton;

},{"./CompareModel.js":2,"./format.js":4}],2:[function(require,module,exports){
var cookies = require('cookies-js'),
    urlService = require('./url.js');

function CompareModel(dispatcher) {
    if (window.parent.compareModel) {
        return window.parent.compareModel;
    }

    if (window.compareModel) {
        return window.compareModel;
    }

    window.compareModel = this;

    this.cookieName = 'compare';
    this.dispatcher = dispatcher;
}

CompareModel.prototype.getCount = function () {
    var items = this.getItems();

    return items.length;
};

CompareModel.prototype.getPageAddress = function () {
    var items = this.getItems();

    return urlService.secureProjectUrl('catalog', '/compare/' + encodeURI(items.join('+')));
};

CompareModel.prototype.add = function (data) {
    var items = this.getItems(),
        insertions = [].concat(data);

    insertions = _.difference(insertions, items);

    this.setItems(items.concat(insertions));
    this.dispatcher.trigger('compare:add', insertions);
};

CompareModel.prototype.remove = function (data) {
    var items = this.getItems(),
        deletions = [].concat(data);

    deletions = _.intersection(deletions, items);

    this.setItems(_.difference(items, deletions));
    this.dispatcher.trigger('compare:remove', deletions);
};

CompareModel.prototype.clear = function () {
    var items = this.getItems();

    this.setItems([]);
    this.dispatcher.trigger('compare:clear', items);
};

CompareModel.prototype.getItems = function () {
    var cookieName = this.cookieName,
        state = [];

    try {
        state = JSON.parse(cookies.get(cookieName) || '')
    } catch (e) {
    }

    return _.isArray(state) ? state : [];
};

CompareModel.prototype.setItems = function (keys) {
    var cookieName = this.cookieName;

    cookies.set(cookieName, JSON.stringify(keys || []), {
        expires: 365 * 24 * 60 * 60,
        domain: location.hostname.split('.').slice(-2).join('.'),
        path: '/'
    });
};

module.exports = CompareModel;

},{"./url.js":5,"cookies-js":7}],3:[function(require,module,exports){
(function (root, constructor) {
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = constructor;
    } else {
        root.EventDispatcher = constructor;
    }
}(this, (function () {
    function EventDispatcher() {
        this.subscriptions = {};
    }

    EventDispatcher.prototype.subscribe = function (eventNames, callbackFunction) {
        ([].concat(eventNames)).forEach(function (eventName) {
            var eventSubscriptions = this.subscriptions[eventName];

            if (typeof eventSubscriptions === 'undefined') {
                eventSubscriptions = this.subscriptions[eventName] = [];
            }

            if (typeof callbackFunction !== 'function') {
                return;
            }

            eventSubscriptions.push(callbackFunction);
        }.bind(this));
    };

    EventDispatcher.prototype.trigger = function (eventNames) {
        var callbackArguments = Array.prototype.splice.call(arguments, 1);

        ([].concat(eventNames)).forEach(function (eventName) {
            var eventSubscriptions = this.subscriptions[eventName];

            if (typeof eventSubscriptions === 'undefined') {
                return;
            }

            for (var index in eventSubscriptions) {
                eventSubscriptions[index].apply(null, callbackArguments);
            }
        }.bind(this));
    };

    EventDispatcher.prototype.unsubscribe = function (eventNames) {
        ([].concat(eventNames)).forEach(function (eventName) {
            if (typeof this.subscriptions[eventName] !== 'undefined') {
                delete this.subscriptions[eventName];
            }
        }.bind(this));
    };

    return EventDispatcher;
}())));

},{}],4:[function(require,module,exports){
var escape = require('escape-html'),
    numeral = require('numeral'),
    instance = {};

instance.price = function (pricesObject) {
    var price;

    if (pricesObject.min === pricesObject.max) {
        price = formatPrice(pricesObject.min);
    } else {
        price = formatPrice(pricesObject.min) + '&nbsp;&ndash; ' + formatPrice(pricesObject.max);
    }

    return (price + '&nbsp;' + pricesObject.currency_sign);
};

instance.minPrice = function (pricesObject, currency) {
    var currency = currency || 'BYN',
        price = pricesObject.price_min.converted[currency];

    price = price ? price.amount : pricesObject.min;

    return formatPrice(price, currency) + '&nbsp;р.';
};

instance.priceObject = function (priceObject) {
    priceObject = priceObject || {};

    var amount = priceObject.amount,
        currency = priceObject.currency;

    return formatPrice(amount, currency);
};

function formatPrice(price, currency) {
    var priceValue = parseFloat(price),
        isWithWhitespaces = priceValue >= 10000;

    if (currency === 'BYN') {
        return isWithWhitespaces
            ? numeral(price).format('0,0.00').replace(/\,/g, '&nbsp;').replace(/\./g, ',')
            : numeral(price).format('0.00').replace(/\./g, ',');
    }

    return isWithWhitespaces
        ? numeral(price).format('0,0').replace(/\,/g, '&nbsp;')
        : numeral(price).format('0');
}

instance.match = function (substring, string) {
    substring = escape(substring);
    string = escape(string);

    if (!substring && string) {
        return string;
    }

    if (substring && !string) {
        return '';
    }

    return string.replace(substring, '<span class="text_match">$&</span>');
};

instance.pluralForm = function (count, forms) {
    var form = 2,
        forms = forms || [];

    if ((count % 10 === 1) && (count % 100 != 11)) {
        form = 0;
    } else if ((count % 10 >= 2) && (count % 10 <= 4) && ((count % 100 < 10) || (count % 100 >= 20))) {
        form = 1;
    }

    if (form > forms.length) {
        return forms[0] || null;
    }

    return forms[form];
};

instance.numberKFormatter = function (number) {
    return number > 99999 ? (number / 1000).toFixed(0) + ' K' : instance.numberWithSpaces(number);
};

instance.numberWithSpaces = function (number) {
    return (number || '').toString().replace(/\s+/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

instance.htmlToText = function (html) {
    var div = document.createElement('div');

    div.innerHTML = html;

    return div.innerText || div.textContent;
};

instance.parseDotObject = function (object) {
    var result = {};

    _.each(object, function (value, property) {
        var temp = result,
            parts = (property || '').toString().split('.'),
            key = parts.pop(),
            part;

        while (parts.length) {
            part = parts.shift();
            temp = temp[part] = temp[part] || {};
        }

        temp[key] = object[property]
    });

    return result;
};

instance.getDotProperty = function (object, property) {
    var parts = (property || '').toString().split('.'),
        temp = object,
        result,
        key;

    while (parts.length) {
        key = parts.shift();

        if (!_.isObject(temp) || !temp.hasOwnProperty(key)) {
            result = undefined;
            continue;
        }

        result = temp = temp[key];
    }

    return result;
};

instance.formatPhone = function (phone) {
    return phone.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3-$4-$5');
};

instance.formatPhoneToHtml = function (phone) {
    return phone.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 <strong>$2</strong> $3-$4-$5');
};

module.exports = instance;

},{"escape-html":8,"numeral":9}],5:[function(require,module,exports){
(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory;
    } else {
        root.URL = factory;
    }
}(this, (function () {
    var instance = {};

    instance.baseDomain = (function () {
        return document.location.host.split('.').slice(-2).join('.');
    }());

    instance.projectDomain = function (projectName) {
        return projectName + '.' + instance.baseDomain;
    };

    instance.projectUrl = function (projectName, pathQuery, schema) {
        pathQuery = pathQuery ? pathQuery.replace(/^\/*/, '/') : '';
        schema = schema || 'http://';

        return schema + instance.projectDomain(projectName) + pathQuery;
    };

    instance.secureProjectUrl = function (projectName, pathQuery) {
        return instance.projectUrl(projectName, pathQuery, 'https://');
    };

    instance.redirect = function (url) {
        document.location.href = url;
    };

    instance.removeHash = function () {
        history.replaceState('', document.title, window.location.pathname + window.location.search);
    };

    instance.queryParamsToJson = function () {
        var search = window.location.search.replace('?', ''),
            result = {};

        try {
            result = JSON.parse('{"' + decodeURI(search).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
        } catch (exception) {
        }

        return result;
    };

    instance.setParameterToQueryString = function (parameter, value, silent) {
        var queryString = (window.location.search || '').replace(/(^\?)/, ''),
            newPart = parameter + '=' + value,
            parts = _.compact(queryString.split('&')),
            resultParts = _.map(parts, function (part) {
                var name = part.split('=')[0];

                return name === parameter ? newPart : part;
            }),
            parameterPart = _.find(resultParts, function (part) {
                var name = part.split('=')[0];

                return name === parameter
            });

        if (!parameterPart) {
            resultParts.push(newPart);
        }

        setHistoryState(resultParts, silent);
    };

    instance.removeParameterFromQueryString = function (parameter, silent) {
        var queryString = (window.location.search || '').replace(/(^\?)/, ''),
            parts = _.compact(queryString.split('&')),
            resultParts = _.filter(parts, function (part) {
                var name = part.split('=')[0];

                return name !== parameter;
            });

        setHistoryState(resultParts, silent);
    };

    function setHistoryState(queryParts, silent) {
        queryParts = _.compact(queryParts);

        var location = window.location,
            queryString = (queryParts.length ? '?' : '') + queryParts.join('&'),
            url = location.origin + location.pathname + queryString + location.hash;

        silent
            ? window.history.replaceState({}, '', url)
            : window.history.pushState({}, '', url);
    }

    return instance;
}())));

},{}],6:[function(require,module,exports){
var Dispatcher = require('./modules/EventDispatcher.js'),
    Button = require('./modules/CompareButton.js');

window.Onliner = window.Onliner || {};
window.Onliner.ProductCompare = ProductCompare;

function ProductCompare(productKey) {
    var dispatcher = new Dispatcher();

    this.productKey = productKey;
    this.dispatcher = dispatcher;
    this.button = new Button(dispatcher);
    this.compare = window.compareModel;
    this.checkbox = {
        isChecked: ko.observable(this.compare.getItems().indexOf(productKey) > -1),
        isEnabled: ko.observable(true)
    };

    ko.applyBindings(this.checkbox, document.getElementById('product-compare-control'));
    ko.applyBindings(this.button, document.getElementById('compare-button-container'));

    this.subscribe();

    window.dispatcher = dispatcher;
}

ProductCompare.prototype.subscribe = function () {
    var self = this,
        dispatcher = this.dispatcher,
        productKey = this.productKey,
        checkbox = this.checkbox;

    /* External triggers (Search popup) START */
    dispatcher.subscribe('compare:add', function (productNames) {
        if (productNames.indexOf(productKey) > -1) {
            checkbox.isChecked(true);
        }
    });

    dispatcher.subscribe('compare:remove', function (productNames) {
        if (productNames.indexOf(productKey) > -1) {
            checkbox.isChecked(false);
        }
    });
    /* External triggers END */

    dispatcher.subscribe('compare:clear', function (productNames) {
        if (productNames.indexOf(productKey) > -1) {
            checkbox.isChecked(false);
        }
    });

    checkbox.isChecked.subscribe(function (checked) {
        self.compare[checked ? 'add' : 'remove'](productKey);
    });
};

},{"./modules/CompareButton.js":1,"./modules/EventDispatcher.js":3}],7:[function(require,module,exports){
/*
 * Cookies.js - 1.2.3
 * https://github.com/ScottHamper/Cookies
 *
 * This is free and unencumbered software released into the public domain.
 */
(function (global, undefined) {
    'use strict';

    var factory = function (window) {
        if (typeof window.document !== 'object') {
            throw new Error('Cookies.js requires a `window` with a `document` object');
        }

        var Cookies = function (key, value, options) {
            return arguments.length === 1 ?
                Cookies.get(key) : Cookies.set(key, value, options);
        };

        // Allows for setter injection in unit tests
        Cookies._document = window.document;

        // Used to ensure cookie keys do not collide with
        // built-in `Object` properties
        Cookies._cacheKeyPrefix = 'cookey.'; // Hurr hurr, :)
        
        Cookies._maxExpireDate = new Date('Fri, 31 Dec 9999 23:59:59 UTC');

        Cookies.defaults = {
            path: '/',
            secure: false
        };

        Cookies.get = function (key) {
            if (Cookies._cachedDocumentCookie !== Cookies._document.cookie) {
                Cookies._renewCache();
            }
            
            var value = Cookies._cache[Cookies._cacheKeyPrefix + key];

            return value === undefined ? undefined : decodeURIComponent(value);
        };

        Cookies.set = function (key, value, options) {
            options = Cookies._getExtendedOptions(options);
            options.expires = Cookies._getExpiresDate(value === undefined ? -1 : options.expires);

            Cookies._document.cookie = Cookies._generateCookieString(key, value, options);

            return Cookies;
        };

        Cookies.expire = function (key, options) {
            return Cookies.set(key, undefined, options);
        };

        Cookies._getExtendedOptions = function (options) {
            return {
                path: options && options.path || Cookies.defaults.path,
                domain: options && options.domain || Cookies.defaults.domain,
                expires: options && options.expires || Cookies.defaults.expires,
                secure: options && options.secure !== undefined ?  options.secure : Cookies.defaults.secure
            };
        };

        Cookies._isValidDate = function (date) {
            return Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime());
        };

        Cookies._getExpiresDate = function (expires, now) {
            now = now || new Date();

            if (typeof expires === 'number') {
                expires = expires === Infinity ?
                    Cookies._maxExpireDate : new Date(now.getTime() + expires * 1000);
            } else if (typeof expires === 'string') {
                expires = new Date(expires);
            }

            if (expires && !Cookies._isValidDate(expires)) {
                throw new Error('`expires` parameter cannot be converted to a valid Date instance');
            }

            return expires;
        };

        Cookies._generateCookieString = function (key, value, options) {
            key = key.replace(/[^#$&+\^`|]/g, encodeURIComponent);
            key = key.replace(/\(/g, '%28').replace(/\)/g, '%29');
            value = (value + '').replace(/[^!#$&-+\--:<-\[\]-~]/g, encodeURIComponent);
            options = options || {};

            var cookieString = key + '=' + value;
            cookieString += options.path ? ';path=' + options.path : '';
            cookieString += options.domain ? ';domain=' + options.domain : '';
            cookieString += options.expires ? ';expires=' + options.expires.toUTCString() : '';
            cookieString += options.secure ? ';secure' : '';

            return cookieString;
        };

        Cookies._getCacheFromString = function (documentCookie) {
            var cookieCache = {};
            var cookiesArray = documentCookie ? documentCookie.split('; ') : [];

            for (var i = 0; i < cookiesArray.length; i++) {
                var cookieKvp = Cookies._getKeyValuePairFromCookieString(cookiesArray[i]);

                if (cookieCache[Cookies._cacheKeyPrefix + cookieKvp.key] === undefined) {
                    cookieCache[Cookies._cacheKeyPrefix + cookieKvp.key] = cookieKvp.value;
                }
            }

            return cookieCache;
        };

        Cookies._getKeyValuePairFromCookieString = function (cookieString) {
            // "=" is a valid character in a cookie value according to RFC6265, so cannot `split('=')`
            var separatorIndex = cookieString.indexOf('=');

            // IE omits the "=" when the cookie value is an empty string
            separatorIndex = separatorIndex < 0 ? cookieString.length : separatorIndex;

            var key = cookieString.substr(0, separatorIndex);
            var decodedKey;
            try {
                decodedKey = decodeURIComponent(key);
            } catch (e) {
                if (console && typeof console.error === 'function') {
                    console.error('Could not decode cookie with key "' + key + '"', e);
                }
            }
            
            return {
                key: decodedKey,
                value: cookieString.substr(separatorIndex + 1) // Defer decoding value until accessed
            };
        };

        Cookies._renewCache = function () {
            Cookies._cache = Cookies._getCacheFromString(Cookies._document.cookie);
            Cookies._cachedDocumentCookie = Cookies._document.cookie;
        };

        Cookies._areEnabled = function () {
            var testKey = 'cookies.js';
            var areEnabled = Cookies.set(testKey, 1).get(testKey) === '1';
            Cookies.expire(testKey);
            return areEnabled;
        };

        Cookies.enabled = Cookies._areEnabled();

        return Cookies;
    };
    var cookiesExport = (global && typeof global.document === 'object') ? factory(global) : factory;

    // AMD support
    if (typeof define === 'function' && define.amd) {
        define(function () { return cookiesExport; });
    // CommonJS/Node.js support
    } else if (typeof exports === 'object') {
        // Support Node.js specific `module.exports` (which can be a function)
        if (typeof module === 'object' && typeof module.exports === 'object') {
            exports = module.exports = cookiesExport;
        }
        // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
        exports.Cookies = cookiesExport;
    } else {
        global.Cookies = cookiesExport;
    }
})(typeof window === 'undefined' ? this : window);
},{}],8:[function(require,module,exports){
/*!
 * escape-html
 * Copyright(c) 2012-2013 TJ Holowaychuk
 * Copyright(c) 2015 Andreas Lubbe
 * Copyright(c) 2015 Tiancheng "Timothy" Gu
 * MIT Licensed
 */

'use strict';

/**
 * Module variables.
 * @private
 */

var matchHtmlRegExp = /["'&<>]/;

/**
 * Module exports.
 * @public
 */

module.exports = escapeHtml;

/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} string The string to escape for inserting into HTML
 * @return {string}
 * @public
 */

function escapeHtml(string) {
  var str = '' + string;
  var match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  var escape;
  var html = '';
  var index = 0;
  var lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&#39;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex, index)
    : html;
}

},{}],9:[function(require,module,exports){
/*! @preserve
 * numeral.js
 * version : 1.5.6
 * author : Adam Draper
 * license : MIT
 * http://adamwdraper.github.com/Numeral-js/
 */

(function() {

    /************************************
        Variables
    ************************************/

    var numeral,
        VERSION = '1.5.6',
        // internal storage for language config files
        languages = {},
        defaults = {
            currentLanguage: 'en',
            zeroFormat: null,
            nullFormat: null,
            defaultFormat: '0,0'
        },
        options = {
            currentLanguage: defaults.currentLanguage,
            zeroFormat: defaults.zeroFormat,
            nullFormat: defaults.nullFormat,
            defaultFormat: defaults.defaultFormat
        },
        byteSuffixes = {
            bytes: ['B','KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            iec: ['B','KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
        };


    /************************************
        Constructors
    ************************************/


    // Numeral prototype object
    function Numeral(number) {
        this._value = number;
    }

    /**
     * Implementation of toFixed() that treats floats more like decimals
     *
     * Fixes binary rounding issues (eg. (0.615).toFixed(2) === '0.61') that present
     * problems for accounting- and finance-related software.
     */
    function toFixed (value, maxDecimals, roundingFunction, optionals) {
        var splitValue = value.toString().split('.'),
            minDecimals = maxDecimals - (optionals || 0),
            boundedPrecision,
            optionalsRegExp,
            power,
            output;

        // Use the smallest precision value possible to avoid errors from floating point representation
        if (splitValue.length === 2) {
          boundedPrecision = Math.min(Math.max(splitValue[1].length, minDecimals), maxDecimals);
        } else {
          boundedPrecision = minDecimals;
        }

        power = Math.pow(10, boundedPrecision);

        //roundingFunction = (roundingFunction !== undefined ? roundingFunction : Math.round);
        // Multiply up by precision, round accurately, then divide and use native toFixed():
        output = (roundingFunction(value * power) / power).toFixed(boundedPrecision);

        if (optionals > maxDecimals - boundedPrecision) {
            optionalsRegExp = new RegExp('\\.?0{1,' + (optionals - (maxDecimals - boundedPrecision)) + '}$');
            output = output.replace(optionalsRegExp, '');
        }

        return output;
    }

    /************************************
        Formatting
    ************************************/

    // determine what type of formatting we need to do
    function formatNumeral(n, format, roundingFunction) {
        var output;

        if (n._value === 0 && options.zeroFormat !== null) {
            output = options.zeroFormat;
        } else if (n._value === null && options.nullFormat !== null) {
            output = options.nullFormat;
        } else {
            // figure out what kind of format we are dealing with
            if (format.indexOf('$') > -1) {
                output = formatCurrency(n, format, roundingFunction);
            } else if (format.indexOf('%') > -1) {
                output = formatPercentage(n, format, roundingFunction);
            } else if (format.indexOf(':') > -1) {
                output = formatTime(n, format);
            } else if (format.indexOf('b') > -1 || format.indexOf('ib') > -1) {
                output = formatBytes(n, format, roundingFunction);
            } else if (format.indexOf('o') > -1) {
                output = formatOrdinal(n, format, roundingFunction);
            } else {
                output = formatNumber(n._value, format, roundingFunction);
            }
        }

        return output;
    }

    function formatCurrency(n, format, roundingFunction) {
        var symbolIndex = format.indexOf('$'),
            openParenIndex = format.indexOf('('),
            minusSignIndex = format.indexOf('-'),
            space = '',
            spliceIndex,
            output;

        // check for space before or after currency
        if (format.indexOf(' $') > -1) {
            space = ' ';
            format = format.replace(' $', '');
        } else if (format.indexOf('$ ') > -1) {
            space = ' ';
            format = format.replace('$ ', '');
        } else {
            format = format.replace('$', '');
        }

        // format the number
        output = formatNumber(n._value, format, roundingFunction, false);

        // position the symbol
        if (symbolIndex <= 1) {
            if (output.indexOf('(') > -1 || output.indexOf('-') > -1) {
                output = output.split('');
                spliceIndex = 1;
                if (symbolIndex < openParenIndex || symbolIndex < minusSignIndex) {
                    // the symbol appears before the "(" or "-"
                    spliceIndex = 0;
                }
                output.splice(spliceIndex, 0, languages[options.currentLanguage].currency.symbol + space);
                output = output.join('');
            } else {
                output = languages[options.currentLanguage].currency.symbol + space + output;
            }
        } else {
            if (output.indexOf(')') > -1) {
                output = output.split('');
                output.splice(-1, 0, space + languages[options.currentLanguage].currency.symbol);
                output = output.join('');
            } else {
                output = output + space + languages[options.currentLanguage].currency.symbol;
            }
        }

        return output;
    }

    function formatPercentage(n, format, roundingFunction) {
        var space = '',
            output,
            value = n._value * 100;

        // check for space before %
        if (format.indexOf(' %') > -1) {
            space = ' ';
            format = format.replace(' %', '');
        } else {
            format = format.replace('%', '');
        }

        output = formatNumber(value, format, roundingFunction);

        if (output.indexOf(')') > -1) {
            output = output.split('');
            output.splice(-1, 0, space + '%');
            output = output.join('');
        } else {
            output = output + space + '%';
        }

        return output;
    }

    function formatBytes(n, format, roundingFunction) {
        var output,
            suffixes = format.indexOf('ib') > -1 ? byteSuffixes.iec : byteSuffixes.bytes,
            value = n._value,
            suffix = '',
            power,
            min,
            max;

        // check for space before
        if (format.indexOf(' b') > -1 || format.indexOf(' ib') > -1) {
            suffix = ' ';
            format = format.replace(' ib', '').replace(' b', '');
        } else {
            format = format.replace('ib', '').replace('b', '');
        }

        for (power = 0; power <= suffixes.length; power++) {
            min = Math.pow(1024, power);
            max = Math.pow(1024, power + 1);

            if (value === null || value === 0 || value >= min && value < max) {
                suffix += suffixes[power];

                if (min > 0) {
                    value = value / min;
                }

                break;
            }
        }

        output = formatNumber(value, format, roundingFunction);

        return output + suffix;
    }

    function formatOrdinal(n, format, roundingFunction) {
        var output,
            ordinal = '';

        // check for space before
        if (format.indexOf(' o') > -1) {
            ordinal = ' ';
            format = format.replace(' o', '');
        } else {
            format = format.replace('o', '');
        }

        ordinal += languages[options.currentLanguage].ordinal(n._value);

        output = formatNumber(n._value, format, roundingFunction);

        return output + ordinal;
    }

    function formatTime(n) {
        var hours = Math.floor(n._value / 60 / 60),
            minutes = Math.floor((n._value - (hours * 60 * 60)) / 60),
            seconds = Math.round(n._value - (hours * 60 * 60) - (minutes * 60));

        return hours + ':' + ((minutes < 10) ? '0' + minutes : minutes) + ':' + ((seconds < 10) ? '0' + seconds : seconds);
    }

    function formatNumber(value, format, roundingFunction) {
        var negP = false,
            signed = false,
            optDec = false,
            abbr = '',
            abbrK = false, // force abbreviation to thousands
            abbrM = false, // force abbreviation to millions
            abbrB = false, // force abbreviation to billions
            abbrT = false, // force abbreviation to trillions
            abbrForce = false, // force abbreviation
            abs,
            min,
            max,
            power,
            w,
            precision,
            thousands,
            d = '',
            neg = false;

        if (value === null) {
            value = 0;
        }

        abs = Math.abs(value);

        // see if we should use parentheses for negative number or if we should prefix with a sign
        // if both are present we default to parentheses
        if (format.indexOf('(') > -1) {
            negP = true;
            format = format.slice(1, -1);
        } else if (format.indexOf('+') > -1) {
            signed = true;
            format = format.replace(/\+/g, '');
        }

        // see if abbreviation is wanted
        if (format.indexOf('a') > -1) {
            // check if abbreviation is specified
            abbrK = format.indexOf('aK') >= 0;
            abbrM = format.indexOf('aM') >= 0;
            abbrB = format.indexOf('aB') >= 0;
            abbrT = format.indexOf('aT') >= 0;
            abbrForce = abbrK || abbrM || abbrB || abbrT;

            // check for space before abbreviation
            if (format.indexOf(' a') > -1) {
                abbr = ' ';
            }

            format = format.replace(new RegExp(abbr + 'a[KMBT]?'), '');

            if (abs >= Math.pow(10, 12) && !abbrForce || abbrT) {
                // trillion
                abbr = abbr + languages[options.currentLanguage].abbreviations.trillion;
                value = value / Math.pow(10, 12);
            } else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9) && !abbrForce || abbrB) {
                // billion
                abbr = abbr + languages[options.currentLanguage].abbreviations.billion;
                value = value / Math.pow(10, 9);
            } else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6) && !abbrForce || abbrM) {
                // million
                abbr = abbr + languages[options.currentLanguage].abbreviations.million;
                value = value / Math.pow(10, 6);
            } else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3) && !abbrForce || abbrK) {
                // thousand
                abbr = abbr + languages[options.currentLanguage].abbreviations.thousand;
                value = value / Math.pow(10, 3);
            }
        }


        if (format.indexOf('[.]') > -1) {
            optDec = true;
            format = format.replace('[.]', '.');
        }

        w = value.toString().split('.')[0];
        precision = format.split('.')[1];
        thousands = format.indexOf(',');

        if (precision) {
            if (precision.indexOf('[') > -1) {
                precision = precision.replace(']', '');
                precision = precision.split('[');
                d = toFixed(value, (precision[0].length + precision[1].length), roundingFunction, precision[1].length);
            } else {
                d = toFixed(value, precision.length, roundingFunction);
            }

            w = d.split('.')[0];

            if (d.indexOf('.') > -1) {
                d = languages[options.currentLanguage].delimiters.decimal + d.split('.')[1];
            } else {
                d = '';
            }

            if (optDec && Number(d.slice(1)) === 0) {
                d = '';
            }
        } else {
            w = toFixed(value, null, roundingFunction);
        }

        // format number
        if (w.indexOf('-') > -1) {
            w = w.slice(1);
            neg = true;
        }

        if (thousands > -1) {
            w = w.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + languages[options.currentLanguage].delimiters.thousands);
        }

        if (format.indexOf('.') === 0) {
            w = '';
        }

        return ((negP && neg) ? '(' : '') + ((!negP && neg) ? '-' : '') + ((!neg && signed) ? '+' : '') + w + d + ((abbr) ? abbr : '') + ((negP && neg) ? ')' : '');
    }


    /************************************
        Unformatting
    ************************************/

    // revert to number
    function unformatNumeral(n, string) {
        var stringOriginal = string,
            thousandRegExp,
            millionRegExp,
            billionRegExp,
            trillionRegExp,
            bytesMultiplier = false,
            power,
            value;

        if (string.indexOf(':') > -1) {
            value = unformatTime(string);
        } else {
            if (string === options.zeroFormat || string === options.nullFormat) {
                value = 0;
            } else {
                if (languages[options.currentLanguage].delimiters.decimal !== '.') {
                    string = string.replace(/\./g, '').replace(languages[options.currentLanguage].delimiters.decimal, '.');
                }

                // see if abbreviations are there so that we can multiply to the correct number
                thousandRegExp = new RegExp('[^a-zA-Z]' + languages[options.currentLanguage].abbreviations.thousand + '(?:\\)|(\\' + languages[options.currentLanguage].currency.symbol + ')?(?:\\))?)?$');
                millionRegExp = new RegExp('[^a-zA-Z]' + languages[options.currentLanguage].abbreviations.million + '(?:\\)|(\\' + languages[options.currentLanguage].currency.symbol + ')?(?:\\))?)?$');
                billionRegExp = new RegExp('[^a-zA-Z]' + languages[options.currentLanguage].abbreviations.billion + '(?:\\)|(\\' + languages[options.currentLanguage].currency.symbol + ')?(?:\\))?)?$');
                trillionRegExp = new RegExp('[^a-zA-Z]' + languages[options.currentLanguage].abbreviations.trillion + '(?:\\)|(\\' + languages[options.currentLanguage].currency.symbol + ')?(?:\\))?)?$');

                // see if bytes are there so that we can multiply to the correct number
                for (power = 1; power <= byteSuffixes.bytes.length; power++) {
                    bytesMultiplier = ((string.indexOf(byteSuffixes.bytes[power]) > -1) || (string.indexOf(byteSuffixes.iec[power]) > -1))? Math.pow(1024, power) : false;

                    if (bytesMultiplier) {
                        break;
                    }
                }

                // do some math to create our number
                value = bytesMultiplier ? bytesMultiplier : 1;
                value *= stringOriginal.match(thousandRegExp) ? Math.pow(10, 3) : 1;
                value *= stringOriginal.match(millionRegExp) ? Math.pow(10, 6) : 1;
                value *= stringOriginal.match(billionRegExp) ? Math.pow(10, 9) : 1;
                value *= stringOriginal.match(trillionRegExp) ? Math.pow(10, 12) : 1;
                // check for percentage
                value *= string.indexOf('%') > -1 ? 0.01 : 1;
                // check for negative number
                value *= (string.split('-').length + Math.min(string.split('(').length - 1, string.split(')').length - 1)) % 2 ? 1 : -1;
                // remove non numbers
                value *= Number(string.replace(/[^0-9\.]+/g, ''));
                // round if we are talking about bytes
                value = bytesMultiplier ? Math.ceil(value) : value;
            }
        }

        n._value = value;

        return n._value;
    }
    function unformatTime(string) {
        var timeArray = string.split(':'),
            seconds = 0;
        // turn hours and minutes into seconds and add them all up
        if (timeArray.length === 3) {
            // hours
            seconds = seconds + (Number(timeArray[0]) * 60 * 60);
            // minutes
            seconds = seconds + (Number(timeArray[1]) * 60);
            // seconds
            seconds = seconds + Number(timeArray[2]);
        } else if (timeArray.length === 2) {
            // minutes
            seconds = seconds + (Number(timeArray[0]) * 60);
            // seconds
            seconds = seconds + Number(timeArray[1]);
        }
        return Number(seconds);
    }


    /************************************
        Top Level Functions
    ************************************/

    numeral = function(input) {
        if (numeral.isNumeral(input)) {
            input = input.value();
        } else if (input === 0 || typeof input === 'undefined') {
            input = 0;
        } else if (input === null) {
            input = null;
        } else if (!Number(input)) {
            input = numeral.fn.unformat(input);
        } else {
            input = Number(input);
        }

        return new Numeral(input);
    };

    // version number
    numeral.version = VERSION;

    // compare numeral object
    numeral.isNumeral = function(obj) {
        return obj instanceof Numeral;
    };


    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    numeral.language = function(key, values) {
        if (!key) {
            return options.currentLanguage;
        }

        key = key.toLowerCase();

        if (key && !values) {
            if (!languages[key]) {
                throw new Error('Unknown language : ' + key);
            }

            options.currentLanguage = key;
        }

        if (values || !languages[key]) {
            loadLanguage(key, values);
        }

        return numeral;
    };

    numeral.reset = function() {
        for (var property in defaults) {
            options[property] = defaults[property];
        }
    };

    // This function provides access to the loaded language data.  If
    // no arguments are passed in, it will simply return the current
    // global language object.
    numeral.languageData = function(key) {
        if (!key) {
            return languages[options.currentLanguage];
        }

        if (!languages[key]) {
            throw new Error('Unknown language : ' + key);
        }

        return languages[key];
    };

    numeral.language('en', {
        delimiters: {
            thousands: ',',
            decimal: '.'
        },
        abbreviations: {
            thousand: 'k',
            million: 'm',
            billion: 'b',
            trillion: 't'
        },
        ordinal: function(number) {
            var b = number % 10;
            return (~~(number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
        },
        currency: {
            symbol: '$'
        }
    });

    numeral.zeroFormat = function(format) {
        options.zeroFormat = typeof(format) === 'string' ? format : null;
    };

    numeral.nullFormat = function (format) {
        options.nullFormat = typeof(format) === 'string' ? format : null;
    };

    numeral.defaultFormat = function(format) {
        options.defaultFormat = typeof(format) === 'string' ? format : '0.0';
    };

    numeral.validate = function(val, culture) {
        var _decimalSep,
            _thousandSep,
            _currSymbol,
            _valArray,
            _abbrObj,
            _thousandRegEx,
            languageData,
            temp;

        //coerce val to string
        if (typeof val !== 'string') {
            val += '';
            if (console.warn) {
                console.warn('Numeral.js: Value is not string. It has been co-erced to: ', val);
            }
        }

        //trim whitespaces from either sides
        val = val.trim();

        //if val is just digits return true
        if ( !! val.match(/^\d+$/)) {
            return true;
        }

        //if val is empty return false
        if (val === '') {
            return false;
        }

        //get the decimal and thousands separator from numeral.languageData
        try {
            //check if the culture is understood by numeral. if not, default it to current language
            languageData = numeral.languageData(culture);
        } catch (e) {
            languageData = numeral.languageData(numeral.language());
        }

        //setup the delimiters and currency symbol based on culture/language
        _currSymbol = languageData.currency.symbol;
        _abbrObj = languageData.abbreviations;
        _decimalSep = languageData.delimiters.decimal;
        if (languageData.delimiters.thousands === '.') {
            _thousandSep = '\\.';
        } else {
            _thousandSep = languageData.delimiters.thousands;
        }

        // validating currency symbol
        temp = val.match(/^[^\d]+/);
        if (temp !== null) {
            val = val.substr(1);
            if (temp[0] !== _currSymbol) {
                return false;
            }
        }

        //validating abbreviation symbol
        temp = val.match(/[^\d]+$/);
        if (temp !== null) {
            val = val.slice(0, -1);
            if (temp[0] !== _abbrObj.thousand && temp[0] !== _abbrObj.million && temp[0] !== _abbrObj.billion && temp[0] !== _abbrObj.trillion) {
                return false;
            }
        }

        _thousandRegEx = new RegExp(_thousandSep + '{2}');

        if (!val.match(/[^\d.,]/g)) {
            _valArray = val.split(_decimalSep);
            if (_valArray.length > 2) {
                return false;
            } else {
                if (_valArray.length < 2) {
                    return ( !! _valArray[0].match(/^\d+.*\d$/) && !_valArray[0].match(_thousandRegEx));
                } else {
                    if (_valArray[0].length === 1) {
                        return ( !! _valArray[0].match(/^\d+$/) && !_valArray[0].match(_thousandRegEx) && !! _valArray[1].match(/^\d+$/));
                    } else {
                        return ( !! _valArray[0].match(/^\d+.*\d$/) && !_valArray[0].match(_thousandRegEx) && !! _valArray[1].match(/^\d+$/));
                    }
                }
            }
        }

        return false;
    };

    /************************************
        Helpers
    ************************************/

    function loadLanguage(key, values) {
        languages[key] = values;
    }

    /************************************
        Floating-point helpers
    ************************************/

    // The floating-point helper functions and implementation
    // borrows heavily from sinful.js: http://guipn.github.io/sinful.js/

    // Production steps of ECMA-262, Edition 5, 15.4.4.21
    // Reference: http://es5.github.io/#x15.4.4.21
    if (!Array.prototype.reduce) {
        Array.prototype.reduce = function(callback /*, initialValue*/) {
            'use strict';
            if (this === null) {
                throw new TypeError('Array.prototype.reduce called on null or undefined');
            }

            if (typeof callback !== 'function') {
                throw new TypeError(callback + ' is not a function');
            }

            var t = Object(this), len = t.length >>> 0, k = 0, value;

            if (arguments.length === 2) {
                value = arguments[1];
            } else {
                while (k < len && !(k in t)) {
                    k++;
                }

                if (k >= len) {
                    throw new TypeError('Reduce of empty array with no initial value');
                }

                value = t[k++];
            }
            for (; k < len; k++) {
                if (k in t) {
                    value = callback(value, t[k], k, t);
                }
            }
            return value;
        };
    }

    /**
     * Computes the multiplier necessary to make x >= 1,
     * effectively eliminating miscalculations caused by
     * finite precision.
     */
    function multiplier(x) {
        var parts = x.toString().split('.');
        if (parts.length < 2) {
            return 1;
        }
        return Math.pow(10, parts[1].length);
    }

    /**
     * Given a variable number of arguments, returns the maximum
     * multiplier that must be used to normalize an operation involving
     * all of them.
     */
    function correctionFactor() {
        var args = Array.prototype.slice.call(arguments);
        return args.reduce(function(prev, next) {
            var mp = multiplier(prev),
                mn = multiplier(next);
            return mp > mn ? mp : mn;
        }, -Infinity);
    }


    /************************************
        Numeral Prototype
    ************************************/


    numeral.fn = Numeral.prototype = {

        clone: function() {
            return numeral(this);
        },

        format: function (inputString, roundingFunction) {
            return formatNumeral(this,
                inputString ? inputString : options.defaultFormat,
                roundingFunction !== undefined ? roundingFunction : Math.round
            );
        },

        unformat: function (inputString) {
            if (Object.prototype.toString.call(inputString) === '[object Number]') {
                return inputString;
            }

            return unformatNumeral(this, inputString ? inputString : options.defaultFormat);
        },

        value: function() {
            return this._value;
        },

        valueOf: function() {
            return this._value;
        },

        set: function(value) {
            this._value = Number(value);
            return this;
        },

        add: function(value) {
            var corrFactor = correctionFactor.call(null, this._value, value);

            function cback(accum, curr, currI, O) {
                return accum + corrFactor * curr;
            }
            this._value = [this._value, value].reduce(cback, 0) / corrFactor;
            return this;
        },

        subtract: function(value) {
            var corrFactor = correctionFactor.call(null, this._value, value);

            function cback(accum, curr, currI, O) {
                return accum - corrFactor * curr;
            }
            this._value = [value].reduce(cback, this._value * corrFactor) / corrFactor;
            return this;
        },

        multiply: function(value) {
            function cback(accum, curr, currI, O) {
                var corrFactor = correctionFactor(accum, curr);
                return (accum * corrFactor) * (curr * corrFactor) /
                    (corrFactor * corrFactor);
            }
            this._value = [this._value, value].reduce(cback, 1);
            return this;
        },

        divide: function(value) {
            function cback(accum, curr, currI, O) {
                var corrFactor = correctionFactor(accum, curr);
                return (accum * corrFactor) / (curr * corrFactor);
            }
            this._value = [this._value, value].reduce(cback);
            return this;
        },

        difference: function(value) {
            return Math.abs(numeral(this._value).subtract(value).value());
        }

    };

    /************************************
        Exposing Numeral
    ************************************/

    // CommonJS module is defined
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = numeral;
    }

    /*global ender:false */
    if (typeof ender === 'undefined') {
        // here, `this` means `window` in the browser, or `global` on the server
        // add `numeral` as a global object via a string identifier,
        // for Closure Compiler 'advanced' mode
        this['numeral'] = numeral;
    }

    /*global define:false */
    if (typeof define === 'function' && define.amd) {
        define([], function() {
            return numeral;
        });
    }
}).call(this);

},{}]},{},[6]);
