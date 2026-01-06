#!/usr/bin/env python3
"""
Generate placeholder icons for Summora Chrome Extension
Creates simple gradient icons with 'S' text
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a gradient icon with 'S' text"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)

    # Create purple gradient (matching the app theme)
    for y in range(size):
        # Calculate color for this row (gradient from #667eea to #764ba2)
        r = int(102 + (118 - 102) * y / size)
        g = int(126 + (75 - 126) * y / size)
        b = int(234 + (162 - 234) * y / size)
        draw.rectangle([(0, y), (size, y + 1)], fill=(r, g, b))

    # Add 'S' text in white
    try:
        # Try to use a system font
        font_size = int(size * 0.6)
        try:
            # Try common system fonts
            font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', font_size)
        except:
            try:
                font = ImageFont.truetype('/System/Library/Fonts/Arial.ttf', font_size)
            except:
                # Fallback to default font
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    # Draw 'S' centered
    text = 'S'
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]

    # Add shadow for depth
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 128))
    draw.text((x, y), text, font=font, fill='white')

    # Save image
    img.save(output_path, 'PNG')
    print(f'Created {output_path}')

def main():
    """Generate all required icon sizes"""
    icons_dir = 'icons'

    # Create icons directory if it doesn't exist
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)

    # Generate icons for required sizes
    sizes = {
        'icon16.png': 16,
        'icon48.png': 48,
        'icon128.png': 128
    }

    for filename, size in sizes.items():
        output_path = os.path.join(icons_dir, filename)
        create_icon(size, output_path)

    print('\nAll icons generated successfully!')
    print('Icons are located in the icons/ directory')

if __name__ == '__main__':
    main()
