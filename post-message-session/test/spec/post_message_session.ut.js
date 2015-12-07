describe('PostMessageSession(win)', function() {
    'use strict';

    var PostMessageSession;
    var EventEmitter;
    var Promise;

    beforeEach(function() {
        PostMessageSession = require('../../lib/PostMessageSession');
        EventEmitter = require('events').EventEmitter;
        Promise = require('lie');
    });

    it('should exist', function() {
        expect(PostMessageSession).toEqual(jasmine.any(Function));
        expect(PostMessageSession.name).toBe('PostMessageSession');
    });

    describe('static:', function() {
        describe('methods:', function() {
            describe('getID()', function() {
                it('should return a Number', function() {
                    expect(PostMessageSession.getID()).toEqual(jasmine.any(Number));
                });

                it('should return a new Number every time', function() {
                    expect([PostMessageSession.getID(), PostMessageSession.getID(), PostMessageSession.getID()]).not.toContain(PostMessageSession.getID());
                });
            });
        });
    });

    describe('instance:', function() {
        var frame, win;
        var session;
        var handleMessage;

        function ping(source, type, id, eventName, data) {
            var event = {
                data: JSON.stringify({ __c6__: {
                    type: type + ':' + id,
                    id: id,
                    event: eventName,
                    data: data
                } }),
                source: source
            };

            handleMessage(event);
        }

        beforeEach(function() {
            frame = document.createElement('iframe');
            document.body.appendChild(frame);
            win = frame.contentWindow;

            spyOn(window, 'addEventListener');

            session = new PostMessageSession(win);
            handleMessage = window.addEventListener.calls.mostRecent().args[1];
        });

        afterEach(function() {
            document.body.removeChild(frame);
        });

        it('should be an EventEmitter', function() {
            expect(session).toEqual(jasmine.any(EventEmitter));
        });

        it('should add an event listener for the message event', function() {
            expect(window.addEventListener).toHaveBeenCalledWith('message', jasmine.any(Function), false);
        });

        describe('when a ping is received', function() {
            var hello;

            beforeEach(function() {
                hello = jasmine.createSpy('hello()');
                session.on('hello', hello);

                handleMessage({ data: 33 });
                ping({}, 'ping', 3, 'hello', { num: 1 });
                ping(session.window, 'response', 3, 'hello', { num: 2 });
                ping(session.window, 'ping', 3, 'foo', { num: 4 });
                ping(session.window, 'ping', 3, 'hello', { num: 7 });
            });

            it('should emit the event', function() {
                expect(hello).toHaveBeenCalledWith({ num: 7 }, jasmine.any(Function));
            });

            describe('the function', function() {
                beforeEach(function() {
                    spyOn(session, 'post');
                    hello.calls.mostRecent().args[1]('foo');
                });

                it('should do nothing', function() {
                    expect(session.post).not.toHaveBeenCalled();
                });
            });
        });

        describe('when a request is received', function() {
            var question;

            beforeEach(function() {
                question = jasmine.createSpy('question()');
                session.on('question', question);

                handleMessage({ data: 33 });
                ping({}, 'request', 3, 'question', { num: 5 });
                ping(session.window, 'ping', 3, 'request', { num: 4 });
                ping(session.window, 'request', 3, 'bar', { num: 3 });
                ping(session.window, 'request', 83, 'question', { num: 2 });
            });

            it('should emit the event', function() {
                expect(question).toHaveBeenCalledWith({ num: 2 }, jasmine.any(Function));
            });

            describe('the function', function() {
                beforeEach(function() {
                    spyOn(session, 'post');
                    question.calls.mostRecent().args[1]({ life: 42 });
                });

                it('should post() to the window', function() {
                    expect(session.post).toHaveBeenCalledWith('response', 'question', { life: 42 }, 83);
                });
            });
        });

        describe('properties:', function() {
            describe('id', function() {
                it('should be a number', function() {
                    expect(session.id).toEqual(jasmine.any(Number));
                });

                it('should increment with each instance', function() {
                    expect(new PostMessageSession(window).id).toBeLessThan(new PostMessageSession(window).id);
                });
            });

            describe('window', function() {
                it('should be the provided window', function() {
                    expect(session.window).toBe(win);
                });
            });
        });

        describe('methods:', function() {
            describe('post(type, event, data, [id])', function() {
                var type, event, data;
                var result;
                var message;

                beforeEach(function() {
                    spyOn(session.window, 'postMessage');
                    type = 'some-type';
                    event = 'something';
                    data = { foo: 'bar' };

                    result = session.post(type, event, data);
                    message = JSON.parse(session.window.postMessage.calls.mostRecent().args[0]);
                });

                it('should call postMessage() on its window', function() {
                    expect(session.window.postMessage).toHaveBeenCalledWith(jasmine.any(String), '*');
                    expect(message).toEqual({ __c6__: { type: jasmine.any(String), id: jasmine.any(Number), event: event, data: data } });
                    expect(message.__c6__.type).toEqual(type + ':' + message.__c6__.id);
                });

                it('should increment the ID with each ping', function() {
                    session.post('foo', 'hello', 'bar');
                    session.post('bar', 'foo', 'hello');

                    session.window.postMessage.calls.all().slice(0, session.window.postMessage.calls.count() - 1).forEach(function(call, index) {
                        var message = JSON.parse(call.args[0]);
                        var nextMessage = JSON.parse(session.window.postMessage.calls.argsFor(index + 1)[0]);

                        expect(nextMessage.__c6__.id).toBeGreaterThan(message.__c6__.id);
                    });
                });

                it('should return the id', function() {
                    expect(result).toBe(message.__c6__.id);
                });

                describe('if an id is specified', function() {
                    var id;

                    beforeEach(function() {
                        session.window.postMessage.calls.reset();
                        id = 4;

                        result = session.post(type, event, data, id);
                    });

                    it('should return the id', function() {
                        expect(result).toBe(id);
                    });

                    it('should call postMessage() using the specified id', function() {
                        expect(session.window.postMessage).toHaveBeenCalledWith(JSON.stringify({ __c6__: {
                            type: type + ':' + id,
                            id: id,
                            event: event,
                            data: data
                        } }), '*');
                    });
                });
            });

            describe('ping(event, data)', function() {
                var event, data;
                var result;

                beforeEach(function() {
                    spyOn(session, 'post').and.returnValue(3);
                    event = 'something';
                    data = { foo: 'bar' };

                    result = session.ping(event, data);
                });

                it('should be chainable', function() {
                    expect(result).toBe(session);
                });

                it('should call post()', function() {
                    expect(session.post).toHaveBeenCalledWith('ping', event, data);
                });
            });

            describe('request(event, data)', function() {
                var event, data;
                var success, failure;
                var result;

                beforeEach(function() {
                    event = 'some-request';
                    data = { nums: [1, 2, 3] };

                    success = jasmine.createSpy('success()');
                    failure = jasmine.createSpy('failure()');

                    spyOn(session, 'post').and.callThrough();
                    spyOn(session.window, 'postMessage');

                    result = session.request(event, data);
                    result.then(success, failure);
                });

                it('should return a Promise', function() {
                    expect(result).toEqual(jasmine.any(Promise));
                });

                it('should call post()', function() {
                    expect(session.post).toHaveBeenCalledWith('request', event, data);
                });

                describe('when a response is received', function() {
                    var requestId;

                    beforeEach(function(done) {
                        requestId = JSON.parse(session.window.postMessage.calls.mostRecent().args[0]).__c6__.id;

                        handleMessage({ data: 'dj93rh8439' });
                        ping({}, 'response', requestId, event, { num: 1 });
                        ping(session.window, 'ping', requestId, event, { num: 2 });
                        ping(session.window, 'response', requestId + 1, event, { num: 3 });
                        ping(session.window, 'response', requestId, event, { num: 4 });

                        setTimeout(done, 15);
                    });

                    it('should fulfill the promise with the result', function() {
                        expect(success).toHaveBeenCalledWith({ num: 4 });
                    });
                });
            });

            describe('destroy()', function() {
                beforeEach(function() {
                    spyOn(window, 'removeEventListener');

                    session.destroy();
                });

                it('should remove the message listener', function() {
                    expect(window.removeEventListener).toHaveBeenCalledWith('message', handleMessage, false);
                });
            });
        });
    });
});
