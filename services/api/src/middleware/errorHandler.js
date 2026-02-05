/**
 * Custom API Error class with status code and optional details.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(400, message, details);
  }
}

/**
 * 401 Unauthorized
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 Forbidden
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

/**
 * 422 Unprocessable Entity
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(422, message, details);
  }
}

/**
 * 429 Too Many Requests
 */
class TooManyRequestsError extends ApiError {
  constructor(message = 'Too many requests') {
    super(429, message);
  }
}

/**
 * 500 Internal Server Error
 */
class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message);
    this.isOperational = false;
  }
}

/**
 * Express middleware: catch 404 for unmatched routes.
 */
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Express global error handler middleware.
 * Must have 4 parameters so Express recognises it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Default to 500 if no status code is set
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ValidationError' && err.errors) {
    // Mongoose-style validation errors
    statusCode = 422;
    message = 'Validation failed';
    details = err.errors;
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    details = { constraint: err.constraint };
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist';
    details = { constraint: err.constraint };
  }

  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body too large';
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user ? req.user.id : null,
    });
  }

  // Build response payload
  const response = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development mode
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalError,
  notFound,
  errorHandler,
};
