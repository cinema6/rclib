'use strict';

module.exports = function prefix(logger, method, args) {
    return ['[' + method + '] (' + logger.prefix() + ')'].concat(args);
};
