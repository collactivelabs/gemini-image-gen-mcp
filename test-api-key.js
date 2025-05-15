import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

console.log("Testing API key...");

// Check if API key is defined
if (!process.env.GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY is not set in environment variables");
  process.exit(1);
}

console.log("API key is set. First few characters:", process.env.GEMINI_API_KEY.substring(0, 5) + "...");

// Initialize the API client
try {
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
  console.log("Successfully initialized GoogleGenAI client");
  
  // Test the API with a simple model list call
  const modelsPromise = genAI.getModels();
  console.log("Attempting to fetch available models...");
  
  modelsPromise.then(models => {
    console.log("Available models:", models);
    console.log("API key is working correctly!");
  }).catch(error => {
    console.error("Error fetching models:", error.message);
    console.error("API key might be invalid or expired");
  });
} catch (error) {
  console.error("Error initializing client:", error.message);
}
