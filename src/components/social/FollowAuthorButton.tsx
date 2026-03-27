import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { followAuthor, unfollowAuthor, isFollowingAuthor } from "@/services/social/authorFollowService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FollowAuthorButtonProps {
  authorId: string;
  authorName?: string;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const FollowAuthorButton = ({ authorId, authorName, onFollowChange, variant = "default", size = "default", className = "" }: FollowAuthorButtonProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user || user.id === authorId) { setLoading(false); return; }
      const following = await isFollowingAuthor(authorId);
      setIsFollowing(following);
      setLoading(false);
    };
    checkFollowStatus();
  }, [authorId, user]);

  if (!user || user.id === authorId) return null;

  const handleClick = async () => {
    setActionLoading(true);
    try {
      if (isFollowing) {
        const success = await unfollowAuthor(authorId);
        if (success) { setIsFollowing(false); onFollowChange?.(false); toast.success(t('followAuthor.unfollowed', { name: authorName || '' })); }
        else toast.error(t('followAuthor.unfollowFailed'));
      } else {
        const success = await followAuthor(authorId);
        if (success) { setIsFollowing(true); onFollowChange?.(true); toast.success(t('followAuthor.followedSuccess', { name: authorName || '' })); }
        else toast.error(t('followAuthor.followFailed'));
      }
    } finally { setActionLoading(false); }
  };

  if (loading) return <Button variant={variant} size={size} disabled className={className}><Loader2 className="h-4 w-4 animate-spin" /></Button>;

  return (
    <Button variant={isFollowing ? "outline" : variant} size={size} onClick={handleClick} disabled={actionLoading} className={className}>
      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : isFollowing ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
      {isFollowing ? t("followAuthor.following") : t("followAuthor.follow")}
    </Button>
  );
};

export default FollowAuthorButton;
