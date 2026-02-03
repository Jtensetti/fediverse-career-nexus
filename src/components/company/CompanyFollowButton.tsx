import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { followCompany, unfollowCompany, isFollowingCompany } from "@/services/companyFollowService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CompanyFollowButtonProps {
  companyId: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export default function CompanyFollowButton({ 
  companyId, 
  size = "default",
  className = "" 
}: CompanyFollowButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading: checkingFollow } = useQuery({
    queryKey: ['companyFollow', companyId],
    queryFn: () => isFollowingCompany(companyId),
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: () => followCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyFollow', companyId] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success("Now following this company");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to follow company");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companyFollow', companyId] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success("Unfollowed company");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unfollow company");
    },
  });

  const handleClick = () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isLoading = followMutation.isPending || unfollowMutation.isPending || checkingFollow;

  if (!user) {
    return (
      <Button size={size} onClick={handleClick} className={className}>
        <UserPlus className="h-4 w-4 mr-2" />
        Follow
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-4 w-4 mr-2" />
      ) : (
        <UserPlus className="h-4 w-4 mr-2" />
      )}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
