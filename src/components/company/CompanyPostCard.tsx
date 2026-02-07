import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, MoreHorizontal, Trash2, Globe, Share2 } from "lucide-react";
import { ShareButton } from "@/components/common/ShareButton";
import { deleteCompanyPost } from "@/services/companyPostService";
import { linkifyWithMarkdown, stripHtml } from "@/lib/linkify";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import type { FederatedPost } from "@/services/federationService";

interface CompanyPostCardProps {
  post: FederatedPost;
  canDelete?: boolean;
  onDelete?: (postId: string) => void;
}

export default function CompanyPostCard({ post, canDelete = false, onDelete }: CompanyPostCardProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const company = (post as any).company;
  const raw = post.content as any;
  const note = raw?.type === 'Create' ? raw.object : raw;
  
  const content = DOMPurify.sanitize(note?.content || '', {
    ALLOWED_TAGS: ['p', 'br', 'a', 'strong', 'em', 'b', 'i'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  const linkedContent = linkifyWithMarkdown(content);
  
  const attachments = (note?.attachment || []).filter((att: any) => 
    att.type === 'Image' && att.url
  );

  const publishedDate = post.published_at || post.created_at;
  const formattedDate = publishedDate 
    ? formatDistanceToNow(new Date(publishedDate), { addSuffix: true })
    : '';

  const handleDelete = async () => {
    if (!company?.id) return;
    
    setIsDeleting(true);
    const success = await deleteCompanyPost(post.id, company.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
    
    if (success && onDelete) {
      onDelete(post.id);
    }
  };

  const shareUrl = `${window.location.origin}/post/${post.id}`;
  const shareTitle = stripHtml(content).substring(0, 100);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Link to={`/company/${company?.slug}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={company?.logo_url} alt={company?.name} />
                <AvatarFallback className="bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <Link 
                to={`/company/${company?.slug}`}
                className="font-semibold hover:underline truncate block"
              >
                {company?.name || t("companyPost.company", "Company")}
              </Link>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
            </div>

            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete", "Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Content Warning */}
          {post.content_warning && (
            <div className="mb-3 p-2 rounded-md bg-accent border border-border text-sm">
              <strong>CW:</strong> {post.content_warning}
            </div>
          )}

          {/* Post content */}
          <div 
            className="prose prose-sm dark:prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: linkedContent }}
          />

          {/* Image attachments */}
          {attachments.length > 0 && (
            <div className={cn(
              "mt-3 grid gap-2",
              attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {attachments.map((att: any, idx: number) => (
                <img
                  key={idx}
                  src={att.url}
                  alt={att.name || 'Post image'}
                  className="rounded-lg w-full object-cover max-h-80"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 pb-3 flex justify-end">
          <ShareButton
            url={shareUrl}
            title={shareTitle}
            variant="ghost"
            size="sm"
          />
        </CardFooter>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("companyPost.deleteTitle", "Delete post?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("companyPost.deleteDesc", "This action cannot be undone. The post will be permanently deleted.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("companyPost.deleting", "Deleting...") : t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
