import { EventEmitter } from 'events';
import LiveResource from '../../lib/LiveResource';
import fetchMock from 'fetch-mock';
import { createUuid } from 'rc-uuid';
import { StatusCodeError } from '../../lib/errors';
import shuffle from 'lodash/shuffle';
import find from 'lodash/find';
import assign from 'lodash/assign';
import defer from 'promise-defer';
import querystring from 'querystring';

const wait = window.setTimeout;
const EVENTS = ['refresh', 'change', 'error'];

describe('LiveResource', () => {
    let resource;
    let config;

    beforeEach(() => {
        jasmine.clock().install();

        config = {
            endpoint: '/api/campaigns',
            pollInterval: 5000,
            query: {
                foo: 'bar',
                hello: 'world',
            },
        };

        fetchMock.mock(`${config.endpoint}?${querystring.stringify(config.query)}`, new Promise(() => {}));

        resource = new LiveResource(config);
    });

    afterEach(() => {
        resource = null;
        config = null;

        fetchMock.restore();

        jasmine.clock().uninstall();
    });

    it('should exist', () => {
        expect(resource).toEqual(jasmine.any(EventEmitter));
    });

    describe('if no endpoint is specified', () => {
        beforeEach(() => {
            delete config.endpoint;
        });

        it('should throw', () => {
            expect(() => new LiveResource(config)).toThrow(new Error('config.endpoint is required'));
        });
    });

    describe('when a listener is added', () => {
        beforeEach(() => {
            spyOn(resource, 'open').and.callThrough();
            spyOn(resource, 'close').and.callThrough();
        });

        EVENTS.forEach(event => describe(`of type "${event}"`, () => {
            let handler;

            beforeEach(() => {
                handler = jasmine.createSpy(event);
                resource.on(event, handler);
            });

            afterEach(() => {
                handler = null;
            });

            it('should open() the resource', () => {
                expect(resource.open).toHaveBeenCalledWith();
            });

            describe('twice', () => {
                let handler2;

                beforeEach(() => {
                    resource.open.calls.reset();

                    handler2 = jasmine.createSpy(`${event}[2]`);
                    resource.on(event, handler2);
                });

                afterEach(() => {
                    handler2 = null;
                });

                it('should not open() the resource again', () => {
                    expect(resource.open).not.toHaveBeenCalled();
                });
            });
        }));

        ['foo', 'bar', 'whatever'].forEach(event => describe(`of type "${event}"`, () => {
            let handler;

            beforeEach(() => {
                handler = jasmine.createSpy(event);
                resource.on(event, handler);
            });

            afterEach(() => {
                handler = null;
            });

            it('should not open() the resource', () => {
                expect(resource.open).not.toHaveBeenCalled();
            });
        }));
    });

    EVENTS.forEach(event => describe(`when the last "${event}" listener is removed`, () => {
        let handler1;
        let handler2;
        let handler3;
        let handler4;

        let otherEvent;

        beforeEach(() => {
            spyOn(resource, 'open').and.callThrough();
            spyOn(resource, 'close').and.callThrough();

            otherEvent = find(shuffle(EVENTS), e => e !== event);

            handler1 = jasmine.createSpy(`${event}[1]`);
            handler2 = jasmine.createSpy(`${event}[2]`);
            handler3 = jasmine.createSpy(`${event}[3]`);
            handler4 = jasmine.createSpy(`${event}[4]`);

            resource.on(event, handler1);
            resource.on(event, handler2);
            resource.on(event, handler3);
            resource.on(otherEvent, handler4);
            resource.on('foo', () => {});
        });

        afterEach(() => {
            handler1 = null;
            handler2 = null;
            handler3 = null;
        });

        it('should call close()', () => {
            resource.removeListener(event, handler1);
            resource.removeListener(event, handler2);
            resource.removeListener(event, handler3);
            expect(resource.close).not.toHaveBeenCalled();

            resource.removeListener(otherEvent, handler4);
            expect(resource.close).toHaveBeenCalledWith();
        });
    }));

    describe('properties', () => {
        describe('data', () => {
            it('should be null', () => {
                expect(resource.data).toBeNull();
            });
        });

        describe('config', () => {
            it('should be a copy of the config', () => {
                expect(resource.config).toEqual(config);
                expect(resource.config).not.toBe(config);
            });
        });

        describe('opened', () => {
            it('should be false', () => {
                expect(resource.opened).toBe(false);
            });
        });
    });

    describe('methods', () => {
        describe('refresh()', () => {
            let response;

            let success;
            let failure;

            let refresh;
            let change;
            let error;

            beforeEach(done => {
                response = [
                    {
                        id: `cam-${createUuid()}`,
                    },
                    {
                        id: `cam-${createUuid()}`,
                    },
                    {
                        id: `cam-${createUuid()}`,
                    },
                ];

                fetchMock.restore();

                fetchMock.mock(`${config.endpoint}?${querystring.stringify(config.query)}`, {
                    body: response,
                });

                success = jasmine.createSpy('success()');
                failure = jasmine.createSpy('failure()');

                refresh = jasmine.createSpy('refresh');
                resource.on('refresh', refresh);

                change = jasmine.createSpy('change');
                resource.on('change', change);

                error = jasmine.createSpy('error');
                resource.on('error', error);

                wait(() => {
                    fetchMock.reset();

                    resource.refresh().then(success, failure);

                    wait(done);
                });
            });

            afterEach(() => {
                response = null;

                success = null;
                failure = null;

                refresh = null;
                change = null;
                error = null;

                expect(fetchMock.calls().unmatched.length).toBe(0);
            });

            it('should make the request', () => {
                expect(fetchMock.called(`${config.endpoint}?${querystring.stringify(config.query)}`)).toBe(true, `Did not call ${config.endpoint}`);
                expect(fetchMock.lastOptions(`${config.endpoint}?${querystring.stringify(config.query)}`)).toEqual({
                    credentials: 'same-origin',
                });
                expect(fetchMock.calls().matched.length).toBe(1);
            });

            it('should emit "refresh"', () => {
                expect(refresh).toHaveBeenCalledWith(response);
            });

            it('should fulfill with the response data', () => {
                expect(success).toHaveBeenCalledWith(response);
            });

            it('should update the "data"', () => {
                expect(resource.data).toEqual(response);
            });

            it('should emit "change"', () => {
                expect(change).toHaveBeenCalledWith(response, null);
            });

            [400, 404, 403, 500, 503].forEach(statusCode => describe(`if the server responds with a ${statusCode}`, () => {
                beforeEach(done => {
                    fetchMock.reset();
                    success.calls.reset();
                    failure.calls.reset();
                    refresh.calls.reset();
                    change.calls.reset();

                    response = `[${statusCode}]: There was a problem!`;

                    fetchMock.restore();

                    fetchMock.mock(`${config.endpoint}?${querystring.stringify(config.query)}`, {
                        status: statusCode,
                        body: response,
                    });

                    resource.refresh().then(success, failure);

                    wait(done);
                });

                it('should not emit "refresh"', () => {
                    expect(refresh).not.toHaveBeenCalled();
                });

                it('should reject with a StatusCodeError', () => {
                    expect(failure).toHaveBeenCalledWith(new StatusCodeError(response, jasmine.any(Response)));
                });

                it('should not update the "data"', () => {
                    expect(resource.data).not.toEqual(response);
                });

                it('should not emit "change"', () => {
                    expect(change).not.toHaveBeenCalled();
                });

                it('should emit "error"', () => {
                    expect(error).toHaveBeenCalledWith(new StatusCodeError(response, jasmine.any(Response)));
                });
            }));

            describe('if called again', () => {
                describe('and there is no change', () => {
                    beforeEach(done => {
                        fetchMock.reset();
                        success.calls.reset();
                        failure.calls.reset();
                        refresh.calls.reset();
                        change.calls.reset();

                        resource.refresh().then(success, failure);

                        wait(done);
                    });

                    it('should make the request', () => {
                        expect(fetchMock.called(`${config.endpoint}?${querystring.stringify(config.query)}`)).toBe(true, `Did not call ${config.endpoint}`);
                        expect(fetchMock.lastOptions(`${config.endpoint}?${querystring.stringify(config.query)}`)).toEqual({
                            credentials: 'same-origin',
                        });
                        expect(fetchMock.calls().matched.length).toBe(1);
                    });

                    it('should emit "refresh"', () => {
                        expect(refresh).toHaveBeenCalledWith(response);
                    });

                    it('should fulfill with the response data', () => {
                        expect(success).toHaveBeenCalledWith(response);
                    });

                    it('should not emit "change"', () => {
                        expect(change).not.toHaveBeenCalled();
                    });
                });
            });
        });

        describe('open()', () => {
            let open;
            let refreshDeferred;

            beforeEach(() => {
                refreshDeferred = defer();
                spyOn(resource, 'refresh').and.callFake(() => refreshDeferred.promise);

                open = jasmine.createSpy('open');
                resource.on('open', open);

                resource.open();
            });

            afterEach(() => {
                open = null;
                refreshDeferred = null;
            });

            it('should refresh the resource every `pollInterval`', done => {
                expect(resource.refresh).not.toHaveBeenCalled();

                jasmine.clock().tick(0);
                expect(resource.refresh).toHaveBeenCalledWith();
                resource.refresh.calls.reset();

                Array.apply([], new Array(10)).reduce((promise, item, index) => promise.then(() => new Promise(resolve => {
                    const action = (index % 2 === 0) ? 'resolve' : 'reject';

                    jasmine.clock().tick(5000);
                    expect(resource.refresh).not.toHaveBeenCalled();

                    refreshDeferred[action]({});
                    refreshDeferred = defer();
                    wait(() => {
                        jasmine.clock().tick(4999);
                        expect(resource.refresh).not.toHaveBeenCalled();
                        jasmine.clock().tick(1);
                        expect(resource.refresh).toHaveBeenCalledWith();

                        resource.refresh.calls.reset();
                        resolve();
                    });
                })), Promise.resolve()).then(done, done.fail);
            });

            it('should set opened to true', () => {
                expect(resource.opened).toBe(true);
            });

            it('should emit "open"', () => {
                expect(open).toHaveBeenCalledWith();
            });

            describe('if called a second time', () => {
                beforeEach(() => {
                    open.calls.reset();

                    resource.open();
                });

                it('should not emit "open"', () => {
                    expect(open).not.toHaveBeenCalled();
                });

                it('should schedule nothing', () => {
                    jasmine.clock().tick(0);

                    expect(resource.refresh.calls.count()).toBe(1);
                });
            });

            describe('if a pollInterval is not specified', () => {
                beforeEach(done => {
                    delete config.pollInterval;

                    resource = new LiveResource(config);
                    spyOn(resource, 'refresh').and.returnValue(Promise.resolve({}));

                    open = jasmine.createSpy('open');
                    resource.on('open', open);

                    resource.open();
                    jasmine.clock().tick(0);
                    resource.refresh.calls.reset();

                    wait(done);
                });

                it('should refresh the resource every 1 second', () => {
                    jasmine.clock().tick(999);
                    expect(resource.refresh).not.toHaveBeenCalled();
                    jasmine.clock().tick(1);
                    expect(resource.refresh).toHaveBeenCalledWith();
                });
            });
        });

        describe('close()', () => {
            let close;
            let refreshDeferred;

            beforeEach(done => {
                refreshDeferred = defer();
                spyOn(resource, 'refresh').and.callFake(() => refreshDeferred.promise);
                resource.open();

                close = jasmine.createSpy('close()');
                resource.on('close', close);

                jasmine.clock().tick(0);
                resource.refresh.calls.reset();

                refreshDeferred.resolve({});
                wait(() => {
                    resource.close();
                    jasmine.clock().tick(5000);

                    done();
                });
            });

            afterEach(() => {
                close = null;
            });

            it('should stop the polling', () => {
                expect(resource.refresh).not.toHaveBeenCalled();
            });

            it('should set opened to false', () => {
                expect(resource.opened).toBe(false);
            });

            it('should emit "close"', () => {
                expect(close).toHaveBeenCalledWith();
            });

            describe('if called twice', () => {
                beforeEach(() => {
                    close.calls.reset();

                    resource.close();
                });

                it('should not emit "close" again', () => {
                    expect(close).not.toHaveBeenCalled();
                });
            });

            describe('if called synchronously after open()', () => {
                beforeEach(() => {
                    resource.refresh.calls.reset();

                    resource.open();
                    resource.close();

                    jasmine.clock().tick(0);
                });

                it('should stop the polling', () => {
                    expect(resource.refresh).not.toHaveBeenCalled();
                });
            });

            describe('if called while a request is in-flight', () => {
                beforeEach(done => {
                    refreshDeferred = defer();

                    resource.open();
                    jasmine.clock().tick(0);
                    resource.refresh.calls.reset();

                    resource.close();

                    refreshDeferred.resolve({});
                    wait(() => {
                        jasmine.clock().tick(5000);
                        done();
                    });
                });

                it('should stop the polling', () => {
                    expect(resource.refresh).not.toHaveBeenCalled();
                });
            });

            describe('if the resource is re-opened while a refresh is in-flight', () => {
                beforeEach(done => {
                    const firstDeferred = refreshDeferred = defer();

                    resource.open();
                    jasmine.clock().tick(0);
                    resource.close();

                    refreshDeferred = defer();
                    resource.open();
                    jasmine.clock().tick(0);

                    firstDeferred.resolve({});
                    wait(() => {
                        resource.refresh.calls.reset();
                        jasmine.clock().tick(5000);
                        done();
                    });
                });

                it('should not continue to recurse the original call', () => {
                    expect(resource.refresh).not.toHaveBeenCalled();
                });
            });
        });

        describe('request(endpoint, options)', () => {
            let endpoint;
            let options;

            let data;
            let responseBody;
            let responseDeferred;

            let success;
            let failure;

            let error;

            beforeEach(done => {
                data = {
                    foo: 'bar',
                    hello: 'world',
                };

                endpoint = `${config.endpoint}/cam-${createUuid()}`;
                options = {
                    credentials: 'same-origin',
                    method: 'PUT',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };

                responseDeferred = defer();
                responseBody = assign({
                    id: `cam-${createUuid()}`,
                }, data);

                fetchMock.restore();
                fetchMock
                    .put(endpoint, responseDeferred.promise)
                    .get(config.endpoint, new Promise(() => {}));

                success = jasmine.createSpy('success()');
                failure = jasmine.createSpy('failure()');

                error = jasmine.createSpy('error');
                resource.on('error', error);

                spyOn(resource, 'open').and.callThrough();
                spyOn(resource, 'close').and.callThrough();

                resource.open();

                resource.request(endpoint, options).then(success, failure);

                expect(resource.opened).toBe(false);
                resource.emit('refresh', { old: 'data' });

                wait(done);
            });

            afterEach(() => {
                endpoint = null;
                options = null;

                data = null;
                responseBody = null;
                responseDeferred = null;

                success = null;
                failure = null;

                error = null;

                expect(fetchMock.calls().unmatched.length).toBe(0);
            });

            it('should close() itself', () => {
                expect(resource.close).toHaveBeenCalledWith();
            });

            it('should make a PUT request', () => {
                expect(fetchMock.called(endpoint)).toBe(true, `Did not request ${endpoint}`);
                expect(fetchMock.lastOptions(endpoint)).toEqual(options);
                expect(fetchMock.calls().matched.length).toBe(1);
            });

            describe('when the request succeeds', () => {
                beforeEach(done => {
                    responseDeferred.resolve({
                        status: 200,
                        body: responseBody,
                    });

                    wait(done);
                });

                it('should not resolve the Promise', () => {
                    expect(success).not.toHaveBeenCalled();
                    expect(failure).not.toHaveBeenCalled();
                });

                it('should open() itself', () => {
                    expect(resource.open).toHaveBeenCalledWith();
                });

                describe('and "refresh" is emitted', () => {
                    let refreshData;

                    beforeEach(done => {
                        refreshData = assign({}, responseBody, {
                            serverHash: createUuid(),
                        });

                        resource.emit('refresh', refreshData);
                        wait(done);
                    });

                    afterEach(() => {
                        refreshData = null;
                    });

                    it('should fulfill with the data', () => {
                        expect(success).toHaveBeenCalledWith([refreshData, responseBody]);
                    });
                });
            });

            [400, 404, 403, 500, 503].forEach(statusCode => describe(`if the server responds with a ${statusCode}`, () => {
                beforeEach(done => {
                    responseBody = `[${statusCode}]: There was a problem!`;
                    responseDeferred.resolve({
                        status: statusCode,
                        body: responseBody,
                    });

                    wait(done);
                });

                it('should reject with a StatusCodeError', () => {
                    expect(failure).toHaveBeenCalledWith(new StatusCodeError(responseBody, jasmine.any(Response)));
                });

                it('should emit "error"', () => {
                    expect(error).toHaveBeenCalledWith(new StatusCodeError(responseBody, jasmine.any(Response)));
                });

                it('should open() itself', () => {
                    expect(resource.open).toHaveBeenCalledWith();
                });
            }));

            describe('if the request fails', () => {
                let reason;

                beforeEach(done => {
                    reason = new Error('Something bad happened!');

                    responseDeferred.resolve({
                        throws: reason,
                    });

                    wait(done);
                });

                afterEach(() => {
                    reason = null;
                });

                it('should reject with the Error', () => {
                    expect(failure).toHaveBeenCalledWith(reason);
                });

                it('should emit "error"', () => {
                    expect(error).toHaveBeenCalledWith(reason);
                });

                it('should open() itself', () => {
                    expect(resource.open).toHaveBeenCalledWith();
                });
            });
        });

        describe('update(data)', () => {
            let data;
            let response;

            let success;
            let failure;

            beforeEach(done => {
                data = {
                    foo: 'bar',
                    hello: 'world',
                };

                response = {
                    id: `cam-${createUuid()}`,
                };

                success = jasmine.createSpy('success()');
                failure = jasmine.createSpy('failure()');

                spyOn(resource, 'request').and.returnValue(Promise.resolve([response, null]));

                resource.update(data).then(success, failure);
                wait(done);
            });

            afterEach(() => {
                data = null;
                response = null;

                success = null;
                failure = null;
            });

            it('should call request()', () => {
                expect(resource.request).toHaveBeenCalledWith(config.endpoint, {
                    credentials: 'same-origin',
                    method: 'PUT',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            });

            it('should fulfill with the refresh data', () => {
                expect(success).toHaveBeenCalledWith(response);
            });
        });
    });
});
