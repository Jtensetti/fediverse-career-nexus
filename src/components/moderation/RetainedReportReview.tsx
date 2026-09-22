import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type RetainedText = { title: string; content: string; purge_after: string };
const textOnly = (value: string) => DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

export function RetainedReportReview({ reportId }: { reportId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<RetainedText | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setValue(null); setError(false);
    if (open && user) {
      void supabase.functions.invoke('review-deleted-content', { body: { report_id: reportId } })
        .then(({ data, error }) => {
          if (!active) return;
          if (error || !data || typeof data.content !== 'string' || !data.purge_after) setError(true);
          else setValue(data);
        }).catch(() => { if (active) setError(true); });
    }
    return () => { active = false; };
  }, [open, reportId, user?.id]);
  useEffect(() => {
    if (!value) return;
    const remaining = Date.parse(value.purge_after) - Date.now();
    const timer = setTimeout(() => { setValue(null); setError(true); }, Math.max(0, Math.min(remaining, 2147483647)));
    return () => clearTimeout(timer);
  }, [value]);
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Granska raderad text</Button>
    <Dialog open={open && !!user} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Anmält innehåll som har raderats</DialogTitle>
          <DialogDescription>Åtkomsten loggas. Text kan granskas om anmälan gjordes före raderingen och ärendet fortfarande är öppet. Bilder och privata meddelanden visas inte här.</DialogDescription>
        </DialogHeader>
        {error ? <p role="alert">Texten är inte tillgänglig. Ärendet kan vara avslutat, lagringstiden slut eller åtkomsten nekad.</p>
          : value ? <div className="max-h-[60vh] overflow-y-auto space-y-4">
            <p className="text-sm text-muted-foreground">Raderas permanent {new Date(value.purge_after).toLocaleString('sv-SE')}. Granskningen förlänger inte lagringstiden.</p>
            {value.title && <h3 className="font-semibold">{textOnly(value.title)}</h3>}
            <p className="whitespace-pre-wrap break-words">{textOnly(value.content) || 'Inlägget innehåller ingen granskbar text.'}</p>
          </div> : <p role="status">Hämtar texten…</p>}
      </DialogContent>
    </Dialog>
  </>;
}
