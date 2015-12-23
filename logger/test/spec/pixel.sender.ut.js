if (!('Image' in global)) { return; }
/* jshint node:false, browser:true, browserify:true */

describe('senders/pixel', function() {
    var Logger;
    var get;
    var send;
    var logger;
    var parseUrl;

    var config;

    beforeEach(function() {
        Logger = require('../../lib/Logger');
        parseUrl = require('url').parse;

        jasmine.clock().install();
        jasmine.clock().mockDate();

        get = require('../../senders/pixel');
        logger = new Logger({
            meta: {
                container: 'pocketmath',
                network: 'mopub',
                app: 'Words with Friends'
            }
        });

        config = {
            url: 'https://logging.reelcontent.com/pixel.gif',
            addParams: jasmine.createSpy('addParams()').and.callFake(function(logger) {
                return {
                    c: logger.meta.container,
                    n: logger.meta.network,
                    a: logger.meta.app
                };
            }),
            ttl: 120
        };

        spyOn(window, 'Image').and.callFake(function() { return { src: null }; });

        send = get(config);
        logger.tasks.send = [send];
        logger.tasks.format = [];
    });

    afterEach(function() {
        jasmine.clock().uninstall();
    });

    it('should return a Function', function() {
        expect(send).toEqual(jasmine.any(Function));
    });

    describe('when called', function() {
        var image;

        beforeEach(function() {
            logger.prefix('My Prefix');

            send(logger, 'log', ['foo', 'bar', 'hello']);
            image = window.Image.calls.mostRecent().returnValue;
        });

        it('should create an Image', function() {
            expect(window.Image).toHaveBeenCalledWith();
        });

        it('should use the addParams function', function() {
            expect(config.addParams).toHaveBeenCalledWith(logger);
        });

        it('should give the image a src', function() {
            expect(parseUrl(image.src, true)).toEqual(jasmine.objectContaining({
                protocol: 'https:',
                host: 'logging.reelcontent.com',
                pathname: '/pixel.gif',
                query: {
                    v: 'foo, bar, hello',
                    t: Date.now().toString(),
                    l: 'log',
                    p: logger.prefix(),
                    u: logger.uuid(),
                    c: logger.meta.container,
                    n: logger.meta.network,
                    a: logger.meta.app
                }
            }));
        });

        describe('before the TTL expires', function() {
            beforeEach(function() {
                jasmine.clock().tick((config.ttl * 60 * 1000) - 1);
                window.Image.calls.reset();

                send(logger, 'log', ['foo', 'bar', 'hello']);
                send(logger, 'warn', ['hey']);
                send(logger, 'info', ['hola']);
            });

            it('should fire all the Pixels', function() {
                expect(window.Image.calls.count()).toBe(3);
            });
        });

        describe('after the TTL expires', function() {
            beforeEach(function() {
                jasmine.clock().tick((config.ttl * 60 * 1000) + 1);
                window.Image.calls.reset();
                image = null;

                send(logger, 'log', ['foo', 'bar', 'hello']);
                send(logger, 'warn', ['hey']);
                send(logger, 'info', ['hola']);
                image = window.Image.calls.mostRecent().returnValue;
            });

            it('should fire a single error', function() {
                expect(window.Image.calls.count()).toBe(1);

                expect(parseUrl(image.src, true)).toEqual(jasmine.objectContaining({
                    protocol: 'https:',
                    host: 'logging.reelcontent.com',
                    pathname: '/pixel.gif',
                    query: {
                        v: 'Log TTL has expired.',
                        t: Date.now().toString(),
                        l: 'error',
                        p: logger.prefix(),
                        u: logger.uuid(),
                        c: logger.meta.container,
                        n: logger.meta.network,
                        a: logger.meta.app
                    }
                }));
            });
        });
    });

    describe('if provided minimal configuration', function() {
        var image;

        beforeEach(function() {
            logger.prefix('My Prefix');

            config = {
                url: '/pixel.gif'
            };

            send = get(config);
            logger.tasks.send = [send];

            send(logger, 'log', ['foo', 'bar', 'hello']);
            image = window.Image.calls.mostRecent().returnValue;
        });

        it('should only include the default query params', function() {
            expect(parseUrl(image.src, true)).toEqual(jasmine.objectContaining({
                pathname: '/pixel.gif',
                query: {
                    v: 'foo, bar, hello',
                    t: Date.now().toString(),
                    l: 'log',
                    p: logger.prefix(),
                    u: logger.uuid()
                }
            }));
        });

        describe('before an hour', function() {
            beforeEach(function() {
                jasmine.clock().tick((60 * 60 * 1000) - 1);
                window.Image.calls.reset();

                send(logger, 'log', ['foo', 'bar', 'hello']);
                send(logger, 'warn', ['hey']);
                send(logger, 'info', ['hola']);
                image = window.Image.calls.mostRecent().returnValue;
            });

            it('should fire all the Pixels', function() {
                expect(window.Image.calls.count()).toBe(3);
            });
        });

        describe('after an hour', function() {
            beforeEach(function() {
                jasmine.clock().tick((60 * 60 * 1000) + 1);
                window.Image.calls.reset();
                image = null;

                send(logger, 'log', ['foo', 'bar', 'hello']);
                send(logger, 'warn', ['hey']);
                send(logger, 'info', ['hola']);
                image = window.Image.calls.mostRecent().returnValue;
            });

            it('should fire a single error', function() {
                expect(window.Image.calls.count()).toBe(1);

                expect(parseUrl(image.src, true)).toEqual(jasmine.objectContaining({
                    pathname: '/pixel.gif',
                    query: {
                        v: 'Log TTL has expired.',
                        t: Date.now().toString(),
                        l: 'error',
                        p: logger.prefix(),
                        u: logger.uuid()
                    }
                }));
            });
        });
    });
});
