import { useEffect, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOwnMedia, isNoltoMedia } from '@/lib/media';

export function ArticleContent({ html }: { html: string }) {
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const safe = useMemo(() => DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
  }), [html]);
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const originals = new Map<HTMLImageElement, string>();
    const blobs: string[] = [];
    for (const image of ref.current?.querySelectorAll('img') || []) {
      if (!isNoltoMedia(image.src)) continue;
      originals.set(image, image.src);
      fetchOwnMedia(image.src, controller.signal).then(blob => {
        if (!blob || controller.signal.aborted) return;
        const url = URL.createObjectURL(blob); blobs.push(url); image.src = url;
      }).catch(() => {});
    }
    return () => { controller.abort(); originals.forEach((src, image) => { image.src = src; }); blobs.forEach(URL.revokeObjectURL); };
  }, [safe, user?.id]);
  return <div ref={ref} className="article-content" dangerouslySetInnerHTML={{ __html: safe }} />;
}
