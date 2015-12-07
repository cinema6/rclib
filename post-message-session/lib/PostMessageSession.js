'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var LiePromise = require('lie');

var noop = function() {};

function parseMessage(event) {
    var message = (function() {
        try {
            return JSON.parse(event.data).__c6__ || null;
        } catch(e) {
            return null;
        }
    }());

    return message && {
        type: message.type.split(':')[0],
        id: message.id,
        event: message.event,
        data: message.data
    };
}

function PostMessageSession(win) {
    var self = this;
    var $private = {
        pending: {},
        handleMessage: handleMessage
    };

    function handleMessage(event) {
        var message = (event.source === win && parseMessage(event) || null);
        if (!message) { return; }

        switch (message.type) {
        case 'ping':
            return self.emit(message.event, message.data, noop);
        case 'request':
            return self.emit(message.event, message.data, function respond(data) {
                return self.post('response', message.event, data, message.id);
            });
        case 'response':
            ($private.pending[message.id] || noop)(message.data);
            return delete $private.pending[message.id];
        }
    }

    EventEmitter.call(this);

    this.__private__ = $private;

    this.id = this.constructor.getID();
    this.window = win;

    window.addEventListener('message', handleMessage, false);
}
inherits(PostMessageSession, EventEmitter);

PostMessageSession.prototype.post = function post(type, event, data/*, [id]*/) {
    var id = arguments.length >= 4 ? arguments[3] : this.constructor.getID();

    this.window.postMessage(JSON.stringify({ __c6__: {
        type: (type + ':' + id),
        id: id,
        event: event,
        data: data
    } }), '*');

    return id;
};

PostMessageSession.prototype.ping = function ping(event, data) {
    this.post('ping', event, data);
    return this;
};

PostMessageSession.prototype.request = function request(event, data) {
    var self = this;
    var $private = this.__private__;

    return new LiePromise(function resolver(resolve) {
        $private.pending[self.post('request', event, data)] = resolve;
    });
};

PostMessageSession.prototype.destroy = function destroy() {
    window.removeEventListener('message', this.__private__.handleMessage, false);
};

module.exports = PostMessageSession;

PostMessageSession.getID = (function() {
    var counter = 0;

    return function getID() {
        return counter++;
    };
}());

