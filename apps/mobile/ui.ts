import { StyleSheet } from 'react-native';
import { useTheme, fonts } from './theme';
export function useUi() { const { colors: c } = useTheme(); return StyleSheet.create({
  content: { padding: 24, gap: 16, flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  heading: { fontSize: 28, fontFamily: fonts.display, letterSpacing: -0.8, color: c.text },
  text: { fontSize: 16, lineHeight: 25, fontFamily: fonts.regular, color: c.text },
  subtle: { fontSize: 14, lineHeight: 22, fontFamily: fonts.regular, color: c.muted },
  error: { color: c.error, fontSize: 15, lineHeight: 24, fontFamily: fonts.regular },
  input: { minHeight: 52, borderWidth: 1, borderColor: c.input, backgroundColor: c.card, borderRadius: 14, padding: 14, fontSize: 17, fontFamily: fonts.regular, color: c.text },
  button: { minHeight: 48, borderRadius: 24, padding: 14, backgroundColor: '#efbf68', alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: c.soft },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontFamily: fonts.semi, color: c.text },
  card: { padding: 20, borderRadius: 20, gap: 8, backgroundColor: c.card, borderWidth: 1, borderColor: c.border },
}); }
