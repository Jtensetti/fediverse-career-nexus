import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { createCustomFeed, updateCustomFeed, type CustomFeed, type FeedRules } from "@/services/misc/feedPreferencesService";
import { FEED_RULE_LIMIT, hasFeedSources, normalizeTag, validTag } from "@/lib/feedRules";

type Choice = { id: string; label: string; kind: 'person' | 'actor' | 'company'; detail?: string };
type Source = 'person' | 'company';
const escapedSearch = (term: string) => `%${term.replace(/[\\%_]/g, '\\$&')}%`;

async function findChoices(kind: Source, term: string): Promise<Choice[]> {
  const pattern = escapedSearch(term.trim());
  if (kind === 'company') {
    const { data, error } = await supabase.from('companies').select('id,name').ilike('name', pattern).limit(8);
    if (error) throw error;
    return (data ?? []).map(row => ({ id: row.id, label: row.name, kind }));
  }
  const results = await Promise.all([
    supabase.from('public_profiles').select('id,fullname,username').ilike('fullname', pattern).limit(6),
    supabase.from('public_profiles').select('id,fullname,username').ilike('username', pattern).limit(6),
    supabase.from('public_actors').select('id,preferred_username,remote_actor_url').eq('is_remote', true).ilike('preferred_username', pattern).limit(6),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const people: Choice[] = [...(results[0].data ?? []), ...(results[1].data ?? [])].flatMap(row => row.id ? [{
    id: row.id, label: row.fullname || row.username || '', detail: `@${row.username}@nolto.social`, kind: 'person' as const,
  }] : []);
  const actors: Choice[] = (results[2].data ?? []).flatMap(row => row.id ? [{
    id: row.id, label: row.preferred_username || '', detail: row.remote_actor_url || '', kind: 'actor' as const,
  }] : []);
  return [...new Map([...people, ...actors].map(choice => [`${choice.kind}:${choice.id}`, choice])).values()];
}

function ChoiceSearch({ kind, choices, onChange }: { kind: Source; choices: Choice[]; onChange: (choices: Choice[]) => void }) {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Choice[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  useEffect(() => {
    let active = true;
    setResults([]);
    if (term.trim().length < 2) { setStatus('idle'); return; }
    setStatus('loading');
    const timer = setTimeout(() => {
      findChoices(kind, term).then(found => { if (active) { setResults(found); setStatus('ready'); } })
        .catch(() => { if (active) setStatus('error'); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [term, kind]);
  const label = t(kind === 'person' ? 'feed.people' : 'feed.organizations');
  return <div className="space-y-2">
    <Label htmlFor={`feed-${kind}`}>{label}</Label>
    <Input id={`feed-${kind}`} value={term} maxLength={80} onChange={event => setTerm(event.target.value)}
      placeholder={t('personalFeeds.searchPlaceholder')} disabled={choices.length >= FEED_RULE_LIMIT} autoComplete="off" />
    <div aria-live="polite" className="text-sm text-muted-foreground">
      {status === 'loading' && t('common.loading')}
      {status === 'error' && t('personalFeeds.searchError')}
      {status === 'ready' && results.length === 0 && t('personalFeeds.noResults')}
    </div>
    {results.filter(result => !choices.some(choice => choice.id === result.id)).length > 0 && <ul className="max-h-44 overflow-y-auto rounded-md border">
      {results.filter(result => !choices.some(choice => choice.id === result.id)).map(result => <li key={`${result.kind}:${result.id}`}>
        <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted"
          onClick={() => { onChange([...choices, result]); setTerm(''); }}>
          <span className="block text-sm font-medium">{result.label}</span>
          {result.detail && <span className="block truncate text-xs text-muted-foreground">{result.detail}</span>}
        </button>
      </li>)}
    </ul>}
    <div className="flex flex-wrap gap-2">{choices.map(choice => <button type="button" key={`${choice.kind}:${choice.id}`}
      className="inline-flex max-w-full items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"
      aria-label={t('personalFeeds.remove', { name: choice.label })} onClick={() => onChange(choices.filter(item => item.id !== choice.id))}>
      <span className="truncate">{choice.label}</span><X className="h-3 w-3 shrink-0" />
    </button>)}</div>
  </div>;
}

function RuleWords({ kind, values, onChange }: { kind: 'tags' | 'keywords'; values: string[]; onChange: (values: string[]) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const value = kind === 'tags' ? normalizeTag(input) : input.trim().toLowerCase();
  const valid = !!value && value.length <= 80 && (kind !== 'tags' || validTag(value));
  function add() { if (valid && values.length < FEED_RULE_LIMIT) { onChange([...new Set([...values, value])]); setInput(''); } }
  return <div className="space-y-2">
    <Label htmlFor={`feed-${kind}`}>{t(kind === 'tags' ? 'personalFeeds.tags' : 'feed.keywords')}</Label>
    <div className="flex gap-2">
      <Input id={`feed-${kind}`} value={input} maxLength={80} onChange={event => setInput(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add(); } }}
        placeholder={kind === 'tags' ? '#design' : t('personalFeeds.keywordPlaceholder')} />
      <Button type="button" variant="outline" onClick={add} disabled={!valid || values.length >= FEED_RULE_LIMIT} aria-label={t('common.add')}><Plus className="h-4 w-4" /></Button>
    </div>
    {input && !valid && <p className="text-sm text-destructive">{t('personalFeeds.invalidTag')}</p>}
    <div className="flex flex-wrap gap-2">{values.map(word => <button type="button" key={word}
      className="inline-flex max-w-full items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm"
      aria-label={t('personalFeeds.remove', { name: word })} onClick={() => onChange(values.filter(item => item !== word))}>
      <span className="truncate">{kind === 'tags' ? '#' : ''}{word}</span><X className="h-3 w-3 shrink-0" />
    </button>)}</div>
  </div>;
}

export default function CreateCustomFeedDialog({ open, onOpenChange, editFeed, onSaved }: {
  open: boolean; onOpenChange: (open: boolean) => void; editFeed?: CustomFeed | null; onSaved?: () => void;
}) {
  const { t } = useTranslation();
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{t(editFeed ? 'feed.editCustomFeed' : 'feed.createCustomFeed')}</DialogTitle>
        <DialogDescription>{t('personalFeeds.description')}</DialogDescription>
      </DialogHeader>
      {open && <FeedForm key={editFeed?.id ?? 'new'} editFeed={editFeed} onSaved={() => { onOpenChange(false); onSaved?.(); }} />}
    </DialogContent>
  </Dialog>;
}

function FeedForm({ editFeed, onSaved }: { editFeed?: CustomFeed | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(editFeed?.name ?? '');
  const [description, setDescription] = useState(editFeed?.description ?? '');
  const [tags, setTags] = useState(editFeed?.rules.include_tags ?? []);
  const [keywords, setKeywords] = useState(editFeed?.rules.include_keywords ?? []);
  const [people, setPeople] = useState<Choice[]>([
    ...(editFeed?.rules.include_users ?? []).map(id => ({ id, label: t('personalFeeds.unavailablePerson'), kind: 'person' as const })),
    ...(editFeed?.rules.include_actors ?? []).map(id => ({ id, label: t('personalFeeds.unavailablePerson'), kind: 'actor' as const })),
  ]);
  const [companies, setCompanies] = useState<Choice[]>((editFeed?.rules.include_companies ?? []).map(id => ({ id, label: t('personalFeeds.unavailableCompany'), kind: 'company' })));
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(!!editFeed);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!editFeed) return;
    let active = true;
    async function hydrate() {
      const [profiles, actors, orgs] = await Promise.all([
        supabase.from('public_profiles').select('id,fullname,username').in('id', editFeed!.rules.include_users ?? []),
        supabase.from('public_actors').select('id,preferred_username,remote_actor_url').in('id', editFeed!.rules.include_actors ?? []),
        supabase.from('companies').select('id,name').in('id', editFeed!.rules.include_companies ?? []),
      ]);
      if (!active) return;
      if (profiles.error || actors.error || orgs.error) { setError(true); return; }
      setPeople(current => current.map(choice => {
        const profile = profiles.data?.find(row => choice.kind === 'person' && row.id === choice.id);
        const actor = actors.data?.find(row => choice.kind === 'actor' && row.id === choice.id);
        return { ...choice, label: profile?.fullname || profile?.username || actor?.preferred_username || choice.label };
      }));
      setCompanies(current => current.map(choice => ({ ...choice, label: orgs.data?.find(row => row.id === choice.id)?.name || choice.label })));
    }
    hydrate().catch(() => { if (active) setError(true); }).finally(() => { if (active) setHydrating(false); });
    return () => { active = false; };
  }, [editFeed]);
  const rules: FeedRules = {
    ...editFeed?.rules, include_tags: tags, include_keywords: keywords,
    include_users: people.filter(choice => choice.kind === 'person').map(choice => choice.id),
    include_actors: people.filter(choice => choice.kind === 'actor').map(choice => choice.id),
    include_companies: companies.map(choice => choice.id),
  };
  return <form className="space-y-5" onSubmit={async event => {
    event.preventDefault();
    if (saving || !name.trim() || !hasFeedSources(rules)) return;
    setSaving(true); setError(false);
    try {
      const data = { name: name.trim(), description: description.trim(), rules };
      const result = editFeed ? await updateCustomFeed(editFeed.id, data) : await createCustomFeed(data);
      if (result) onSaved(); else setError(true);
    } catch { setError(true); } finally { setSaving(false); }
  }}>
    <fieldset disabled={saving || hydrating} className="space-y-5">
      <div className="space-y-2"><Label htmlFor="feed-name">{t('feed.name')}</Label>
        <Input id="feed-name" required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="feed-description">{t('feed.description')}</Label>
        <Textarea id="feed-description" maxLength={300} rows={2} value={description} onChange={event => setDescription(event.target.value)} /></div>
      <RuleWords kind="tags" values={tags} onChange={setTags} />
      <ChoiceSearch kind="person" choices={people} onChange={setPeople} />
      <ChoiceSearch kind="company" choices={companies} onChange={setCompanies} />
      <RuleWords kind="keywords" values={keywords} onChange={setKeywords} />
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{t('personalFeeds.saveError')}</p>}
    <DialogFooter><Button type="submit" disabled={saving || hydrating || !name.trim() || !hasFeedSources(rules)}>
      {saving || hydrating ? t('common.loading') : t('common.save')}
    </Button></DialogFooter>
  </form>;
}
