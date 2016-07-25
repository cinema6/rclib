import { EventEmitter } from 'events';
import {
    parse as parseURL,
    format as formatURL,
} from 'url';
import clone from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import includes from 'lodash/includes';
import values from 'lodash/values';
import defaults from 'lodash/defaults';
import assign from 'lodash/assign';
import { StatusCodeError } from './errors';
import {
    CREDENTIALS,
    HEADERS,
    MIME,
    HTTP,
} from './enums';

const EVENTS = {
    REFRESH: 'refresh',
    CHANGE: 'change',
    ERROR: 'error',
};

const EVENT_VALUES = values(EVENTS);

function checkResponse(response) {
    if (!(/^2/).test(response.status)) {
        return response.text().then(message => {
            throw new StatusCodeError(message, response);
        });
    }

    return response.json();
}

export default class LiveResource extends EventEmitter {
    constructor(config) {
        super();

        this.data = null;
        this.config = defaults(clone(config), {
            pollInterval: 1000,
        });
        this.opened = false;

        // If somebody adds a listener for any of LiveResource's events, automatically start polling
        // the resource.
        this.on('newListener', type => {
            if (!this.opened && includes(EVENT_VALUES, type)) {
                this.open();
            }
        });
        // When nobody is listening to any events anymore, stop polling.
        this.on('removeListener', () => {
            const totalListeners = EVENT_VALUES.map(event => this.listeners(event).length)
                .reduce((sum, listenerAmount) => sum + listenerAmount, 0);

            if (totalListeners < 1) {
                this.close();
            }
        });

        if (!this.config.endpoint) {
            throw new Error('config.endpoint is required');
        }
    }

    refresh() {
        // Parse `config.endpoint` into its parts, tack on `config.query` and convert it back to a
        // string.
        const url = formatURL(assign(parseURL(this.config.endpoint), {
            query: this.config.query,
        }));

        return fetch(url, {
            credentials: CREDENTIALS.SAME_ORIGIN,
        })
        .then(checkResponse)
        .then(data => {
            const current = this.data;

            this.data = data;
            this.emit(EVENTS.REFRESH, data);

            if (!isEqual(this.data, current)) {
                this.emit(EVENTS.CHANGE, this.data, current);
            }

            return data;
        })
        .catch(reason => {
            this.emit(EVENTS.ERROR, reason);

            throw reason;
        });
    }

    update(data) {
        return this.request(this.config.endpoint, {
            credentials: CREDENTIALS.SAME_ORIGIN,
            method: HTTP.PUT,
            body: JSON.stringify(data),
            headers: {
                [HEADERS.CONTENT_TYPE]: MIME.JSON,
            },
        }).then(([refreshed]) => refreshed);
    }

    request(endpoint, options) {
        return new Promise((resolve, reject) => {
            // Stop polling while the request is being made.
            this.close();

            fetch(endpoint, options)
            .then(checkResponse)
            .catch(reason => {
                reject(reason);
                this.emit(EVENTS.ERROR, reason);

                throw reason;
            })
            // Listen for the "refresh" event. Adding this listener will cause the resource to be
            // open()ed again. Fulfill the Promise once the refresh is complete. Doing this ensures
            // that code listening for the resolution of this Promise, and code listening for
            // "change"s or "refresh"es will receive the update at roughly the same time.
            .then(body => this.once(EVENTS.REFRESH, data => resolve([data, body])));
        });
    }

    open() {
        let opened = true;

        // Recursive Function to refresh() the resource after a specified `time`.
        const refresh = time => setTimeout(() => {
            const recurse = () => refresh(this.config.pollInterval);

            // Stop recursion if the resource is ever closed.
            if (opened) {
                this.refresh().then(recurse, recurse);
            }
        }, time);

        if (this.opened) { return; }

        this.opened = true;
        this.emit('open');

        this.once('close', () => {
            opened = false;
        });

        // Kick of first refresh in the next turn of the event loop. This means that the following:
        //
        // ```javascript
        // resource.open();
        // resource.close();
        // ```
        //
        // would not cause any refreshes to happen.
        refresh();
    }

    close() {
        if (!this.opened) { return; }

        this.opened = false;
        this.emit('close');
    }
}
