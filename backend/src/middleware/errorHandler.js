/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors
      });
    }
  
    // Mongoose duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `A record with this ${field} already exists`
      });
    }
  
    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
  
    // Default error
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
  
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
  
  /**
   * Async error wrapper to catch errors in async route handlers
   */
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  
  /**
   * Custom error class
   */
  class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = {
    errorHandler,
    asyncHandler,
    AppError
  };