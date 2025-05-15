// Test .env loading using ES modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
try {
  const envPath = path.resolve(__dirname, '.env');
  console.log('Looking for .env file at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('.env file exists');
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('Content of .env file:');
    console.log(envContent);
    
    // Try to parse the variables
    const envVars = {};
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        envVars[key] = value;
      }
    });
    
    console.log('Parsed environment variables:');
    console.log(envVars);
  } else {
    console.log('.env file does not exist');
  }
} catch (error) {
  console.error('Error reading .env file:', error);
}
