#!/usr/bin/env python3

"""
Kronos Splash Screen Generator (PIL)
Generates a clean, branded splash screen PNG (1080x1920) with lightning bolt.
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("❌ PIL/Pillow not installed. Install with:")
    print("   pip install Pillow pillow-simd")  
    print("   or")
    print("   brew install python-imageio")
    sys.exit(1)

# Configuration
WIDTH = 1080
HEIGHT = 1920
BACKGROUND_COLOR = (79, 70, 229)    # #4F46E5 - Kronos purple
TEXT_COLOR = (255, 255, 255)        # #FFFFFF - White
ICON_SIZE = 88
GLOW_ENABLED = True

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def draw_lightning_bolt(draw, x, y, size, color):
    """Draw a lightning bolt icon at given position."""
    # Lightning bolt path (scaled to size)
    scale = size / 100
    
    points = [
        (x + 25 * scale, y - 40 * scale),
        (x - 15 * scale, y + 10 * scale),
        (x + 5 * scale, y + 10 * scale),
        (x - 25 * scale, y + 60 * scale),
        (x + 40 * scale, y - 0 * scale),
        (x + 10 * scale, y - 10 * scale),
    ]
    
    draw.polygon(points, fill=color)

def draw_glow_effect(image, x, y, size, color):
    """Draw subtle glow effect behind icon."""
    # Create a temporary image for the glow
    glow_radius = int(size * 0.6)
    glow_size = glow_radius * 2
    
    # Create radial gradient
    glow = Image.new('RGBA', (glow_size, glow_size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Draw concentric circles for gradient effect
    for i in range(glow_radius, 0, -1):
        alpha = int(15 * (1 - i / glow_radius))  # Fade out
        circle_color = color + (alpha,)
        glow_draw.ellipse(
            [(glow_radius - i, glow_radius - i), 
             (glow_radius + i, glow_radius + i)],
            fill=circle_color
        )
    
    # Paste glow onto main image
    glow_x = x - glow_radius
    glow_y = y - glow_radius
    image.paste(glow, (glow_x, glow_y), glow)

def generate_splash():
    """Generate the splash screen image."""
    # Create image with background
    img = Image.new('RGB', (WIDTH, HEIGHT), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Add subtle gradient overlay (darkening at bottom)
    for y in range(HEIGHT):
        factor = y / HEIGHT
        darken = int(0.03 * factor * 255)
        overlay_color = (0, 0, 0, int(darken * 0.1))
        draw.line([(0, y), (WIDTH, y)], fill=overlay_color)
    
    center_x = WIDTH // 2
    center_y = int(HEIGHT / 2 - 60)
    
    # Draw glow effect
    if GLOW_ENABLED:
        glow_color = TEXT_COLOR + (38,)  # 15% opacity
        draw_glow_effect(img, center_x, center_y, ICON_SIZE, glow_color)
    
    # Convert to RGBA for drawing with alpha
    img = img.convert('RGBA')
    draw = ImageDraw.Draw(img)
    
    # Draw lightning bolt
    draw_lightning_bolt(draw, center_x, center_y, ICON_SIZE, TEXT_COLOR)
    
    # Try to load system font, fall back to default
    try:
        # Try common system font paths
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",  # macOS
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",  # Linux
            "C:\\Windows\\Fonts\\arial.ttf",  # Windows
        ]
        
        title_font = None
        for font_path in font_paths:
            if Path(font_path).exists():
                title_font = ImageFont.truetype(font_path, 72)
                break
        
        if not title_font:
            title_font = ImageFont.load_default()
    except:
        title_font = ImageFont.load_default()
    
    try:
        subtitle_font = ImageFont.truetype(font_paths[0], 18)
    except:
        subtitle_font = ImageFont.load_default()
    
    # Draw "KRONOS" title
    title_text = "Kronos"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = center_x - title_width // 2
    title_y = center_y + ICON_SIZE // 2 + 40
    draw.text((title_x, title_y), title_text, fill=TEXT_COLOR, font=title_font)
    
    # Draw "Student timetable" subtitle  
    subtitle_text = "Student timetable"
    subtitle_color = TEXT_COLOR + (int(255 * 0.7),)  # 70% opacity
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = center_x - subtitle_width // 2
    subtitle_y = center_y + ICON_SIZE // 2 + 130
    draw.text((subtitle_x, subtitle_y), subtitle_text, fill=subtitle_color, font=subtitle_font)
    
    return img

def main():
    try:
        print("🎨 Generating Kronos splash screen...")
        print(f"   Dimensions: {WIDTH}×{HEIGHT}px")
        print(f"   Background: Kronos purple (#4F46E5)")
        print(f"   Icon: Lightning bolt ({ICON_SIZE}px)")
        print(f"   Glow effect: {'enabled' if GLOW_ENABLED else 'disabled'}")
        
        img = generate_splash()
        
        # Output path
        script_dir = Path(__file__).parent
        output_path = script_dir.parent / 'assets' / 'splash.png'
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save PNG
        img = img.convert('RGB')
        img.save(output_path, 'PNG', optimize=True)
        
        # Get file size
        file_size_kb = output_path.stat().st_size / 1024
        
        print(f"\n✓ Splash screen generated successfully!")
        print(f"   Output: {output_path}")
        print(f"   Size: {file_size_kb:.1f} KB")
        print(f"\n📝 Next steps:")
        print(f"   1. Verify: npm run ios")
        print(f"   2. Check for artifacts (should be none)")
        print(f"   3. Verify transition from splash to app")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
