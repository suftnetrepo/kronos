#!/usr/bin/env node

/**
 * Kronos Splash Screen Generator (Pure JS PNG Encoder)
 * 
 * Generates a clean, branded splash screen PNG (1080x1920) without artifacts.
 * Pure Node.js - no external dependencies required.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG file signature
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// CRC32 checksum helper
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPaletteEntry(r, g, b) {
  return Buffer.from([r, g, b]);
}

function createSimpleSolidPNG(width, height, r, g, b) {
  // This creates a simple solid color PNG
  // For Kronos, we'll create a solid color with gradients using pixel manipulation
  
  const IHDR_data = Buffer.alloc(13);
  IHDR_data.writeUInt32BE(width, 0);
  IHDR_data.writeUInt32BE(height, 4);
  IHDR_data[8] = 8;  // bit depth
  IHDR_data[9] = 6;  // color type: RGBA
  IHDR_data[10] = 0; // compression
  IHDR_data[11] = 0; // filter
  IHDR_data[12] = 0; // interlace

  // Create image data with gradient effect
  const scanlines = [];
  
  for (let y = 0; y < height; y++) {
    const scanline = Buffer.alloc(1 + width * 4);
    scanline[0] = 0; // filter type: None
    
    const gradientFactor = y / height;
    const darken = Math.min(1, 0.03 * gradientFactor); // Very subtle darkening
    const adjustedR = Math.max(0, Math.min(255, Math.floor(r * (1 - darken))));
    const adjustedG = Math.max(0, Math.min(255, Math.floor(g * (1 - darken))));
    const adjustedB = Math.max(0, Math.min(255, Math.floor(b * (1 - darken))));
    
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      scanline[idx] = adjustedR;
      scanline[idx + 1] = adjustedG;
      scanline[idx + 2] = adjustedB;
      scanline[idx + 3] = 255; // Alpha
    }
    
    scanlines.push(scanline);
  }

  const idat_data = zlib.deflateSync(Buffer.concat(scanlines));

  const png = Buffer.concat([
    PNG_SIGNATURE,
    createChunk('IHDR', IHDR_data),
    createChunk('IDAT', idat_data),
    createChunk('IEND', Buffer.alloc(0))
  ]);

  return png;
}

function generateSplash() {
  // Kronos purple: #4F46E5
  const purple_r = 0x4F;
  const purple_g = 0x46;
  const purple_b = 0xE5;
  
  const WIDTH = 1080;
  const HEIGHT = 1920;

  console.log('Generating simple PNG base...');
  const png = createSimpleSolidPNG(WIDTH, HEIGHT, purple_r, purple_g, purple_b);
  
  return png;
}

async function main() {
  try {
    console.log('🎨 Generating Kronos splash screen...');
    console.log('   Using pure Node.js PNG encoder');
    console.log('   Dimensions: 1080×1920px');
    console.log('   Background: #4F46E5 (Kronos purple)');

    const png = generateSplash();

    // Output path: assets/splash.png
    const outputPath = path.join(__dirname, '..', 'assets', 'splash.png');
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, png);

    const fileSizeKb = (png.length / 1024).toFixed(1);
    console.log(`✓ Splash PNG created: ${fileSizeKb} KB`);
    console.log(`   Output: ${outputPath}`);
    console.log(`\n⚠️  Note: This is a gradient-only version.`);
    console.log(`   For full design (icon + text), use one of:`);
    console.log(`   1. splash-generator.html (browser-based)`);
    console.log(`   2. npm install canvas && node scripts/generate-splash.js`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
