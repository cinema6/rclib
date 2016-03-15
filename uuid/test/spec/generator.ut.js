var flush = true;
describe('generator', function() {
    var generator, utils;
    
    beforeEach(function() {
        if (flush){ for (var m in require.cache){ delete require.cache[m]; } flush = false; }
        generator   = require('../../lib/generator');
        utils       = require('../../lib/utils');
    });
    
    describe('counter', function() {
        it('should start at a random value', function() {
            expect(generator.components.counter.max).toBe(262144);
            expect(generator.components.counter.start).toBeLessThan(generator.components.counter.max);
            expect(generator.components.counter.start >= 0).toBe(true);
            expect(generator.counter).toBe(generator.components.counter.start);
        });
    });
    
    describe('capValue', function() {
        it('should cap a value if larger than max possible for the given uuid component', function() {
            expect(generator.capValue(1000, 'machineId')).toBe(1000);
            expect(generator.capValue(10000000000, 'machineId')).toBe(254976);
            expect(generator.capValue(10000000000, 'ts')).toBe(10000000000);
            expect(generator.capValue(999999999999999999, 'ts')).toBe(2970630750208);
        });
    });
    
    describe('getMachineId', function() {
        beforeEach(function() {
            spyOn(utils, 'getIp');
            spyOn(utils, 'randInt').and.callFake(function() {
                if (utils.randInt.calls.count() <= 1) {
                    return 123;
                } else {
                    return 234;
                }
            });
        });
        
        it('should return a number computed from the last two sections of the ip', function() {
            utils.getIp.and.returnValue('10.0.0.123');
            expect(generator.getMachineId()).toBe(123);

            utils.getIp.and.returnValue('11.12.0.123');
            expect(generator.getMachineId()).toBe(123);

            utils.getIp.and.returnValue('10.0.1.123');
            expect(generator.getMachineId()).toBe(379);

            utils.getIp.and.returnValue('10.0.255.255');
            expect(generator.getMachineId()).toBe(65535);
            expect(utils.randInt).not.toHaveBeenCalled();
            expect(generator.components.machineId.fakeVal).not.toBeDefined();
        });
        
        it('should use a random machine id if the ip is 127.0.0.1', function() {
            utils.getIp.and.returnValue('127.0.0.1');
            expect(generator.getMachineId()).toBe(228330);
            expect(utils.randInt.calls.count()).toBe(2);
            expect(utils.randInt).toHaveBeenCalledWith(256);
            expect(generator.components.machineId.fakeVal).toBe(228330);

            // should reuse the fakeVal
            expect(generator.getMachineId()).toBe(228330);
            expect(utils.randInt.calls.count()).toBe(2);
        });
    });
    
    describe('getProcessId', function() {
        it('should return the process pid', function() {
            expect(generator.getProcessId()).toBe(process.pid);
            expect(generator.components.processId.fakeVal).not.toBeDefined();
        });
        
        describe('if the process pid is not defined', function() {
            var pid;
            beforeEach(function() {
                pid = process.pid;
                delete process.pid;
                spyOn(utils, 'randInt').and.returnValue(1234);
            });
            
            afterEach(function() {
                process.pid = pid;
            });

            it('should return and store a random value', function() {
                expect(generator.getProcessId()).toBe(1234);
                expect(generator.components.processId.fakeVal).toBe(1234);

                // should reuse the fakeVal
                expect(generator.getProcessId()).toBe(1234);
            });
        });
    });
    
    describe('encode', function() {
        it('should encode values into strings for each component type', function() {
            expect(generator.encode(200000, 'machineId')).toBe('MR0');
            expect(generator.encode(100000, 'processId')).toBe('oqw');
            expect(generator.encode(3666666666666, 'ts')).toBe('RmSnjGG');
            expect(generator.encode(166666, 'counter')).toBe('EIa');
        });
        
        it('should be able to pad the strings if not long enough', function() {
            expect(generator.encode(1, 'machineId')).toBe('001');
            expect(generator.encode(100, 'processId')).toBe('01A');
            expect(generator.encode(100000, 'ts')).toBe('0000oqw');
            expect(generator.encode(1000, 'counter')).toBe('0fE');
        });
    });
    
    describe('decode', function() {
        it('should decode strings into integers', function() {
            expect(generator.decode('MR0')).toBe(200000);
            expect(generator.decode('000001')).toBe(1);
            expect(generator.decode('FOO_')).toBe(10955967);
            expect(generator.decode('evan')).toBe(3797655);
        });
    });

    describe('generate', function() {
        beforeEach(function() {
            spyOn(generator, 'getMachineId').and.returnValue(123);
            spyOn(generator, 'getProcessId').and.returnValue(4567);
            generator.components.counter.start = 1234;
            generator.counter = 1234;
            generator.previousTS = 0;
            
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(1456766781229));
        });
        
        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('should generate a 16 character id using url-safe characters', function() {
            var id = generator.generate();
            expect(id.length).toEqual(16);
            expect(id).toMatch(/^[0-9a-zA-Z-_]{16}$/);
            
            var matchObj = id.match(/(.{3})(.{3})(.{7})(.{3})/);
            expect(matchObj[1]).toBe('01X');        // encoded machineId
            expect(matchObj[2]).toBe('17n');        // encoded processId
            expect(matchObj[3]).toBe('000bQ_t');    // encoded ts
            expect(matchObj[4]).toBe('0ji');        // encoded counter
            
            expect(generator.counter).toBe(1234);
            expect(generator.previousTS).toBe(3100637);
        });
        
        it('should not return duplicate ids when many calls are made', function() {
            var ids = {};
            for (var i = 0; i < 1000; i++) {
                var id = generator.generate();
                expect(ids[id]).not.toBeDefined();
                ids[id] = true;
            }
        });
        
        describe('counter management', function() {
            it('should increment the counter when multiple ids are generated at the same timestamp', function() {
                expect(generator.generate()).toMatch(/.{13}0ji/);
                expect(generator.counter).toBe(1234);
                expect(generator.previousTS).toBe(3100637);

                expect(generator.generate()).toMatch(/.{13}0jj/);
                expect(generator.counter).toBe(1235);

                expect(generator.generate()).toMatch(/.{13}0jk/);
                expect(generator.counter).toBe(1236);

                expect(generator.generate()).toMatch(/.{13}0jl/);
                expect(generator.counter).toBe(1237);
                expect(generator.previousTS).toBe(3100637);
            });
            
            it('should handle the counter exceeding the max value', function() {
                generator.components.counter.start = 262143;
                generator.counter = 262143;

                expect(generator.generate()).toMatch(/.{13}___/);
                expect(generator.counter).toBe(262143);

                expect(generator.generate()).toMatch(/.{13}000/);
                expect(generator.counter).toBe(262144);

                expect(generator.generate()).toMatch(/.{13}001/);
                expect(generator.counter).toBe(262145);
            });
            
            it('should reset the counter when the timestamp changes', function() {
                expect(generator.generate()).toMatch(/.{6}000bQ_t0ji/);
                expect(generator.counter).toBe(1234);
                expect(generator.previousTS).toBe(3100637);

                expect(generator.generate()).toMatch(/.{6}000bQ_t0jj/);
                expect(generator.counter).toBe(1235);
                expect(generator.previousTS).toBe(3100637);

                jasmine.clock().tick(1);
                expect(generator.generate()).toMatch(/.{6}000bQ_u0ji/);
                expect(generator.counter).toBe(1234);
                expect(generator.previousTS).toBe(3100638);
            });
        });
    });
    
    describe('parse', function() {
        it('should be able to parse the components of uuid strings', function() {
            expect(generator.parse('0Gz38h0004azV4dM')).toEqual({
                machineId   : 2723,
                ip          : '?.?.10.163',
                processId   : 12817,
                ts          : jasmine.any(Date),
                counter     : 17264
            });
            expect(generator.parse('0Gz38h0004azV4dM').ts.toString()).toBe('Mon Feb 29 2016 11:52:52 GMT-0500 (EST)');

            expect(generator.parse('f______________-')).toEqual({
                machineId   : 65535,
                ip          : '?.?.255.255',
                processId   : 262143,
                ts          : jasmine.any(Date),
                counter     : 262142
            });
            expect(generator.parse('f______________-').ts.toString()).toBe('Sun Jul 13 2155 20:09:51 GMT-0400 (EDT)');
        });
        
        it('should throw an error if the string is not a valid uuid', function() {
            var msg = 'str is not a valid uuid';
            expect(function() { generator.parse('foo'); }).toThrow(new Error(msg));
            expect(function() { generator.parse('1234567890abcdefg'); }).toThrow(new Error(msg));
            expect(function() { generator.parse('1234567890abcde*'); }).toThrow(new Error(msg));
        });
    });
    
    describe('randomUuid', function() {
        it('should generate an id using url-safe characters', function() {
            var id = generator.randomUuid();
            expect(id.length).toEqual(20);
            expect(id).toMatch(/^[0-9a-zA-Z-_]{20}$/);
        });
        
        it('should allow generating an id of a custom length', function() {
            var id = generator.randomUuid(100);
            expect(id.length).toEqual(100);
            expect(id).toMatch(/^[0-9a-zA-Z-_]{100}$/);
        });
    });
});

