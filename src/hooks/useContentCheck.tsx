import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Assessment = { level: 'allow' | 'warn' | 'review'; reason: string | null };

/** The database repeats this check on every write, including direct API calls. */
export function useContentCheck() {
  const { t } = useTranslation();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  const decision = useRef<((proceed: boolean) => void) | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; decision.current?.(false); decision.current = null; };
  }, []);

  const finish = (proceed: boolean) => {
    decision.current?.(proceed);
    decision.current = null;
    setAssessment(null);
  };

  const check = async (text: string): Promise<boolean> => {
    if (busy.current) return false;
    busy.current = true;
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc('assess_public_text', { p_text: text });
      if (error) throw error;
      if (!alive.current) return false;
      const result = data as Assessment | null;
      if (!result || !['allow', 'warn', 'review'].includes(result.level)) throw new Error('Invalid assessment');
      if (result.level === 'allow') return true;
      setAssessment(result);
      return await new Promise<boolean>(resolve => { decision.current = resolve; });
    } catch {
      if (alive.current) toast.error(t('contentCare.checkFailed'));
      return false;
    } finally {
      busy.current = false;
      if (alive.current) setChecking(false);
    }
  };

  const held = assessment?.level === 'review';
  const dialog = <Dialog open={assessment !== null} onOpenChange={open => { if (!open) finish(false); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t(held ? 'contentCare.reviewTitle' : 'contentCare.pauseTitle')}</DialogTitle>
        <DialogDescription>{t(held ? 'contentCare.reviewPrompt' : 'contentCare.pausePrompt')}</DialogDescription>
      </DialogHeader>
      <p className="text-sm">{t('contentCare.suggestion')}</p>
      <p className="text-sm text-muted-foreground">{t('contentCare.limits')}</p>
      <Link className="text-sm text-primary underline" to="/conversation-guide" target="_blank" rel="noopener noreferrer">{t('contentCare.guideLink')}</Link>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => finish(false)}>{t('contentCare.edit')}</Button>
        <Button onClick={() => finish(true)}>{t(held ? 'contentCare.submitReview' : 'contentCare.sendAnyway')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
  return { check, checking, dialog };
}
