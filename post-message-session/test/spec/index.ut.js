describe('index.js', function() {
    it('should be a reference to PostMessageSession', function() {
        expect(require('../../index')).toBe(require('../../lib/PostMessageSession'));
    });
});
