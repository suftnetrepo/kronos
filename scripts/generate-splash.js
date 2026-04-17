#!/usr/bin/env node

/**
 * Kronos Splash Screen Generator
 * 
 * Generates a clean, branded splash screen PNG (1080x1920) without artifacts.
 * Uses canvas to render SVG-quality output with:
 * - Kronos purple background (#4F46E5)
 * - White lightning bolt icon
 * - "Kronos" title + "Student timetable" subtitle
 * - Subtle glow effect
 * 
 * Usage: node scripts/generate-splash.js
 */

const fs = require('fs');
const path = require('path');

try {
  const { createCanvas } = require('canvas');
  console.log('✓ canvas module found');
} catch (e) {
  console.error(
    '✗ canvas module not found. Install with:\n' +
    '  npm install canvas\n' +
    '  or\n' +
    '  yarn add canvas'
  );
  process.exit(1);
}

const { createCanvas } = require('canvas');

// Configuration
const WIDTH = 1080;
const HEIGHT = 1920;
const BACKGROUND_COLOR = '#4F46E5';
const LOGO_COLOR = '#FFFFFF';
const ICON_SIZE = 88;
const GLOW_ENABLED = true;

function hexToRgba(hex, alpha = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawLightningBolt(ctx, centerX, centerY, size, color) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(size / 100, size / 100);

  ctx.fillStyle = color;
  ctx.beginPath();
  // Lightning bolt path (normalized to 100x100)
  ctx.moveTo(25, -40);
  ctx.lineTo(-15, 10);
  ctx.lineTo(5, 10);
  ctx.lineTo(-25, 60);
  ctx.lineTo(40, 0);
  ctx.lineTo(10, -10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function generateSplash() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Add subtle gradient overlay (very subtle depth)
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.03)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2 - 60;

  // Draw glow effect behind icon
  if (GLOW_ENABLED) {
    const glowRadius = ICON_SIZE * 0.6;
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, glowRadius
    );

    glowGradient.addColorStop(0, hexToRgba(LOGO_COLOR, 0.15));
    glowGradient.addColorStop(1, hexToRgba(LOGO_COLOR, 0));

    ctx.fillStyle = glowGradient;
    ctx.fillRect(
      centerX - glowRadius,
      centerY - glowRadius,
      glowRadius * 2,
      glowRadius * 2
    );
  }

  // Draw lightning bolt icon
  drawLightningBolt(ctx, centerX, centerY, ICON_SIZE, LOGO_COLOR);

  // Draw "Kronos" text
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = LOGO_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Kronos', centerX, centerY + ICON_SIZE / 2 + 40);

  // Draw "Student timetable" subtitle
  ctx.font = '500 18px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
  ctx.fillStyle = LOGO_COLOR;
  ctx.globalAlpha = 0.7;
  ctx.fillText('Student timetable', centerX, centerY + ICON_SIZE / 2 + 130);
  ctx.globalAlpha = 1;

  return canvas;
}

async function main() {
  try {
    console.log('🎨 Generating Kronos splash screen...');
    console.log(`   Dimensions: ${WIDTH}×${HEIGHT}px`);
    console.log(`   Background: ${BACKGROUND_COLOR}`);
    console.log(`   Glow effect: ${GLOW_ENABLED ? 'enabled' : 'disabled'}`);

    const canvas = generateSplash();

    // Determine output path
    const outputPath = path.join(__dirname, '..', 'assets', 'splash.png');
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save to PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    const fileSizeKb = (buffer.length / 1024).toFixed(1);
    console.log(`✓ Splash screen generated successfully!`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Size: ${fileSizeKb} KB`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Verify app.json splash config:`);
    console.log(`      - image: "./assets/splash.png"`);
    console.log(`      - backgroundColor: "#4F46E5"`);
    console.log(`      - resizeMode: "contain"`);
    console.log(`   2. Test on iOS: npm run ios`);
    console.log(`   3. Test on Android: npm run android`);
    console.log(`   4. Verify no artifacts or cropping issues\n`);

  } catch (error) {
    console.error('❌ Error generating splash screen:', error);
    process.exit(1);
  }
}

main();
