import { GoogleGenAI, Modality } from '@google/genai';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Logger } from './utils/logger.js';
import e from 'express';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

//Initialize Gemini GoogleGenAI with the @google/genai SDK
const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export class GeminiService {
    constructor() {
        if (!GEMINI_API_KEY) {
            this.logger.warn('Warning: GEMINI_API_KEY environment variable not set');
            throw new Error('GEMINI_API_KEY is not set');
        }

        // Set up output directory
        this.outputImageDir = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'generated-images');
        this.outputVideoDir = process.env.OUTPUT_DIR || path.join(__dirname, '..', 'generated-videos');
        this.logger = new Logger();

        try {
            if (!fs.existsSync(this.outputImageDir)) {
                fs.mkdirSync(this.outputImageDir, { recursive: true });
                this.logger.info(`Created output directory: ${this.outputImageDir}`);
            }
            else if (!fs.existsSync(this.outputVideoDir)) {
                fs.mkdirSync(this.outputVideoDir, { recursive: true });
                this.logger.info(`Created output directory: ${this.outputVideoDir}`);
            }
        } catch (error) {
            this.logger.error("Failed to create output directory: ", `${error.message}`);
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            const fallbackImageDir = path.join(homeDir, '.gemini-image-gen-mcp', 'generated-images');
            const fallbackVideoDir = path.join(homeDir, '.gemini-image-gen-mcp', 'generated-videos');

            try {
                if (!fs.existsSync(fallbackImageDir)) {
                    fs.mkdirSync(fallbackImageDir, { recursive: true });
                }
                this.logger.info(`Using fallback directory: ${fallbackImageDir}`);
                this.outputImageDir = fallbackImageDir;
            } catch (fallbackError) {
                this.logger.error("Failed to create fallback directory: ", `${fallbackError.message}`);
            }

            try {
                if (!fs.existsSync(fallbackVideoDir)) {
                    fs.mkdirSync(fallbackVideoDir, { recursive: true });
                }
                this.logger.info(`Using fallback directory: ${fallbackVideoDir}`);
                this.outputVideoDir = fallbackVideoDir;
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
            //let response = null;
            this.logger.info(`Using model: ${modelName}`);
            this.logger.info(`Generating image with prompt: "${prompt.substring(0, 50)}..."`);

            //if (modelName === 'gemini-2.0-flash-preview-image-generation') {
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
            /*}else {
                response = await client.models.generateImages({
                        model: modelName,
                        prompt: prompt,
                        config: {
                            numberOfImages: 4,
                        },
                });

                let idx = 1;
                for (const generatedImage of response.generatedImages) {
                        let imgBytes = generatedImage.image.imageBytes;
                        const buffer = Buffer.from(imgBytes, "base64");
                        fs.writeFileSync(`imagen-${idx}.png`, buffer);
                        idx++;
                }
            }*/

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
                this.logger.error('Generating image', 'No image data found in response');
                throw new Error('No image data found in response');
            }

            // Save the image to a file
            const filename = `image_${Date.now()}.png`;
            const filePath = path.join(this.outputImageDir, filename);

            // Convert base64 to buffer and save
            try {
                const buffer = Buffer.from(imageData, 'base64');
                fs.writeFileSync(filePath, buffer);
                this.logger.info(`Image saved to ${filePath}`);
            } catch (saveError) {
                this.logger.error("Generating image", `Error saving image: ${saveError.message}`);
                throw saveError;
            }

            return {
                local_path: filePath,
                fileUri: imageUri,
                enhanced_prompt: responseText
            };
        } catch (error) {
            this.logger.error("Error generating image: ", `${error.message}`);
            // If the API call fails, use a placeholder image
            this.logger.info('Using placeholder image as fallback');
            const filename = `image_${Date.now()}_placeholder.png`;
            const filePath = path.join(this.outputImageDir, filename);

            // Generate a placeholder image
            try {
                await this.downloadImageVideo("https://placehold.co/1024x1024/EEE/31343C?text=Gemini+Image", filePath);
                this.logger.info(`Placeholder image saved to ${filePath}`);

                return {
                    local_path: filePath,
                    enhanced_prompt: `Failed to generate with Gemini: ${error.message}. Used placeholder instead.`,
                    error: error.message
                };
            } catch (downloadError) {
                this.logger.error("Generating image", `Error saving placeholder image: ${downloadError.message}`);
                throw error; // Re-throw the original error
            }
        }
    }

    //Generate video using Gemini Veo2.0
    async generateVideo(prompt, options = {}) {
        try {
            this.logger.info(`Generating video with prompt: "${prompt.substring(0, 50)}..."`);
            const modelName = options.model || 'veo-2.0-generate-001';

            const operation = await client.models.generateVideos({
                model: modelName,
                prompt: prompt,
                config: {
                    personGeneration: "allow",
                    aspectRatio: "16:9",
                },
            });

            this.logger.info('Video generation request completed');

            // Process the response to extract the generated video
            let videoData = null;
            let videoUri = '';
            let responseText = '';

            while (!operation.done) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({
                    operation: operation,
                });
            }

            // Get the response object
            const result = operation.response;

            // Extract text and   image from parts array in response
            if (result && result.generatedVideos.length > 0) {

                operation.response?.generatedVideos?.forEach(async (generatedVideo, n) => {
                    const resp = await fetch(`${generatedVideo.video?.uri}&key=${GEMINI_API_KEY}`); // append your API key
                    const writer = createWriteStream(`video${n}.mp4`);
                    videoData = writer;
                    Readable.fromWeb(resp.body).pipe(writer);
                });
            }

            // If no video data was found in the response
            if (!videoData) {
                this.logger.error('Generating video', 'No video data found in response');
                throw new Error('No video data found in response');
            }

            // Save the video to a file
            const filename = `video_${Date.now()}.mp4`;
            const filePath = path.join(this.outputVideoDir, filename);

            // Convert base64 to buffer and save
            try {
                const buffer = Buffer.from(videoData, 'base64');
                fs.writeFileSync(filePath, buffer);
                this.logger.info(`Video saved to ${filePath}`);
            } catch (saveError) {
                this.logger.error("Generating video", `Error saving video: ${saveError.message}`);
                throw saveError;
            }

            return {
                local_path: filePath,
                fileUri: videoUri,
                enhanced_prompt: responseText
            };
        } catch (error) {
            this.logger.error("Error generating video: ", `${error.message}`);
            // If the API call fails, use a placeholder video
            this.logger.info('Using placeholder video as fallback');
            const filename = `video_${Date.now()}_placeholder.mp4`;
            const filePath = path.join(this.outputVideoDir, filename);

            // Generate a placeholder video
            try {
                await this.downloadImageVideo("https://placehold.co/1024x1024/EEE/31343C?text=Gemini+Video", filePath);
                this.logger.info(`Placeholder video saved to ${filePath}`);

                return {
                    local_path: filePath,
                    enhanced_prompt: `Failed to generate with Gemini: ${error.message}. Used placeholder instead.`,
                    error: error.message
                };
            } catch (downloadError) {
                this.logger.error("Generating video", `Error saving placeholder video: ${downloadError.message}`);
                throw error; // Re-throw the original error
            }
        }
    }

    //Generate video from image using Gemini Veo2.0
    async generateVideoFromImage(prompt, options = {}) {
        try {
            this.logger.info(`Generating video from image with prompt: "${prompt.substring(0, 50)}..."`);
            const modelName = options.model || 'veo-2.0-generate-001';

            const response = await client.models.generateImages({
                model: "imagen-3.0-generate-002",
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                },
            });

            const operation = await client.models.generateVideos({
                model: modelName,
                prompt: prompt,
                image: {
                    imageBytes: response.generatedImages[0].image.imageBytes, // response from Imagen
                    mimeType: "image/png",
                },
                config: {
                    aspectRatio: "16:9",
                    numberOfVideos: 2,
                },
            });

            this.logger.info('Video generation request completed');

            // Process the response to extract the generated video
            let videoData = null;
            let videoUri = '';
            let responseText = '';

            while (!operation.done) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
                    operation = await ai.operations.getVideosOperation({
                    operation: operation,
                });
            }

            // Get the response object
            const result = operation.response;

            // Extract text and   image from parts array in response
            if (result && result.generatedVideos.length > 0) {

                result.response?.generatedVideos?.forEach(async (generatedVideo, n) => {
                    const resp = await fetch(
                        `${generatedVideo.video?.uri}&key=${GEMINI_API_KEY}`, // append your API key
                    );
                    const writer = createWriteStream(`video${n}.mp4`);
                    videoData = writer;
                    Readable.fromWeb(resp.body).pipe(writer);
                });
            }

            // If no video data was found in the response
            if (!videoData) {
                this.logger.error('Generating video from image', 'No video data found in response');
                throw new Error('No video data found in response');
            }

            // Save the video to a file
            const filename = `video_${Date.now()}.mp4`;
            const filePath = path.join(this.outputVideoDir, filename);

            // Convert base64 to buffer and save
            try {
                const buffer = Buffer.from(videoData, 'base64');
                fs.writeFileSync(filePath, buffer);
                this.logger.info(`Video saved to ${filePath}`);
            } catch (saveError) {
                this.logger.error("Generating video from image", `Error saving video: ${saveError.message}`);
                throw saveError;
            }

            return {
                local_path: filePath,
                fileUri: videoUri,
                enhanced_prompt: responseText
            };
        } catch (error) {
            this.logger.error("Error generating video from image: ", `${error.message}`);
            // If the API call fails, use a placeholder video
            this.logger.info('Using placeholder video as fallback');
            const filename = `video_${Date.now()}_placeholder.mp4`;
            const filePath = path.join(this.outputVideoDir, filename);

            // Generate a placeholder video
            try {
                await this.downloadImageVideo("https://placehold.co/1024x1024/EEE/31343C?text=Gemini+Video", filePath);
                this.logger.info(`Placeholder video saved to ${filePath}`);

                return {
                    local_path: filePath,
                    enhanced_prompt: `Failed to generate with Gemini: ${error.message}. Used placeholder instead.`,
                    error: error.message
                };
            } catch (downloadError) {
                this.logger.error("Generating video from image", `Error saving placeholder video: ${downloadError.message}`);
                throw error; // Re-throw the original error 
            }
        }
    }

    // Helper function to download and save an image
    async downloadImageVideo(url, filename) {
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
                    fs.unlink(filename, () => { });
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
}
