import { forwardRef, type ImgHTMLAttributes } from 'react';
import { mediaCrossOrigin } from '@/lib/mediaCredentials';

/** The URL boundary is shared with avatars, preloads and sanitized articles.
 * External images without CORS support keep their existing loading behavior.
 */
export const PublicImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(function PublicImage({ src, crossOrigin, ...props }, ref) {
  return <img ref={ref} {...props} crossOrigin={mediaCrossOrigin(src, import.meta.env?.VITE_SUPABASE_URL) ?? crossOrigin} src={src} />;
});
