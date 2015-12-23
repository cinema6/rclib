describe('index', function() {
    var Logger;
    var exports;

    beforeEach(function() {
        Logger = require('../../lib/Logger');
        exports = require('../../index');
    });

    describe('Logger', function() {
        it('should be the Logger class', function() {
            expect(exports.Logger).toBe(Logger);
        });
    });

    describe('default', function() {
        it('should be a Logger instance', function() {
            expect(exports.default).toEqual(jasmine.any(Logger));
        });
    });
});
