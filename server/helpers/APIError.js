const httpStatus = require('http-status');
const ExtendableError = require('./ExtendableError').default;

/**
 * Class representing an API error.
 * @extends ExtendableError
 */
class APIError extends ExtendableError {
	/**
	 * Creates an API error.
	 * @param {string} message - Error message.
	 * @param {number} status - HTTP status code of error.
	 * @param {boolean} isPublic - Whether the message should be visible to user or not.
	 */
	constructor(
		message,
		status = httpStatus.INTERNAL_SERVER_ERROR,
		isPublic = false
	) {
		super(message, status, isPublic);
	}
}

module.exports = APIError;
