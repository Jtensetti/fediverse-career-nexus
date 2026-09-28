import { useTranslation } from 'react-i18next';
import { userFacingErrorMessage } from '@/lib/userFacingError';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { profileShareRequest, selectedProfile, type ProfileField } from '@/lib/profileSharing';
import { getOwnProfileForSharing } from '@/services/profile/profileSharingService';

import { tx } from "@/i18n/tx";
const labelKeys: Record<ProfileField, string> = { name: 'profileEdit.displayName', headline: 'profileEdit.headline', location: 'profileEdit.location', bio: 'profileEdit.bio', profileUrl: 'profileSharingLabels.profileUrl', handle: 'profileSharingLabels.handle', email: 'auth.email', phone: 'profileEdit.phone', website: 'companyForm.website', experience: 'profile.experience', education: 'profile.education', skills: 'profile.skills' };
export default function ShareProfile() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const request = useMemo(() => { try { return profileShareRequest(window.location.search); } catch { return null; } }, []);
  const [selected, setSelected] = useState(new Set<ProfileField>(['name', 'headline', 'profileUrl']));
  const [sent, setSent] = useState(false);
  const profile = useQuery({ queryKey: ['own-profile-sharing', user?.id], queryFn: getOwnProfileForSharing, enabled: !!user && !!request, retry: false });
  const send = (cancelled = false) => {
    if (!request || !window.opener || (!cancelled && (!user || !profile.data))) return;
    window.opener.postMessage({ type: 'nolto:profile', version: 1, request: request.request, cancelled,
      ...(!cancelled && { profile: selectedProfile(profile.data!, request.fields, selected) }) }, request.origin);
    setSent(true); window.close();
  };
  return <main className="min-h-screen bg-background px-5 py-8"><div className="mx-auto max-w-lg space-y-6">
    <a href="/" className="font-display text-2xl text-primary">Nolto</a>
    <h1 className="text-2xl font-semibold">{tx("ui.shareProfile.valjVadDuVill")}</h1>
    {!request || !window.opener ? <p role="alert">{tx("ui.shareProfile.oppnaDelningenMedNolto")}</p>
      : sent ? <p role="status">{tx("ui.shareProfile.klartDuKanStanga")}</p>
      : <>
        <div className="rounded-xl border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{tx("ui.shareProfile.mottagare")}</p><p className="break-all font-semibold">{request.origin}</p></div>
        <p className="text-sm text-muted-foreground">{tx("ui.shareProfile.baraDeUppgifterDu")}</p>
        {loading ? <p role="status">{tx("ui.shareProfile.kontrollerarInloggningen")}</p> : !user ? <div className="space-y-3"><Button asChild><a href="/auth" target="_blank" rel="noopener noreferrer">{tx("ui.shareProfile.loggaInPaNolto")}</a></Button><p className="text-sm">{tx("ui.shareProfile.loggaInIDen")}</p></div>
          : profile.isPending ? <p role="status">{tx("ui.shareProfile.hamtarDinProfil")}</p>
          : profile.isError ? <><p role="alert">{userFacingErrorMessage(profile.error, 'ui.profileService.failedToLoadProfile')}</p><Button variant="outline" onClick={() => void profile.refetch()}>{tx("ui.shareProfile.forsokIgen")}</Button></>
          : <div className="space-y-4">{request.fields.map(field => {
            const value = profile.data?.[field];
            const preview = Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : [item.title || item.degree, item.company || item.institution, item.start_date || item.start_year, item.end_date || item.end_year].filter(Boolean).join(' · ')).join('\n') : value;
            return <div key={field} className="flex gap-3 rounded-lg border p-4"><Checkbox id={`share-${field}`} checked={selected.has(field)} disabled={!preview} onCheckedChange={checked => setSelected(previous => { const next = new Set(previous); if (checked) next.add(field); else next.delete(field); return next; })} /><div className="min-w-0"><Label htmlFor={`share-${field}`}>{t(labelKeys[field])}</Label><p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{preview || tx("ui.shareProfile.inteIfyllt")}</p></div></div>;
          })}</div>}
        <div className="flex gap-3"><Button variant="outline" onClick={() => send(true)}>{tx("ui.shareProfile.avbryt")}</Button><Button disabled={!profile.data || !user || !request.fields.some(field => selected.has(field) && profile.data?.[field])} onClick={() => send()}>{tx("ui.shareProfile.delaValdaUppgifter")}</Button></div>
      </>}
  </div></main>;
}
