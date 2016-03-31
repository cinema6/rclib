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
```
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
```
