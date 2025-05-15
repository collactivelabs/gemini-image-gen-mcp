# Gemini Image Generation MCP Configuration Guide

This document provides detailed instructions on how to configure the Gemini Image Generation MCP for use with Claude and other LLM systems.

## What is MCP?

MCP (Model Calling Protocol) is a protocol for Large Language Models (LLMs) to call other models or services. It enables LLMs like Claude to delegate specific tasks to specialized models, such as image generation with Google's Gemini model.

## Configuring Claude to use this MCP

To allow Claude to generate images using this MCP, you'll need to register the MCP with Claude. This can be done in two ways:

### Option 1: Using Claude API

When making API requests to Claude, include the MCP configuration in your request:

```json
{
  "model": "claude-3-opus-20240229",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Please generate an image of a sunset over mountains"
    }
  ],
  "tools": [
    {
      "name": "gemini_image_generation",
      "mcp": {
        "url": "https://your-server-url.com/mcp",
        "auth": {
          "type": "bearer",
          "token": "your_authentication_token" // If you've implemented authentication
        }
      }
    }
  ]
}
```

### Option 2: Using Claude Console

If you're using the Claude Console, you can configure MCPs in the Developer Settings:

1. Go to Developer Settings
2. Navigate to the MCPs section
3. Click "Add MCP"
4. Fill in the details:
   - Name: `gemini_image_generation`
   - URL: `https://your-server-url.com/mcp`
   - Authentication (if implemented): Select Bearer Token and enter your token

## Sample MCP JSON Configuration

```json
{
  "name": "gemini_image_generation",
  "description": "Generate images using Google's Gemini model",
  "mcp_url": "https://your-server-url.com/mcp",
  "authentication": {
    "type": "bearer",
    "token": "your_auth_token"
  },
  "parameters": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "A detailed text description of the image you want to generate"
      },
      "model": {
        "type": "string",
        "enum": ["gemini-2.0-flash-preview-image-generation"],
        "description": "The Gemini model to use for generation",
        "default": "gemini-2.0-flash-preview-image-generation"
      },
      "temperature": {
        "type": "number",
        "description": "Controls randomness (0.0 to 1.0)",
        "default": 1.0
      },
      "topP": {
        "type": "number",
        "description": "Nucleus sampling parameter",
        "default": 0.95
      },
      "topK": {
        "type": "number",
        "description": "Top-k sampling parameter",
        "default": 40
      },
      "save": {
        "type": "boolean",
        "description": "Whether to save the generated image to the filesystem",
        "default": true
      }
    },
    "required": ["prompt"]
  }
}
```

## Running Locally

To run the MCP server locally:

1. Clone the repository
2. Copy `.env.example` to `.env` and add your Google API key
3. Install dependencies: `npm install`
4. Start the server: `./start-server.sh` or `node src/index.js`

## Using Docker

To run using Docker:

1. Ensure Docker and Docker Compose are installed
2. Create a `.env` file with your Google API key
3. Run: `docker-compose up -d`

## Testing Claude with the MCP

Once your MCP is configured and Claude has access to it, you can test it with prompts like:

1. "Generate an image of a sunset over mountains"
2. "Create a picture of a futuristic city with flying cars"
3. "Make an illustration of a friendly robot playing with children"

Claude should recognize these as image generation requests and use your MCP to generate the images using Gemini.

## Important Notes

- This MCP server provides integration with Google's Gemini model for image generation capabilities.
- The current implementation uses Gemini to enhance prompts. In a production environment, you might want to integrate with additional image generation services.
- Generated images are saved locally by default in the `generated-images` directory.
