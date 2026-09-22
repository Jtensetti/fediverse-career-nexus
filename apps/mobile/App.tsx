import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { fetchPublicFeed, type PublicPost } from '@nolto/public-feed';
import { postText } from './content';

const backend = { url: process.env.EXPO_PUBLIC_BACKEND_URL ?? '', publishableKey: process.env.EXPO_PUBLIC_BACKEND_KEY ?? '' };
const site = process.env.EXPO_PUBLIC_SITE_URL ?? '';
const configured = backend.url.startsWith('https://') && !!backend.publishableKey && site.startsWith('https://');
const PAGE_SIZE = 12;

function Timeline() {
  const [scope, setScope] = useState<'local' | 'federated'>('local');
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const nextOffset = useRef(0);
  const active = useRef<AbortController | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    if (!configured || (!refresh && active.current)) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setRefreshing(refresh);
    setError('');
    const offset = refresh ? 0 : nextOffset.current;
    try {
      const page = await fetchPublicFeed(backend, { scope, offset, limit: PAGE_SIZE, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPosts(current => [...new Map([...(refresh ? [] : current), ...page].map(post => [post.id, post])).values()]);
      nextOffset.current = offset + PAGE_SIZE;
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      if (!controller.signal.aborted) setError('Flödet kunde inte laddas. Försök igen.');
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false); setRefreshing(false); }
    }
  }, [scope]);

  useEffect(() => {
    setPosts([]);
    setHasMore(false);
    nextOffset.current = 0;
    void load(true);
    return () => { active.current?.abort(); active.current = null; };
  }, [load]);

  const openPost = async (id: string) => {
    try { await Linking.openURL(new URL(`/post/${encodeURIComponent(id)}`, site).href); }
    catch { Alert.alert('Länken kunde inte öppnas', 'Försök igen om en stund.'); }
  };

  return <SafeAreaView style={styles.screen}>
    <StatusBar style="dark" />
    <View style={styles.header}><Text style={styles.logo}>Nolto</Text><Text style={styles.subtitle}>Ditt professionella nätverk</Text></View>
    <FlatList
      data={posts}
      keyExtractor={post => post.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#294653" />}
      ListHeaderComponent={<View>
        <Text style={styles.heading}>Samtal om arbetslivet.</Text>
        <Text style={styles.intro}>Titta in. Du behöver inget konto för att läsa.</Text>
        <View style={styles.tabs}>{(['local', 'federated'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: scope === value }} onPress={() => setScope(value)} style={[styles.tab, value === scope && styles.selectedTab]}><Text style={value === scope ? styles.selectedLabel : styles.tabLabel}>{value === 'local' ? 'På Nolto' : 'Hela nätverket'}</Text></Pressable>)}</View>
        {!configured && <Text style={styles.error}>Ange appens publika backend- och webbaddress i den lokala konfigurationen.</Text>}
        {!!error && <View accessibilityRole="alert"><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" style={styles.button} onPress={() => void load(posts.length === 0)}><Text style={styles.buttonLabel}>Försök igen</Text></Pressable></View>}
      </View>}
      ListEmptyComponent={configured && !loading && !error ? <View style={styles.empty}><Text style={styles.cardTitle}>Här börjar samtalen.</Text><Text style={styles.body}>Det finns inga offentliga inlägg i det här flödet än.</Text></View> : loading ? <ActivityIndicator color="#294653" accessibilityLabel="Laddar inlägg" /> : null}
      renderItem={({ item }) => <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.actor_name || 'Offentligt inlägg'}</Text>
        {!!item.content_warning ? <Text style={styles.body}>Innehållsvarning: {item.content_warning}</Text> : <Text style={styles.body} numberOfLines={8}>{postText(item.content)}</Text>}
        <Pressable accessibilityRole="link" onPress={() => void openPost(item.id)} style={styles.postLink}><Text style={styles.linkLabel}>Öppna inlägget på webben ↗</Text></Pressable>
      </View>}
      ListFooterComponent={hasMore ? <Pressable accessibilityRole="button" disabled={loading} style={styles.button} onPress={() => void load(false)}><Text style={styles.buttonLabel}>{loading ? 'Laddar…' : 'Visa fler inlägg'}</Text></Pressable> : null}
    />
  </SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><Timeline /></SafeAreaProvider>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f9fb' },
  header: { paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderColor: '#e2e8ef' },
  logo: { fontSize: 28, fontWeight: '700', color: '#294653' },
  subtitle: { marginTop: 4, fontSize: 12, color: '#5d707a' },
  list: { padding: 24, flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  heading: { marginTop: 10, fontSize: 30, fontWeight: '700', letterSpacing: -1, color: '#172c37' },
  intro: { marginVertical: 16, fontSize: 15, lineHeight: 24, color: '#5d707a' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  tab: { padding: 14, borderRadius: 24, backgroundColor: '#e7eef0' },
  selectedTab: { backgroundColor: '#294653' },
  selectedLabel: { color: '#fff', fontWeight: '600' },
  tabLabel: { color: '#294653', fontWeight: '600' },
  card: { padding: 20, marginVertical: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8ef' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#172c37' },
  body: { marginTop: 12, fontSize: 16, lineHeight: 25, color: '#425862' },
  empty: { padding: 28, marginVertical: 24, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8ef' },
  error: { marginVertical: 16, lineHeight: 23, color: '#9b302d' },
  button: { backgroundColor: '#efbf68', padding: 16, marginVertical: 14, borderRadius: 24, alignItems: 'center' },
  buttonLabel: { color: '#172c37', fontWeight: '600' },
  postLink: { paddingTop: 20, paddingBottom: 8 },
  linkLabel: { color: '#294653', fontSize: 14, fontWeight: '600' },
});
