import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryFeedbackProps {
  failed: boolean;
  hasData: boolean;
  busy: boolean;
  retry: () => unknown;
}

/** Distinguishes initial failure from a failed refresh; cached data stays visible. */
export default function QueryFeedback({ failed, hasData, busy, retry }: QueryFeedbackProps) {
  const { t } = useTranslation();
  if (failed) return <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive bg-card p-4">
    <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-destructive" />
    <p className="min-w-0 flex-1">{t(hasData ? "ux.refreshFailed" : "ux.loadFailed")}</p>
    <Button variant="outline" disabled={busy} aria-busy={busy} onClick={() => void retry()}>{t(busy ? "common.loading" : "common.retry")}</Button>
  </div>;
  if (busy) return <p role="status" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{t(hasData ? "ux.refreshing" : "common.loading")}</p>;
  return null;
}
