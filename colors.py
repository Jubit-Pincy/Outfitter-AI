import numpy as np
from PIL import Image
from rembg import remove
from sklearn.cluster import KMeans
from skimage.color import rgb2lab, deltaE_cie76

# ============================================================
# Adjusted Palette (Adjusted 'white' to reflect real lighting)
# ============================================================
NAMED_COLORS_RGB = {
    "black": (15, 15, 15),
    "white": (240, 240, 240),      # Adjusted threshold for real-world off-white
    "grey": (128, 128, 128),
    "charcoal": (54, 54, 54),
    "light-grey": (190, 190, 190),
    "beige": (222, 202, 173),
    "cream": (245, 238, 220),
    "tan": (210, 180, 140),
    "khaki": (195, 176, 145),
    "navy": (0, 0, 80),
    "blue": (30, 90, 200),
    "light-blue": (140, 190, 230),
    "denim": (70, 100, 140),
    "teal": (0, 128, 128),
    "green": (40, 130, 60),
    "olive": (100, 110, 40),
    "sage": (150, 165, 130),
    "mint": (170, 220, 190),
    "red": (200, 30, 30),
    "terracotta": (185, 80, 85),  # Muted rose/earthy red
    "maroon": (110, 20, 30),
    "burgundy": (90, 20, 35),
    "pink": (230, 150, 180),
    "coral": (240, 120, 100),
    "yellow": (220, 200, 40),
    "mustard": (200, 160, 40),
    "orange": (230, 120, 30),
    "rust": (160, 80, 40),
    "purple": (110, 60, 140),
    "lavender": (190, 170, 220),
    "brown": (110, 70, 40),
    "chocolate": (70, 40, 25),
    "camel": (170, 120, 70),
}

# Pre-convert reference palette to LAB space once at startup
NAMED_COLORS_LAB = {
    name: rgb2lab(np.array([[rgb]], dtype=np.uint8) / 255.0)[0][0]
    for name, rgb in NAMED_COLORS_RGB.items()
}


def remove_background_fast(image_path, max_dim=400):
    """Resizes image before rembg to drastically speed up processing."""
    img = Image.open(image_path).convert("RGBA")
    
    # Downsample large images for ~5-10x speed boost
    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    return remove(img)


def get_dominant_color_fast(rgba_image, k=3):
    """Sub-samples pixels and runs optimized MiniBatch/KMeans."""
    arr = np.array(rgba_image)

    mask = arr[:, :, 3] > 128  # opaque mask
    pixels = arr[mask][:, :3]

    if len(pixels) == 0:
        return (0, 0, 0)

    # Subsample max 10,000 pixels for fast K-Means fitting
    if len(pixels) > 10000:
        indices = np.random.choice(len(pixels), 10000, replace=False)
        sample_pixels = pixels[indices]
    else:
        sample_pixels = pixels

    kmeans = KMeans(n_clusters=k, n_init=1, init='k-means++', random_state=42)
    kmeans.fit(sample_pixels)

    counts = np.bincount(kmeans.labels_)
    dominant = kmeans.cluster_centers_[np.argmax(counts)]
    return tuple(int(c) for c in dominant)


def nearest_named_color_lab(rgb):
    """Maps RGB to nearest palette color using CIELAB perceptual distance."""
    # Convert input RGB (0-255) to normalized LAB array
    target_lab = rgb2lab(np.array([[rgb]], dtype=np.uint8) / 255.0)[0][0]

    min_dist = float("inf")
    closest_name = "unknown"

    for name, lab_val in NAMED_COLORS_LAB.items():
        # DeltaE measures perceptual distance as human eyes see color
        dist = deltaE_cie76(target_lab, lab_val)
        if dist < min_dist:
            min_dist = dist
            closest_name = name

    return closest_name


def extract_color(image_path):
    """Fast & perceptually accurate extraction pipeline."""
    bg_removed = remove_background_fast(image_path)
    dominant_rgb = get_dominant_color_fast(bg_removed)
    color_name = nearest_named_color_lab(dominant_rgb)
    return color_name, dominant_rgb

if __name__ == "__main__":
    image_path = r"C:\Users\Leena_pc\Downloads\Womens_dress4.jpg"  # Replace with your image path

    color_name, rgb = extract_color(image_path)
    print(f"Detected color: {color_name}  (RGB: {rgb})")
