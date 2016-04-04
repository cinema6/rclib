rc-kinesis
=======

Library for working with Amazon Kinesis streams.

Install
-------
```bash
$> npm install rc-kinesis --registry "http://deployer1:4873/"
```

Usage
-----

### Producing to a Stream
```javascript
var JsonProducer = require('rc-kinesis').JsonProducer;

var producer = new JsonProducer('myStream', {
    // AWS options
    region: 'us-east-1'
});

producer.produce({
    // JSON data
}).then(function(data) {
    // Do something with the result of putRecord
}).catch(function(error) {
    // Do something with the putRecord error
});

// With Node streams API:
// (Produces JSON written to stdin to the stream.)
var through = require('through2');
var parseJson = through.obj(function(chunk, enc, callback) {
    this.push(JSON.parse(chunk));
    callback();
});

process.stdin.pipe(parseJson).pipe(producer.createWriteStream());
```
