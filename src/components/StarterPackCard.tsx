import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Star, UserPlus, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarterPack, followStarterPack } from "@/services/starterPackService";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface StarterPackCardProps {
  pack: StarterPack;
  memberPreviews?: Array<{
    id: string;
    avatar_url: string | null;
    fullname: string | null;
  }>;
  isFollowed?: boolean;
  onFollowChange?: (followed: boolean) => void;
  compact?: boolean;
}

const categoryColors: Record<string, string> = {
  community: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  industry: "bg-green-500/10 text-green-600 dark:text-green-400",
  topic: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  region: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
};

export default function StarterPackCard({
  pack,
  memberPreviews = [],
  isFollowed: initialFollowed = false,
  onFollowChange,
  compact = false
}: StarterPackCardProps) {
  const { user } = useAuth();
  const [isFollowed, setIsFollowed] = useState(initialFollowed);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || isLoading) return;

    setIsLoading(true);
    const success = await followStarterPack(pack.id);
    if (success) {
      setIsFollowed(true);
      onFollowChange?.(true);
    }
    setIsLoading(false);
  };

  return (
    <Link to={`/packs/${pack.slug}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2 }}
      >
        <Card className={cn(
          "cursor-pointer transition-all hover:shadow-md border-border/50 hover:border-primary/30",
          compact && "shadow-none"
        )}>
          <CardContent className={cn("p-4", compact && "p-3")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {pack.is_featured && (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                  )}
                  <h3 className={cn(
                    "font-semibold truncate text-foreground",
                    compact ? "text-sm" : "text-base"
                  )}>
                    {pack.name}
                  </h3>
                </div>
                
                {!compact && pack.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {pack.description}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  {/* Member avatars */}
                  {memberPreviews.length > 0 && (
                    <div className="flex -space-x-2">
                      {memberPreviews.slice(0, 3).map((member, i) => (
                        <Avatar key={member.id} className={cn(
                          "border-2 border-background",
                          compact ? "h-6 w-6" : "h-7 w-7"
                        )}>
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {member.fullname?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {pack.member_count > 3 && (
                        <div className={cn(
                          "flex items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground",
                          compact ? "h-6 w-6" : "h-7 w-7"
                        )}>
                          +{pack.member_count - 3}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{pack.member_count} {pack.member_count === 1 ? 'member' : 'members'}</span>
                  </div>

                  <Badge variant="secondary" className={cn(
                    "text-[10px] px-1.5 py-0",
                    categoryColors[pack.category] || "bg-muted"
                  )}>
                    {pack.category}
                  </Badge>
                </div>
              </div>

              {user && !compact && (
                <Button
                  variant={isFollowed ? "outline" : "default"}
                  size="sm"
                  onClick={handleFollow}
                  disabled={isLoading || isFollowed}
                  className="flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isFollowed ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Followed
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
