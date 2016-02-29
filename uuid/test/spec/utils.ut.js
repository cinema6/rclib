var flush = true;
describe('utils', function() {
    var utils, os;
    
    beforeEach(function() {
        if (flush){ for (var m in require.cache){ delete require.cache[m]; } flush = false; }
        utils   = require('../../lib/utils');
        os      = require('os');
        
    });

    describe('randInt', function() {
        it('should return a random integer', function() {
            var rand = utils.randInt(100);
            expect(rand >= 0).toBe(true);
            expect(rand <= 100).toBe(true);
        });
        
        it('should handle an undefined max', function() {
            expect(utils.randInt()).toBe(0);
        });
    });
    
    describe('getIp', function() {
        var mockIfaces;
        beforeEach(function() {
            mockIfaces = {
                lo: [
                    {
                        address: '127.0.0.1',
                        family: 'IPv4',
                        internal: true
                    }
                ],
                wlan0: [
                    {
                        address: '1234:56:a789:9876:1a23:b456:93a4:39fe',
                        family: 'IPv6',
                        internal: false
                    },
                    {
                        address: '10.1.10.123',
                        family: 'IPv4',
                        internal: false
                    }
                ],
                tun0: [
                    {
                        address: '172.20.200.150',
                        family: 'IPv4',
                        internal: false
                    }
                ]
            };
            spyOn(os, 'networkInterfaces').and.callFake(function() { return mockIfaces; });
        });
        
        it('should return the first non-internal IPv4 address', function() {
            expect(utils.getIp()).toBe('10.1.10.123');

            mockIfaces.wlan0.pop();
            expect(utils.getIp()).toBe('172.20.200.150');
        });
        
        it('should default to 127.0.0.1', function() {
            mockIfaces.wlan0.pop();
            delete mockIfaces.tun0;
            expect(utils.getIp()).toBe('127.0.0.1');
            
            mockIfaces = {};
            expect(utils.getIp()).toBe('127.0.0.1');
        });
    });
});
