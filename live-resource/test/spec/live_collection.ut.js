import LiveCollection from '../../lib/LiveCollection';
import LiveResource from '../../lib/LiveResource';
import fetchMock from 'fetch-mock';
import { createUuid } from 'rc-uuid';
import shuffle from 'lodash/shuffle';
import find from 'lodash/find';
import assign from 'lodash/assign';

const wait = window.setTimeout;
const EVENTS = ['add', 'remove', 'update'];

describe('LiveCollection', () => {
    let collection;
    let config;

    beforeEach(() => {
        jasmine.clock().install();

        config = {
            endpoint: '/api/campaigns',
            pollInterval: 5000,
        };

        fetchMock.mock(config.endpoint, new Promise(() => {}));

        collection = new LiveCollection(config);
        collection.on('foo', () => {});
        collection.on('bar', () => {});
    });

    afterEach(() => {
        collection = null;
        config = null;

        fetchMock.restore();

        jasmine.clock().uninstall();
    });

    it('should exist', () => {
        expect(collection).toEqual(jasmine.any(LiveResource));
    });

    it('should not be listening for a change', () => {
        expect(collection.listeners('change').length).toBe(0, 'Something is listening for "change."');
    });

    EVENTS.forEach(event => describe(`when the last "${event}" listener is removed`, () => {
        let handler1;
        let handler2;
        let handler3;
        let handler4;

        let otherEvent;

        beforeEach(() => {
            spyOn(collection, 'open').and.callThrough();
            spyOn(collection, 'close').and.callThrough();

            otherEvent = find(shuffle(EVENTS), e => e !== event);

            handler1 = jasmine.createSpy(`${event}[1]`);
            handler2 = jasmine.createSpy(`${event}[2]`);
            handler3 = jasmine.createSpy(`${event}[3]`);
            handler4 = jasmine.createSpy(`${event}[4]`);

            collection.on(event, handler1);
            collection.on(event, handler2);
            collection.on(event, handler3);
            collection.on(otherEvent, handler4);
            collection.on('foo', () => {});
        });

        afterEach(() => {
            handler1 = null;
            handler2 = null;
            handler3 = null;
            handler4 = null;
        });

        it('should remove its "change" listener', () => {
            collection.removeListener(event, handler1);
            collection.removeListener(event, handler2);
            collection.removeListener(event, handler3);
            expect(collection.listeners('change').length).toBe(1);

            collection.removeListener(otherEvent, handler4);
            expect(collection.listeners('change').length).toBe(0);
        });
    }));

    describe('events:', () => {
        describe('add', () => {
            let add;

            beforeEach(() => {
                add = jasmine.createSpy('add');
                collection.on('add', add);
                collection.on('add', () => {});
            });

            afterEach(() => {
                add = null;
            });

            describe('on initialization', () => {
                let data;

                beforeEach(() => {
                    data = Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }));

                    collection.emit('change', data, null);
                });

                afterEach(() => {
                    data = null;
                });

                it('should emit for each item', () => {
                    expect(add.calls.count()).toBe(data.length);
                    data.forEach(item => expect(add).toHaveBeenCalledWith(item.id, item, null));
                });

                describe('if not an Array', () => {
                    beforeEach(() => {
                        data = {
                            forEach: () => {},
                            map: () => ([]),
                        };
                    });

                    it('should throw', () => {
                        expect(() => collection.emit('change', data, null)).toThrow(new TypeError('Server must respond with an Array'));
                    });
                });
            });

            describe('after initialization', () => {
                let oldData;
                let newData;
                let newItem;

                beforeEach(() => {
                    newItem = { id: `cam-${createUuid()}` };

                    oldData = Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }));
                    newData = [].concat(
                        oldData.slice(0, 3),
                        [newItem],
                        oldData.slice(3)
                    );

                    collection.emit('change', newData, oldData);
                });

                it('should only emit for the new item', () => {
                    expect(add).toHaveBeenCalledWith(newItem.id, newItem, null);
                    expect(add.calls.count()).toBe(1);
                });
            });
        });

        describe('remove', () => {
            let remove;

            beforeEach(() => {
                remove = jasmine.createSpy('remove');
                collection.on('remove', remove);
                collection.on('remove', () => {});
            });

            afterEach(() => {
                remove = null;
            });

            describe('on initialization', () => {
                let data;

                beforeEach(() => {
                    data = Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }));

                    collection.emit('change', data, null);
                });

                afterEach(() => {
                    data = null;
                });

                it('should not emit anything', () => {
                    expect(remove).not.toHaveBeenCalled();
                });

                describe('if not an Array', () => {
                    beforeEach(() => {
                        data = {
                            forEach: () => {},
                            map: () => ([]),
                        };
                    });

                    it('should throw', () => {
                        expect(() => collection.emit('change', data, null)).toThrow(new TypeError('Server must respond with an Array'));
                    });
                });
            });

            describe('after initialization', () => {
                let oldData;
                let newData;
                let removedItem;

                beforeEach(() => {
                    oldData = Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }));
                    removedItem = oldData[2];

                    newData = oldData.filter(item => item !== removedItem);

                    collection.emit('change', newData, oldData);
                });

                it('should only emit for the removed item', () => {
                    expect(remove).toHaveBeenCalledWith(removedItem.id, null, removedItem);
                    expect(remove.calls.count()).toBe(1);
                });
            });
        });

        describe('update', () => {
            let update;

            beforeEach(() => {
                update = jasmine.createSpy('update');
                collection.on('update', update);
                collection.on('update', () => {});
            });

            afterEach(() => {
                update = null;
            });

            describe('on initialization', () => {
                let data;

                beforeEach(() => {
                    data = Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }));

                    collection.emit('change', data, null);
                });

                afterEach(() => {
                    data = null;
                });

                it('should not emit anything', () => {
                    expect(update).not.toHaveBeenCalled();
                });

                describe('if not an Array', () => {
                    beforeEach(() => {
                        data = {
                            forEach: () => {},
                            map: () => ([]),
                        };
                    });

                    it('should throw', () => {
                        expect(() => collection.emit('change', data, null)).toThrow(new TypeError('Server must respond with an Array'));
                    });
                });
            });

            describe('after initialization', () => {
                let oldData;
                let newData;
                let updatedItem;

                beforeEach(() => {
                    oldData = Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }));
                    updatedItem = {
                        id: oldData[3].id,
                        lastUpdated: new Date().toISOString(),
                        hash: createUuid(),
                    };

                    newData = shuffle(oldData.map(item => (item.id === updatedItem.id ? updatedItem : item)));

                    collection.emit('change', newData, oldData);
                });

                it('should only emit for the modified item', () => {
                    expect(update).toHaveBeenCalledWith(updatedItem.id, updatedItem, oldData[3]);
                    expect(update.calls.count()).toBe(1);
                });
            });
        });
    });

    describe('methods:', () => {
        describe('update(id, data)', () => {
            let id;
            let data;

            let response;

            let success;
            let failure;

            beforeEach(done => {
                response = Array.apply([], new Array(10)).map(() => ({
                    id: `cam-${createUuid()}`,
                    lastUpdated: new Date().toISOString(),
                }));

                id = response[3].id;
                data = {
                    foo: 'bar',
                    hello: 'world',
                };

                success = jasmine.createSpy('success()');
                failure = jasmine.createSpy('failure()');

                spyOn(LiveResource.prototype, 'update').and.callThrough();
                spyOn(collection, 'request').and.returnValue(Promise.resolve([response]));

                collection.update(id, data).then(success, failure);
                wait(done);
            });

            afterEach(() => {
                response = null;

                id = null;
                data = null;
            });

            it('should not call super()', () => {
                expect(LiveResource.prototype.update).not.toHaveBeenCalled();
            });

            it('should call request()', () => {
                expect(collection.request).toHaveBeenCalledWith(`${config.endpoint}/${id}`, {
                    credentials: 'same-origin',
                    method: 'PUT',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            });

            it('should fulfill with the correct item', () => {
                expect(success).toHaveBeenCalledWith(response[3]);
            });

            describe('if the endpoint has a trailing slash', () => {
                beforeEach(done => {
                    config.endpoint += '/';
                    collection = new LiveCollection(config);
                    spyOn(collection, 'request').and.returnValue(Promise.resolve([response]));

                    collection.update(id, data).then(success, failure);
                    wait(done);
                });

                it('should not add two slashes', () => {
                    expect(collection.request).toHaveBeenCalledWith(`${config.endpoint}${id}`, jasmine.any(Object));
                });
            });
        });

        describe('add(data)', () => {
            let data;

            let response;
            let newItem;

            let success;
            let failure;

            beforeEach(done => {
                data = {
                    foo: 'bar',
                    hello: 'world',
                };

                newItem = assign({}, data, {
                    id: `cam-${createUuid()}`,
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                });
                response = [].concat(
                    Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    })),
                    [assign({}, newItem, {
                        hash: createUuid(),
                    })],
                    Array.apply([], new Array(5)).map(() => ({
                        id: `cam-${createUuid()}`,
                    }))
                );

                success = jasmine.createSpy('success()');
                failure = jasmine.createSpy('failure()');

                spyOn(collection, 'request').and.returnValue(Promise.resolve([response, newItem]));

                collection.add(data).then(success, failure);
                wait(done);
            });

            afterEach(() => {
                data = null;

                response = null;
                newItem = null;

                success = null;
                failure = null;
            });

            it('should call request()', () => {
                expect(collection.request).toHaveBeenCalledWith(`${config.endpoint}`, {
                    credentials: 'same-origin',
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            });

            it('should fulfill with the correct item', () => {
                expect(success).toHaveBeenCalledWith(response[5]);
            });
        });

        describe('remove(id)', () => {
            let id;

            let response;

            let success;
            let failure;

            beforeEach(done => {
                id = `cam-${createUuid()}`;

                response = Array.apply([], new Array(5)).map(() => ({
                    id: `cam-${createUuid()}`,
                }));

                success = jasmine.createSpy('success()');
                failure = jasmine.createSpy('failure()');

                spyOn(collection, 'request').and.returnValue(Promise.resolve([response, null]));

                collection.remove(id).then(success, failure);
                wait(done);
            });

            afterEach(() => {
                id = null;

                response = null;

                success = null;
                failure = null;
            });

            it('should call request()', () => {
                expect(collection.request).toHaveBeenCalledWith(`${config.endpoint}/${id}`, {
                    credentials: 'same-origin',
                    method: 'DELETE',
                });
            });

            it('should fulfill with null', () => {
                expect(success).toHaveBeenCalledWith(null);
            });

            describe('if the endpoint has a trailing slash', () => {
                beforeEach(done => {
                    config.endpoint += '/';
                    collection = new LiveCollection(config);
                    spyOn(collection, 'request').and.returnValue(Promise.resolve([response]));

                    collection.remove(id).then(success, failure);
                    wait(done);
                });

                it('should not add two slashes', () => {
                    expect(collection.request).toHaveBeenCalledWith(`${config.endpoint}${id}`, jasmine.any(Object));
                });
            });
        });
    });
});
