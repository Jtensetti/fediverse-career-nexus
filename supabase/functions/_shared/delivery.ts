/** Delivery bookkeeping must preserve partial success without losing failed recipients. */
export async function deliverInboxes(
  inboxes: Iterable<string>, delivered: Set<string>,
  send: (inbox: string) => Promise<Response>, record: (inbox: string) => Promise<void>,
): Promise<string[]> {
  const failures: string[] = [];
  for (const inbox of new Set(inboxes)) {
    if (delivered.has(inbox)) continue;
    try {
      const response = await send(inbox);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await record(inbox);
      delivered.add(inbox);
    } catch (error) { failures.push(`${inbox}: ${error instanceof Error ? error.message : "Delivery failed"}`); }
  }
  return failures;
}
