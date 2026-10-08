#!/usr/bin/env python3
"""Decode local catalog media. JSON in/out; never fetches remote resources."""
import hashlib
import io
import json
import sys
import warnings

try:
    from PIL import Image, ImageFile
except ImportError:
    print(json.dumps({"error": "Pillow is required: install it with python3 -m pip install Pillow"}))
    sys.exit(2)

ImageFile.LOAD_TRUNCATED_IMAGES = False
warnings.simplefilter("error", Image.DecompressionBombWarning)
request = json.load(sys.stdin)
Image.MAX_IMAGE_PIXELS = request["maxPixels"]
results = []
for filename in request["files"]:
    try:
        with open(filename, "rb") as source:
            encoded = source.read(request["maxBytes"] + 1)
        if len(encoded) > request["maxBytes"]:
            raise ValueError("Image exceeds the maximum byte size")
        checksum = hashlib.sha256(encoded).hexdigest()
        with Image.open(io.BytesIO(encoded)) as image:
            width, height = image.size
            image_format = image.format
            frames = getattr(image, "n_frames", 1)
            if width * height > request["maxPixels"]:
                raise ValueError("Image exceeds the maximum pixel count")
            if max(width, height) > request["maxDimension"]:
                raise ValueError("Image exceeds the maximum dimension")
            if frames != 1:
                raise ValueError("Animated images are not catalog product photographs")
            image.verify()
        # verify() alone does not fully decompress JPEG and other formats.
        with Image.open(io.BytesIO(encoded)) as image:
            image.load()
        results.append({"path": filename, "valid": True, "width": width,
                        "height": height, "format": image_format, "frames": frames,
                        "sha256": checksum})
    except Exception as error:
        results.append({"path": filename, "valid": False,
                        "error": str(error)[:400]})
print(json.dumps({"decoder": "Pillow", "results": results}))
