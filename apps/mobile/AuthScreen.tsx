import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { client } from './client';
import { site } from './config';
import { useUi } from './ui';
import { Button } from './components';

export function AuthScreen({ mfa, onVerified }: { mfa: boolean; onVerified: () => void }) {
  const ui = useUi();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!client || busy) return;
    setBusy(true); setError('');
    try {
      if (mfa) {
        const factors = await client.auth.mfa.listFactors();
        if (factors.error) throw factors.error;
        const factor = factors.data.totp.find(item => item.status === 'verified');
        if (!factor) throw new Error('Totp unavailable');
        const result = await client.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
        if (result.error) throw result.error;
      } else {
        const result = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
      }
      setPassword(''); setCode(''); onVerified();
    } catch { setError(mfa ? 'Koden kunde inte verifieras. Kontrollera koden och uppkopplingen och försök igen.' : 'Det gick inte att logga in. Kontrollera e-post, lösenord och uppkoppling.'); }
    finally { setBusy(false); }
  }
  async function openAuth() {
    try { await Linking.openURL(new URL('/auth', site).href); }
    catch { setError('Webbsidan kunde inte öppnas.'); }
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Text style={ui.heading}>{mfa ? 'Bekräfta att det är du' : 'Välkommen tillbaka.'}</Text>
      <Text style={ui.text}>{mfa ? 'Ange koden från din autentiseringsapp.' : 'Logga in med ditt Nolto-konto för att se och aktivera notiser.'}</Text>
      {mfa ? <><Text style={ui.label}>Engångskod</Text><TextInput accessibilityLabel="Engångskod" style={ui.input} value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} /></> : <>
        <Text style={ui.label}>E-post</Text><TextInput accessibilityLabel="E-post" style={ui.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="username" />
        <Text style={ui.label}>Lösenord</Text><TextInput accessibilityLabel="Lösenord" style={ui.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" onSubmitEditing={() => void submit()} />
      </>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      <Button title={mfa ? 'Bekräfta' : 'Logga in'} busy={busy} disabled={mfa ? code.length !== 6 : !email.trim() || !password} onPress={() => void submit()} />
      {mfa ? <Pressable accessibilityRole="button" onPress={() => { void client?.auth.signOut({ scope: 'local' }).then(({ error }) => { if (error) setError('Utloggningen misslyckades. Försök igen.'); }); }} style={[ui.button, ui.secondary]}><Text style={ui.label}>Avbryt inloggningen</Text></Pressable> : <>
        <Pressable accessibilityRole="link" onPress={() => void openAuth()} style={[ui.button, ui.secondary]}><Text style={ui.label}>Skapa konto eller återställ lösenord på webben</Text></Pressable>
        <Text style={ui.subtle}>Mobilappen stöder än så länge inloggning med e-post och lösenord. Använder du en annan inloggningsmetod finns den på webben.</Text>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
