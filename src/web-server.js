import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GeminiService } from './gemini-service.js';
import fs from 'fs';
import multer from 'multer';
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
const port = process.env.PORT || 3021;

// Configure multer for file uploads (if needed later)
const upload = multer({ dest: 'uploads/' });

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, '..', 'public')));

// Serve generated images
app.use('/generated-images', express.static(join(__dirname, '..', 'generated-images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gemini Image Generation MCP server is running' });
});

// Generate image endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, model, temperature, topP, topK, save } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Prompt is required' 
      });
    }

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

// Get all generated images endpoint
app.get('/api/images', (req, res) => {
  try {
    const outputDir = geminiService.outputDir;
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

// Start the server
app.listen(port, () => {
  logger.info(`Web interface running at http://localhost:${port}`);
  
  // Check for required API key
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('GEMINI_API_KEY is not set. Image generation will fail.');
  }
});
