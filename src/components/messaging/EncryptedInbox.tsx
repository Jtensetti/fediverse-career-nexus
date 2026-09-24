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
  const { t } = useTranslation();
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
    if (user) getInboxBackup().then(value => { if (current) setExisting(value); }).catch(() => { if (current) setError(t("ui.encryptedInbox.couldNotLoadYour")); });
    return () => { current = false; };
  }, [user?.id]);
  useEffect(() => {
    if (!ready || !partnerId) return;
    let current = true;
    getInboxPublicKey(partnerId).then(value => { if (current) setPeerFingerprint(value?.fingerprint || null); })
      .catch(() => { if (current) setError(t("ui.encryptedInbox.theRecipientsKeyCould")); });
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
        if (backupFile.size > 50000) throw new Error(t("ui.encryptedInbox.theBackupFileIs"));
        setExisting(await unlockInboxFromBackup(JSON.parse(await backupFile.text()), passphrase));
        setBackupFile(null); setPassphrase(''); setConfirmation('');
      }
      else if (existing) { await unlockInbox(passphrase); setPassphrase(''); }
      else if (!pending) {
        if (passphrase !== confirmation) throw new Error(t("ui.encryptedInbox.theKeyPhrasesMust"));
        setPending(await prepareInbox(passphrase));
      } else {
        if (!saved) return;
        await activateInbox(pending, passphrase);
        setExisting(pending); setPending(null); setPassphrase(''); setConfirmation('');
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : (t("ui.encryptedInbox.pleaseRetry"))); }
    finally { setBusy(false); }
  }
  if (!user) return null;
  if (ready) return <div className="rounded-lg border p-4 mb-4 space-y-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><p>{t("ui.encryptedInbox.inboxUnlockedNewMessages")}</p><Button size="sm" variant="outline" onClick={lockInbox}>{t("ui.encryptedInbox.lockInbox")}</Button></div>
    <details><summary className="cursor-pointer">{t("ui.encryptedInbox.keysAndBackup")}</summary>
      <p className="mt-3">{t("ui.encryptedInbox.compareTheseFingerprintsUsing")}</p>
      <p className="break-all mt-2">{t("ui.encryptedInbox.yourKey")}{existing?.fingerprint}</p>
      {partnerId && <p className="break-all mt-2">{t("ui.encryptedInbox.recipientKey")}{peerFingerprint || (t("ui.encryptedInbox.notActivated"))}</p>}
      {existing && <Button className="mt-3" variant="outline" onClick={() => downloadInboxBackup(existing)}>{t("ui.encryptedInbox.downloadEncryptedKeyBackup")}</Button>}
    </details>{error && <p role="alert" className="text-destructive">{error}</p>}
  </div>;
  return <Card className="mb-5"><CardHeader><CardTitle>{existing ? (t("ui.encryptedInbox.unlockYourInbox")) : (t("ui.encryptedInbox.enableEncryptedMessages"))}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p>{t("ui.encryptedInbox.yourKeyPhraseIs")}</p>
      {existing === undefined ? <p role="status">{t("ui.encryptedInbox.loadingEncryptionSettings")}</p> : <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4">
        {!pending && <><label className="block space-y-2"><span>{t("ui.encryptedInbox.keyPhrase")}</span><Input type="password" autoComplete="off" value={passphrase} onChange={event => setPassphrase(event.target.value)} minLength={existing ? undefined : 16} maxLength={1024} required /></label>
          {!existing && !backupFile && <label className="block space-y-2"><span>{t("ui.encryptedInbox.repeatKeyPhrase")}</span><Input type="password" autoComplete="off" value={confirmation} onChange={event => setConfirmation(event.target.value)} required /></label>}
          <details><summary className="cursor-pointer text-sm">{t("ui.encryptedInbox.useADownloadedKey")}</summary><label className="block mt-3"><span className="sr-only">{t("ui.encryptedInbox.encryptedKeyBackup")}</span><Input type="file" accept="application/json,.json" onChange={event => setBackupFile(event.target.files?.[0] || null)} /></label></details></>}
        {pending && <><Button type="button" variant="outline" onClick={() => downloadInboxBackup(pending)}>{t("ui.encryptedInbox.downloadEncryptedKeyBackup")}</Button><label className="flex items-start gap-3"><Checkbox checked={saved} onCheckedChange={value => setSaved(value === true)} /><span>{t("ui.encryptedInbox.iHaveStoredThe")}</span></label></>}
        <Button type="submit" disabled={busy || (!!pending && !saved)}>{busy ? (t("ui.encryptedInbox.working")) : existing || backupFile ? (t("ui.encryptedInbox.unlock")) : pending ? (t("ui.encryptedInbox.activateInbox")) : (t("ui.encryptedInbox.createMessageKey"))}</Button>
      </form>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">{t("ui.encryptedInbox.publicPostsAreExcluded")}<Link to="/privacy" className="underline">{t("ui.encryptedInbox.readAboutPrivacyAnd")}</Link></p>
    </CardContent></Card>;
}
