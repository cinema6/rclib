describe('index.js', function() {
    it('should be a reference to BrowserInfo', function() {
        expect(require('../../index')).toBe(require('../../lib/BrowserInfo'));
    });
});
