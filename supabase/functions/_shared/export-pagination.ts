/** Fail rather than silently deliver an incomplete archive. The query must use a stable order. */
export async function collectPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; count: number | null; error: unknown }>,
  maxRows = 50000,
  consumePage?: (page: T[]) => void,
): Promise<T[]> {
  const rows: T[] = [];
  let expectedCount: number | undefined;
  for (;;) {
    const { data, count, error } = await fetchPage(rows.length, rows.length + 499);
    if (error) throw error;
    if (!data || count === null || count > maxRows) throw new Error("Export exceeds the self-service limit or returned no count");
    if (expectedCount !== undefined && count !== expectedCount) throw new Error("Records changed during export; retry the export");
    expectedCount = count;
    consumePage?.(data);
    if (!data.length && rows.length < count) throw new Error("Export pagination stopped before all rows were read");
    rows.push(...data);
    if (rows.length > maxRows) throw new Error("Export exceeds the self-service limit");
    if (rows.length >= count) return rows;
  }
}
