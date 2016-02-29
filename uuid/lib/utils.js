'use strict';

// browserify should stub this if necessary: https://github.com/CoderPuppy/os-browserify
var os = require('os');

// Return a random integer between 0 and max (includes 0, doesn't include max)
module.exports.randInt = function randInt(max) {
    return Math.floor(Math.random() * (max || 0));
};

// Return the local machine's first non-internal IPv4 address, defaulting to 127.0.0.1
module.exports.getIp = function getIp() {
    var ifaces = os.networkInterfaces() || {},
        ifaceNames = Object.keys(ifaces);
        
    for (var i in ifaceNames) {
        var iface = ifaces[ifaceNames[i]];
        
        for (var j in iface) {
            if (iface[j].internal === false && iface[j].family === 'IPv4') {
                return iface[j].address;
            }
        }
    }
    
    return '127.0.0.1';
};
