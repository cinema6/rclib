describe('formatters/string', function() {
    var stringify;
    var inspect;
    var Logger;
    var logger;

    beforeEach(function() {
        stringify = require('../../formatters/string');
        inspect = require('util').inspect;
        Logger = require('../../lib/Logger');

        logger = new Logger();
    });

    it('should convert non-strings using utils.inspect', function() {
        expect(
            stringify(logger, 'log', [true, false, 11, 'hello world', undefined, null, { hello: 'world' }])
        ).toEqual(
            [inspect(true), inspect(false), inspect(11), 'hello world', inspect(undefined), inspect(null), inspect({ hello: 'world' })]
        );
    });
});
