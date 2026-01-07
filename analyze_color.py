from PIL import Image
from collections import Counter
import sys

def get_dominant_green(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGB")
        pixels = list(img.getdata())
        
        # Filter for greenish pixels
        # R < G, B < G, and G > 50 (not too dark)
        green_pixels = [
            (r, g, b) for r, g, b in pixels 
            if g > r and g > b and g > 50
        ]
        
        if not green_pixels:
            print("No distinct green found")
            return

        # Count frequencies
        counts = Counter(green_pixels)
        most_common = counts.most_common(5)
        
        print("Top 5 greens found:")
        for color, count in most_common:
            hex_color = '#{:02x}{:02x}{:02x}'.format(*color)
            print(f"Color: {hex_color}, Count: {count}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_dominant_green("/home/szansky/.gemini/antigravity/brain/a10396ad-fbdb-4274-abe2-fd9320c93076/uploaded_image_1767791797832.png")
