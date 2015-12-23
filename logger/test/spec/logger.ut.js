var proxyquire = require('proxyquire');

describe('logger', function() {
    'use strict';

    var Logger;
    var logger;
    var inspect;
    var EventEmitter;
    var getConsoleSender;

    var stubs;

    beforeEach(function() {
        getConsoleSender = require('../../senders/console');

        stubs = {
            '../senders/console': jasmine.createSpy('get()').and.returnValue(getConsoleSender()),
            '../formatters/prefix': require('../../formatters/prefix'),
            '../formatters/string': require('../../formatters/string'),
            'events': require('events'),

            '@noCallThru': true
        };

        Logger = proxyquire('../../lib/Logger', stubs);
        inspect = require('util').inspect;
        EventEmitter = require('events').EventEmitter;

        logger = new Logger();
    });

    it('should exist', function() {
        expect(logger).toEqual(jasmine.any(EventEmitter));
    });

    describe('properties:', function() {
        describe('tasks', function() {
            it('should be an object with format and send properties', function() {
                expect(logger.tasks).toEqual({
                    format: jasmine.any(Array),
                    send: jasmine.any(Array)
                });
            });

            describe('.format', function() {
                describe('[0]', function() {
                    it('should be the string formatter', function() {
                        expect(logger.tasks.format[0]).toBe(require('../../formatters/string'));
                    });
                });

                describe('[1]', function() {
                    it('should be the prefix formatter', function() {
                        expect(logger.tasks.format[1]).toBe(require('../../formatters/prefix'));
                    });
                });
            });

            describe('.send', function() {
                describe('[0]', function() {
                    it('should be a console sender', function() {
                        expect(stubs['../senders/console']).toHaveBeenCalledWith();
                        expect(logger.tasks.send[0]).toBe(stubs['../senders/console'].calls.mostRecent().returnValue);
                    });
                });
            });
        });

        describe('meta', function() {
            it('should be an Object', function() {
                expect(logger.meta).toEqual({});
            });
        });
    });

    describe('methods:', function() {
        describe('uuid()', function() {
            it('should return a unique identifier', function() {
                expect(logger.uuid()).toMatch(/[0-9a-z]{14}/);
            });

            it('should return the same identifier', function() {
                expect(logger.uuid()).toBe(logger.uuid());
            });

            it('should give the children the same uuid', function() {
                expect(logger.context('foo').uuid()).toBe(logger.uuid());
            });
        });

        describe('levels()', function() {
            var setLevels;

            beforeEach(function() {
                setLevels = jasmine.createSpy('setLevels()');
                logger.on('setLevels', setLevels);
            });

            beforeEach(function() {
                jasmine.createSpy('setLevels()');
            });

            it('should return an Array with all the supported log levels', function() {
                expect(logger.levels()).toEqual(['log', 'info', 'warn', 'error']);
            });

            it('should return the same Array', function() {
                expect(logger.levels()).toBe(logger.levels());
            });

            it('should not emit setLevels', function() {
                logger.levels();
                expect(setLevels).not.toHaveBeenCalled();
            });

            describe('when called with an Array', function() {
                var log, info, warn, error;
                var result;

                beforeEach(function() {
                    log = logger.constructor.prototype.log;
                    info = logger.constructor.prototype.info;
                    warn = logger.constructor.prototype.warn;
                    error = logger.constructor.prototype.error;

                    result = logger.levels(['info', 'error']);
                });

                it('should emit "setLevels"', function() {
                    expect(setLevels).toHaveBeenCalled();
                });

                it('should return the provided Array', function() {
                    expect(result).toEqual(['info', 'error']);
                });

                it('should replace the unsepcified methods with a noop function', function() {
                    expect(logger.log.toString()).toBe(function() {}.toString());
                    expect(logger.info).toBe(info);
                    expect(logger.warn.toString()).toBe(function() {}.toString());
                    expect(logger.error).toBe(error);
                });

                it('should return the provided Array when passed no args', function() {
                    expect(logger.levels()).toBe(result);
                });

                it('should allow all methods to be restored', function() {
                    logger.levels(['log', 'info', 'warn', 'error']);
                    expect(logger.log).toBe(log);
                    expect(logger.info).toBe(info);
                    expect(logger.warn).toBe(warn);
                    expect(logger.error).toBe(error);
                });
            });

            describe('after the logger is disabled', function() {
                var log, info, warn, error;

                beforeEach(function() {
                    log = logger.constructor.prototype.log;
                    info = logger.constructor.prototype.info;
                    warn = logger.constructor.prototype.warn;
                    error = logger.constructor.prototype.error;

                    logger.enabled(false);
                });

                it('should still return the same levels', function() {
                    expect(logger.levels()).toEqual(['log', 'info', 'warn', 'error']);
                });

                it('should still replace every fn with a noop', function() {
                    expect(logger.log).not.toBe(log);
                    expect(logger.info).not.toBe(info);
                    expect(logger.warn).not.toBe(warn);
                    expect(logger.error).not.toBe(error);
                });

                describe('when called', function() {
                    beforeEach(function() {
                        setLevels.calls.reset();
                        logger.levels(['error']);
                    });

                    it('should not replace any of the noops', function() {
                        expect(logger.log).not.toBe(log);
                        expect(logger.info).not.toBe(info);
                        expect(logger.warn).not.toBe(warn);
                        expect(logger.error).not.toBe(error);
                    });

                    it('should set the returned Array', function() {
                        expect(logger.levels()).toEqual(['error']);
                    });

                    it('should still emit setLevels', function() {
                        expect(setLevels).toHaveBeenCalled();
                    });
                });
            });
        });

        describe('enabled()', function() {
            var result;
            var log, info, warn, error;
            var enable, disable, setLevels;

            beforeEach(function() {
                spyOn(logger, 'levels').and.callThrough();
                log = logger.constructor.prototype.log;
                info = logger.constructor.prototype.info;
                warn = logger.constructor.prototype.warn;
                error = logger.constructor.prototype.error;

                enable = jasmine.createSpy('enable()');
                disable = jasmine.createSpy('disable()');
                setLevels = jasmine.createSpy('setLevels()');

                logger.on('enable', enable);
                logger.on('disable', disable);
                logger.on('setLevels', setLevels);

                result = logger.enabled();
            });

            it('should return true', function() {
                expect(result).toBe(true);
            });

            it('should not call logger.levels', function() {
                expect(logger.levels).not.toHaveBeenCalled();
            });

            it('should not emit enable or disable', function() {
                expect(enable).not.toHaveBeenCalled();
                expect(disable).not.toHaveBeenCalled();
            });

            describe('when called with a boolean', function() {
                describe('to enable', function() {
                    beforeEach(function() {
                        result = logger.enabled(true);
                    });

                    it('should do nothing', function() {
                        expect(result).toBe(true);
                        expect(logger.levels).not.toHaveBeenCalled();
                        expect(enable).not.toHaveBeenCalled();
                        expect(disable).not.toHaveBeenCalled();
                        expect(setLevels).not.toHaveBeenCalled();
                    });
                });

                describe('to disable', function() {
                    beforeEach(function() {
                        logger.levels(['warn', 'error']);
                        logger.levels.calls.reset();
                        setLevels.calls.reset();

                        result = logger.enabled(false);
                    });

                    it('should return false', function() {
                        expect(result).toBe(false);
                    });

                    it('should set the log levels to an empty Array', function() {
                        expect(logger.levels).toHaveBeenCalledWith([]);
                    });

                    it('should replace every fn with a noop', function() {
                        expect(logger.log).not.toBe(log);
                        expect(logger.info).not.toBe(info);
                        expect(logger.warn).not.toBe(warn);
                        expect(logger.error).not.toBe(error);
                    });

                    it('should emit "disable"', function() {
                        expect(disable).toHaveBeenCalled();
                        expect(enable).not.toHaveBeenCalled();
                    });

                    it('should not emit "setLevels"', function() {
                        expect(setLevels).not.toHaveBeenCalled();
                    });

                    describe('and then enable', function() {
                        beforeEach(function() {
                            logger.levels.calls.reset();
                            setLevels.calls.reset();
                            enable.calls.reset();
                            disable.calls.reset();

                            result = logger.enabled(true);
                        });

                        it('should return true', function() {
                            expect(result).toBe(true);
                        });

                        it('should call levels() with its previous value', function() {
                            expect(logger.levels).toHaveBeenCalledWith(['warn', 'error']);
                        });

                        it('should restore every fn specified', function() {
                            expect(logger.log).not.toBe(log);
                            expect(logger.info).not.toBe(info);
                            expect(logger.warn).toBe(warn);
                            expect(logger.error).toBe(error);
                        });

                        it('should emit "enable"', function() {
                            expect(enable).toHaveBeenCalled();
                        });

                        it('should not emit "setLevels"', function() {
                            expect(setLevels).not.toHaveBeenCalled();
                        });
                    });
                });
            });
        });

        describe('prefix()', function() {
            var setPrefix;

            beforeEach(function() {
                setPrefix = jasmine.createSpy('setPrefix()');
                logger.on('setPrefix', setPrefix);
            });

            it('should return an empty String', function() {
                expect(logger.prefix()).toBe('');
            });

            it('should not emit setPrefix', function() {
                logger.prefix();
                expect(setPrefix).not.toHaveBeenCalled();
            });

            describe('if called with a string', function() {
                it('should set the prefix', function() {
                    expect(logger.prefix('foo')).toBe('foo');
                    expect(logger.prefix()).toBe('foo');
                });

                it('should emit "setPrefix"', function() {
                    logger.prefix('bar');
                    expect(setPrefix).toHaveBeenCalled();
                });
            });
        });

        describe('context(prefix)', function() {
            var result;

            beforeEach(function() {
                logger.levels(['warn', 'error']);
                logger.enabled(false);
                logger.prefix('MRAID');
                logger.tasks = {
                    format: [function() {}],
                    send: [function() {}]
                };

                result = logger.context('TEST');
            });

            it('should return a copy of the logger with an extended prefix', function() {
                expect(result.levels()).toEqual(logger.levels());
                expect(result.enabled()).toEqual(logger.enabled());
                expect(result.prefix()).toEqual(logger.prefix() + ' TEST');

                expect(result.tasks).toBe(logger.tasks);
                expect(result.meta).toBe(logger.meta);
            });

            describe('if the parent has no prefix', function() {
                beforeEach(function() {
                    logger.prefix('');

                    result = logger.context('MRAID');
                });

                it('should not include a space', function() {
                    expect(result.prefix()).toBe('MRAID');
                });
            });

            describe('when the levels are changed', function() {
                beforeEach(function() {
                    spyOn(result, 'levels').and.callThrough();

                    logger.levels(['error']);
                });

                it('should update the child\'s levels', function() {
                    expect(result.levels).toHaveBeenCalledWith(['error']);
                });
            });

            describe('when enabled', function() {
                beforeEach(function() {
                    spyOn(result, 'enabled').and.callThrough();

                    logger.enabled(true);
                });

                it('should enable the child', function() {
                    expect(result.enabled).toHaveBeenCalledWith(true);
                });

                describe('then disabled', function() {
                    beforeEach(function() {
                        result.enabled.calls.reset();

                        logger.enabled(false);
                    });

                    it('should disable the child', function() {
                        expect(result.enabled).toHaveBeenCalledWith(false);
                    });
                });
            });

            describe('when the prefix is changed', function() {
                beforeEach(function() {
                    logger.prefix('APP');
                });

                it('should update the child\'s prefix', function() {
                    expect(result.prefix()).toBe('APP TEST');
                });
            });
        });

        ['log', 'info', 'warn', 'error'].forEach(function(method) {
            describe(method + '()', function() {
                var format1, format2;
                var send1, send2;

                beforeEach(function() {
                    format1 = jasmine.createSpy('format1()').and.returnValue(['Formatted by 1']);
                    format2 = jasmine.createSpy('format2()').and.returnValue(['Formatted by Two']);
                    send1 = jasmine.createSpy('send1()');
                    send2 = jasmine.createSpy('send2()');

                    logger.tasks = { format: [format1, format2], send: [send1, send2] };

                    logger[method]('foo', 'bar');
                });

                it('should call each format function', function() {
                    expect(format1).toHaveBeenCalledWith(logger, method, ['foo', 'bar']);
                    expect(format2).toHaveBeenCalledWith(logger, method, ['Formatted by 1']);
                });

                it('should call each send function', function() {
                    expect(send1).toHaveBeenCalledWith(logger, method, ['Formatted by Two']);
                    expect(send2).toHaveBeenCalledWith(logger, method, ['Formatted by Two']);
                });
            });
        });
    });
});
