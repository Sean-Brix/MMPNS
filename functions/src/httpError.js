/* eslint-disable require-jsdoc */

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const notFound = (message = "Not found") => new HttpError(404, message);

const badRequest = (message = "Bad request") => new HttpError(400, message);

const unauthorized = (message = "Unauthorized") =>
  new HttpError(401, message);

const forbidden = (message = "Forbidden") => new HttpError(403, message);

module.exports = {
  HttpError,
  badRequest,
  forbidden,
  notFound,
  unauthorized,
};
