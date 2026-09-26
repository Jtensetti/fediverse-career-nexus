import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Bell, House, UserRound } from 'lucide-react-native';
import { client } from './client';
import { configured } from './config';
import { isUuid } from './notification-content';
import { clearLocalPushConsent, enablePush, hasPushConsent } from './push';
import { Timeline } from './Timeline';
import { AuthScreen } from './AuthScreen';
import { AccountScreen } from './AccountScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { useSession } from './useSession';
import { fonts, useTheme } from './theme';
import { ErrorState } from './components';

type Tab = 'home' | 'notifications' | 'account';
function Shell() {
  const { colors: c, isDark } = useTheme();
  const { session, status: auth, verify } = useSession();
  const [tab, setTab] = useState<Tab>('home');
  const [revision, setRevision] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pushError, setPushError] = useState('');
  const previousUser = useRef<string | null>(null);
  const lastResponse = useRef<string | null>(null);
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  const onHandled = useCallback(() => setPendingId(null), []);
  useEffect(() => {
    if (previousUser.current && previousUser.current !== session?.user.id) {
      setPendingId(null); setPushError('');
      if (Platform.OS !== 'web') void clearLocalPushConsent().catch(() => undefined);
    }
    previousUser.current = session?.user.id ?? null;
  }, [session?.user.id]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const request = response.notification.request;
      if (request.identifier === lastResponse.current) return;
      lastResponse.current = request.identifier;
      if (isUuid(request.content.data?.notificationId)) { setPendingId(request.content.data.notificationId); setTab('notifications'); refresh(); }
      Notifications.clearLastNotificationResponse();
    };
    const response = Notifications.addNotificationResponseReceivedListener(handle);
    const received = Notifications.addNotificationReceivedListener(refresh);
    handle(Notifications.getLastNotificationResponse());
    return () => { response.remove(); received.remove(); };
  }, [refresh]);
  const userId = auth === 'verified' ? session?.user.id : undefined;
  useEffect(() => {
    if (!userId || !client) return;
    const channel = client.channel(`mobile-inbox:${userId}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}`,
    }, refresh).subscribe();
    const active = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { void client?.removeChannel(channel); active.remove(); };
  }, [userId, refresh]);
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    let cancelled = false; let running = false;
    const renew = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        if (await hasPushConsent(userId)) await enablePush(userId, false);
        if (!cancelled) setPushError('');
      } catch { if (!cancelled) setPushError('Pushnotiser kunde inte uppdateras. Kontrollera notisinställningen och din uppkoppling.'); }
      finally { running = false; }
    };
    void renew();
    const token = Notifications.addPushTokenListener(() => { void renew(); });
    const active = AppState.addEventListener('change', state => { if (state === 'active') void renew(); });
    return () => { cancelled = true; token.remove(); active.remove(); };
  }, [userId]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top', 'left', 'right']}>
    <StatusBar style={isDark ? 'light' : 'dark'} />
    <View style={{ paddingHorizontal: 24, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Nolto, gå till flödet" onPress={() => setTab('home')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontFamily: fonts.display, fontSize: 29, letterSpacing: -1.2, color: c.primary }}>Nolto<Text style={{ color: c.teal }}>.</Text></Text></Pressable>
      <View style={{ backgroundColor: c.soft, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20 }}><Text style={{ fontFamily: fonts.semi, fontSize: 11, color: c.muted }}>{tab === 'home' ? 'Ett öppnare arbetsliv' : tab === 'notifications' ? 'Dina notiser' : 'Ditt konto'}</Text></View>
    </View>
    <View style={{ flex: 1 }}>
      {tab === 'home' ? <Timeline /> : !configured ? <View style={{ padding: 24 }}><ErrorState text="Den här appversionen saknar anslutning till Nolto." /></View> : auth === 'loading' ? <View style={{ padding: 40 }}><ActivityIndicator color={c.primary} accessibilityLabel="Kontrollerar inloggning" /></View> : auth === 'error' ? <View style={{ flex: 1, padding: 24 }}><ErrorState text="Din inloggning kunde inte verifieras. Kontrollera uppkopplingen och försök igen." retry={verify} />{session && <AccountScreen userId={session.user.id} email={session.user.email} onSignedOut={() => setTab('home')} pushError="" />}</View> : auth === 'guest' || auth === 'mfa' ? <AuthScreen mfa={auth === 'mfa'} onVerified={verify} /> : session && (tab === 'notifications' ? <NotificationsScreen key={session.user.id} userId={session.user.id} pendingId={pendingId} onHandled={onHandled} revision={revision} /> : <AccountScreen key={session.user.id} userId={session.user.id} email={session.user.email} onSignedOut={() => { setTab('home'); setPendingId(null); }} pushError={pushError} />)}
    </View>
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.card, borderTopWidth: 1, borderColor: c.border }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
        {([{ id: 'home', title: 'Flöde', icon: House }, { id: 'notifications', title: 'Notiser', icon: Bell }, { id: 'account', title: 'Konto', icon: UserRound }] as const).map(({ id, title, icon: Icon }) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)} style={{ flex: 1, minHeight: 59, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <View style={{ minWidth: 56, alignItems: 'center', paddingVertical: 5, borderRadius: 15, backgroundColor: tab === id ? c.soft : 'transparent' }}><Icon size={22} color={tab === id ? c.primary : c.muted} strokeWidth={tab === id ? 2.2 : 1.7} /></View>
          <Text style={{ fontFamily: tab === id ? fonts.semi : fonts.regular, fontSize: 11, color: tab === id ? c.primary : c.muted }}>{title}</Text>
        </Pressable>)}
      </View>
    </SafeAreaView>
  </SafeAreaView>;
}
export default function App() {
  const [loaded, error] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'), 'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'), 'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
  });
  return <SafeAreaProvider>{loaded || error ? <Shell /> : <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color="#294653" /></View>}</SafeAreaProvider>;
}
