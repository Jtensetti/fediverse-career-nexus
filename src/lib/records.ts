// Public database views can describe identifiers as nullable. Do not construct
// links or issue follow-up queries for a row without an identifier.
export function hasRecordId<T extends { id: string | null }>(record: T): record is T & { id: string } {
  return typeof record.id === 'string' && record.id.length > 0;
}
