'use strict';

var WritableStream = require('readable-stream').Writable;
var inherits = require('util').inherits;

function JsonStream(producer) {
    WritableStream.call(this, { objectMode: true });

    this.__private__ = {
        producer: producer
    };
}
inherits(JsonStream, WritableStream);

JsonStream.prototype._write = function _write(chunk, encoding, callback) {
    this.__private__.producer.produce(chunk)
        .then(function finish() { return callback(); })
        .catch(callback);
};

module.exports = JsonStream;
