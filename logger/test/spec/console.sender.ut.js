describe('senders/console', function() {
    'use strict';

    var Logger;
    var get;
    var logger;
    var send;

    beforeEach(function() {
        get = require('../../senders/console');
        Logger = require('../../lib/Logger');

        logger = new Logger();

        jasmine.clock().install();
        jasmine.clock().mockDate();

        send = get();
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });

    it('should return a Function', function() {
        expect(send).toEqual(jasmine.any(Function));
    });

    describe('when the returned Function is called', function() {
        beforeEach(function() {
            spyOn(console, 'log');

            send(logger, 'log', ['foo', 'bar']);
        });

        it('should send commands to the console', function() {
            expect(console.log).toHaveBeenCalledWith(new Date(), 'foo', 'bar');
        });
    });
});
