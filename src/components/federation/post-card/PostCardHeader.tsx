import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe, MoreHorizontal, Edit, Trash2, Flag, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ShareButton } from "@/components/common/ShareButton";
import { ProfileHoverCard } from "@/components/common/ProfileHoverCard";
import AvatarWithStatus from "@/components/common/AvatarWithStatus";
import { RepostIndicator } from "@/components/posts/QuotedPostPreview";
import { stripHtml } from "@/lib/linkify";
import { getActorName, getActorUsername, getAvatarUrl, getProfileLink, getInstanceSuffix } from "./postCardUtils";
import type { FederatedPost } from "@/services/federation/federationService";

interface PostCardHeaderProps {
  post: FederatedPost;
  isQuoteRepost: boolean;
  isOwnPost: boolean;
  publishedDate: string;
  displayContent: string;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onReportRequest: () => void;
  onBlockRequest: () => void;
  hasUser: boolean;
}

export default function PostCardHeader({
  post,
  isQuoteRepost,
  isOwnPost,
  publishedDate,
  displayContent,
  onEdit,
  onDeleteRequest,
  onReportRequest,
  onBlockRequest,
  hasUser,
}: PostCardHeaderProps) {
  const { t } = useTranslation();
  const isCompanyPost = !!post.company;
  const actorName = getActorName(post);
  const username = getActorUsername(post);
  const avatarUrl = getAvatarUrl(post);
  const profileLink = getProfileLink(post);
  const instanceSuffix = getInstanceSuffix(post);

  return (
    <CardHeader className="pb-2">
      {isQuoteRepost && <RepostIndicator reposterName={actorName} />}
      <div className="flex items-center gap-3">
        <ProfileHoverCard
          username={post.source === 'local' && !isCompanyPost ? post.profile?.username : undefined}
          userId={post.source === 'local' && !isCompanyPost ? post.user_id : undefined}
          disabled={post.source !== 'local' || isCompanyPost}
        >
          <Link
            to={profileLink}
            className={post.source === 'local' || isCompanyPost ? 'cursor-pointer' : 'cursor-default'}
            onClick={(e) => post.source !== 'local' && !isCompanyPost && e.preventDefault()}
          >
            <AvatarWithStatus
              src={avatarUrl || undefined}
              alt={actorName}
              fallback={actorName.charAt(0).toUpperCase()}
              size="md"
              status={post.source === 'remote' ? 'remote' : 'none'}
              isFreelancer={!isCompanyPost && post.source === 'local' && post.profile?.is_freelancer}
            />
          </Link>
        </ProfileHoverCard>

        <div className="flex-1 min-w-0">
          <ProfileHoverCard
            username={post.source === 'local' && !isCompanyPost ? post.profile?.username : undefined}
            userId={post.source === 'local' && !isCompanyPost ? post.user_id : undefined}
            disabled={post.source !== 'local' || isCompanyPost}
          >
            <Link
              to={profileLink}
              className={post.source === 'local' || isCompanyPost ? 'hover:underline cursor-pointer' : 'cursor-default'}
              onClick={(e) => post.source !== 'local' && !isCompanyPost && e.preventDefault()}
            >
              <div className="font-semibold truncate">{actorName}</div>
            </Link>
          </ProfileHoverCard>

          {username && (
            <div className="text-xs text-muted-foreground truncate">
              {isCompanyPost
                ? <Link to={`/company/${post.company!.slug}`} className="hover:underline">{t('postCard.companyPage')}</Link>
                : <>@{username}{instanceSuffix}</>
              }
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {publishedDate && <span>{publishedDate}</span>}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t('postCard.postOptions')}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwnPost && (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('postCard.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeleteRequest} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('postCard.deletePost')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {!isOwnPost && hasUser && (
              <>
                <DropdownMenuItem onClick={onReportRequest}>
                  <Flag className="mr-2 h-4 w-4" />
                  {t('postCard.reportPost')}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={onBlockRequest}>
                  <UserX className="mr-2 h-4 w-4" />
                  {t('postCard.blockUser')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <ShareButton
                url={`${window.location.origin}/post/${post.id}`}
                title={stripHtml(displayContent).substring(0, 100)}
                variant="ghost"
                size="sm"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardHeader>
  );
}
