rc-post-message-session
=======================

Install
-------
```bash
$> npm install rc-post-message-session --registry "http://deployer1:4873/"
```

Usage
-----
### PostMessageSession(*win*) [`EventEmitter`]
* Constructor Parameters
    * (`Window`) **win**: A `Window` (usually belonging to an `<iframe>`) to communicate with.
* Properties
    * (`Number`) **id**: A unique identifier for the session.
    * (`Window`) **window**: The `Window` passed to the constructor.
* Methods
    * **post(*type*, *event*, *data*, [*id*])**
        * Sends a message to the `win`. This method should not be called directly. Use `ping()` or `request()` instead.
        * Parameters
            * (`String`) **type**: The type of message to post.
            * (`String`) **event**: The name of the event to post.
            * (`any`) **data**: A payload of data to include with the message.
            * (`Number`) **id** [*optional*]: A unique ID for the message. One will be generated if not specified.
        * Returns
            * (`Number`): The unique ID for the message.
    *  **ping(*event*, *data*)**
        *  Sends a message to the `win` with the specified data.
        *  Parameters
            * (`String`) **event**: The name of the event to post.
            * (`any`) **data**: A payload of data to include with the message.
        * Returns
            * (`PostMessageSession`): Itself (to enable method chaining.)
    * **request(*event*, *data*)**
        *  Requests data from the `win` with the specified data.
        *  Parameters
            * (`String`) **event**: The name of the event to post.
            * (`any`) **data**: A payload of data to include with the request.
        * Returns
            * (`Promise`): A `Promise` that will be fulfilled with the `win`'s response.
* Events
    * Any `ping()`s or `request()`s from the `win` will be emitted as events on the instance. Each event will be `emit()`ted with the following parameters:
        * (`any`): The data payload for the `request()`/`ping()`.
        * (`Function`): A function that will respond to a `request()` with the supplied data payload. This function is still supplied for `ping()` events, but calling it will have no effect.