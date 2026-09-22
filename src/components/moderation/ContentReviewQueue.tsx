import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/integrations/supabase/types';
import { requestContentDeletion } from '@/services/privacy/deletionService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Review = Database['public']['Functions']['get_content_review_queue']['Returns'][number];

function ReviewItem({ review, own }: { review: Review; own: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const client = useQueryClient();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const history = useQuery({
    queryKey: ['content-review-history', user?.id, review.content_kind, review.content_id, review.revision, review.status],
    queryFn: async () => {
      const { data, error } = await supabase.from('content_review_decisions').select('id,action,explanation,revision,created_at')
        .eq('content_kind', review.content_kind).eq('content_id', review.content_id).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['content-reviews'] }),
      client.invalidateQueries({ queryKey: ['content-review-history'] }),
      client.invalidateQueries({ queryKey: ['federatedFeed'] }),
      client.invalidateQueries({ queryKey: ['user-articles'] }),
    ]);
  };
  const decide = async (action: 'approve' | 'reject' | 'appeal') => {
    if (busy || note.trim().length < 3) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('decide_content_review', {
        p_kind: review.content_kind, p_id: review.content_id, p_revision: review.revision,
        p_action: action, p_explanation: note.trim(),
      });
      if (error) throw error;
      setNote('');
      await refresh();
      toast.success(t('contentCare.decisionSaved'));
    } catch {
      toast.error(t('contentCare.decisionFailed'));
      await refresh();
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await requestContentDeletion(review.content_kind as 'post' | 'article' | 'comment', review.content_id);
      await refresh();
      toast.success(t('contentCare.deletionRequested'));
    } catch { toast.error(t('contentCare.deletionFailed')); }
    finally { setBusy(false); }
  };
  const appealed = history.data?.some(item => item.action === (review.status === 'rejected' ? 'appeal' : 'context') && item.revision === review.revision);
  return <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{t(`contentCare.${review.status}`)}</CardTitle>
      <p className="text-sm text-muted-foreground">{new Date(review.created_at).toLocaleString()} · {t(`contentCare.kind_${review.content_kind}`)}</p>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-4 text-sm">{DOMPurify.sanitize(review.body, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}</p>
      <p className="text-sm text-muted-foreground">{t('contentCare.reviewReason')}</p>
      {history.isError && <p role="alert" className="text-sm text-destructive">{t('contentCare.historyFailed')}</p>}
      {history.data?.map(item => <div key={item.id} className="border-l-2 pl-3 text-sm">
        <p className="font-medium">{t(`contentCare.action_${item.action}`)}</p>
        <p className="whitespace-pre-wrap break-words">{item.explanation}</p>
      </div>)}
      {(!own || !appealed) && <div className="space-y-2">
        <Label htmlFor={`review-${review.content_id}`}>{t(own ? 'contentCare.contextLabel' : 'contentCare.decisionLabel')}</Label>
        <Textarea id={`review-${review.content_id}`} value={note} onChange={event => setNote(event.target.value)} maxLength={1000} disabled={busy} />
        <div className="flex flex-wrap gap-2">
          {own ? <Button onClick={() => void decide('appeal')} disabled={busy || history.isLoading || history.isError || note.trim().length < 3}>{t('contentCare.addContext')}</Button>
            : <>
              <Button onClick={() => void decide('approve')} disabled={busy || history.isLoading || history.isError || review.can_edit || note.trim().length < 3}>{t('contentCare.approve')}</Button>
              <Button variant="outline" onClick={() => void decide('reject')} disabled={busy || history.isLoading || history.isError || review.can_edit || note.trim().length < 3}>{t('contentCare.reject')}</Button>
            </>}
        </div>
        {!own && review.can_edit && <p className="text-sm text-muted-foreground">{t('contentCare.noSelfReview')}</p>}
      </div>}
      {own && <div className="flex flex-wrap items-center gap-4 text-sm">
        {review.content_kind === 'post' && <Link className="underline" to={`/post/${review.content_id}`}>{t('contentCare.openPost')}</Link>}
        {review.content_kind === 'article' && <Link className="underline" to={`/articles/edit/${review.content_id}`}>{t('contentCare.edit')}</Link>}
        <Button variant="ghost" onClick={() => void remove()} disabled={busy}>{t('contentCare.delete')}</Button>
        <p className="text-muted-foreground">{t('contentCare.deleteHint')}</p>
      </div>}
    </CardContent>
  </Card>;
}

export default function ContentReviewQueue({ own = false }: { own?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ['content-reviews', user?.id, own, page], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_content_review_queue', { p_own: own, p_offset: page * 30 });
      if (error) throw error;
      return data;
    }, refetchInterval: 30000,
  });
  return <section className="space-y-5">
    <h2 className="text-xl font-semibold">{t(own ? 'contentCare.myReviews' : 'contentCare.queueTitle')}</h2>
    <p className="text-muted-foreground">{t(own ? 'contentCare.ownQueueIntro' : 'contentCare.queueIntro')}</p>
    <Link className="inline-block text-sm text-primary underline" to="/conversation-guide">{t('contentCare.guideLink')}</Link>
    {query.isLoading && <p role="status">{t('common.loading')}</p>}
    {query.isError && <div role="alert"><p>{t('contentCare.queueFailed')}</p><Button variant="outline" onClick={() => void query.refetch()}>{t('common.retry')}</Button></div>}
    {query.data?.length === 0 && <p>{t('contentCare.queueEmpty')}</p>}
    {query.data?.map(review => <ReviewItem key={`${review.content_kind}:${review.content_id}:${review.revision}`} review={review} own={own} />)}
    <div className="flex gap-3">
      {page > 0 && <Button variant="outline" onClick={() => setPage(page - 1)}>{t('contentCare.previous')}</Button>}
      {query.data?.length === 30 && <Button variant="outline" onClick={() => setPage(page + 1)}>{t('contentCare.next')}</Button>}
    </div>
  </section>;
}
