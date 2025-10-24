/**
 * Tests for authentication middleware
 */

import { jest } from '@jest/globals';
import { authenticate } from '../src/middleware/auth.js';

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      ip: '127.0.0.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Clear environment variable
    delete process.env.API_AUTH_TOKEN;
  });

  afterEach(() => {
    // Clean up
    delete process.env.API_AUTH_TOKEN;
  });

  test('should pass through when no token is configured', () => {
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject request without token when auth is configured', () => {
    process.env.API_AUTH_TOKEN = 'test-token-123';

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Authentication required'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should accept valid token in Authorization header', () => {
    process.env.API_AUTH_TOKEN = 'test-token-123';
    req.headers.authorization = 'Bearer test-token-123';

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject invalid token in Authorization header', () => {
    process.env.API_AUTH_TOKEN = 'test-token-123';
    req.headers.authorization = 'Bearer wrong-token';

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid token'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should accept valid token in query parameter', () => {
    process.env.API_AUTH_TOKEN = 'test-token-123';
    req.query.token = 'test-token-123';

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should prioritize Authorization header over query parameter', () => {
    process.env.API_AUTH_TOKEN = 'test-token-123';
    req.headers.authorization = 'Bearer test-token-123';
    req.query.token = 'wrong-token';

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should handle malformed Authorization header', () => {
    process.env.API_AUTH_TOKEN = 'test-token-123';
    req.headers.authorization = 'InvalidFormat test-token-123';

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
