import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, Briefcase, Check, ExternalLink } from "lucide-react";
import { getProfilePreview } from "@/services/profileService";

interface ProfileHoverCardProps {
  children: ReactNode;
  username?: string;
  userId?: string;
  disabled?: boolean;
}

export function ProfileHoverCard({ children, username, userId, disabled = false }: ProfileHoverCardProps) {
  const identifier = username || userId;
  const [isOpen, setIsOpen] = useState(false);
  
  // Only fetch when hover card is actually opened - prevents N+1 queries on page load
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-hover", identifier],
    queryFn: () => getProfilePreview(identifier!),
    enabled: !!identifier && !disabled && isOpen,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!identifier || disabled) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" align="start" sideOffset={8}>
        {isLoading ? (
          <ProfileHoverCardSkeleton />
        ) : profile ? (
          <ProfileHoverCardContent profile={profile} />
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Profile not found
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function ProfileHoverCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

interface ProfileHoverCardContentProps {
  profile: {
    id: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    headline?: string;
    bio?: string;
    contact?: {
      location?: string;
    };
    connections?: number;
    isVerified?: boolean;
    experience?: Array<{
      title: string;
      company: string;
    }>;
  };
}

function ProfileHoverCardContent({ profile }: ProfileHoverCardContentProps) {
  const currentRole = profile.experience?.[0];
  
  return (
    <div>
      {/* Header with gradient background */}
      <div className="h-16 bg-gradient-to-r from-primary/20 to-primary/5 rounded-t-md" />
      
      {/* Profile info */}
      <div className="px-4 pb-4 -mt-8">
        <div className="flex items-end gap-3 mb-3">
          <Avatar className="h-14 w-14 ring-4 ring-background">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {profile.displayName?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link 
              to={`/profile/${profile.username || profile.id}`}
              className="font-semibold hover:underline text-foreground"
            >
              {profile.displayName || 'Unknown User'}
            </Link>
            {profile.isVerified && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-1.5 py-0">
                <Check size={10} className="mr-0.5" /> Verified
              </Badge>
            )}
          </div>
          
          {profile.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
          
          {profile.headline && (
            <p className="text-sm text-muted-foreground line-clamp-2">{profile.headline}</p>
          )}
          
          {/* Current role */}
          {currentRole && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Briefcase size={14} className="flex-shrink-0" />
              <span className="truncate">{currentRole.title} at {currentRole.company}</span>
            </div>
          )}
          
          {/* Location */}
          {profile.contact?.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} className="flex-shrink-0" />
              <span>{profile.contact.location}</span>
            </div>
          )}
          
          {/* Connections */}
          {typeof profile.connections === 'number' && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users size={14} className="flex-shrink-0" />
              <span>{profile.connections} connections</span>
            </div>
          )}
        </div>
        
        {/* View profile button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4" 
          asChild
        >
          <Link to={`/profile/${profile.username || profile.id}`}>
            View Profile
            <ExternalLink size={14} className="ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default ProfileHoverCard;
