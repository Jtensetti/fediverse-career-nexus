/** Text-only rendering; remote HTML never becomes a native WebView. */
export function postText(content: Record<string, unknown>): string {
  const value = typeof content.content === 'string' ? content.content : typeof content.name === 'string' ? content.name : '';
  return value.replace(/<\/?(?:p|div|br|li)\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, entity: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity] ?? '').replace(/\n{3,}/g, '\n\n').trim();
}
