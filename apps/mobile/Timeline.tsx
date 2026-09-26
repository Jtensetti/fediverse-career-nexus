import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, Pressable, RefreshControl, Text, View } from 'react-native';
import { Globe2, MessageCircle } from 'lucide-react-native';
import { fetchPublicFeed, type PublicPost } from '@nolto/public-feed';
import { backend, configured, site } from './config';
import { postText } from './content';
import { fonts, useTheme } from './theme';
import { useUi } from './ui';
import { Button, EmptyState, ErrorState, WelcomeCard, WebLink } from './components';

const PAGE_SIZE = 12;
function PostCard({ post, open }: { post: PublicPost; open: () => void }) {
  const { colors: c } = useTheme(); const ui = useUi();
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const text = postText(post.content);
  const name = post.actor_name || 'Någon i nätverket';
  return <View style={[ui.card, { marginBottom: 14, paddingBottom: 8 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      {post.actor_avatar?.startsWith('https://') && !imageFailed ? <Image source={{ uri: post.actor_avatar }} onError={() => setImageFailed(true)} style={{ width: 44, height: 44, borderRadius: 16 }} accessible={false} /> : <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fonts.bold, color: c.primary, fontSize: 17 }}>{name.slice(0, 1).toLocaleUpperCase('sv')}</Text></View>}
      <View style={{ flex: 1 }}><Text style={[ui.label, { fontSize: 15 }]}>{name}</Text><Text style={[ui.subtle, { fontSize: 12 }]}>{post.company ? 'Organisation' : post.source === 'remote' ? 'Från nätverket' : 'På Nolto'}{post.created_at && !Number.isNaN(Date.parse(post.created_at)) ? ` · ${new Date(post.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}` : ''}</Text></View>
      <Globe2 size={16} color={c.muted} accessibilityLabel="Offentligt inlägg" />
    </View>
    {post.content_warning && !revealed ? <View style={{ backgroundColor: c.soft, padding: 16, borderRadius: 14, gap: 12 }}><Text style={ui.label}>Innehållsvarning</Text><Text style={ui.text}>{post.content_warning}</Text><Button title="Visa innehållet" onPress={() => setRevealed(true)} secondary /></View> : <>
      <Text style={ui.text}>{!text ? 'Ett nytt inlägg i nätverket.' : expanded || text.length <= 280 ? text : `${text.slice(0, 280).trimEnd()}…`}</Text>
      {text.length > 280 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: c.primary, fontFamily: fonts.semi }}>{expanded ? 'Visa mindre' : 'Läs mer'}</Text></Pressable>}
    </>}
    <View style={{ borderTopWidth: 1, borderColor: c.border, marginTop: 10 }}><WebLink title="Öppna samtalet på webben" onPress={open} /></View>
  </View>;
}

export function Timeline() {
  const { colors: c } = useTheme(); const ui = useUi();
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
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setLoading(true); setRefreshing(refresh); setError('');
    const offset = refresh ? 0 : nextOffset.current;
    try {
      const page = await fetchPublicFeed(backend, { scope, offset, limit: PAGE_SIZE, signal: controller.signal });
      if (controller.signal.aborted) return;
      setPosts(current => [...new Map([...(refresh ? [] : current), ...page].map(post => [post.id, post])).values()]);
      nextOffset.current = offset + PAGE_SIZE; setHasMore(page.length === PAGE_SIZE);
    } catch { if (!controller.signal.aborted) setError('Flödet kunde inte laddas. Dina redan laddade inlägg finns kvar.'); }
    finally { if (active.current === controller) { active.current = null; setLoading(false); setRefreshing(false); } }
  }, [scope]);
  useEffect(() => {
    setPosts([]); setHasMore(false); nextOffset.current = 0; void load(true);
    return () => { active.current?.abort(); active.current = null; };
  }, [load]);
  async function openPost(id: string) {
    try { await Linking.openURL(new URL(`/post/${encodeURIComponent(id)}`, site).href); }
    catch { setError('Inlägget kunde inte öppnas. Försök igen.'); }
  }
  return <FlatList data={posts} keyExtractor={post => post.id} contentContainerStyle={[ui.content, { gap: 0, paddingTop: 16 }]}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={c.primary} />}
    ListHeaderComponent={<View><WelcomeCard /><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><Text style={[ui.heading, { fontSize: 23 }]}>Ditt nästa samtal</Text><MessageCircle size={21} color={c.primary} /></View>
      <View style={{ flexDirection: 'row', padding: 4, backgroundColor: c.soft, borderRadius: 16, marginBottom: 22 }}>{(['local', 'federated'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: scope === value }} onPress={() => setScope(value)} style={{ flex: 1, minHeight: 44, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: scope === value ? c.card : 'transparent' }}><Text style={{ fontFamily: fonts.semi, fontSize: 14, color: scope === value ? c.text : c.muted }}>{value === 'local' ? 'På Nolto' : 'Hela nätverket'}</Text></Pressable>)}</View>
      {!configured && <ErrorState text="Den här appversionen saknar anslutning till Nolto. Kontakta den som gav dig appen." />}
      {!!error && <ErrorState text={error} retry={() => void load(posts.length === 0)} />}
    </View>}
    ListEmptyComponent={loading ? <View style={{ padding: 30 }}><ActivityIndicator color={c.primary} accessibilityLabel="Laddar samtal" /></View> : configured && !error ? <EmptyState title="Här börjar samtalen." text="Det finns inga offentliga inlägg här än. Titta in igen om en stund." icon={MessageCircle} /> : null}
    renderItem={({ item }) => <PostCard post={item} open={() => void openPost(item.id)} />}
    ListFooterComponent={hasMore ? <Button title="Visa fler inlägg" busy={loading} onPress={() => void load(false)} secondary /> : posts.length ? <Text style={[ui.subtle, { textAlign: 'center', padding: 16, fontSize: 12 }]}>Du är ikapp. Ett bra läge för en paus.</Text> : null} />;
}
