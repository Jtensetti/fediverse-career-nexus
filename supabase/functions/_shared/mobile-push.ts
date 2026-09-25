export const PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
export const PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
export function validExpoToken(value: unknown): value is string {
  return typeof value === 'string' && value === value.trim() && /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,200}\]$/.test(value);
}
export function pushMessage(token: string, notificationId: string) {
  return { to: token, title: 'Nolto', body: 'Du har en ny notis. Öppna Nolto för att läsa.',
    sound: 'default', channelId: 'activity', ttl: 3600, data: { notificationId } };
}
type ProviderResult = { status?: string; id?: string; details?: { error?: string } };
export function providerOutcome(result: ProviderResult | undefined, receipt = false) {
  if (result?.status === 'ok' && (receipt || (typeof result.id === 'string' && result.id.length > 0))) return 'ok';
  if (result?.details?.error === 'DeviceNotRegistered') return 'unregistered';
  if (result?.details?.error === 'MessageRateExceeded') return 'retry';
  return result?.status === 'error' ? 'failed' : 'retry';
}
export function retryDelay(attempt: number) { return Math.min(3600, 30 * 2 ** Math.max(0, Math.min(attempt - 1, 10))); }
export const retryableStatus = (status: number) => status === 429 || status >= 500;
