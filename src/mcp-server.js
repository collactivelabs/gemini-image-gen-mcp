#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GeminiService } from './gemini-service.js';

// Load environment variables
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (error) {
  // Continue without dotenv
}

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log function that writes to stderrc
function log(message) {
  console.error(`[${new Date().toISOString()}] ${message}`);
}

// Initialize Gemini service
const geminiService = new GeminiService();

// MCP Server Implementation
class MCPServer {
  constructor() {
    this.buffer = '';
    this.initialized = false;
  }

  async handleRequest(request) {
    try {
      const { method, params, id, jsonrpc } = request;
      
      // Validate JSON-RPC version
      if (jsonrpc !== '2.0') {
        return {
          jsonrpc: '2.0',
          id: id || null,
          error: {
            code: -32600,
            message: 'Invalid Request',
            data: 'jsonrpc must be "2.0"'
          }
        };
      }
      
      switch (method) {
        case 'initialize':
          this.initialized = true;
          
          // Send the response
          const initResponse = {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'gemini-image-generation',
                version: '1.0.0'
              }
            }
          };

          // Process the response synchronously
          process.stdout.write(JSON.stringify(initResponse) + '\n');
          
          // Send initialized notification after the response
          setTimeout(() => {
            if (this.initialized) {
              const notification = {
                jsonrpc: '2.0',
                method: 'notifications/initialized'
              };
              process.stdout.write(JSON.stringify(notification) + '\n');
            }
          }, 100);

          return null; // Already sent

        case 'notifications/initialized':
          // This is a notification from client, no response needed
          return null;
          
        case 'tools/list':
          // this is a placeholder for the tools/list method
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'generate_image',
                  description: 'Generate an image using Google Gemini',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      prompt: {
                        type: 'string',
                        description: 'Text description of the image to generate'
                      },
                      model: {
                        type: 'string',
                        enum: ['gemini-2.0-flash-preview-image-generation'],
                        description: 'Model to use',
                        default: 'gemini-2.0-flash-preview-image-generation'
                      },
                      temperature: {
                        type: 'number',
                        description: 'Temperature for generation (0.0 to 1.0)',
                        default: 1.0,
                        minimum: 0.0,
                        maximum: 1.0
                      },
                      topP: {
                        type: 'number',
                        description: 'Top-p parameter for sampling',
                        default: 0.95,
                        minimum: 0.0,
                        maximum: 1.0
                      },
                      topK: {
                        type: 'number',
                        description: 'Top-k parameter for sampling',
                        default: 40,
                        minimum: 1
                      },
                      save: {
                        type: 'boolean',
                        description: 'Whether to save the generated image to the filesystem',
                        default: 'true'
                      }
                    },
                    required: ['prompt']
                  }
                }
              ]
            }
          };
          
        case 'resources/list':
          // This is a placeholder for the resources/list method
          return {
            jsonrpc: '2.0',
            id,
            result: {
              resources: []
            }
          };
          
        case 'prompts/list':
          // This is a placeholder for the prompts/list method
          return {
            jsonrpc: '2.0',
            id,
            result: {
              prompts: []
            }
          };
          
        case 'tools/call':
          // Handle tool calls
          const { name, arguments: args } = params;
          
          if (name === 'generate_image') {
            try {
              if (!args.prompt) {
                log('Prompt is required for image generation')
                throw new Error('Prompt is required for image generation');
              }
              
              const options = {
                model: args.model || 'gemini-2.0-flash-preview-image-generation',
                temperature: args.temperature !== undefined ? args.temperature : 1.0,
                topP: args.topP !== undefined ? args.topP : 0.95,
                topK: args.topK !== undefined ? args.topK : 40,
                save: args.save !== false
              };
              
              const result = await geminiService.generateImage(args.prompt, options);
              log(`Image generated successfully: ${JSON.stringify(result)}`);
              
              if (result) {
                let responseText = `Image generated successfully!\n\nPrompt: ${args.prompt}`;

                if (result.local_path) {
                  responseText += `\n\nSaved to: ${result.local_path}`;
                }

                if (result.fileUri) {
                    responseText += `\n\nImage URL: ${result.fileUri}`;
                }
                
                if (result.enhanced_prompt) {
                  responseText += `\n\nRevised prompt: ${result.enhanced_prompt}`;
                }
                
                if (result.error) {
                  responseText += `\n\nNote: ${result.error} (Fallback image used)`;
                }
                
                return {
                  jsonrpc: '2.0',
                  id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: responseText
                      }
                    ]
                  }
                };
              } else {
                log('No image was generated');
                throw new Error('No image was generated');
              }
            } catch (error) {
              log(`Error generating image: ${error.message}`);
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32000,
                  message: `Failed to generate image: ${error.message}`
                }
              };
            }
          }
          
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
          
        default:
          // For unknown methods, return method not found
          if (id !== undefined) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: 'Method not found'
              }
            };
          }
          // If no id, it's a notification, no response needed
          return null;
      }
    } catch (error) {
      log(`Error handling request: ${error.message}`);
      return {
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      };
    }
  }

  processInput(chunk) {
    this.buffer += chunk;
    
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const request = JSON.parse(line);
          
          // Handle the request
          this.handleRequest(request).then(response => {
            if (response) {
              process.stdout.write(JSON.stringify(response) + '\n');
            }
          }).catch(error => {
            log(`Error processing request: ${error.message}`);
            // Send proper error response
            const errorResponse = {
              jsonrpc: '2.0',
              id: request.id || null,
              error: {
                code: -32603,
                message: 'Internal error',
                data: error.message
              }
            };
            process.stdout.write(JSON.stringify(errorResponse) + '\n');
          });
        } catch (error) {
          log(`Error parsing JSON: ${error.message}`);
          // Send parse error if there's likely an id
          const errorResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
              data: error.message
            }
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        }
      }
    }
  }

  start() {
    log('MCP Server starting...');

    if (!process.env.GEMINI_API_KEY) {
      log('Warning: GEMINI_API_KEY not set. Image generation will fail.');
    }
    
    // Set up stdin
    process.stdin.setEncoding('utf8');
    
    // Ensure stdout is in line mode
    if (process.stdout._handle && process.stdout._handle.setBlocking) {
      process.stdout._handle.setBlocking(true);
    }
    
    process.stdin.on('data', chunk => this.processInput(chunk));
    process.stdin.on('end', () => {
      log('Input stream ended');
      process.exit(0);
    });
    
    // Handle errors
    process.on('uncaughtException', error => {
      log(`Uncaught exception: ${error.message}`);
      log(`Stack: ${error.stack}`);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      log(`Unhandled rejection: ${reason}`);
      process.exit(1);
    });
    
    // Ensure clean exit
    process.on('SIGINT', () => {
      log('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      log('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });
    
    log('MCP Server ready');
  }
}

// Start the server
const server = new MCPServer();
server.start();
