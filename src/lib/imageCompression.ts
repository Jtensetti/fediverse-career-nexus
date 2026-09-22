export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

/** Always re-encode, including small files: discard EXIF and enforce both pixel
 * and byte limits. A failed conversion must never upload the original file.
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  if (!/^image\/(jpeg|png|webp|gif|avif|bmp)$/.test(file.type)) throw new Error('Välj en JPEG-, PNG-, WebP-, GIF- eller AVIF-bild.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Bilden får vara högst 20 MB före komprimering.');
  const maxWidth = Math.max(1, Math.min(options.maxWidth || 1920, 1920));
  const maxHeight = Math.max(1, Math.min(options.maxHeight || 1920, 1920));
  const maxBytes = Math.max(1024, Math.min(options.maxSizeKB || 500, 500) * 1024);
  const source = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Bilden kunde inte läsas. Prova en annan bild.'));
      img.src = source;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw new Error('Bilden saknar giltiga mått.');
    let scale = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Din webbläsare kunde inte bearbeta bilden.');
    for (let attempt = 0; attempt < 8; attempt++) {
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [Math.min(options.quality || 0.82, 0.92), 0.65, 0.48]) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
          result => result ? resolve(result) : reject(new Error('Bilden kunde inte komprimeras.')), 'image/jpeg', quality,
        ));
        if (blob.type !== 'image/jpeg') throw new Error('Webbläsaren kunde inte skapa en JPEG-bild.');
        if (blob.size <= maxBytes) return new File([blob], `${file.name.replace(/\.[^.]*$/, '') || 'bild'}.jpg`, { type: blob.type, lastModified: Date.now() });
      }
      scale *= 0.75;
    }
    throw new Error('Bilden kunde inte komprimeras till 500 KB. Välj en annan bild.');
  } finally { img.src = ''; URL.revokeObjectURL(source); }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
