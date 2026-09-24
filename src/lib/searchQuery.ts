/** Match every word without treating punctuation as PostgREST/LIKE syntax. */
export function searchTerms(query: string): string[] {
  return [...new Set(query.normalize('NFC').match(/[\p{L}\p{M}\p{N}]+/gu) || [])];
}

export function profileSearchFilter(query: string): string | undefined {
  const terms = searchTerms(query);
  if (!terms.length) return undefined;
  const columns = ['username', 'fullname', 'headline'];
  return `and(${terms.map(term => `or(${columns.map(column => `${column}.ilike."%${term}%"`).join(',')})`).join(',')})`;
}
