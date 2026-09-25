import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { ArrowUpRight, Bell, RefreshCw, type LucideIcon } from 'lucide-react-native';
import { fonts, useTheme } from './theme';
import { useUi } from './ui';

export function Button({ title, onPress, busy = false, secondary = false, disabled = false, icon: Icon }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean; disabled?: boolean; icon?: LucideIcon }) {
  const ui = useUi(); const { colors: c } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={busy || disabled} onPress={onPress}
    style={({ pressed }) => [ui.button, secondary && ui.secondary, { flexDirection: 'row', gap: 8, opacity: busy || disabled ? 0.55 : pressed ? 0.8 : 1 }]}>
    {busy ? <ActivityIndicator color={secondary ? c.text : '#142d39'} /> : Icon ? <Icon size={18} color={secondary ? c.text : '#142d39'} /> : null}
    <Text style={[ui.label, { color: secondary ? c.text : '#142d39', flexShrink: 1, textAlign: 'center' }]}>{title}</Text>
  </Pressable>;
}
export function EmptyState({ title, text, icon: Icon = Bell }: { title: string; text: string; icon?: LucideIcon }) {
  const ui = useUi(); const { colors: c } = useTheme();
  return <View style={{ paddingVertical: 36, paddingHorizontal: 16, alignItems: 'center', gap: 12 }}>
    <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}><Icon size={28} color={c.primary} strokeWidth={1.7} /></View>
    <Text style={[ui.label, { fontSize: 19, textAlign: 'center' }]}>{title}</Text><Text style={[ui.subtle, { textAlign: 'center', maxWidth: 290 }]}>{text}</Text>
  </View>;
}
export function ErrorState({ text, retry }: { text: string; retry?: () => void }) {
  const ui = useUi();
  return <View style={[ui.card, { marginVertical: 12 }]}><Text accessibilityRole="alert" style={ui.error}>{text}</Text>{retry && <Button title="Försök igen" onPress={retry} secondary icon={RefreshCw} />}</View>;
}
export function WelcomeCard() {
  const { colors: c } = useTheme();
  return <View style={{ backgroundColor: c.hero, borderRadius: 26, padding: 24, overflow: 'hidden', marginBottom: 26 }}>
    <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#355663', right: -55, bottom: -72 }} />
    <Text style={{ fontFamily: fonts.semi, fontSize: 11, letterSpacing: 1.8, color: '#f0c477', marginBottom: 12 }}>DITT PROFESSIONELLA NÄTVERK</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 35, letterSpacing: -0.7, color: c.heroText }}>Bra samtal.{ '\n' }Nya möjligheter.</Text><Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: '#d5e4e9', marginTop: 12 }}>Människor och idéer som tar arbetslivet framåt.</Text></View>
      <Image source={require('./assets/mascot.webp')} accessibilityIgnoresInvertColors accessible={false} style={{ width: 86, height: 110 }} resizeMode="contain" />
    </View>
  </View>;
}
export function WebLink({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors: c } = useTheme();
  return <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}><Text style={{ fontFamily: fonts.semi, fontSize: 14, color: c.primary, flexShrink: 1 }}>{title}</Text><ArrowUpRight size={17} color={c.primary} /></Pressable>;
}
