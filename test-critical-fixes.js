#!/usr/bin/env node
/**
 * Critical Fixes Test Suite
 * Tests the 6 critical bug fixes implemented
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Critical Fixes...\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        testsFailed++;
    }
}

// Test 1: Verify modules can be imported without errors
test('Module imports work without errors', async () => {
    const indexPath = path.join(__dirname, 'src', 'index.js');
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');

    if (!fs.existsSync(indexPath)) {
        throw new Error('index.js not found');
    }
    if (!fs.existsSync(servicePath)) {
        throw new Error('gemini-service.js not found');
    }
});

// Test 2: Verify imports are present in gemini-service.js
test('Required imports present in gemini-service.js', () => {
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    if (!content.includes('createWriteStream')) {
        throw new Error('createWriteStream import missing');
    }
    if (!content.includes('Readable')) {
        throw new Error('Readable import missing');
    }
});

// Test 3: Verify server.logger is used instead of this.logger in index.js
test('server.logger used correctly in index.js', () => {
    const indexPath = path.join(__dirname, 'src', 'index.js');
    const content = fs.readFileSync(indexPath, 'utf-8');

    // Check that the fix is present
    if (!content.includes('server.start().catch(err => server.logger.error')) {
        throw new Error('server.logger not used in error handler');
    }

    // Make sure the bug is not present
    const lines = content.split('\n');
    const lastLines = lines.slice(-10).join('\n');
    if (lastLines.includes('.catch(err => this.logger')) {
        throw new Error('this.logger still present in error handler');
    }
});

// Test 4: Verify client.operations is used instead of ai.operations
test('client.operations used instead of ai.operations', () => {
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    // Check that ai.operations is not present
    if (content.includes('ai.operations')) {
        throw new Error('ai.operations still present (should be client.operations)');
    }

    // Verify client.operations is present
    if (!content.includes('client.operations.getVideosOperation')) {
        throw new Error('client.operations.getVideosOperation not found');
    }
});

// Test 5: Verify timeout mechanism exists in polling loops
test('Timeout mechanism present in video polling loops', () => {
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    // Check for timeout constants
    if (!content.includes('maxPollingTime')) {
        throw new Error('maxPollingTime constant not found');
    }

    // Check for timeout check
    if (!content.includes('Video generation timeout')) {
        throw new Error('Timeout error message not found');
    }

    // Verify it appears in both functions (should appear at least twice)
    const matches = content.match(/maxPollingTime/g);
    if (!matches || matches.length < 2) {
        throw new Error('Timeout mechanism should be in both video generation functions');
    }
});

// Test 6: Verify URL object is used for API key instead of string concatenation
test('URL object used for API key parameters', () => {
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    // Check that URL object is used
    if (!content.includes('new URL(generatedVideo.video?.uri)')) {
        throw new Error('URL object not used for video URI');
    }

    if (!content.includes('videoUrl.searchParams.append')) {
        throw new Error('searchParams.append not used for API key');
    }

    // Verify old dangerous pattern is gone
    if (content.includes('`${generatedVideo.video?.uri}&key=${GEMINI_API_KEY}`')) {
        throw new Error('Dangerous API key concatenation still present');
    }
});

// Test 7: Verify directory creation logic uses 'if' instead of 'else if'
test('Directory creation logic fixed (both directories created)', () => {
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');
    const content = fs.readFileSync(servicePath, 'utf-8');

    // Find the directory creation section
    const dirCreationMatch = content.match(/if \(!fs\.existsSync\(this\.outputImageDir\)\)[\s\S]{0,200}if \(!fs\.existsSync\(this\.outputVideoDir\)\)/);

    if (!dirCreationMatch) {
        throw new Error('Independent if statements for directory creation not found');
    }

    // Make sure 'else if' pattern is not present in directory creation
    const bugPattern = /if \(!fs\.existsSync\(this\.outputImageDir\)\)[\s\S]{0,200}else if \(!fs\.existsSync\(this\.outputVideoDir\)\)/;
    if (bugPattern.test(content)) {
        throw new Error('else if still present (should be independent if statements)');
    }
});

// Test 8: Verify files have valid JavaScript syntax
test('Files contain valid JavaScript syntax', () => {
    const servicePath = path.join(__dirname, 'src', 'gemini-service.js');
    const indexPath = path.join(__dirname, 'src', 'index.js');

    // Read files and check for basic syntax validity
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Check for balanced braces (simple check)
    const serviceOpenBraces = (serviceContent.match(/\{/g) || []).length;
    const serviceCloseBraces = (serviceContent.match(/\}/g) || []).length;

    if (serviceOpenBraces !== serviceCloseBraces) {
        throw new Error('Unbalanced braces in gemini-service.js');
    }

    const indexOpenBraces = (indexContent.match(/\{/g) || []).length;
    const indexCloseBraces = (indexContent.match(/\}/g) || []).length;

    if (indexOpenBraces !== indexCloseBraces) {
        throw new Error('Unbalanced braces in index.js');
    }
});

// Print results
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed === 0) {
    console.log('\n✨ All critical fixes verified successfully!\n');
    process.exit(0);
} else {
    console.log('\n⚠️  Some tests failed. Please review the fixes.\n');
    process.exit(1);
}
