describe('formatters/prefix', function() {
    var Logger;
    var logger;
    var prefix;

    beforeEach(function() {
        Logger = require('../../lib/Logger');
        prefix = require('../../formatters/prefix');

        logger = new Logger();

        jasmine.clock().install();
        jasmine.clock().mockDate();
        logger.prefix('MRAID');
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });

    it('should prefix the args', function() {
        expect(prefix(logger, 'error', ['hello', 'world'])).toEqual(['[error] (MRAID)', 'hello', 'world']);
    });
});
