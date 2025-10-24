import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GeminiService } from './gemini-service.js';
import { authenticate } from './middleware/auth.js';
import { swaggerOptions } from './config/swagger.js';
import { responseCache } from './utils/cache.js';
import fs from 'fs';
import { Logger } from './utils/logger.js';

// Load environment variables
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch (error) {
  // Continue without dotenv
}

// Set up __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log function
const logger = new Logger();

// Initialize Gemini service
const geminiService = new GeminiService();

// Set up Express app
const app = express();
const port = process.env.PORT || 3070;

// Configure CORS with environment variable support
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  optionsSuccessStatus: 200
};

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure stricter rate limiting for generation endpoints
const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.GENERATION_RATE_LIMIT || 20, // Limit to 20 generation requests
  message: 'Too many generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(join(__dirname, '..', 'public')));
app.use(limiter); // Apply rate limiting to all routes

// Serve generated images
app.use('/generated-images', express.static(join(__dirname, '..', 'generated-images')));

// Serve generated videos
app.use('/generated-videos', express.static(join(__dirname, '..', 'generated-videos')));

// Setup Swagger documentation
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Gemini API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Validation middleware
const validateImageGeneration = [
  body('prompt')
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Prompt must be between 1 and 5000 characters'),
  body('temperature')
    .optional()
    .isFloat({ min: 0.0, max: 1.0 })
    .withMessage('Temperature must be between 0.0 and 1.0'),
  body('topP')
    .optional()
    .isFloat({ min: 0.0, max: 1.0 })
    .withMessage('topP must be between 0.0 and 1.0'),
  body('topK')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('topK must be between 1 and 100'),
  body('model')
    .optional()
    .isString()
    .trim(),
  body('save')
    .optional()
    .isBoolean()
    .withMessage('save must be a boolean')
];

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the server is running and responsive
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gemini Image Generation MCP server is running' });
});

/**
 * @swagger
 * /api/generate-image:
 *   post:
 *     summary: Generate an image using Gemini AI
 *     description: Generate an image from a text prompt using Google's Gemini 2.0 model
 *     tags: [Generation]
 *     security:
 *       - BearerAuth: []
 *       - QueryToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerationRequest'
 *     responses:
 *       200:
 *         description: Image generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/api/generate-image', generationLimiter, authenticate, validateImageGeneration, handleValidationErrors, async (req, res) => {
  try {
    const { prompt, model, temperature, topP, topK, save } = req.body;

    const options = {
			model: model || 'gemini-2.0-flash-preview-image-generation',
			temperature: temperature !== undefined ? parseFloat(temperature) : 1.0,
			topP: topP !== undefined ? parseFloat(topP) : 0.95,
			topK: topK !== undefined ? parseInt(topK) : 40,
			save: save !== false
		};

    // Check cache first (only if caching is enabled)
    const cacheEnabled = process.env.ENABLE_CACHE !== 'false';
    const cacheKey = responseCache.generateKey(prompt, options);

    if (cacheEnabled) {
      const cachedResult = responseCache.get(cacheKey);
      if (cachedResult) {
        logger.info(`Cache hit for image generation: "${prompt.substring(0, 50)}..."`);
        return res.json({
          success: true,
          result: cachedResult,
          cached: true
        });
      }
    }

    logger.info(`Web interface: Generating image with prompt: "${prompt}"`);

    const result = await geminiService.generateImage(prompt, options);

    // Get image URL relative to our web server
    let imageUrl = result.local_path;
    if (imageUrl) {
      // Convert absolute path to web URL
      const relativePath = imageUrl.split('generated-images')[1];
      imageUrl = `/generated-images${relativePath}`;
    }

    const response = {
      prompt,
      enhanced_prompt: result.enhanced_prompt,
      image_path: imageUrl,
      full_result: result,
      error: result.error // Pass along any error for UI display
    };

    // Store in cache if caching is enabled
    if (cacheEnabled && !result.error) {
      responseCache.set(cacheKey, response);
    }

    res.json({
      success: true,
      result: response
    });
  } catch (error) {
    logger.error('Generate Image', `Error generating image: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/generate-video:
 *   post:
 *     summary: Generate a video using Gemini Veo 2.0
 *     description: Generate a video from a text prompt using Google's Veo 2.0 model
 *     tags: [Generation]
 *     security:
 *       - BearerAuth: []
 *       - QueryToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerationRequest'
 *     responses:
 *       200:
 *         description: Video generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
app.post('/api/generate-video', generationLimiter, authenticate, validateImageGeneration, handleValidationErrors, async (req, res) => {
  try {
    const { prompt, model, temperature, topP, topK, save } = req.body;

    logger.info(`Web interface: Generating video with prompt: "${prompt}"`);

    const options = {
      model: model || 'veo-2.0-generate-001',
      temperature: temperature !== undefined ? parseFloat(temperature) : 1.0,
      topP: topP !== undefined ? parseFloat(topP) : 0.9 ,
      topK: topK !== undefined ? parseInt(topK) : 40,
      save: save !== false
    };

    const result = await geminiService.generateVideo(prompt, options);

    // Get video URL relative to our web server
    let videoUrl = result.local_path;
    if (videoUrl) {
      // Convert absolute path to web URL
      const relativePath = videoUrl.split('generated-videos')[1];
      videoUrl = `/generated-videos${relativePath}`;
    }

    res.json({
      success: true,
      result: {
        prompt,
        enhanced_prompt: result.enhanced_prompt,
        video_path: videoUrl,
        full_result: result,
        error: result.error // Pass along any error for UI display        
      }
    });
  } catch (error) {
    logger.error('Generate Video', `Error generating video: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/generate-video-from-image:
 *   post:
 *     summary: Generate a video from an initial image
 *     description: Generate a video using an image generated from the prompt as the starting frame
 *     tags: [Generation]
 *     security:
 *       - BearerAuth: []
 *       - QueryToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerationRequest'
 *     responses:
 *       200:
 *         description: Video generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerationResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
app.post('/api/generate-video-from-image', generationLimiter, authenticate, validateImageGeneration, handleValidationErrors, async (req, res) => {
  try {
    const { prompt, model, temperature, topP, topK, save } = req.body;

    logger.info(`Web interface: Generating video from image with prompt: "${prompt}"`);

    const options = {
      model: model || 'veo-2.0-generate-001',
      temperature: temperature !== undefined ? parseFloat(temperature) : 1.0,
      topP: topP !== undefined ? parseFloat(topP) : 0.9 ,
      topK: topK !== undefined ? parseInt(topK) : 40,
      save: save !== false
    };

    const result = await geminiService.generateVideoFromImage(prompt, options);

    // Get video URL relative to our web server
    let videoUrl = result.local_path;
    if (videoUrl) {
      // Convert absolute path to web URL
      const relativePath = videoUrl.split('generated-images')[1];
      videoUrl = `/generated-images${relativePath}`;
    }

    res.json({
        success: true,
        result: {
          prompt,
          enhanced_prompt: result.enhanced_prompt,
          video_path: videoUrl,
          full_result: result,
          error: result.error // Pass along any error for UI display        
        }
        });
    } catch (error) {
      logger.error('Generate Video From Image', `Error generating video from image: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: Get list of generated images
 *     description: Retrieve a list of all generated image URLs
 *     tags: [Gallery]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of image URLs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImagesListResponse'
 *       500:
 *         description: Internal server error
 */
app.get('/api/images', (req, res) => {
  try {
    const outputDir = geminiService.outputImageDir;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Check if directory exists
    if (!fs.existsSync(outputDir)) {
      return res.json({
        success: true,
        images: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      });
    }

    // Get all files
    const allFiles = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
      .sort((a, b) => {
        // Sort by modification time (newest first)
        const statsA = fs.statSync(join(outputDir, a));
        const statsB = fs.statSync(join(outputDir, b));
        return statsB.mtimeMs - statsA.mtimeMs;
      });

    const total = allFiles.length;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const paginatedFiles = allFiles
      .slice(skip, skip + limit)
      .map(file => `/generated-images/${file}`);

    res.json({
      success: true,
      images: paginatedFiles,
      total,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    logger.error('Get Images', `Error getting images: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Get list of generated videos
 *     description: Retrieve a list of all generated video URLs
 *     tags: [Gallery]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of video URLs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VideosListResponse'
 *       500:
 *         description: Internal server error
 */
app.get('/api/videos', (req, res) => {
  try {
    const outputDir = geminiService.outputVideoDir;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Check if directory exists
    if (!fs.existsSync(outputDir)) {
      return res.json({
        success: true,
        videos: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      });
    }

    // Get all files
    const allFiles = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.avi'))
      .sort((a, b) => {
        // Sort by modification time (newest first)
        const statsA = fs.statSync(join(outputDir, a));
        const statsB = fs.statSync(join(outputDir, b));
        return statsB.mtimeMs - statsA.mtimeMs;
      });

    const total = allFiles.length;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination
    const paginatedFiles = allFiles
      .slice(skip, skip + limit)
      .map(file => `/generated-videos/${file}`);

    res.json({
      success: true,
      videos: paginatedFiles,
      total,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    logger.error('Get Videos', `Error getting videos: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     description: Returns information about the current cache state
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Cache statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 size:
 *                   type: number
 *                 ttl:
 *                   type: number
 *                 entries:
 *                   type: array
 */
app.get('/api/cache/stats', (req, res) => {
  const stats = responseCache.getStats();
  res.json({
    success: true,
    cache: stats
  });
});

/**
 * @swagger
 * /api/cache/clear:
 *   post:
 *     summary: Clear the cache
 *     description: Removes all entries from the response cache
 *     tags: [System]
 *     security:
 *       - BearerAuth: []
 *       - QueryToken: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
app.post('/api/cache/clear', authenticate, (req, res) => {
  responseCache.clear();
  logger.info('Cache cleared manually');
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

// Start the server
app.listen(port, () => {
  logger.info(`Web interface running at http://localhost:${port}`);

  // Check for required API key
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY is not set. Image generation will fail.');
  }
});
