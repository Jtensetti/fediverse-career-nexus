import { useColorScheme } from 'react-native';

const light = { background: '#f6f8fa', card: '#ffffff', text: '#142d39', muted: '#546775', border: '#dfe7ed', input: '#81939e', primary: '#294653', primaryText: '#fff', soft: '#e9f0f2', accent: '#eebe68', teal: '#208a80', error: '#aa322e', hero: '#294653', heroText: '#ffffff', unread: '#f1f7f7' };
const dark: typeof light = { background: '#0f172a', card: '#152033', text: '#f4f7fb', muted: '#acb9cc', border: '#2b3b50', input: '#7889a0', primary: '#48b6df', primaryText: '#102534', soft: '#213447', accent: '#eebe68', teal: '#59d1bd', error: '#ffaaa5', hero: '#213b48', heroText: '#f4f7fb', unread: '#1b3440' };
export function useTheme() { const isDark = useColorScheme() === 'dark'; return { colors: isDark ? dark : light, isDark }; }
export const fonts = { regular: 'Inter-Regular', semi: 'Inter-SemiBold', bold: 'Inter-Bold', display: 'Montserrat-Bold' };
