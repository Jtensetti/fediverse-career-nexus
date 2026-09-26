import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { Bell, LogOut, ShieldCheck, UserRound } from 'lucide-react-native';
import { client } from './client';
import { site } from './config';
import { disablePush, enablePush, hasPushConsent } from './push';
import { fonts, useTheme } from './theme';
import { useUi } from './ui';
import { Button, ErrorState, WebLink } from './components';

export function AccountScreen({ userId, email, onSignedOut, pushError }: { userId: string; email?: string; onSignedOut: () => void; pushError: string }) {
  const { colors: c, isDark } = useTheme(); const ui = useUi();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (Platform.OS !== 'web') void hasPushConsent(userId).then(setEnabled).catch(() => setError('Notisinställningen kunde inte läsas.')); }, [userId, pushError]);
  async function changePush(value: boolean) {
    setBusy(true); setError('');
    try { if (value) await enablePush(userId); else await disablePush(); setEnabled(value); }
    catch (error) { setError(error instanceof Error ? error.message : 'Notisinställningen kunde inte sparas.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (!client) return;
    setBusy(true); setError('');
    try {
      if (Platform.OS !== 'web' && await hasPushConsent(userId)) await disablePush();
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      onSignedOut();
    } catch { setError('Utloggningen kunde inte slutföras. Anslut till internet och försök igen så att notiserna till den här telefonen stoppas.'); }
    finally { setBusy(false); }
  }
  async function open(path: string) { try { await Linking.openURL(new URL(path, site).href); } catch { setError('Webbsidan kunde inte öppnas.'); } }
  return <ScrollView contentContainerStyle={ui.content}>
    <Text style={ui.heading}>På dina villkor.</Text><Text style={ui.subtle}>Ditt konto och det du vill höra från oss.</Text>
    <View style={[ui.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}><View style={{ backgroundColor: c.soft, width: 48, height: 48, borderRadius: 17, justifyContent: 'center', alignItems: 'center' }}><UserRound color={c.primary} size={24} /></View><View style={{ flex: 1 }}><Text style={ui.label}>Ditt Nolto-konto</Text><Text style={[ui.subtle, { marginTop: 4 }]}>{email || 'Du är inloggad'}</Text></View></View>
    <Text style={[ui.subtle, { fontFamily: fonts.semi, fontSize: 11, letterSpacing: 1.5, marginTop: 8 }]}>NOTISER</Text>
    <View style={ui.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Bell color={c.primary} size={22} /><Text style={[ui.label, { flex: 1 }]}>Pushnotiser</Text><Switch accessibilityLabel="Pushnotiser på den här telefonen" value={enabled} disabled={busy || Platform.OS === 'web'} onValueChange={value => void changePush(value)} trackColor={{ false: c.input, true: c.teal }} /></View>
      <Text style={[ui.subtle, { marginTop: 8 }]}>{Platform.OS === 'web' ? 'Pushnotiser aktiveras i iPhone- eller Android-appen.' : 'Få en notis när någon hör av sig. Du väljer själv när du vill läsa.'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: c.soft, padding: 12, borderRadius: 12, marginTop: 8 }}><ShieldCheck size={18} color={c.primary} /><Text style={[ui.subtle, { flex: 1, fontSize: 12, lineHeight: 19 }]}>Låsskärmen visar bara att något har hänt. Inga namn eller meddelanden delas där.</Text></View>
      <WebLink title="Öppna telefonens notisinställningar" onPress={() => { void Linking.openSettings().catch(() => setError('Telefonens inställningar kunde inte öppnas.')); }} />
    </View>
    {(error || pushError) && <ErrorState text={error || pushError} />}
    <View style={ui.card}><Text style={ui.label}>Det ska kännas som Nolto.</Text><Text style={ui.subtle}>Appen följer telefonens {isDark ? 'mörka' : 'ljusa'} tema och textstorlek.</Text><WebLink title="Redigera din profil på webben" onPress={() => void open('/profile/edit')} /><WebLink title="Hantera ditt konto på webben" onPress={() => void open('/profile/edit')} /></View>
    <Button title="Logga ut från den här telefonen" onPress={() => void signOut()} busy={busy} secondary icon={LogOut} />
    <Text style={[ui.subtle, { textAlign: 'center', fontSize: 12 }]}>Nolto · Ett öppnare arbetsliv</Text>
  </ScrollView>;
}
