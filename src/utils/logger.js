/**
 * Simple logging utility for the OpenAI Image Generation MCP
 */

import fs from 'fs';
import path from 'path';

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

export class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);
    this.logToFile = options.logToFile || false;
    this.logFilePath = options.logFilePath || path.join(process.cwd(), 'logs', 'mcp.log');
    
    // Create logs directory if logging to file
    if (this.logToFile) {
      const logsDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    }
  }
  
  /**
   * Format a log message with timestamp and level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   */
  formatLogMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }
  
  /**
   * Write a log message to the log file
   * @param {string} message - Formatted log message
   */
  writeToFile(message) {
    if (!this.logToFile) return;
    
    fs.appendFileSync(this.logFilePath, message + '\n');
  }
  
  /**
   * Log an error message
   * @param {string} message - Error message
   * @param {Error} [error] - Optional error object
   */
  error(message, error) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      const formattedMessage = this.formatLogMessage('ERROR', message);
      console.error(formattedMessage);
      
      if (error) {
        console.error(error);
      }
      
      this.writeToFile(formattedMessage);
      if (error) {
        this.writeToFile(error.stack || error.toString());
      }
    }
  }
  
  /**
   * Log a warning message
   * @param {string} message - Warning message
   */
  warn(message) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      const formattedMessage = this.formatLogMessage('WARN', message);
      console.warn(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message - Info message
   */
  info(message) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const formattedMessage = this.formatLogMessage('INFO', message);
      console.info(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - Debug message
   */
  debug(message) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      const formattedMessage = this.formatLogMessage('DEBUG', message);
      console.debug(formattedMessage);
      this.writeToFile(formattedMessage);
    }
  }
  
  /**
   * Log request information for an MCP request
   * @param {Object} req - Express request object
   * @param {string} status - Request status (received, processing, completed, failed)
   * @param {Object} [data] - Optional additional data
   */
  request(req, status, data = {}) {
    const requestId = req.headers['x-request-id'] || 'unknown';
    const method = req.method;
    const path = req.path;
    const ip = req.ip;
    
    let message = `Request ${requestId} ${status} - ${method} ${path} from ${ip}`;
    
    if (data.prompt) {
      // Truncate long prompts
      const truncatedPrompt = data.prompt.length > 50 
        ? `${data.prompt.substring(0, 50)}...` 
        : data.prompt;
      
      message += ` - Prompt: "${truncatedPrompt}"`;
    }
    
    if (data.error) {
      message += ` - Error: ${data.error}`;
    }
    
    if (data.responseTime) {
      message += ` - Response time: ${data.responseTime}ms`;
    }
    
    this.info(message);
  }
}