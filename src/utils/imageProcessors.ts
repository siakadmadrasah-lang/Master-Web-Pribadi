/**
 * Utility to process uploaded logos and favicons:
 * 1. Fast client-side image compression & optimization to prevent slow uploads.
 * 2. Remove white or light backgrounds and faux-checkerboard patterns to make logos transparent.
 * 3. Smart Circular Crop & Maximize: Auto-crops circular emblems, removes all outer white/checkerboard margins, and zooms in 100% to fill the emblem badge.
 * 4. Generate optimized favicon data URLs (64x64).
 */

/**
 * Fast client-side image compressor & resizer.
 * Resizes large camera photos / scans down to optimal display dimensions (max 800px)
 * with crisp quality, reducing 10MB files to ~80-150KB for sub-second uploads.
 */
export function compressAndResizeImage(
  file: File,
  maxDimension = 800,
  quality = 0.9
): Promise<string> {
  return new Promise((resolve) => {
    // If SVG, read as text/dataURL directly to preserve vector sharpness
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const isPng = file.type === 'image/png';
          // Use PNG if it's PNG or WEBP to preserve transparency, otherwise JPEG for high compression
          const mime = isPng ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(mime, isPng ? undefined : quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Remove white, off-white, and fake checkerboard pattern backgrounds from an image
 */
export function removeWhiteBackground(imageDataUrl: string, threshold = 220): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check if pixel is pure white, near white, or light gray checkerboard pattern
          // Checkerboard pixels usually have low saturation and high brightness (r,g,b close to each other and > 185)
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          const isNearGray = (maxVal - minVal) <= 18; // Very neutral color (white, grey, light grey)

          if (r >= threshold && g >= threshold && b >= threshold) {
            // Very bright pixel
            const avg = (r + g + b) / 3;
            if (avg > 245) {
              data[i + 3] = 0; // Completely transparent
            } else {
              const alphaRatio = (255 - avg) / (255 - threshold);
              data[i + 3] = Math.max(0, Math.min(255, Math.floor(alphaRatio * 255)));
            }
          } else if (isNearGray && minVal >= 190) {
            // Light grey checkerboard square
            const avg = (r + g + b) / 3;
            const alphaRatio = Math.max(0, (255 - avg) / 65);
            data[i + 3] = Math.max(0, Math.min(255, Math.floor(alphaRatio * 255)));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Error making background transparent:', err);
        resolve(imageDataUrl);
      }
    };
    img.onerror = () => {
      resolve(imageDataUrl);
    };
    img.src = imageDataUrl;
  });
}

/**
 * Smart Circular Cropper & Emblem Maximizer:
 * 1. Scans the image to find the circular emblem in the center.
 * 2. Crops out all outer faux-checkerboard / white corners.
 * 3. Clips cleanly with anti-aliasing into a circle.
 * 4. Zooms/scales the emblem to fill 100% of the canvas frame edge-to-edge.
 */
export function cropCircleAndMaximizeEmblem(imageDataUrl: string, zoomFactor = 1.08): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // Temporary canvas to analyze image pixels
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = origW;
        tempCanvas.height = origH;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) {
          resolve(imageDataUrl);
          return;
        }

        tempCtx.drawImage(img, 0, 0);
        const imgData = tempCtx.getImageData(0, 0, origW, origH);
        const data = imgData.data;

        // Find the bounding box of non-white / non-checkerboard content
        let minX = origW;
        let minY = origH;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < origH; y++) {
          for (let x = 0; x < origW; x++) {
            const idx = (y * origW + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a > 20) {
              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const isFauxBg = minC > 185 && (maxC - minC) < 18; // checkerboard or white
              const isPureWhite = (r > 240 && g > 240 && b > 240);

              if (!isFauxBg && !isPureWhite) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
        }

        // If bounding box was found and reasonable, use it; otherwise fallback to center square
        let cropX = 0;
        let cropY = 0;
        let cropSize = Math.min(origW, origH);

        if (maxX > minX && maxY > minY && (maxX - minX) > 20 && (maxY - minY) > 20) {
          const contentW = maxX - minX;
          const contentH = maxY - minY;
          cropSize = Math.max(contentW, contentH);
          const centerX = minX + contentW / 2;
          const centerY = minY + contentH / 2;
          cropX = Math.max(0, Math.min(origW - cropSize, centerX - cropSize / 2));
          cropY = Math.max(0, Math.min(origH - cropSize, centerY - cropSize / 2));
        } else {
          cropX = (origW - cropSize) / 2;
          cropY = (origH - cropSize) / 2;
        }

        // Target high-res canvas (512x512 for crispness)
        const targetSize = 512;
        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetSize;
        outCanvas.height = targetSize;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) {
          resolve(imageDataUrl);
          return;
        }

        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';

        // Circular clipping mask so NO corner white or checkerboard ever shows
        outCtx.save();
        outCtx.beginPath();
        outCtx.arc(targetSize / 2, targetSize / 2, (targetSize / 2) - 1, 0, Math.PI * 2);
        outCtx.closePath();
        outCtx.clip();

        // Draw the cropped circular emblem, applying zoomFactor so it fills edge to edge
        const zoomedCropSize = cropSize / zoomFactor;
        const adjustedCropX = cropX + (cropSize - zoomedCropSize) / 2;
        const adjustedCropY = cropY + (cropSize - zoomedCropSize) / 2;

        outCtx.drawImage(
          img,
          adjustedCropX,
          adjustedCropY,
          zoomedCropSize,
          zoomedCropSize,
          0,
          0,
          targetSize,
          targetSize
        );
        outCtx.restore();

        resolve(outCanvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Error cropping circle emblem:', err);
        resolve(imageDataUrl);
      }
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Resize and optimize an image to standard favicon dimensions (32x32 or 64x64)
 */
export function generateFaviconDataUrl(imageDataUrl: string, size = 64): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, size, size);

        // Circular clip for clean favicon
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        resolve(imageDataUrl);
      }
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}
