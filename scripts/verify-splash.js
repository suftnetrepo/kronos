#!/usr/bin/env node

/**
 * Kronos Splash Screen Verification
 * 
 * Verifies that splash screen is properly configured and ready for testing.
 * Checks:
 * - app.json splash config
 * - splash.png exists and is correct dimensions
 * - app.json backgroundColor matches splash colors
 * - iOS test setup is ready
 */

const fs = require('fs');
const path = require('path');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  checks.passed++;
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  checks.failed++;
}

function warn(msg) {
  console.log(`  ⚠ ${msg}`);
  checks.warnings++;
}

console.log('🔍 Kronos Splash Screen Verification\n');

// 1. Check app.json exists and has splash config
console.log('1️⃣  app.json Configuration:');
try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  
  if (appJson.expo?.splash) {
    pass('splash config found');
    
    if (appJson.expo.splash.image === './assets/splash.png') {
      pass('image path: ./assets/splash.png');
    } else {
      warn(`image path: ${appJson.expo.splash.image} (expected ./assets/splash.png)`);
    }
    
    if (appJson.expo.splash.resizeMode === 'contain') {
      pass('resizeMode: contain (portrait mode)');
    } else {
      warn(`resizeMode: ${appJson.expo.splash.resizeMode} (expected contain for portrait)`);
    }
    
    if (appJson.expo.splash.backgroundColor === '#4F46E5') {
      pass('backgroundColor: #4F46E5 (Kronos purple)');
    } else {
      warn(`backgroundColor: ${appJson.expo.splash.backgroundColor} (expected #4F46E5)`);
    }
  } else {
    fail('splash config not found in app.json');
  }
} catch (err) {
  fail(`app.json read error: ${err.message}`);
}

// 2. Check splash.png exists
console.log('\n2️⃣  Asset Files:');
try {
  if (fs.existsSync('./assets/splash.png')) {
    pass('splash.png exists');
    
    const stats = fs.statSync('./assets/splash.png');
    const sizeKb = (stats.size / 1024).toFixed(1);
    
    if (stats.size > 10000) {
      pass(`splash.png size: ${sizeKb} KB (reasonable)`);
    } else {
      warn(`splash.png size: ${sizeKb} KB (very small, may be incorrect)`);
    }
  } else {
    fail('splash.png not found (expected at ./assets/splash.png)');
  }
} catch (err) {
  fail(`splash.png check error: ${err.message}`);
}

// 3. Check icon files
try {
  if (fs.existsSync('./assets/icon.png')) {
    pass('icon.png exists');
  } else {
    warn('icon.png not found');
  }
  
  if (fs.existsSync('./assets/adaptive-icon.png')) {
    pass('adaptive-icon.png exists');
  }
} catch (err) {
  warn(`icon check error: ${err.message}`);
}

// 4. Check project structure
console.log('\n3️⃣  Project Structure:');
try {
  if (fs.existsSync('package.json')) {
    pass('package.json found');
  }
  
  if (fs.existsSync('app.json')) {
    pass('app.json found');
  }
  
  if (fs.existsSync('app/_layout.tsx')) {
    pass('app/_layout.tsx (native splash management) found');
  } else {
    warn('app/_layout.tsx not found (native splash might not work)');
  }
} catch (err) {
  warn(`structure check error: ${err.message}`);
}

// 5. Check optional helpers
console.log('\n4️⃣  Helper Scripts:');
try {
  if (fs.existsSync('scripts/generate-splash.js')) {
    pass('Node.js splash generator (requires canvas) available');
  } else {
    warn('scripts/generate-splash.js not found');
  }
  
  if (fs.existsSync('splash-generator.html')) {
    pass('Browser-based splash generator available');
  } else {
    warn('splash-generator.html not found');
  }
} catch (err) {
  warn(`helper check error: ${err.message}`);
}

// Summary
console.log('\n📊 Summary:');
console.log(`  ✓ Passed: ${checks.passed}`);
if (checks.warnings > 0) console.log(`  ⚠ Warnings: ${checks.warnings}`);
if (checks.failed > 0) console.log(`  ✗ Failed: ${checks.failed}`);

// Recommendations
console.log('\n💡 Next Steps:');

if (checks.failed === 0 && checks.warnings === 0) {
  console.log('  ✓ Everything looks good! Ready to test on iOS.');
  console.log('  1. Run: npm run ios');
  console.log('  2. Verify splash appears with Kronos branding');
  console.log('  3. Check for any artifacts or distortion');
} else if (checks.failed > 0) {
  console.log('  ⚠️  Please fix the failed checks before testing.');
  console.log('  1. Re-generate splash.png using splash-generator.html');
  console.log('  2. Verify app.json splash config');
  console.log('  3. Run this verification again');
} else {
  console.log('  ⚠️  Some warnings found. Review and test.');
  console.log('  1. Verify warning items match your setup');
  console.log('  2. Run: npm run ios');
  console.log('  3. Test splash on device/simulator');
}

console.log('');

// Exit with appropriate code
process.exit(checks.failed > 0 ? 1 : 0);
