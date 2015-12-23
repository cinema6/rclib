'use strict';

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var formatters = {
    string: require('../formatters/string'),
    prefix: require('../formatters/prefix')
};
var senders = {
    console: require('../senders/console')()
};

var LOG_LEVELS = ['log', 'info', 'warn', 'error'];
var DISABLED_LEVELS = [];
var noop = function() {};

var generateUUID = (function() {
    var POSSIBILITIES = '0123456789abcdefghijklmnopqrstuvwxyz';
    var NUM_OF_POSSIBILITIES = POSSIBILITIES.length;

    return function generateUUID(length) {
        var result = '';

        while (length--) {
            result += POSSIBILITIES.charAt(Math.floor(Math.random() * (NUM_OF_POSSIBILITIES - 1)));
        }

        return result;
    };
}());

function Logger(_options_) {
    var options = _options_ || {};

    this.__private__ = {
        enabled: true,
        levels: LOG_LEVELS,
        prefix: '',
        previousLevels: null,
        uuid: options.uuid || generateUUID(14)
    };

    this.tasks = {
        format: [formatters.string, formatters.prefix],
        send: [senders.console]
    };
    this.meta = {};

    LOG_LEVELS.forEach(function(level) {
        delete this[level];
    }, this);

    ['enabled', 'levels', 'prefix'].forEach(function(key) {
        if (key in options) { this[key](options[key]); }
    }, this);

    if ('tasks' in options) {
        this.tasks = options.tasks;
    }

    if ('meta' in options) {
        this.meta = options.meta;
    }
}
inherits(Logger, EventEmitter);

Logger.prototype.uuid = function uuid() {
    return this.__private__.uuid;
};

Logger.prototype.levels = function levels(levelsArray) {
    var enabled = this.__private__.enabled;
    var prop = enabled ? 'levels' : 'previousLevels';
    var current = this.__private__[prop];

    if (levelsArray) {
        if (enabled) {
            this.__private__.levels = levelsArray;

            LOG_LEVELS.forEach(function(level) {
                if (levelsArray.indexOf(level) < 0) {
                    this[level] = noop;
                } else {
                    delete this[level];
                }
            }, this);
        } else {
            this.__private__.previousLevels = levelsArray;
        }

        if (levelsArray !== DISABLED_LEVELS && current !== DISABLED_LEVELS) {
            this.emit('setLevels');
        }
    }

    return this.__private__[prop];
};

Logger.prototype.enabled = function enabled(yes) {
    if (yes === this.__private__.enabled) { return yes; }

    if (typeof yes === 'boolean') {
        if (yes) {
            this.__private__.enabled = true;
            this.levels(this.__private__.previousLevels);
            this.emit('enable');
        } else {
            this.__private__.previousLevels = this.levels();
            this.levels(DISABLED_LEVELS);
            this.__private__.enabled = false;
            this.emit('disable');
        }
    }

    return this.__private__.enabled;
};

Logger.prototype.prefix = function prefix(prefixString) {
    if (typeof prefixString === 'string') {
        this.__private__.prefix = prefixString;
        this.emit('setPrefix');
    }

    return this.__private__.prefix;
};

Logger.prototype.context = function context(prefix) {
    var logger = this;
    var child = new this.constructor({
        uuid: this.uuid(),
        enabled: this.enabled(),
        levels: this.levels(),
        prefix: getPrefix(),
        tasks: this.tasks,
        meta: this.meta
    });

    function getPrefix() {
        return (logger.prefix() + ' ' + prefix).trim();
    }

    this.on('setLevels', function() { child.levels(logger.levels()); });
    this.on('enable', function() { child.enabled(true); });
    this.on('disable', function() { child.enabled(false); });
    this.on('setPrefix', function() { child.prefix(getPrefix()); });

    return child;
};

LOG_LEVELS.forEach(function(method) {
    Logger.prototype[method] = function log() {
        var logger = this;
        var args = Array.prototype.slice.call(arguments);
        var messages = this.tasks.format.reduce(function(messages, nextFn) {
            return nextFn(logger, method, messages);
        }, args);

        this.tasks.send.forEach(function(fn) {
            return fn(logger, method, messages);
        });
    };
});

module.exports = Logger;
