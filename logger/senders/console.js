'use strict';

module.exports = function get() {
    return function send(logger, method, args) {
        return console[method].apply(console, [new Date()].concat(args));
    };
};
