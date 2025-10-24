/**
 * Authentication middleware for API endpoints
 * Supports optional token-based authentication via environment variable
 */

import { Logger } from '../utils/logger.js';

const logger = new Logger();

/**
 * Authentication middleware
 * Checks for API token in Authorization header or query parameter
 * Only enforces authentication if API_AUTH_TOKEN is set in environment
 */
export const authenticate = (req, res, next) => {
  const configuredToken = process.env.API_AUTH_TOKEN;

  // If no token is configured, allow all requests
  if (!configuredToken) {
    return next();
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  let providedToken = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.substring(7);
  }

  // Fallback: Check query parameter (less secure, but convenient for testing)
  if (!providedToken && req.query.token) {
    providedToken = req.query.token;
  }

  // Verify token
  if (!providedToken) {
    logger.warn(`Authentication failed: No token provided from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide an API token via Authorization header or ?token=xxx parameter'
    });
  }

  if (providedToken !== configuredToken) {
    logger.warn(`Authentication failed: Invalid token from ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: 'The provided API token is invalid'
    });
  }

  // Authentication successful
  logger.debug(`Authenticated request from ${req.ip}`);
  next();
};

/**
 * Optional authentication middleware
 * Only authenticates if token is configured, otherwise passes through
 */
export const optionalAuth = authenticate;

/**
 * Require authentication middleware
 * Always requires valid token, even if not configured (for sensitive endpoints)
 */
export const requireAuth = (req, res, next) => {
  const configuredToken = process.env.API_AUTH_TOKEN;

  if (!configuredToken) {
    logger.error('requireAuth: API_AUTH_TOKEN not configured but required for this endpoint');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      message: 'Authentication is required but not configured'
    });
  }

  authenticate(req, res, next);
};
