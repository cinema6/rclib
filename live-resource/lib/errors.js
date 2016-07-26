export class StatusCodeError extends Error {
    constructor(message, response) {
        super(message);

        this.status = response.status;
        this.response = response;
    }
}
