#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { GeminiService } from './gemini-service.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Logger } from './utils/logger.js';

// Load environment variables
try {
  import('dotenv').then(dotenv => dotenv.config());
} catch (error) {
  // Continue without dotenv
}

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GeminiImageServer {
  constructor() {
    this.geminiService = new GeminiService();
    this.logger = new Logger();
    this.server = new Server(
      {
        name: 'gemini-image-generation',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {
            generate_image: {
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
                    default: true
                  }
                },
                required: ['prompt']
              }
            }
          }
        }
      }
    );

    // Register tool list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
                default: true
              }
            },
            required: ['prompt']
          }
        }
      ]
    }));

    // Register tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'generate_image') {
        return this.handleGenerateImage(request.params.arguments, request.id);
      }
      
      this.logger.error("SetRequestHandler", `Unknown tool: ${request.params.name}`);
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  async handleGenerateImage(args, requestId) {
    try {
      this.logger.debug(`Handling generate_image request: ${JSON.stringify(args)}`);

      if (!args.prompt) {
        this.logger.error("generate_image", 'Prompt is required for image generation');
        throw new Error('Prompt is required for image generation');
      }
      
      const options = {
        model: args.model || 'gemini-2.0-flash-preview-image-generation',
        temperature: args.temperature !== undefined ? args.temperature : 1.0,
        topP: args.topP !== undefined ? args.topP : 0.95,
        topK: args.topK !== undefined ? args.topK : 40,
        save: args.save !== false
      };
      
      const result = await this.geminiService.generateImage(args.prompt, options);
      
      // Prepare response
      let responseText = `Image generated successfully!\n\nPrompt: ${args.prompt}`;
      
      if (result.enhanced_prompt) {
        responseText += `\n\nEnhanced prompt: ${result.enhanced_prompt}`;
      }
      
      if (result.local_path) {
        responseText += `\n\nSaved to: ${result.local_path}`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ]
      };
    } catch (error) {
      this.logger.error('handleGenerateImage', `Error generating image: ${error.message}`);

      return {
        content: [
          {
            type: 'text',
            text: `Failed to generate image: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('Gemini Image Generation MCP server running');
      
      // Keep the process running
      process.on('SIGINT', () => {
        this.server.close().catch(err => this.logger.error('SIGINT', err));
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        this.server.close().catch(err => this.logger.error('SIGTERM', err));
        process.exit(0);
      });
    } catch (error) {
      this.logger.error('Start', `Error starting MCP server: ${error.message}`);
      process.exit(1);
    }
  }
}

// Start the server
const server = new GeminiImageServer();
server.start().catch(err => this.logger.error('Start', `Error starting server: ${err.message}`));
