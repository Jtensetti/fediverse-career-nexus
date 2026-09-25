import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import { projectId } from './config';
import { pushApi } from './client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});
const installationKey = 'nolto.push.installation';
const consentKey = 'nolto.push.consent';
let operation: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = operation.then(work, work);
  operation = next.catch(() => undefined);
  return next;
}
async function installationId() {
  let id = await SecureStore.getItemAsync(installationKey);
  if (!id) { id = randomUUID(); await SecureStore.setItemAsync(installationKey, id); }
  return id;
}
export async function hasPushConsent(userId: string) { return (await SecureStore.getItemAsync(consentKey)) === userId; }
async function registerPush(userId: string, requestPermission = true) {
  if (!Device.isDevice) throw new Error('Pushnotiser behöver testas på en fysisk telefon.');
  if (!projectId) throw new Error('Pushnotiser är inte konfigurerade i den här appversionen.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('activity', {
    name: 'Nytt på Nolto', importance: Notifications.AndroidImportance.DEFAULT,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    await unregisterPush();
    throw new Error('Notiser är avstängda. Du kan tillåta dem i telefonens inställningar.');
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await pushApi({ action: 'register', installation_id: await installationId(), platform: Platform.OS, token: token.data });
  await SecureStore.setItemAsync(consentKey, userId);
}
async function unregisterPush() {
  const id = await SecureStore.getItemAsync(installationKey);
  if (id) await pushApi({ action: 'revoke', installation_id: id });
  await SecureStore.deleteItemAsync(consentKey);
  await Notifications.setBadgeCountAsync(0);
  await Notifications.dismissAllNotificationsAsync();
}
async function clearConsent() {
  await SecureStore.deleteItemAsync(consentKey);
  await Notifications.setBadgeCountAsync(0);
  await Notifications.dismissAllNotificationsAsync();
}
// Rotation, permission changes and logout share one queue, so a renewal started
// before logout cannot finish after the device has been unregistered.
export const enablePush = (userId: string, requestPermission = true) => serial(() => registerPush(userId, requestPermission));
export const disablePush = () => serial(unregisterPush);
export const clearLocalPushConsent = () => serial(clearConsent);
