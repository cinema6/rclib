rc-live-resource
=======================

`live-resource` is a collection of classes to manage the polling of URLs for changes in the response. After creating an instance, users can listen for changes to the underlying resource.

Install
-------

1. Install via NPM

    ```bash
    $> npm install rc-live-resource isomorphic-fetch core-js --registry "http://deployer1:4873/"
    ```

2. Setup `fetch()` and `Promise` polyfills

    ```javascript
    import 'core-js/fn/promise';
    import 'isomorphic-fetch';
    ```

Example
-------

```javascript
import { LiveResource, LiveCollection } from 'rc-live-resource';

const analytics = new LiveResource({
    endpoint: '/api/analytics/campaigns/showcase/apps/cam-0Ek37e0bVN5L_tsN',
});
const campaigns = new LiveCollection({
    endpoint: '/api/campaigns',
    query: { statuses: 'active' },
});

analytics.on('change', data => console.log('Got new analytics:', data));

campaigns
    .on('add', (id, campaign) => console.log(`New campaign(${id}):`, campaign))
    .on('update', (id, newCamp, oldCamp) => console.log(`campaign(${id}) updated:`, newCamp, oldCamp))
    .on('remove', id => console.log(`Removed campaign(${id}).`));

campaigns.update('cam-0Ek37e0bVN5L_tsN', {
    thisIs: 'new data',
});
```

Usage
-----

```javascript
import {
    LiveResource,
    LiveCollection,
} from 'rc-live-resource';
```

### LiveResource(*config*) [`EventEmitter`]
* Class to manage polling an endpoint for changes in its response.
* Constructor Parameters
    * (`Object`) **config**:
        * (`String`) **config.endpoint**: The URL to poll for changes.
        * (`Number`) **config.pollInterval** [*optional*]: The number of milliseconds to wait in-between requests. Defaults to `1000`.
        * (`Object`) **config.query** [*optional*]: Query parameters to be sent when a refresh is performed.
* Properties
    * (`Object`) **data**: The current state of the resource. Initialized as `null`.
    * (`Object`) **config**: The configuration `Object`, with defaults applied.
    * (`Boolean`) **opened**: Boolean indicating if the resource is being polled or not.
* Methods
    * **refresh()**
        * Makes a request to the `config.endpoint` and updates itself with the latest data. **This should not need to be called manually. It will be called automatically every `config.pollInterval` ms.**
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled with the latest data.
    *  **update(*data*)**
        * Makes a `PUT` request to `config.endpoint` with the specified `data` as a JSON request body.
        *  Parameters
            * (`any`) **data**: A payload of data that will be sent as the request body.
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled after the update succeeds.
    * **request(*endpoint*, *options*)**
        * Temporarily pauses polling while sending a request to the server. Directly passes its parameters to `fetch()`.
        *  Parameters
            * (`String`) **endpoint**: The URL to request.
            * (`Object`) **data** [*optional*]: `fetch()` options.
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled with an `Array` with two members:
                * `[0]`: The most-recent `refresh()` data (ocurring *after* the `PUT` succeeds.)
                * `[1]`: The response body of the `PUT`, parsed as JSON.
    * **open()**
        * Starts polling the resource for changes. **This should not be called directly. Polling will start automatically when you start listening for any events.**
    * **close()**
        * Stops polling the resource for changes. **This should not be called directly. Polling will stop automatically when there are no more event subscribers.**
* Events
    * **refresh**
        * Emitted whenever the resource is refreshed.
        * Event Data
            * (`any`) **data**: The most-recent data from the server.
    * **change**:
        * Emitted whenever the resource changes.
        * Event Data
            * (`any`) **newData**: The new data from the server.
            * (`any`) **oldData**: The previous data (will be `null` initially.)
    * **error**:
        * Emitted whenver an error occurs.
        * Event Data
            * (`Error`) **error**: The error.
    * **open**:
        * Emitted when polling starts.
    * **close**:
        * Emitted when polling stops.

### LiveCollection(*config*) [`LiveResource`]
* Class to manage polling an endpoint for an `Array` of items, diffing and emitting events as items are added, removed and modified. **Inherits all of `LiveResource`'s properties, methods, and events.**
* Constructor Parameters
    * (`Object`) **config**:
        * (`String`) **config.endpoint**: The URL to poll for changes.
        * (`Number`) **config.pollInterval** [*optional*]: The number of milliseconds to wait in-between requests. Defaults to `1000`.
        * (`Object`) **config.query** [*optional*]: Query parameters to be sent when a refresh is performed.
* Methods
    *  **update(*id*, *data*)**
        * Makes a `PUT` request to `config.endpoint`/`id` with the specified `data` as a JSON request body.
        *  Parameters
            * (`String`) **id**: The unique id of the item.
            * (`any`) **data**: A payload of data that will be sent as the request body.
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled after the update succeeds.
    *  **add(*data*)**
        * Makes a `POST` request to `config.endpoint` with the specified `data` as a JSON request body.
        *  Parameters
            * (`any`) **data**: A payload of data that will be sent as the request body.
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled after the add succeeds.
    *  **remove(*id*)**
        * Makes a `DELETE` request to `config.endpoint`/`id`.
        *  Parameters
            * (`String`) **id**: The unique id of the item.
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled after the delete succeeds.
* Events
    * **add**
        * Emitted whenever an item is added to the collection.
        * Event Data
            * (`String`) **id**: The `id` of the item.
            * (`Object`) **newItem**: The item.
            * (`null`) **oldItem**: The old item (always `null` for this event.)
    * **update**
        * Emitted whenever an item is updated in the collection.
        * Event Data
            * (`String`) **id**: The `id` of the item.
            * (`Object`) **newItem**: The item's new state.
            * (`Object`) **oldItem**: The previous state of the item.
    * **remove**
        * Emitted whenever an item is removed from the collection.
        * Event Data
            * (`String`) **id**: The `id` of the item.
            * (`null`) **newItem**: The item's new state (always `null` for this event.)
            * (`Object`) **oldItem**: The previous state of the item.