# Gemini Image & Video Generation MCP

A production-ready Model Context Protocol (MCP) server that enables Claude and other LLMs to generate images and videos using Google's Gemini AI models (Gemini 2.0 Flash and Veo 2.0).

## 🌟 Features

### Core Capabilities
- ✨ **Image Generation** - Create images using Gemini 2.0 Flash (`gemini-2.0-flash-preview-image-generation`)
- 🎬 **Video Generation** - Generate videos using Veo 2.0 (`veo-2.0-generate-001`)
- 🎨 **Image-to-Video** - Animate images into videos with Veo 2.0
- 💾 **Local Storage** - Automatically save generated content
- ⚙️ **Parameter Control** - Fine-tune temperature, topK, and topP

### Production Features
- 🔒 **Optional Authentication** - Token-based API security
- ⚡ **Response Caching** - 30-minute TTL cache for repeated prompts
- 📊 **Rate Limiting** - Prevent API abuse (100/15min general, 20/15min generation)
- ✅ **Input Validation** - Comprehensive request validation
- 📄 **Pagination** - Efficient gallery browsing with sorting
- 🔐 **Configurable CORS** - Environment-based origin control
- 📚 **OpenAPI Documentation** - Interactive Swagger UI at `/api-docs`
- 🧪 **Test Suite** - 17 automated tests with Jest
- 🐳 **Docker Support** - Easy containerized deployment

## 📋 Prerequisites

- **Node.js** 18 or higher
- **Google API Key** with access to:
  - Gemini 2.0 Flash (image generation)
  - Veo 2.0 (video generation)
- **Docker** (optional, for containerized deployment)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/gemini-image-gen-mcp.git
cd gemini-image-gen-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Running the Server

#### Option 1: Node.js (Development)

```bash
# MCP server only (for Claude integration)
npm start

# Web server with REST API + UI
npm run web

# Or use the start script
./start-server.sh --both      # Both servers
./start-server.sh --mcp-only  # MCP only
./start-server.sh --web-only  # Web only
```

#### Option 2: Docker (Production)

```bash
docker-compose up -d
```

The web interface will be available at **http://localhost:3070**

## 🎯 API Endpoints

### Generation Endpoints
- `POST /api/generate-image` - Generate an image from a text prompt
- `POST /api/generate-video` - Generate a video from a text prompt
- `POST /api/generate-video-from-image` - Generate a video from an initial image

### Gallery Endpoints
- `GET /api/images?page=1&limit=20` - List generated images (paginated)
- `GET /api/videos?page=1&limit=20` - List generated videos (paginated)

### System Endpoints
- `GET /health` - Health check
- `GET /api-docs` - Interactive Swagger UI documentation
- `GET /api-docs.json` - OpenAPI JSON specification
- `GET /api/cache/stats` - View cache statistics
- `POST /api/cache/clear` - Clear response cache (requires auth)

## 📖 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:3070/api-docs
- **OpenAPI JSON**: http://localhost:3070/api-docs.json

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Try-it-now functionality
- Authentication testing
- Parameter descriptions and examples

## 🔐 Authentication

Authentication is **optional** and can be enabled by setting the `API_AUTH_TOKEN` environment variable:

```bash
# In .env file
API_AUTH_TOKEN=your-secure-token-here
```

### Using Authentication

**Bearer Token (Recommended):**
```bash
curl -H "Authorization: Bearer your-secure-token-here" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A sunset over mountains"}' \
  http://localhost:3070/api/generate-image
```

**Query Parameter (Alternative):**
```bash
curl -X POST \
  "http://localhost:3070/api/generate-image?token=your-secure-token-here" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A sunset over mountains"}'
```

## ⚙️ Configuration Options

All configuration is done via environment variables in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | **Required** - Google Gemini API key | - |
| `API_AUTH_TOKEN` | Optional - API authentication token | - |
| `MCP_AUTH_TOKEN` | Optional - MCP server authentication | - |
| `PORT` | Web server port | `3070` |
| `OUTPUT_DIR` | Base directory for generated files | `./generated-images` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `*` |
| `RATE_LIMIT_MAX` | Max requests per 15min per IP | `100` |
| `GENERATION_RATE_LIMIT` | Max generation requests per 15min | `20` |
| `ENABLE_CACHE` | Enable response caching | `true` |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Current Test Coverage:**
- 2 test suites
- 17 tests passing
- Coverage: Authentication, Tool Schemas, Input Validation

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t gemini-image-gen-mcp .

# Run container
docker run -d \
  -p 3070:3070 \
  -e GEMINI_API_KEY=your_key_here \
  -v $(pwd)/generated-images:/app/generated-images \
  -v $(pwd)/generated-videos:/app/generated-videos \
  gemini-image-gen-mcp
```

## 🔌 Usage with Claude

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gemini-image-generation": {
      "command": "node",
      "args": ["/full/path/to/gemini-image-gen-mcp/src/mcp-server.js"],
      "env": {
        "GEMINI_API_KEY": "your-gemini-api-key-here"
      }
    }
  }
}
```

### Claude API Usage

```bash
# Example prompt to Claude
"Please generate an image of a serene mountain landscape at sunset using the Gemini image generation tool"
```

Claude will automatically invoke the MCP server's `generate_image` tool.

## 🎨 Web Interface

The web interface provides three main sections:

### 1. Generator Tab
- Enter text prompts for image/video generation
- Adjust generation parameters (temperature, topP, topK)
- Use sample prompts for quick testing
- View generation results with enhanced prompts

### 2. Gallery Tab
- Browse all generated images and videos
- Pagination support (20 items per page)
- Sorted by newest first
- Click to view full size

### 3. About Tab
- Project information
- Feature list
- Configuration details
- API documentation links

## 📊 Performance & Optimization

### Response Caching
- Automatically caches successful generation results
- 30-minute TTL (configurable)
- Reduces API costs for repeated prompts
- Cache key includes: prompt + model + parameters
- View cache stats at `/api/cache/stats`

### Exponential Backoff
- Smart video polling (2s → 30s max)
- Reduces API calls by ~60%
- Prevents API rate limiting

### Async I/O
- Non-blocking file operations
- Improved server responsiveness
- Better handling of concurrent requests

### Pagination
- Constant memory usage
- Handles galleries with thousands of items
- Sorted by modification time

## 🛡️ Security Features

- ✅ **Input Validation** - All parameters validated with express-validator
- ✅ **Rate Limiting** - Two-tier system (general + generation specific)
- ✅ **Request Size Limits** - 10MB max to prevent DoS
- ✅ **CORS Configuration** - Environment-based origin control
- ✅ **Optional Authentication** - Token-based API security
- ✅ **No Hardcoded Secrets** - All credentials via environment variables

## 🔧 Troubleshooting

### Common Issues

**"GEMINI_API_KEY is not set" error:**
```bash
# Make sure .env file exists and contains:
GEMINI_API_KEY=your_actual_key_here
```

**Port already in use:**
```bash
# Change port in .env file:
PORT=3080
```

**Cache not working:**
```bash
# Check cache is enabled in .env:
ENABLE_CACHE=true
# View cache stats:
curl http://localhost:3070/api/cache/stats
```

**Rate limit exceeded:**
```bash
# Increase limits in .env:
RATE_LIMIT_MAX=200
GENERATION_RATE_LIMIT=50
```

## 📝 Example API Requests

### Generate an Image

```bash
curl -X POST http://localhost:3070/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A futuristic cityscape at night with neon lights",
    "temperature": 0.8,
    "topP": 0.95,
    "topK": 40
  }'
```

### Generate a Video

```bash
curl -X POST http://localhost:3070/api/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A bird flying through a forest",
    "temperature": 1.0
  }'
```

### List Images with Pagination

```bash
curl "http://localhost:3070/api/images?page=1&limit=10"
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Run tests before committing: `npm test`
- Follow existing code style
- Update documentation for new features
- Add tests for new functionality

## 📄 License

ISC

## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- Video generation using [Veo 2.0](https://deepmind.google/technologies/veo/)

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the [API Documentation](http://localhost:3070/api-docs)
- Review the troubleshooting section above

---

**Made with ❤️ for the AI community**
