/**
 * Client-side image compression utility
 * Compresses images before upload to reduce storage costs and improve load times
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeKB: 500
};

/**
 * Compresses an image file using Canvas API
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed image file
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for small images
  if (file.size < (opts.maxSizeKB! * 1024)) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > opts.maxWidth!) {
        height = (height * opts.maxWidth!) / width;
        width = opts.maxWidth!;
      }
      
      if (height > opts.maxHeight!) {
        width = (width * opts.maxHeight!) / height;
        height = opts.maxHeight!;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Try to meet size target with progressive quality reduction
      let quality = opts.quality!;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // If still too large and quality can be reduced, try again
            if (blob.size > opts.maxSizeKB! * 1024 && quality > 0.3) {
              quality -= 0.1;
              tryCompress();
              return;
            }

            // Create new file with same name
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
