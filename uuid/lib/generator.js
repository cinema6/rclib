'use strict';

var utils   = require('./utils');

// NOTE: DO NOT CHANGE THESE IF YOU WANT YOUR IDS TO REMAIN UNIQUE
var OLD_TS      = 1456763680592,
    ALPHABET    = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!';

var generator = {
    components: {   // NOTE: DON'T CHANGE THESE LENGTHS EITHER
        machineId: {
            //length: 3
            length: 4
        },
        processId: {
            //length: 3
            length: 4
        },
        ts: { // NOTE: This value will rollover at Sun Jul 13 2155 20:09:51 GMT-0400 (EDT).
            //length: 7
            length: 9
        },
        counter: {
            //length: 3
            length: 3
        }
    },
    previousTS: 0,
    counter: 0
};

// start counter at random int b/t 0 and max value possible for 3-char string
generator.components.counter.max = Math.pow(
    ( ALPHABET.length / 2 ),
    generator.components.counter.length
);
generator.components.counter.start = utils.randInt(generator.components.counter.max);
generator.counter = generator.components.counter.start;


// If val is too large for its type (based on generator components' length), modulo it
generator.capValue = function(val, type) {
    return val % Math.pow(ALPHABET.length, this.components[type].length);
};

// Get a "machine id": computed by treating last two sections of local IP address as 2-byte int
generator.getMachineId = function() {
    var self = this,
        ip = utils.getIp(),
        ipMatch, ipNums;
    
    /* If only local IP returned, use a random value that cannot come from a real IP instead.
     * Max value for 3-char string is 0x3ffff, but values generated from real IP can be at most
     * 0x0ffff. So use a random number up to 0xffff, and then OR with 0x30000. */
    if (ip === '127.0.0.1') {
        // only create this fake machineId once, then reuse
        if (self.components.machineId.fakeVal === undefined) {
            ipNums = [ utils.randInt(256), utils.randInt(256) ];
            self.components.machineId.fakeVal = ( (ipNums[0] << 8) + ipNums[1] ) | 0x30000;
        }
        
        return self.components.machineId.fakeVal;
    }
    
    ipMatch = ip.match(/(\d+)\.(\d+)$/);
    ipNums = [ parseInt(ipMatch[1]), parseInt(ipMatch[2]) ];
    
    return (ipNums[0] << 8) + ipNums[1];
};

// Normally returns process.pid. If not defined (i.e. in browser) store + return a fake value.
generator.getProcessId = function() {
    var self = this;

    if (process && !!process.pid) {
        return process.pid;
    }
    
    if (self.components.processId.fakeVal === undefined) {
        var max = Math.pow(ALPHABET.length, generator.components.processId.length);
        self.components.processId.fakeVal = utils.randInt(max);
    }
    
    return self.components.processId.fakeVal;
};

// Convert val into a string appropriate for the given type
generator.encode = function(val, type) {
    var self = this,
        desiredLength = type ? self.components[type].length : 0,
        maxCharVal = (ALPHABET.length - 1) / 2,
        str = '';
    
    while (val >= 1 || str.length < desiredLength) {
        var charCode = ( val & maxCharVal ) | ( utils.randInt(256) & 0x20 );
        str = ALPHABET.charAt(charCode) + str;
        val = val / (ALPHABET.length / 2);
    }
    
    // If string shorter than max length for given type, pad with '0'
    //while (str.length < desiredLength) {
    //    str = '0' + str;
    //}
    
    return str;
};

// Decode a previously encoded string into an integer, used for parsing uuids
generator.decode = function(str) {
    var val = 0;
        
    for (var i = 0; i < str.length; i++) {
        var charVal = ALPHABET.indexOf(str.charAt(i)) & 31;
        val += ( charVal * Math.pow(( ALPHABET.length / 2 ), (str.length - i - 1)) );
    }
    
    return val;
};


// Create and return a new uuid
generator.generate = function() {
    var self = this;

    var machineId = self.capValue(generator.getMachineId(), 'machineId'),
        processId = self.capValue(self.getProcessId(), 'processId');
        
    // Express ts as difference from a reference time, giving ts field more possible values
    var ts = self.capValue(Date.now() - OLD_TS, 'ts');
    
    // If ts unchanged since last generation, increment counter; otherwise, reset counter
    if (ts === self.previousTS) {
        self.counter++;
    } else {
        self.counter = self.components.counter.start;
    }
    
    self.previousTS = ts;
    
    var counter = self.capValue(self.counter, 'counter');
    
    return self.encode(machineId, 'machineId') +
           self.encode(processId, 'processId') +
           self.encode(ts, 'ts') +
           self.encode(counter, 'counter');
};

// Parse a uuid, returning an object with each component's original value.
generator.parse = function(str) {
    var self = this,
        // validRegex = new RegExp('^[' + ALPHABET + ']{16}$');
        validRegex = new RegExp('^[' + ALPHABET + ']{20}$');
        
    if (!validRegex.test(str)) {
        throw new Error('str is not a valid uuid');
    }
    
    return ['machineId', 'processId', 'ts', 'counter'].reduce(function(obj, type) {
        var typeLen = self.components[type].length,
            strPart = str.substr(0, typeLen);
        
        var val = self.decode(strPart);
        
        if (type === 'ts') {
            obj[type] = new Date(OLD_TS + val);
        } else {
            obj[type] = val;
        }
        
        if (type === 'machineId') {
            obj.ip = '?.?.' + (val >> 8) + '.' + (val & 0xff);
        }

        str = str.substr(typeLen);
        
        return obj;
    }, {});
};

// Return a randomly-generated uuid of a given length (default 20 chars), using same alphabet.
generator.randomUuid = function(len) {
    len = len || 20;
    var str = '';
    
    for (var i = 0; i < len; i++) {
        var rand = utils.randInt(ALPHABET.length);
        str = str + ALPHABET.charAt(rand);
    }
    
    return str;
};

module.exports = generator;

