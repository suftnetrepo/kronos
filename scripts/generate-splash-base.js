#!/usr/bin/env node

/**
 * Kronos Splash Generator - Pure Node.js
 * Creates a solid color splash PNG (1080x1920) for testing
 * 
 * This version creates a simple but valid PNG with:
 * - Solid Kronos purple background
 * - Ready for full design (can be updated later)
 * 
 * For full design with icon/text, use splash-generator.html in browser
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG constants
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0; // Ensure unsigned 32-bit
}

function createChunk(type, data) {
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(typeAndData));
  
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function generatePNG(width, height, r, g, b) {
  // IHDR chunk
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 2;    // color type: RGB
  ihdr[10] = 0;   // compression
  ihdr[11] = 0;   // filter
  ihdr[12] = 0;   // interlace

  // IDAT chunk - image data
  const scanlines = [];
  
  // Create scanline data with subtle top-to-bottom gradient
  for (let y = 0; y < height; y++) {
    const scanline = Buffer.allocUnsafe(1 + width * 3);
    scanline[0] = 0; // filter type
    
    // Very subtle darkening towards bottom (3% at bottom)
    const gradientFactor = y / height;
    const darkenAmount = 0.03 * gradientFactor;
    const adjustedR = Math.max(0, Math.min(255, Math.floor(r * (1 - darkenAmount))));
    const adjustedG = Math.max(0, Math.min(255, Math.floor(g * (1 - darkenAmount))));
    const adjustedB = Math.max(0, Math.min(255, Math.floor(b * (1 - darkenAmount))));
    
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 3;
      scanline[idx] = adjustedR;
      scanline[idx + 1] = adjustedG;
      scanline[idx + 2] = adjustedB;
    }
    
    scanlines.push(scanline);
  }

  const idat = zlib.deflateSync(Buffer.concat(scanlines));

  // IEND chunk
  const iend = Buffer.from([]);

  // Assemble PNG
  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idat),
    createChunk('IEND', iend)
  ]);
}

function main() {
  try {
    console.log('🎨 Generating Kronos splash screen (base version)...');
    
    const WIDTH = 1080;
    const HEIGHT = 1920;
    const PURPLE_R = 0x4F;      // #4F46E5
    const PURPLE_G = 0x46;
    const PURPLE_B = 0xE5;
    
    console.log(`   Dimensions: ${WIDTH}×${HEIGHT}px`);
    console.log(`   Background: Kronos purple (#4F46E5)`);
    console.log(`   Format: PNG with vertical gradient`);
    
    const pngBuffer = generatePNG(WIDTH, HEIGHT, PURPLE_R, PURPLE_G, PURPLE_B);
    
    const outputDir = path.join(__dirname, '..', 'assets');
    const outputPath = path.join(outputDir, 'splash.png');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Backup existing splash if present
    if (fs.existsSync(outputPath)) {
      const backupPath = outputPath + `.backup.${Date.now()}`;
      fs.copyFileSync(outputPath, backupPath);
      console.log(`   Backed up existing splash to: ${path.basename(backupPath)}`);
    }
    
    fs.writeFileSync(outputPath, pngBuffer);
    
    const sizeKb = (pngBuffer.length / 1024).toFixed(1);
    console.log(`\n✓ Splash screen created!`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Size: ${sizeKb} KB`);
    console.log(`\n💡 Note: This is a gradient-only base splash.`);
    console.log(`   For full design with lightning bolt + text, do either:`);
    console.log(`   1. open splash-generator.html  (browser-based)`);
    console.log(`      → Download → cp ~/Downloads/kronos-splash.png ./assets/splash.png`);
    console.log(`   2. npm install -D canvas && node scripts/generate-splash.js`);
    console.log(`\n📝 Next:`);
    console.log(`   npm run ios`);
    console.log(`   Verify splash appears without artifacts\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
