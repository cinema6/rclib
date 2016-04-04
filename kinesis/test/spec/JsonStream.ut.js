'use strict';

describe('JsonStream(producer)', function() {
    var JsonStream = require('../../lib/JsonStream');
    var JsonProducer = require('../../lib/JsonProducer');
    var WritableStream = require('readable-stream').Writable;
    var q = require('q');

    it('should exist', function() {
        expect(JsonStream).toEqual(jasmine.any(Function));
        expect(JsonStream.name).toBe('JsonStream');
    });

    describe('instance:', function() {
        var producer;
        var stream;

        beforeEach(function() {
            producer = new JsonProducer('myStream');
            stream = new JsonStream(producer);
        });

        it('should be a WriteableStream', function() {
            expect(stream).toEqual(jasmine.any(WritableStream));
            expect(stream._writableState.objectMode).toBe(true, 'Stream is not in object mode.');
        });

        describe('methods:', function() {
            describe('_write(chunk, encoding, callback)', function() {
                var chunk, encoding, callback;
                var produceDeferred;

                beforeEach(function(done) {
                    chunk = { data: 'this is data' };
                    encoding = null;
                    callback = jasmine.createSpy('callback()');

                    spyOn(producer, 'produce').and.returnValue((produceDeferred = q.defer()).promise);

                    stream._write(chunk, encoding, callback);
                    process.nextTick(done);
                });

                it('should produce to the producer', function() {
                    expect(producer.produce).toHaveBeenCalledWith(chunk);
                });

                it('should not callback', function() {
                    expect(callback).not.toHaveBeenCalled();
                });

                describe('if the call is successful', function() {
                    beforeEach(function(done) {
                        produceDeferred.fulfill(chunk);
                        process.nextTick(done);
                    });

                    it('should callback', function() {
                        expect(callback).toHaveBeenCalledWith();
                    });
                });

                describe('if the call is not successful', function() {
                    var reason;

                    beforeEach(function(done) {
                        reason = new Error('UH OH!');

                        produceDeferred.reject(reason);
                        process.nextTick(done);
                    });

                    it('should callback with the reason', function() {
                        expect(callback).toHaveBeenCalledWith(reason);
                    });
                });
            });
        });
    });
});
