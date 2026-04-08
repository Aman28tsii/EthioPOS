/**
 * Standardized API Response Helper
 * Provides consistent response format across all endpoints
 */

class ApiResponse {
  /**
   * Success Response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error Response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Error code for frontend handling
   * @param {*} errors - Additional error details
   */
  static error(res, message = 'An error occurred', statusCode = 500, code = 'ERROR', errors = null) {
    const response = {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Validation Error Response
   * @param {Object} res - Express response object
   * @param {Array} errors - Array of validation errors
   */
  static validationError(res, errors) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Not Found Response
   * @param {Object} res - Express response object
   * @param {string} resource - Name of the resource not found
   */
  static notFound(res, resource = 'Resource') {
    return res.status(404).json({
      success: false,
      error: `${resource} not found`,
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Unauthorized Response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      success: false,
      error: message,
      code: 'UNAUTHORIZED',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Forbidden Response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message
   */
  static forbidden(res, message = 'Access forbidden') {
    return res.status(403).json({
      success: false,
      error: message,
      code: 'FORBIDDEN',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Paginated Response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items count
   */
  static paginated(res, data, page, limit, total) {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: (page * limit) < total
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;