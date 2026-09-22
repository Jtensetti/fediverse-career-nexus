import { useEffect, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeInbox, inboxRevision, inboxIsUnlocked, lockInbox, getInboxBackup, prepareInbox, activateInbox,
  unlockInbox, unlockInboxFromBackup, downloadInboxBackup, getInboxPublicKey
} from '@/services/messaging/inboxKeysService';
import type { InboxKeyBackup } from '@/lib/privateMessages';

export function useUnlockedInbox() {
  useSyncExternalStore(subscribeInbox, inboxRevision);
  const { user } = useAuth();
  return !!user && inboxIsUnlocked(user.id);
}

export default function EncryptedInbox({ partnerId }: { partnerId?: string }) {
  const { i18n } = useTranslation();
  const sv = i18n.language.startsWith('sv');
  const { user } = useAuth();
  const ready = useUnlockedInbox();
  const queryClient = useQueryClient();
  const [existing, setExisting] = useState<InboxKeyBackup | null | undefined>();
  const [pending, setPending] = useState<InboxKeyBackup | null>(null);
  const [saved, setSaved] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [peerFingerprint, setPeerFingerprint] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setExisting(undefined); setPending(null); setBackupFile(null); setPassphrase(''); setConfirmation(''); setError('');
    if (user) getInboxBackup().then(value => { if (current) setExisting(value); }).catch(() => { if (current) setError(sv ? 'Kunde inte läsa nyckeln. Ladda om sidan.' : 'Could not load your key. Reload this page.'); });
    return () => { current = false; };
  }, [user?.id]);
  useEffect(() => {
    if (!ready || !partnerId) return;
    let current = true;
    getInboxPublicKey(partnerId).then(value => { if (current) setPeerFingerprint(value?.fingerprint || null); })
      .catch(() => { if (current) setError(sv ? 'Mottagarens nyckel kunde inte verifieras.' : 'The recipient’s key could not be verified.'); });
    return () => { current = false; };
  }, [ready, partnerId]);
  useEffect(() => {
    if (ready) return;
    queryClient.removeQueries({ queryKey: ['conversation'] });
  }, [ready, queryClient]);

  async function submit() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (backupFile) {
        if (backupFile.size > 50000) throw new Error(sv ? 'Backupfilen är för stor.' : 'The backup file is too large.');
        setExisting(await unlockInboxFromBackup(JSON.parse(await backupFile.text()), passphrase));
        setBackupFile(null); setPassphrase(''); setConfirmation('');
      }
      else if (existing) { await unlockInbox(passphrase); setPassphrase(''); }
      else if (!pending) {
        if (passphrase !== confirmation) throw new Error(sv ? 'Nyckelfraserna måste vara lika.' : 'The key phrases must match.');
        setPending(await prepareInbox(passphrase));
      } else {
        if (!saved) return;
        await activateInbox(pending, passphrase);
        setExisting(pending); setPending(null); setPassphrase(''); setConfirmation('');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : (sv ? 'Försök igen.' : 'Please retry.')); }
    finally { setBusy(false); }
  }
  if (!user) return null;
  if (ready) return <div className="rounded-lg border p-4 mb-4 space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><p>{sv ? 'Inkorgen är upplåst. Nya meddelanden krypteras mellan deltagarna.' : 'Inbox unlocked. New messages are encrypted between participants.'}</p><Button size="sm" variant="outline" onClick={lockInbox}>{sv ? 'Lås inkorgen' : 'Lock inbox'}</Button></div>
    <details><summary className="cursor-pointer">{sv ? 'Nycklar och säkerhetskopiering' : 'Keys and backup'}</summary>
      <p className="mt-3">{sv ? 'Jämför dessa fingeravtryck med varandra via en annan betrodd kanal. Nolto kan inte garantera identiteten vid första kontakten.' : 'Compare these fingerprints using another trusted channel. Nolto cannot guarantee identity at first contact.'}</p>
      <p className="break-all mt-2">{sv ? 'Din nyckel: ' : 'Your key: '}{existing?.fingerprint}</p>
      {partnerId && <p className="break-all mt-2">{sv ? 'Mottagarens nyckel: ' : 'Recipient key: '}{peerFingerprint || (sv ? 'Inte aktiverad' : 'Not activated')}</p>}
      {existing && <Button className="mt-3" variant="outline" onClick={() => downloadInboxBackup(existing)}>{sv ? 'Ladda ner krypterad nyckelbackup' : 'Download encrypted key backup'}</Button>}
    </details>{error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
  return <Card className="mb-5"><CardHeader><CardTitle>{existing ? (sv ? 'Lås upp din inkorg' : 'Unlock your inbox') : (sv ? 'Aktivera krypterade meddelanden' : 'Enable encrypted messages')}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p>{sv ? 'Nyckelfrasen används bara i din webbläsare. Nolto kan inte läsa nya meddelanden eller återställa dem om du förlorar frasen. Använd en separat lång fras, gärna minst fem slumpmässiga ord.' : 'Your key phrase is used only in your browser. Nolto cannot read new messages or recover them if you lose the phrase. Use a separate long phrase, preferably at least five random words.'}</p>
      {existing === undefined ? <p role="status">{sv ? 'Läser krypteringsinställningar…' : 'Loading encryption settings…'}</p> : <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
        {!pending && <><label className="block space-y-2"><span>{sv ? 'Nyckelfras' : 'Key phrase'}</span><Input type="password" autoComplete="off" value={passphrase} onChange={event => setPassphrase(event.target.value)} minLength={existing ? undefined : 16} maxLength={1024} required /></label>
          {!existing && !backupFile && <label className="block space-y-2"><span>{sv ? 'Upprepa nyckelfrasen' : 'Repeat key phrase'}</span><Input type="password" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></label>}
          <details><summary className="cursor-pointer text-sm">{sv ? 'Använd en nedladdad nyckelbackup' : 'Use a downloaded key backup'}</summary><label className="block mt-3"><span className="sr-only">{sv ? 'Krypterad nyckelbackup' : 'Encrypted key backup'}</span><Input type="file" accept="application/json,.json" onChange={event => setBackupFile(event.target.files?.[0] || null)} /></label></details></>}
        {pending && <><Button type="button" variant="outline" onClick={() => downloadInboxBackup(pending)}>{sv ? 'Ladda ner krypterad nyckelbackup' : 'Download encrypted key backup'}</Button><label className="flex items-start gap-3"><Checkbox checked={saved} onCheckedChange={value => setSaved(value === true)} /><span>{sv ? 'Jag har sparat backupen och nyckelfrasen på en säker plats.' : 'I have stored the backup and key phrase in a safe place.'}</span></label></>}
        <Button type="submit" disabled={busy || (!!pending && !saved)}>{busy ? (sv ? 'Arbetar…' : 'Working…') : existing || backupFile ? (sv ? 'Lås upp' : 'Unlock') : pending ? (sv ? 'Aktivera inkorgen' : 'Activate inbox') : (sv ? 'Skapa meddelandenyckel' : 'Create message key')}</Button>
      </form>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">{sv ? 'Offentliga inlägg omfattas inte. Äldre meddelanden kan ha serverkryptering. ' : 'Public posts are excluded. Older messages may use server encryption. '}<Link to="/privacy" className="underline">{sv ? 'Läs om integritet och begränsningar' : 'Read about privacy and limitations'}</Link></p>
    </CardContent></Card>;
}
