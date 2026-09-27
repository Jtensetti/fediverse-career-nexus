import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { tx } from '@/i18n/tx';
import { intlLocale } from '@/lib/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type Row = { key: string; label: string; reason: string; count: number; until: string | null; flagged?: boolean };
const table = (name: 'ip_blocks' | 'instance_auto_blocks') => supabase.from(name as never) as unknown as ReturnType<typeof supabase.from>;

async function loadBlocks(): Promise<{ ips: Row[]; servers: Row[] }> {
  const [ips, servers] = await Promise.all([
    table('ip_blocks').select('ip_hash, reason, hit_count, blocked_until').order('last_hit_at', { ascending: false }).limit(200),
    table('instance_auto_blocks').select('host, reason, strikes, blocked_until, flagged_only')
      .or(`blocked_until.gt.${new Date().toISOString()},flagged_only.eq.true`).order('updated_at', { ascending: false }).limit(200),
  ]);
  if (ips.error) throw ips.error;
  if (servers.error) throw servers.error;
  return {
    ips: (ips.data as never as { ip_hash: string; reason: string; hit_count: number; blocked_until: string }[]).map(r => ({
      key: r.ip_hash, label: `${r.ip_hash.slice(0, 12)}…`, reason: r.reason, count: r.hit_count, until: r.blocked_until })),
    servers: (servers.data as never as { host: string; reason: string; strikes: number; blocked_until: string | null; flagged_only: boolean }[]).map(r => ({
      key: r.host, label: r.host, reason: r.reason, count: r.strikes, until: r.blocked_until, flagged: r.flagged_only })),
  };
}

function BlockTable({ rows, kind, onLift }: { rows: Row[]; kind: 'ip' | 'server'; onLift: (row: Row) => void }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{tx('ui.autoBlocks.empty')}</p>;
  const fmt = new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <ul className="divide-y divide-border">
      {rows.map(row => {
        const active = !!row.until && Date.parse(row.until) > Date.now();
        return (
          <li key={row.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-mono text-sm break-all">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.reason} · {tx('ui.autoBlocks.count', { count: row.count })}</p>
              {row.until && active && <p className="text-xs text-muted-foreground">{tx('ui.autoBlocks.until', { date: fmt.format(new Date(row.until)) })}</p>}
            </div>
            <div className="flex items-center gap-2">
              {row.flagged && <Badge variant="outline">{tx('ui.autoBlocks.flagged')}</Badge>}
              {!active && !row.flagged && <Badge variant="outline">{tx('ui.autoBlocks.expired')}</Badge>}
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" size="sm">{tx('ui.autoBlocks.lift')}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{tx('ui.autoBlocks.liftTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>{tx(kind === 'ip' ? 'ui.autoBlocks.liftIp' : 'ui.autoBlocks.liftServer', { name: row.label })}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tx('ui.autoBlocks.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onLift(row)}>{tx('ui.autoBlocks.lift')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AutoBlocksList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['auto-blocks'], queryFn: loadBlocks });
  const lift = (kind: 'ip' | 'server') => async (row: Row) => {
    const { error: liftError } = kind === 'ip'
      ? await table('ip_blocks').delete().eq('ip_hash', row.key)
      : await table('instance_auto_blocks').delete().eq('host', row.key);
    if (liftError) { toast.error(tx('ui.autoBlocks.liftFailed')); return; }
    toast.success(tx('ui.autoBlocks.lifted'));
    queryClient.invalidateQueries({ queryKey: ['auto-blocks'] });
  };
  if (isLoading) return <p className="text-sm text-muted-foreground">{tx('ui.autoBlocks.loading')}</p>;
  if (error || !data) return <p className="text-sm text-destructive">{tx('ui.autoBlocks.loadFailed')}</p>;
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="font-semibold">{tx('ui.autoBlocks.ipTitle')}</h3>
        <p className="text-sm text-muted-foreground">{tx('ui.autoBlocks.ipHelp')}</p>
        <BlockTable rows={data.ips} kind="ip" onLift={lift('ip')} />
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold">{tx('ui.autoBlocks.serverTitle')}</h3>
        <p className="text-sm text-muted-foreground">{tx('ui.autoBlocks.serverHelp')}</p>
        <BlockTable rows={data.servers} kind="server" onLift={lift('server')} />
      </section>
    </div>
  );
}
