import { userFacingErrorMessage } from '@/lib/userFacingError';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/imageCompression';
import type { ImageDraftState } from '@/lib/imageDraft';

export function ImageUploadStatus({ draft, retry }: { draft: ImageDraftState; retry: () => void }) {
  const { t } = useTranslation();
  if (draft.phase === 'empty') return null;
  return <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
    {(draft.phase === 'compressing' || draft.phase === 'uploading') && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
    {draft.phase === 'compressing' && t('posts.optimizingImage', 'Bilden komprimeras…')}
    {draft.phase === 'uploading' && t('posts.uploadingImage', 'Bilden laddas upp. Du kan fortsätta skriva.')}
    {draft.phase === 'ready' && <span>{t('posts.imageReady', 'Bilden är redo')} · {formatFileSize(draft.compressedSize || 0)}</span>}
    {draft.phase === 'error' && <><span className="text-destructive">{userFacingErrorMessage(draft.error, 'runtimeErrors.imageUpload')}</span><Button type="button" variant="outline" size="sm" onClick={retry}>{t('common.retry', 'Försök igen')}</Button></>}
  </div>;
}
