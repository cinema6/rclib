import { StatusCodeError } from '../../lib/errors';

describe('errors', () => {
    describe('StatusCodeError()', () => {
        let body;
        let response;
        let error;

        beforeEach(() => {
            body = 'There was a terrible problem!';
            response = new Response('There was a terrible problem!', {
                status: 404,
                statusText: 'Not Found',
                headers: {},
                url: '/api/campaigns',
            });

            error = new StatusCodeError(body, response);
        });

        afterEach(() => {
            error = null;
            response = null;
            body = null;
        });

        it('should exist', () => {
            expect(error).toEqual(jasmine.any(Error));
            expect(error.message).toBe(body);
            expect(error.response).toBe(response);
            expect(error.status).toBe(response.status);
        });
    });
});
