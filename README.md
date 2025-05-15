# Gemini Image Generation MCP

A Model Calling Protocol (MCP) server that allows Claude and other LLMs to generate images using Google's Gemini AI model.

## Overview

This MCP server enables Large Language Models (LLMs) like Claude to delegate image generation tasks to Google's Gemini model. It follows the MCP standard to provide a seamless integration experience.

## Features

- Generate images from text prompts using Google's Gemini model (`gemini-2.0-flash-preview-image-generation`)
- Save generated images locally
- Configure generation parameters like temperature, topK, and topP
- Interactive web interface for testing and demonstration
- Docker support for easy deployment
- Simple MCP standard implementation

## Prerequisites

- Node.js 18 or higher
- Google API key with access to Gemini API (specifically the image generation preview model)
- For Docker: Docker and Docker Compose

## Getting Started

### Installation

1. Clone this repository:
```
git clone https://your-repository-url/gemini-image-gen-mcp.git
cd gemini-image-gen-mcp
```

2. Install dependencies:
```
npm install
```

3. Create your environment configuration:
```
cp .env.example .env
```

4. Edit the `.env` file to add your Google API key:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running the Server

#### Option 1: Using Node.js directly

For MCP server only:
```
node src/mcp-server.js
```

For web interface only:
```
node src/web-server.js
```

Or use the provided script:

```
# Run both MCP server and web interface
./start-server.sh --both

# Run MCP server only
./start-server.sh --mcp-only

# Run web interface only
./start-server.sh --web-only

# Default (MCP server only)
./start-server.sh
```

The web interface will be available at http://localhost:3020 (or the port specified in your .env file).

#### Option 2: Using Docker

```
docker-compose up -d
```

## Web Interface

The project includes a web interface for testing and demonstrating the image generation capabilities:

- **Generator**: Create images by entering text prompts and adjusting parameters
- **Gallery**: View all previously generated images
- **About**: Information about the project and its features

To access the web interface, navigate to http://localhost:3020 in your browser after starting the web server.

## Usage with Claude

### API Usage

When making API requests to Claude, include the MCP configuration:

```json
{
  "mcpServers": {
    "openai-image-generation": {
      "command": "node",
      "args": ["/full/path/to/openai-image-gen-mcp/src/mcp-server.js"],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key-here"
      }
    }
  }
}
```

### Claude Console Usage

1. Go to Developer Settings
2. Navigate to the MCPs section
3. Click "Add MCP"
4. Fill in the details:
   - Name: `gemini_image_generation`
   - URL: `https://your-server-url.com/mcp`
   - Authentication (if implemented): Select Bearer Token and enter your token

## Gemini Image Generation API

This server uses the Gemini API for image generation. Specifically, it uses the `gemini-2.0-flash-preview-image-generation` model which is optimized for image generation tasks. The implementation follows Google's official API documentation for properly formatting requests and handling responses.

Key features of the Gemini image generation implementation:

- Uses proper response modality for image generation
- Handles base64-encoded image data from response
- Provides enhanced prompts alongside generated images
- Automatically saves generated images for later use

## Configuration Options

The MCP server supports the following configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `GEMINI_API_KEY` | Google API key with Gemini access | (Required) |
| `MCP_AUTH_TOKEN` | Authentication token for MCP | (Optional) |
| `PORT` | Web server port | `3020` |
| `OUTPUT_DIR` | Directory for saved images | `./generated-images` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.