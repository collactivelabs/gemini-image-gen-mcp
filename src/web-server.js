import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GeminiService } from './gemini-service.js';
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gemini Image Generation MCP server is running' });
});

// Generate image endpoint
app.post('/api/generate-image', generationLimiter, validateImageGeneration, handleValidationErrors, async (req, res) => {
  try {
    const { prompt, model, temperature, topP, topK, save } = req.body;

    logger.info(`Web interface: Generating image with prompt: "${prompt}"`);

    const options = {
			model: model || 'gemini-2.0-flash-preview-image-generation',
			temperature: temperature !== undefined ? parseFloat(temperature) : 1.0,
			topP: topP !== undefined ? parseFloat(topP) : 0.95,
			topK: topK !== undefined ? parseInt(topK) : 40,
			save: save !== false
		};

    const result = await geminiService.generateImage(prompt, options);

    // Get image URL relative to our web server
    let imageUrl = result.local_path;
    if (imageUrl) {
      // Convert absolute path to web URL
      const relativePath = imageUrl.split('generated-images')[1];
      imageUrl = `/generated-images${relativePath}`;
    }

    res.json({
      success: true,
      result: {
        prompt,
        enhanced_prompt: result.enhanced_prompt,
        image_path: imageUrl,
        full_result: result,
        error: result.error // Pass along any error for UI display
      }
    });
  } catch (error) {
    logger.error('Generate Image', `Error generating image: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate video endpoint
app.post('/api/generate-video', generationLimiter, validateImageGeneration, handleValidationErrors, async (req, res) => {
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

// Generate video from image endpoint
app.post('/api/generate-video-from-image', generationLimiter, validateImageGeneration, handleValidationErrors, async (req, res) => {
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

// Get all generated images endpoint
app.get('/api/images', (req, res) => {
  try {
    const outputDir = geminiService.outputImageDir;

    // Check if directory exists
    if (!fs.existsSync(outputDir)) {
      return res.json({
        success: true,
        images: []
      });
    }

    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'))
      .map(file => `/generated-images/${file}`);

    res.json({
      success: true,
      images: files
    });
  } catch (error) {
    logger.error('Get Images', `Error getting images: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all generated videos endpoint
app.get('/api/videos', (req, res) => {
  try {
    const outputDir = geminiService.outputVideoDir;

    // Check if directory exists
    if (!fs.existsSync(outputDir)) {
      return res.json({
        success: true,
        videos: []
      });
    }

    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.avi'))
      .map(file => `/generated-videos/${file}`);

    res.json({
      success: true,
      videos: files
    });
  } catch (error) {
    logger.error('Get Videos', `Error getting videos: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  logger.info(`Web interface running at http://localhost:${port}`);

  // Check for required API key
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY is not set. Image generation will fail.');
  }
});
