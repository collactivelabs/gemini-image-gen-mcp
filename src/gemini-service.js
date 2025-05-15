import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Logger } from './utils/logger.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Initialize Gemini GoogleGenAI with the @google/genai SDK
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      this.logger.warn('Warning: GEMINI_API_KEY environment variable not set');
      throw new Error('GEMINI_API_KEY is not set');
    }

    // Set up output directory
    this.outputDir = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'generated-images');
    this.logger = new Logger();

    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
        this.logger.info(`Created output directory: ${this.outputDir}`);
      }
    } catch (error) {
      this.logger.error("Failed to create output directory: ", `${error.message}`);
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const fallbackDir = path.join(homeDir, '.gemini-image-gen-mcp', 'generated-images');
      try {
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        this.logger.info(`Using fallback directory: ${fallbackDir}`);
        this.outputDir = fallbackDir;
      } catch (fallbackError) {
        this.logger.error("Failed to create fallback directory: ", `${fallbackError.message}`);
      }
    }
  }

  // Generate image using Gemini
  async generateImage(prompt, options = {}) {
    try {
      // Use the specific image generation model for Gemini
      const modelName = options.model || 'gemini-2.0-flash-preview-image-generation';
      this.logger.info(`Using model: ${modelName}`);
      this.logger.info(`Generating image with prompt: "${prompt.substring(0, 50)}..."`);

      // Generate content according to documentation
      const response = await client.models.generateContent({
        model: modelName,
        contents: [{ text: prompt }],
        config: {
          temperature: options.temperature || 1.0,
          topP: options.topP || 0.95,
          topK: options.topK || 40,
          // According to documentation, we need to specify response_modalities
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        }
      });

      this.logger.info('Image generation request completed');

      // Process the response to extract the generated image
      let imageData = null;
      let imageUri = '';
      let responseText = '';

      // Get the response object
      const result = response;

      // Extract text and image from parts array in response
      if (result &&
          result.candidates &&
          result.candidates.length > 0 &&
          result.candidates[0].content &&
          result.candidates[0].content.parts) {

        const parts = result.candidates[0].content.parts;

        for (const part of parts) {
          if (part.text) {
            responseText += part.text;
            this.logger.debug(`Response text: ${part.text.substring(0, 50)}...`);
          }
          if (part.inlineData &&
              part.inlineData.mimeType &&
              part.inlineData.mimeType.startsWith('image/')) {
            imageData = part.inlineData.data;
            imageUri = part.fileData?.fileUri;
            this.logger.debug('Found image data in response');
          }
        }
      }

      // If no image data was found in the response
      if (!imageData) {
        this.logger.error('Generating image','No image data found in response');
        throw new Error('No image data found in response');
      }

      // Save the image to a file
      const filename = `image_${Date.now()}.png`;
      const filePath = path.join(this.outputDir, filename);

      // Convert base64 to buffer and save
      try {
        const buffer = Buffer.from(imageData, 'base64');
        fs.writeFileSync(filePath, buffer);
        this.logger.info(`Image saved to ${filePath}`);
      } catch (saveError) {
        this.logger.error("Generating image",`Error saving image: ${saveError.message}`);
        throw saveError;
      }

      return {
        local_path: filePath,
        fileUri: imageUri,
        enhanced_prompt: responseText
      };
    } catch (error) {
      this.logger.error("Error generating image: ",`${error.message}`);
      // If the API call fails, use a placeholder image
      this.logger.info('Using placeholder image as fallback');
      const filename = `image_${Date.now()}_placeholder.png`;
      const filePath = path.join(this.outputDir, filename);

      // Generate a placeholder image
      try {
        await this.downloadImage("https://placehold.co/1024x1024/EEE/31343C?text=Gemini+Image", filePath);
        this.logger.info(`Placeholder image saved to ${filePath}`);

        return {
          local_path: filePath,
          enhanced_prompt: `Failed to generate with Gemini: ${error.message}. Used placeholder instead.`,
          error: error.message
        };
      } catch (downloadError) {
        this.logger.error("Generating image",`Error saving placeholder image: ${downloadError.message}`);
        throw error; // Re-throw the original error
      }
    }
  }

  // Helper function to download and save an image
  async downloadImage(url, filename) {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image, status code: ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(filename);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve(filename);
        });

        file.on('error', (err) => {
          fs.unlink(filename, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }
}
