/**
 * Tool schemas for MCP server
 * Centralized definition to avoid duplication
 */

export const TOOL_SCHEMAS = {
  generate_image: {
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
  },
  generate_video: {
    name: 'generate_video',
    description: 'Generate a video using Google Gemini Veo 2.0',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description of the video to generate'
        },
        model: {
          type: 'string',
          enum: ['veo-2.0-generate-001'],
          description: 'Model to use',
          default: 'veo-2.0-generate-001'
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
          description: 'Whether to save the generated video to the filesystem',
          default: true
        }
      },
      required: ['prompt']
    }
  },
  generate_video_from_image: {
    name: 'generate_video_from_image',
    description: 'Generate a video from an initial image using Google Gemini Veo 2.0',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Text description of the video to generate'
        },
        model: {
          type: 'string',
          enum: ['veo-2.0-generate-001'],
          description: 'Model to use',
          default: 'veo-2.0-generate-001'
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
          description: 'Whether to save the generated video to the filesystem',
          default: true
        }
      },
      required: ['prompt']
    }
  }
};

// Export individual schemas for convenience
export const GENERATE_IMAGE_SCHEMA = TOOL_SCHEMAS.generate_image;
export const GENERATE_VIDEO_SCHEMA = TOOL_SCHEMAS.generate_video;
export const GENERATE_VIDEO_FROM_IMAGE_SCHEMA = TOOL_SCHEMAS.generate_video_from_image;

// Export as array for easy iteration
export const ALL_TOOL_SCHEMAS = Object.values(TOOL_SCHEMAS);
