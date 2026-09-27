import DOMPurify from 'dompurify';
import { mediaCrossOrigin } from './mediaCredentials';

export function articleHtml(html: string, backend: string): string {
  // Sanitize into an inert fragment. Set CORS before any image is inserted in
  // the live document, including anonymous readers and the first render.
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'img', 'hr'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
    RETURN_DOM_FRAGMENT: true,
  });
  for (const image of fragment.querySelectorAll('img')) {
    if (mediaCrossOrigin(image.getAttribute('src') ?? undefined, backend)) image.setAttribute('crossorigin', 'anonymous');
  }
  const template = document.createElement('template');
  template.content.append(fragment);
  return template.innerHTML;
}
