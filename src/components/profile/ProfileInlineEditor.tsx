import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ImageCropDialog } from '@/components/content/ImageCropDialog';
import AvatarWithStatus from '@/components/common/AvatarWithStatus';
import ProfileBanner from './ProfileBanner';
import SimpleMarkdown from '@/components/common/SimpleMarkdown';
import type { UserProfile } from '@/services/profile/profileService';
import { profileAppearanceSchema, validProfileImage, type ProfileAppearance, type ProfileImages } from '@/lib/profileDraft';

function useObjectUrl(file?: File | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!file) { setUrl(undefined); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function EditableText({ label, value, onChange, className, maxLength, preview, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void; className?: string;
  maxLength: number; preview: boolean; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (input.current) { input.current.style.height = '0px'; input.current.style.height = `${input.current.scrollHeight}px`; }
  }, [value, editing, preview]);
  if (editing && !preview) return <div>
    <label className="sr-only" htmlFor={`inline-${maxLength}`}>{label}</label>
    <textarea ref={input} id={`inline-${maxLength}`} autoFocus value={value} maxLength={maxLength} rows={1}
      className={`block w-full resize-none rounded bg-transparent p-1 outline-none ring-2 ring-primary ${className ?? ''}`}
      onChange={event => onChange(event.target.value)} onBlur={() => setEditing(false)}
      onKeyDown={event => { if (event.key === 'Escape' || (!multiline && event.key === 'Enter')) { event.preventDefault(); setEditing(false); } }} />
    <span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span>
  </div>;
  const content = multiline ? <SimpleMarkdown content={value || label} className="whitespace-pre-line break-words" /> : <span className="whitespace-pre-wrap break-words">{value || (preview ? '' : label)}</span>;
  return preview ? <div className={className}>{content}</div> : <button type="button" onClick={() => setEditing(true)} aria-label={label}
    className={`group block w-full rounded border border-dashed border-primary/30 p-1 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary ${className ?? ''}`}>
    {/* Editable biographies are plain text; links become interactive in Preview. */}
    <span className="whitespace-pre-wrap break-words">{value || label}</span>
    <Pencil className="ml-2 inline h-3 w-3 text-muted-foreground" aria-hidden="true" />
  </button>;
}

export default function ProfileInlineEditor({ profile, onSave, onCancel }: {
  profile: UserProfile; onSave: (draft: ProfileAppearance, images: ProfileImages) => Promise<void>; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const initial: ProfileAppearance = { fullname: profile.displayName || '', headline: profile.headline || '', bio: profile.bio || '', location: profile.contact?.location || '' };
  const [draft, setDraft] = useState(initial);
  const [images, setImages] = useState<ProfileImages>({});
  const [crop, setCrop] = useState<{ kind: 'avatar' | 'header'; file: File }>();
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const avatarPreview = useObjectUrl(images.avatar);
  const headerPreview = useObjectUrl(images.header);
  const cropUrl = useObjectUrl(crop?.file);
  const avatar = images.avatar === null ? undefined : avatarPreview || profile.avatarUrl;
  const header = images.header === null ? undefined : headerPreview || profile.headerUrl;
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft) || Object.keys(images).length > 0;
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  function choose(kind: 'avatar' | 'header', file?: File) {
    if (!file) return;
    if (!validProfileImage(file)) { setError(t('profileInline.imageError')); return; }
    setError(''); setCrop({ kind, file });
  }
  const imageControl = (kind: 'avatar' | 'header') => <div className="flex flex-wrap gap-2">
    <Button type="button" variant="secondary" size="sm" onClick={() => document.getElementById(`inline-upload-${kind}`)?.click()}>
      <Camera className="mr-2 h-4 w-4" />{t(`profileInline.${kind}`)}
    </Button>
    <input id={`inline-upload-${kind}`} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1}
      onChange={event => { choose(kind, event.target.files?.[0]); event.target.value = ''; }} />
    {(kind === 'avatar' ? avatar : header) && <Button type="button" variant="secondary" size="sm" onClick={() => setImages(current => ({ ...current, [kind]: null }))}>
      {t('common.remove')}
    </Button>}
  </div>;

  return <section className="mb-6 rounded-lg bg-card shadow-sm" aria-label={t('profile.editProfile')}>
    <form onSubmit={async event => {
      event.preventDefault(); if (saving) return;
      const result = profileAppearanceSchema.safeParse(draft);
      if (!result.success) { setError(t('profileInline.invalid')); return; }
      setSaving(true); setError('');
      try { await onSave(result.data, images); } catch { setError(t('profileInline.saveError')); } finally { setSaving(false); }
    }}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-t-lg border-b bg-card p-4">
        <div><h2 className="font-semibold">{t('profile.editProfile')}</h2><p className="text-sm text-muted-foreground">{t('profileInline.hint')}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={saving} aria-pressed={preview} onClick={() => setPreview(!preview)}>{t(preview ? 'profileInline.edit' : 'profileInline.preview')}</Button>
          <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving || !dirty}>{t(saving ? 'profileEdit.saving' : 'common.save')}</Button>
        </div>
      </div>
      {error && <p role="alert" className="px-4 py-3 text-destructive">{error}</p>}
      <fieldset disabled={saving}>
        <div className="relative overflow-hidden">
          <ProfileBanner headerUrl={header} />
          {!preview && <div className="absolute bottom-4 right-4">{imageControl('header')}</div>}
        </div>
        <div className="relative px-4 pb-6 md:px-6">
          <div className="-mt-16 flex flex-wrap items-end gap-4 md:-mt-20">
            <AvatarWithStatus src={avatar} alt={draft.fullname} size="2xl" ringClassName="ring-background" />
            {!preview && imageControl('avatar')}
          </div>
          <div className="mt-4 space-y-3">
            <EditableText label={t('profileEdit.displayName')} value={draft.fullname} maxLength={100} preview={preview} className="text-2xl font-bold" onChange={fullname => setDraft(current => ({ ...current, fullname }))} />
            <EditableText label={t('profileEdit.headline')} value={draft.headline} maxLength={200} preview={preview} className="text-lg text-muted-foreground" onChange={headline => setDraft(current => ({ ...current, headline }))} />
            <EditableText label={t('profileEdit.location')} value={draft.location} maxLength={120} preview={preview} className="text-sm text-muted-foreground" onChange={location => setDraft(current => ({ ...current, location }))} />
            <p className="text-sm text-muted-foreground">@{profile.username}@nolto.social</p>
            <EditableText label={t('profileEdit.bio')} value={draft.bio} maxLength={5000} multiline preview={preview} className="text-muted-foreground leading-relaxed" onChange={bio => setDraft(current => ({ ...current, bio }))} />
          </div>
          {!dirty && <Button asChild variant="link" className="mt-4 px-0"><Link to="/profile/edit">{t('profileInline.accountSettings')}</Link></Button>}
        </div>
      </fieldset>
    </form>
    {crop && cropUrl && <ImageCropDialog key={cropUrl} open imageSrc={cropUrl} aspectRatio={crop.kind === 'avatar' ? 1 : 3}
      onClose={() => setCrop(undefined)} onCropComplete={blob => {
        setImages(current => ({ ...current, [crop.kind]: new File([blob], `${crop.kind}.jpg`, { type: blob.type }) }));
      }} />}
  </section>;
}
