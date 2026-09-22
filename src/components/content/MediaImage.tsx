import { forwardRef, useEffect, useState, type ImgHTMLAttributes } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOwnMedia, isNoltoMedia } from '@/lib/media';

export function useMediaSource(src?: string): string | undefined {
  const { user } = useAuth();
  const [resolved, setResolved] = useState<{ src: string; userId: string; url: string }>();
  useEffect(() => {
    if (!src || !user || !isNoltoMedia(src)) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetchOwnMedia(src, controller.signal).then(blob => {
      if (!blob || controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setResolved({ src, userId: user.id, url: objectUrl });
    }).catch(() => { /* The public image may still be available without authentication. */ });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, user?.id]);
  return resolved?.src === src && resolved?.userId === user?.id ? resolved.url : src;
}

export const MediaImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(function MediaImage({ src, ...props }, ref) {
  const resolved = useMediaSource(src);
  return <img ref={ref} {...props} src={resolved} />;
});
