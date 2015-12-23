rc-logger
===============

Install
-------
```bash
$> npm install rc-logger --registry "http://deployer1:4873/"
```

Exports
-------

### Main Module
* `Logger`: Reference to the `Logger` class
* `default`: Singleton instance of `Logger`

### rc-logger/formatters/string
**Included by default**

Converts all non-`String`s passed to a logging method into a `String` using `util.inspect()`.

```javascript
var logger = require('rc-logger').default;
var stringify = require('rc-logger/formatters/string');

logger.tasks.format = [stringify];
```
---------------------------------------------------------------------------------------------
### rc-logger/formatters/prefix
**Included by default**

Adds the `Logger`'s prefix and logging method to each log message.

```javascript
var logger = require('rc-logger').default;
var prefix = require('rc-logger/formatters/prefix');

logger.tasks.format = [prefix];
```
---------------------------------------------------------------------------------------------
### rc-logger/senders/console
**Included by default**

Sends messages to the `console` using `console.log`/`info`/`warn`/`error`. Accepts no configuration `Object`.

```javascript
var logger = require('rc-logger').default;
var toConsole = require('rc-logger/senders/console');

logger.tasks.send = [toConsole()];
```
---------------------------------------------------------------------------------------------
### rc-logger/senders/pixel
**Browser-only**

Sends messages to a webserver by firing pixels. Accepts the following configuration options:

* **url** (`String`) [*required*]: The URL of a pixel to request.
* **addParams** (`Function`) [*optional*]: A `Function` that will be called with the `Logger` instance each time a pixel is fired.
  The keys/values of the returned `Object` will be added to the pixel request as query params.
* **ttl** (`Number`) [*optional*]: The amount of time (in seconds) for which logging should be enabled. If messages are sent after the
  `ttl` expires, a final error will be logged and no more pixels will be fired. This defaults to `60`.

The following query params are sent when the pixel URL is requested:

* **v**: The value(s) of the messages, joined with `, `.
* **t**: The current time, in milliseconds.
* **l**: The log level (`log`/`info`/`warn`/`error`.)
* **p**: The `Logger`'s prefix.
* **u**: The `Logger`'s uuid.

```javascript
var logger = require('rc-logger').default;
var toServer = require('rc-logger/senders/pixel');

logger.tasks.send = [toServer({
    url: 'https://logging.reelcontent.com/pixel.gif',
    addParams: function addParams(logger) {
        return {
            c: logger.meta.container,
            a: logger.meta.app,
            n: logger.meta.network
        };
    },
    ttl: 30
})];
```

Classes
-----
### Logger(*options*) [`EventEmitter`]
* Constructor Options
    * **uuid** (`String`): An identifier for the instance (and all its children.) If unspecified, one is generated randomly.
    * **enabled** (`Boolean`): Used to turn logging on or off. Defaults to `true`.
    * **levels** (`Array`): Can contain any combination of the following: `['log', 'info', 'warn', 'error']`. If a level is omitted,
      logging for only that level will be disabled. Defaults to all log levels.
    * **prefix** (`String`): A `String` that will be prepended to all log values. Defaults to `''` (empty `String`.)
    * **tasks** (`Object`): Inital task configration. Read more about `tasks` below.
    * **meta** (`Object`): Arbitrary metadata to attach to the instance. Will also be copied to child instances.
* Properties
    * **tasks** (`Object`): Used to configure log formatting and sending. Has the following properties:
        * **format** (`Array` of `Function`s): When a logging method is called, each `tasks.format` `Function` will be called with:
            * **logger** (`Logger`): The `Logger` whose logging method was called.
            * **method** (`String`): The method of logging (`log`/`info`/`warn`/`error`.)
            * **messages** (`Array`): The arguments passed to the logging method **or** the result of calling the previous `tasks.format`
              `Function`.
            
            Each `tasks.format` function should return a new `Array` of messages. This `Array` will be passed to the next `tasks.format`
            `Function` and finally to the first `tasks.send` `Function`.
        * **send** (`Array` of `Function`s): After all of the `tasks.format` `Function`s have been called, each `tasks.send` `Function` will
          be called with:
            * **logger** (`Logger`): The `Logger` whose logging method was called.
            * **method** (`String`): The method of logging (`log`/`info`/`warn`/`error`.)
            * **messages** (`Array`): The result of the final `tasks.format` `Function`.
    * **meta** (`Object`): The provided `meta` `Object`. Defaults to `{}`.
* Methods
    * **uuid()**: Gets the instance's uuid.
        * **Returns**: `String`: The uuid.
    * **levels(*levelsArray*)**: Gets/sets the log levels.
        * **Arguments**:
            * **levelsArray** (`Array` of `String`s) [*optional*]: The new levels at which to log. Can contain any combination of the
              following: `['log', 'info', 'warn', 'error']`. If unspecified, the method functions as a getter.
        * **Returns**: `Array`: The levels.
    * **enabled(*yes*)**: Checks if the instance is enabled or enables/disables logging.
        * **Arguments**
            * **yes** (`Boolean`) [*optional*]: Enables logging if `true`, disables logging if `false`. If unspecified, the method functions
              as a getter.
        * **Returns** (`Boolean`): The enabled status of the instance.
    * **prefix(*prefixString*)**: Gets/sets the prefix.
        * **Arguments**
            * **prefixString** (`String`) [*optional*]: The new prefix. If unspecified, the method functions as a getter.
        * **Returns** (`String`): The instance's prefix.
    * **context()** (`String`): Creates a new child `Logger` instance. The child will inherit its parent's uuid, enabled status, log levels
      tasks and metadata. The child's prefix will be the parent's prefix with the supplied `prefix` appended.
        * **Arguments**
            * **prefix** (`String`): Will be appended to the parent's prefix to create the child's prefix.
        * **Returns** (`Logger`): The new child instance.
    * **log(*...messages*)**: Logs at the "log" level.
    * **info(*...messages*)**: Logs at the "info" level.
    * **warn(*...messages*)**: Logs at the "warn" level.
    * **error(*...messages*)**: Logs at the "error" level.
* Events
    * **setLevels**: Emitted when the levels are changed.
    * **enable**: Emitted when logging is enabled.
    * **disable**: Emitted when logging is disabled.
    * **setPrefix**: Emitted when the prefix is changed.