import LiveResource from './LiveResource';
import values from 'lodash/values';
import find from 'lodash/find';
import isEqual from 'lodash/isEqual';
import includes from 'lodash/includes';
import {
    CREDENTIALS,
    HEADERS,
    MIME,
    HTTP,
} from './enums';

const EVENTS = {
    ADD: 'add',
    REMOVE: 'remove',
    UPDATE: 'update',
};

const EVENT_VALUES = values(EVENTS);

function single(endpoint, id) {
    return `${endpoint.replace(/\/$/, '')}/${id}`;
}

export default class LiveCollection extends LiveResource {
    constructor(config) {
        super(config);

        // Function to diff changes to the collection, emitting "add", "remove", and "update" as
        // necessary.
        const diff = (newItems, oldItems) => {
            if (!(newItems instanceof Array)) {
                throw new TypeError('Server must respond with an Array');
            }

            newItems.forEach(item => {
                const previous = find(oldItems, { id: item.id });

                if (!previous) {
                    this.emit(EVENTS.ADD, item.id, item, null);
                } else if (!isEqual(item, previous)) {
                    this.emit(EVENTS.UPDATE, item.id, item, previous);
                }
            });

            (oldItems || []).forEach(item => {
                if (!find(newItems, { id: item.id })) {
                    this.emit(EVENTS.REMOVE, item.id, null, item);
                }
            });
        };

        this.on('newListener', type => {
            // Because adding a "change" listener will cause polling to start, one is only
            // added if somebody starts listening for one of the LiveCollection events.
            if (includes(this.listeners('change'), diff) || EVENT_VALUES.indexOf(type) < 0) {
                return;
            }

            this.on('change', diff);
        });

        // Remove the "change" listener when nobody is listening for any LiveCollection events
        // anymore.
        this.on('removeListener', () => {
            const totalListeners = EVENT_VALUES.map(event => this.listeners(event).length)
                .reduce((sum, listenerAmount) => sum + listenerAmount, 0);

            if (totalListeners < 1) {
                this.removeListener('change', diff);
            }
        });
    }

    update(id, data) {
        return this.request(single(this.config.endpoint, id), {
            credentials: CREDENTIALS.SAME_ORIGIN,
            method: HTTP.PUT,
            body: JSON.stringify(data),
            headers: {
                [HEADERS.CONTENT_TYPE]: MIME.JSON,
            },
        }).then(([items]) => find(items, { id }));
    }

    add(data) {
        return this.request(this.config.endpoint, {
            credentials: CREDENTIALS.SAME_ORIGIN,
            method: HTTP.POST,
            body: JSON.stringify(data),
            headers: {
                [HEADERS.CONTENT_TYPE]: MIME.JSON,
            },
        }).then(([items, { id }]) => find(items, { id }));
    }

    remove(id) {
        return this.request(single(this.config.endpoint, id), {
            credentials: CREDENTIALS.SAME_ORIGIN,
            method: HTTP.DELETE,
        }).then(() => null);
    }
}
