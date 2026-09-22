import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCustomFeed, type CustomFeed } from "@/services/misc/feedPreferencesService";
import CreateCustomFeedDialog from "./CreateCustomFeedDialog";

interface ManageCustomFeedsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeds: CustomFeed[];
  onChanged?: () => void;
}

export default function ManageCustomFeedsDialog({
  open,
  onOpenChange,
  feeds,
  onChanged,
}: ManageCustomFeedsDialogProps) {
  const { t } = useTranslation();
  const [editFeed, setEditFeed] = useState<CustomFeed | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteCustomFeed(deleteId);
      setDeleteId(null);
      onChanged?.();
    } catch { toast.error(t('personalFeeds.saveError')); }
    finally { setDeleting(false); }
  };

  const handleEditSaved = () => {
    setEditOpen(false);
    setEditFeed(null);
    onChanged?.();
  };

  const getRuleSummary = (feed: CustomFeed) => {
    const parts: string[] = [];
    if (feed.rules.include_tags?.length)
      parts.push(`${feed.rules.include_tags.length} taggar`);
    if (feed.rules.include_companies?.length)
      parts.push(`${feed.rules.include_companies.length} org.`);
    const people = (feed.rules.include_users?.length ?? 0) + (feed.rules.include_actors?.length ?? 0);
    if (people) parts.push(t("personalFeeds.peopleCount", { count: people }));
    if (feed.rules.include_keywords?.length)
      parts.push(`${feed.rules.include_keywords.length} nyckelord`);
    return parts.length > 0 ? parts.join(", ") : t("feed.noRules", "Inga regler");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("feed.manageFeeds", "Hantera flöden")}
            </DialogTitle>
            <DialogDescription>
              {t("feed.manageFeedsDesc", "Redigera eller ta bort dina anpassade flöden.")}
            </DialogDescription>
          </DialogHeader>

          {feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("feed.noCustomFeeds", "Du har inga anpassade flöden ännu.")}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{feed.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getRuleSummary(feed)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t("personalFeeds.edit", { name: feed.name })}
                      onClick={() => {
                        setEditFeed(feed);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={t("personalFeeds.remove", { name: feed.name })}
                      onClick={() => setDeleteId(feed.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateCustomFeedDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editFeed={editFeed}
        onSaved={handleEditSaved}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("feed.deleteFeedTitle", "Ta bort flöde?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "feed.deleteFeedDesc",
                "Det här flödet tas bort permanent. Denna åtgärd kan inte ångras."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Avbryt")}</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={event => { event.preventDefault(); void handleDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete", "Ta bort")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
