rc-uuid
=======

Library for generating unique ids.

Install
-------
```bash
$> npm install rc-uuid --registry "http://deployer1:4873/"
```

Usage
-----
### `uuid.createUuid()`

Create and return a 16-character unique id. The characters will be chosen from the following alphabet:

`0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!`

UUIDs should not be truncated or modified if you want to maintain uniqueness.

The uuids are generated from 4 components: a machineId, processId, timestamp, and counter; the machineId is derived from the local machine's IPv4 address. Because the uniqueness of the ids relies on a timestamp, machines generating ids should ensure their clock is synced with NTP servers.

If used in the browser, this library will use different logic for the machineId and processId:
- The machineId will be a random integer generated once per session that cannot possibly come from a valid IPv4 address.
- The processId will be a random integer generated once per session

### `uuid.parseUuid(str)`

Parse a valid uuid, returning an object in this format:
```javascript
{
    processId   : Number,
    machineId   : Number,
    ip          : String,   // will be '?.?.<num>.<num>'
    ts          : Date,
    counter     : Number
}
```

Throws an error if the input is not a valid 16-character uuid string.


### `uuid.randomUuid(len)`

Return a randomly-generated id of the provided length (defaults to 20 characters).

Note that these are **not** guaranteed unique, and should **not** be used alongside uuids from createUuid
