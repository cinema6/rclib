'use strict';

var inspect = require('util').inspect;

module.exports = function stringify(logger, method, args) {
    return args.map(function(arg) {
        return typeof arg === 'string' ? arg : inspect(arg);
    });
};
