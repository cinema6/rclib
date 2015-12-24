'use strict';

/* jshint node:false, browser:true, browserify:true */
var merge = require('lodash/object/merge');
var noop = require('lodash/utility/noop');
var stringify = require('querystring').stringify;

module.exports = function get(config) {
    var url = config.url;
    var addParams = config.addParams || noop;
    var expiration = Date.now() + (config.ttl || 60) * 60 * 1000;

    var enabled = true, ttlErrorSent = false;

    return function firePixel(logger, level, args) {
        var pixel;

        if (!ttlErrorSent && Date.now() > expiration) {
            ttlErrorSent = true;
            logger.error('Log TTL has expired.');
            enabled = false;
        }

        if (enabled) {
            pixel = new Image();
            pixel.src = url + '?' + stringify(merge({
                v: args.join(', '),
                t: Date.now(),
                l: level,
                p: logger.prefix(),
                u: logger.uuid()
            }, addParams(logger)));
        }
    };
};
