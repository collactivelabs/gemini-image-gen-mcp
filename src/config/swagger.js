/**
 * OpenAPI/Swagger configuration for the Gemini Image Generation API
 */

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gemini Image & Video Generation API',
      version: '1.0.0',
      description: 'REST API for generating images and videos using Google Gemini AI',
      contact: {
        name: 'API Support',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3070',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Token',
          description: 'Enter your API token',
        },
        QueryToken: {
          type: 'apiKey',
          in: 'query',
          name: 'token',
          description: 'API token in query parameter',
        },
      },
      schemas: {
        GenerationRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              description: 'Text description of the image/video to generate',
              minLength: 1,
              maxLength: 5000,
              example: 'A serene mountain landscape at sunset with vibrant colors',
            },
            model: {
              type: 'string',
              description: 'AI model to use for generation',
              example: 'gemini-2.0-flash-preview-image-generation',
            },
            temperature: {
              type: 'number',
              description: 'Controls randomness (0.0 = deterministic, 1.0 = very random)',
              minimum: 0.0,
              maximum: 1.0,
              default: 1.0,
              example: 0.8,
            },
            topP: {
              type: 'number',
              description: 'Nucleus sampling parameter',
              minimum: 0.0,
              maximum: 1.0,
              default: 0.95,
              example: 0.95,
            },
            topK: {
              type: 'number',
              description: 'Top-k sampling parameter',
              minimum: 1,
              maximum: 100,
              default: 40,
              example: 40,
            },
            save: {
              type: 'boolean',
              description: 'Whether to save the generated content to filesystem',
              default: true,
              example: true,
            },
          },
        },
        GenerationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            result: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  example: 'A serene mountain landscape at sunset',
                },
                enhanced_prompt: {
                  type: 'string',
                  example: 'Generated image showing a serene mountain landscape...',
                },
                image_path: {
                  type: 'string',
                  example: '/generated-images/image_1234567890.png',
                },
                video_path: {
                  type: 'string',
                  example: '/generated-videos/video_1234567890.mp4',
                },
                full_result: {
                  type: 'object',
                  description: 'Complete result object from Gemini API',
                },
                error: {
                  type: 'string',
                  description: 'Error message if generation failed but fallback was used',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Validation failed',
            },
            message: {
              type: 'string',
              example: 'The provided API token is invalid',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
        ImagesListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
                example: '/generated-images/image_1234567890.png',
              },
            },
            total: {
              type: 'number',
              example: 42,
            },
            page: {
              type: 'number',
              example: 1,
            },
            limit: {
              type: 'number',
              example: 20,
            },
          },
        },
        VideosListResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            videos: {
              type: 'array',
              items: {
                type: 'string',
                example: '/generated-videos/video_1234567890.mp4',
              },
            },
            total: {
              type: 'number',
              example: 15,
            },
            page: {
              type: 'number',
              example: 1,
            },
            limit: {
              type: 'number',
              example: 20,
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            message: {
              type: 'string',
              example: 'Gemini Image Generation MCP server is running',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        QueryToken: [],
      },
    ],
  },
  apis: ['./src/web-server.js'],
};
