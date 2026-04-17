#!/bin/bash

# Kronos Splash Screen Implementation Script
# 
# This script guides you through implementing the new splash screen.
# It verifies app.json, backs up old assets, and provides next steps.

set -e

echo "🎨 Kronos Splash Screen Implementation"
echo "====================================="
echo ""

# Check if we're in the project root
if [ ! -f "app.json" ]; then
  echo "❌ Error: app.json not found. Run this script from project root."
  exit 1
fi

# Backup current splash.png
if [ -f "assets/splash.png" ]; then
  echo "📦 Backing up current splash.png..."
  cp assets/splash.png "assets/splash.png.backup.$(date +%s)"
  echo "   ✓ Backup created"
fi

# Verify app.json splash config
echo ""
echo "📋 Verifying app.json splash configuration..."

# Check splash image path
if grep -q '"image": "./assets/splash.png"' app.json; then
  echo "   ✓ Image path: ./assets/splash.png"
else
  echo "   ⚠️  Image path not as expected"
fi

# Check resizeMode
if grep -q '"resizeMode": "contain"' app.json; then
  echo "   ✓ ResizeMode: contain (proper for portrait)"
else
  echo "   ⚠️  ResizeMode not set to 'contain'"
fi

# Check backgroundColor
if grep -q '"backgroundColor": "#4F46E5"' app.json; then
  echo "   ✓ BackgroundColor: #4F46E5 (Kronos purple)"
else
  echo "   ⚠️  BackgroundColor doesn't match Kronos purple"
fi

echo ""
echo "✨ Next Steps:"
echo "============"
echo ""
echo "1. Generate the splash screen:"
echo "   a. Open splash-generator.html in your browser"
echo "   b. Click 'Generate Preview' (defaults are pre-configured)"
echo "   c. Click 'Download 1080×1920'"
echo "   d. Copy the downloaded file to assets/splash.png"
echo "      cp ~/Downloads/kronos-splash.png ./assets/splash.png"
echo ""
echo "2. Verify the asset (no artifacts):"
echo "   file ./assets/splash.png"
echo "   ls -lh ./assets/splash.png"
echo ""
echo "3. Test on iOS simulator:"
echo "   npm run ios"
echo "   # Verify splash appears without black corners"
echo "   # Verify Kronos branding is clear"
echo "   # Verify transition to app is smooth"
echo ""
echo "4. Test on Android (if available):"
echo "   npm run android"
echo ""
echo "📝 Verification Checklist:"
echo "========================"
echo ""
echo "□ No black corners in splash"
echo "□ No compression artifacts"
echo "□ Kronos purple background (#4F46E5) is solid"
echo "□ Lightning bolt icon is centered"
echo "□ 'Kronos' text is readable"
echo "□ 'Student timetable' subtitle visible but subtle"
echo "□ Subtle glow effect behind icon (restrained)"
echo "□ Aspect ratio correct for phone portrait"
echo "□ Transition from native splash to app is smooth"
echo "□ No visual lag or flickering"
echo ""
echo "💡 Troubleshooting:"
echo "=================="
echo ""
echo "If splash doesn't appear or looks wrong:"
echo ""
echo "• Clear build caches:"
echo "  npm run ios -- --clear"
echo "  npm run android -- --clear"
echo "  npx expo start --clear"
echo ""
echo "• Verify app.json hasn't changed:"
echo "  grep 'splash' app.json"
echo ""
echo "• Check splash.png dimensions:"
echo "  npx sips -g pixelWidth -g pixelHeight assets/splash.png"
echo ""
echo "✓ Implementation ready!"
