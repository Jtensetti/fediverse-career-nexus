/** Date-only form values are local calendar dates, never UTC instants. */
export function parseLocalDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Strict 24-hour HH:mm with minute precision; no seconds, no normalizing of 24:00 or 10:60. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** False for malformed times and for local times skipped by a DST transition. */
export function isValidLocalDateTime(date: Date | undefined, time: string | undefined): boolean {
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || !time || !TIME_PATTERN.test(time)) return false;
  const [hour, minute] = time.split(':').map(Number);
  const value = localDateTime(date, time);
  return value.getHours() === hour && value.getMinutes() === minute && value.getDate() === date.getDate();
}

export function localDateTime(date: Date, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
}

export function nextEventRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  start.setMinutes(Math.floor(now.getMinutes() / 30) * 30 + 30, 0, 0);
  // During a repeated DST hour, local setters may select the earlier occurrence.
  while (start <= now) start.setTime(start.getTime() + 30 * 60_000);
  return { start, end: new Date(start.getTime() + 60 * 60_000) };
}

/** Preserve an already valid end; otherwise carry the previous duration forward. */
export function endAfterStartChange(previousStart: Date, previousEnd: Date, nextStart: Date): Date {
  if (previousEnd > nextStart) return previousEnd;
  const duration = previousEnd.getTime() - previousStart.getTime();
  return new Date(nextStart.getTime() + (duration > 0 ? duration : 60 * 60_000));
}
