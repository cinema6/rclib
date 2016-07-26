'use strict';

var desiredVersion = process.argv[2];

var semver = require('semver');
var exec = require('child_process').exec;
var inspect = require('util').inspect;

exec('npm --version', function checkVersion(err, stdout, stderr) {
    if (err || stderr) {
        console.error('There was a problem: ' + inspect(err || stderr));
    }

    if (semver.satisfies(stdout.toString(), desiredVersion)) {
        console.log('NPM satisfies ' + desiredVersion + '.');
        process.exit(0);
    } else {
        console.error('NPM does not satisfy ' + desiredVersion + '.');
        process.exit(1);
    }
});
