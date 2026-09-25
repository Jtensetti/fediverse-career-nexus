import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Platform, Pressable, RefreshControl, Text, View } from 'react-native';
import { Bell, CheckCheck, ChevronRight, MessageCircle, UserPlus, Heart, AtSign } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { client } from './client';
import { site } from './config';
import { type MobileNotification, notificationPath, notificationTitle } from './notification-content';
import { useUi } from './ui';
import { fonts, useTheme } from './theme';
import { Button, EmptyState, ErrorState } from './components';

export function NotificationsScreen({ userId, pendingId, onHandled, revision }: { userId: string; pendingId: string | null; onHandled: () => void; revision: number }) {
  const ui = useUi(); const { colors: c } = useTheme();
  const [rows, setRows] = useState<MobileNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const requestVersion = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; requestVersion.current++; }; }, []);
  const load = useCallback(async (before?: string, beforeId?: string) => {
    if (!client) return;
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const { data, error } = await client.rpc('mobile_notification_inbox', { p_before: before ?? null, p_before_id: beforeId ?? null });
      if (error) throw error;
      if (requestVersion.current !== version || !mounted.current) return;
      const page = data as MobileNotification[];
      setRows(current => before ? [...new Map([...current, ...page].map(row => [row.id, row])).values()] : page);
      setMore(page.length === 50);
      if (Platform.OS !== 'web') await Notifications.setBadgeCountAsync(0);
    } catch { if (requestVersion.current === version && mounted.current) setError('Dina notiser kunde inte hämtas. Försök igen om en stund.'); }
    finally { if (requestVersion.current === version && mounted.current) setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); }, [load, revision]);
  const openNotification = useCallback(async (id: string) => {
    if (!client) return;
    setBusy(true); setError('');
    try {
      // A push may refer to another account or to content since removed. Fetch
      // ownership and visibility again before marking read or navigating.
      const { data, error } = await client.rpc('mobile_notification_inbox', { p_id: id });
      if (error) throw error;
      const notification = (data as MobileNotification[])[0];
      if (!notification) { setError('Den här notisen finns inte längre eller hör till ett annat konto.'); return; }
      const update = await client.from('notifications').update({ read: true }).eq('id', id).eq('recipient_id', userId);
      if (update.error) throw update.error;
      setRows(current => current.map(row => row.id === id ? { ...row, read: true } : row));
      await Linking.openURL(new URL(notificationPath(notification), site).href);
    } catch { setError('Notisen kunde inte öppnas. Kontrollera uppkopplingen och försök igen.'); }
    finally { setBusy(false); }
  }, [userId]);
  useEffect(() => {
    if (pendingId) { onHandled(); void openNotification(pendingId); }
  }, [pendingId, openNotification, onHandled]);
  async function markAllRead() {
    if (!client) return;
    setBusy(true); setError('');
    try {
      const { error } = await client.from('notifications').update({ read: true }).eq('recipient_id', userId).eq('read', false);
      if (error) throw error;
      setRows(current => current.map(row => ({ ...row, read: true })));
      if (Platform.OS !== 'web') {
        await Notifications.setBadgeCountAsync(0);
        await Notifications.dismissAllNotificationsAsync();
      }
    } catch { setError('Notiserna kunde inte markeras som lästa. Försök igen.'); }
    finally { setBusy(false); }
  }
  return <FlatList data={unreadOnly ? rows.filter(row => !row.read) : rows} keyExtractor={row => row.id} contentContainerStyle={[ui.content, { gap: 0 }]}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />}
    ListHeaderComponent={<View><Text style={ui.heading}>Ditt nätverk hör av sig.</Text><Text style={[ui.subtle, { marginTop: 10, marginBottom: 22 }]}>Svar, nya kontakter och sådant du inte vill missa.</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>{[false, true].map(value => <Pressable key={String(value)} accessibilityRole="tab" accessibilityState={{ selected: unreadOnly === value }} onPress={() => setUnreadOnly(value)} style={{ minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, backgroundColor: unreadOnly === value ? c.primary : c.soft }}><Text style={{ fontFamily: fonts.semi, color: unreadOnly === value ? c.primaryText : c.muted }}>{value ? 'Olästa' : 'Alla notiser'}</Text></Pressable>)}</View>
      {rows.some(row => !row.read) && <View style={{ marginBottom: 20 }}><Button title="Markera alla som lästa" secondary busy={busy} icon={CheckCheck} onPress={() => void markAllRead()} /></View>}
      {!!error && <ErrorState text={error} retry={() => void load()} />}
    </View>}
    ListEmptyComponent={loading ? <ActivityIndicator color={c.primary} accessibilityLabel="Laddar notiser" /> : !error ? <EmptyState title={unreadOnly ? 'Du är helt ikapp.' : 'Här samlas det som händer.'} text={unreadOnly ? 'Alla dina notiser är lästa. Nya samtal väntar i flödet.' : 'När någon svarar, följer dig eller skickar ett meddelande syns det här.'} /> : null}
    renderItem={({ item }) => {
      const Icon = item.type === 'message' || item.type === 'reply' ? MessageCircle : item.type === 'follow' || item.type.startsWith('connection') ? UserPlus : item.type === 'like' ? Heart : item.type === 'mention' ? AtSign : Bell;
      return <Pressable accessibilityRole="link" accessibilityLabel={`${item.read ? '' : 'Oläst. '}${notificationTitle(item.type)}. Öppnas på webben.`} disabled={busy} onPress={() => void openNotification(item.id)} style={({ pressed }) => [ui.card, { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 10, backgroundColor: item.read ? c.card : c.unread, opacity: pressed ? 0.75 : 1 }]}>
        <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={c.primary} strokeWidth={1.8} /></View>
        <View style={{ flex: 1, gap: 5 }}><Text style={[ui.label, { fontFamily: item.read ? fonts.regular : fonts.semi, lineHeight: 22 }]}>{notificationTitle(item.type)}</Text><Text style={[ui.subtle, { fontSize: 12 }]}>{new Date(item.created_at).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text></View>
        {!item.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.teal }} />}<ChevronRight size={16} color={c.muted} />
      </Pressable>;
    }}
    ListFooterComponent={more ? <Button title="Visa äldre notiser" secondary busy={loading} onPress={() => void load(rows.at(-1)?.created_at, rows.at(-1)?.id)} /> : <Text style={[ui.subtle, { textAlign: 'center', marginTop: 22, fontSize: 12 }]}>Tryck på en notis för att fortsätta på nolto.social.</Text>} />;
}
