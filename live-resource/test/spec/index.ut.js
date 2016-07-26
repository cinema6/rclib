import * as index from '../../index';
import LiveResource from '../../lib/LiveResource';
import LiveCollection from '../../lib/LiveCollection';
import { StatusCodeError } from '../../lib/errors';

describe('index', () => {
    it('should export LiveResource', () => {
        expect(index.LiveResource).toBe(LiveResource);
    });

    it('should export LiveCollection', () => {
        expect(index.LiveCollection).toBe(LiveCollection);
    });

    it('should export StatusCodeError', () => {
        expect(index.StatusCodeError).toBe(StatusCodeError);
    });
});
