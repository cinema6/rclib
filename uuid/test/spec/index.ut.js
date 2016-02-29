var flush = true;
describe('index', function() {
    var index, generator;
    
    beforeEach(function() {
        if (flush){ for (var m in require.cache){ delete require.cache[m]; } flush = false; }
        generator   = require('../../lib/generator');
        
        ['generate', 'parse', 'randomUuid'].forEach(function(method) {
            spyOn(generator[method], 'bind').and.returnValue(generator[method]);
        });
        
        index = require('../../index');
    });
    
    it('should only export id-related functions', function() {
        expect(index).toEqual({
            createUuid: generator.generate,
            parseUuid: generator.parse,
            randomUuid: generator.randomUuid
        });
        expect(generator.generate.bind).toHaveBeenCalledWith(generator);
        expect(generator.parse.bind).toHaveBeenCalledWith(generator);
        expect(generator.randomUuid.bind).toHaveBeenCalledWith(generator);
    });
});
