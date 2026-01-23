import { useState, useEffect } from "react";
import { Search, User, Ban, AlertTriangle, MessageSquare, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { searchUsers } from "@/services/moderationService";
import { UserBanDialog } from "./UserBanDialog";
import { supabase } from "@/integrations/supabase/client";

interface UserDetails {
  id: string;
  username: string;
  fullname: string | null;
  avatar_url: string | null;
  headline: string | null;
  created_at: string;
  is_banned: boolean;
  report_count: number;
  moderation_action_count: number;
}

export function UserLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    id: string;
    username: string;
    fullname: string | null;
    avatar_url: string | null;
    is_banned: boolean;
  }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch selected user details
  const { data: userDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["user-details", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", selectedUserId)
        .single();

      // Get ban status
      const { data: banStatus } = await supabase.rpc("is_user_banned", {
        check_user_id: selectedUserId,
      });

      // Get report count
      const { count: reportCount } = await supabase
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("content_type", "user")
        .eq("content_id", selectedUserId);

      // Get moderation actions against this user
      const { count: actionCount } = await supabase
        .from("moderation_actions")
        .select("id", { count: "exact", head: true })
        .eq("target_user_id", selectedUserId);

      return {
        ...profile,
        is_banned: banStatus || false,
        report_count: reportCount || 0,
        moderation_action_count: actionCount || 0,
      } as UserDetails;
    },
    enabled: !!selectedUserId,
  });

  const handleSelectUser = (user: typeof searchResults[0]) => {
    setSelectedUserId(user.id);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5" />
        <h3 className="text-lg font-semibold">User Lookup</h3>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a user by username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {isSearching && (
            <p className="text-sm text-muted-foreground mt-4">Searching...</p>
          )}

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y mt-4 max-h-64 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                  onClick={() => handleSelectUser(user)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-2">
                      @{user.username}
                      {user.is_banned && (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      )}
                    </p>
                    {user.fullname && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.fullname}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            ) : userDetails ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={userDetails.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">@{userDetails.username}</h4>
                      {userDetails.is_banned && (
                        <Badge variant="destructive">Banned</Badge>
                      )}
                    </div>
                    {userDetails.fullname && (
                      <p className="text-muted-foreground">{userDetails.fullname}</p>
                    )}
                    {userDetails.headline && (
                      <p className="text-sm text-muted-foreground mt-1">{userDetails.headline}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      Reports
                    </div>
                    <p className="text-2xl font-semibold">{userDetails.report_count}</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Ban className="h-4 w-4" />
                      Actions
                    </div>
                    <p className="text-2xl font-semibold">{userDetails.moderation_action_count}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/profile/${userDetails.username}`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Profile
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/messages?user=${userDetails.id}`}>
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Link>
                  </Button>
                  {!userDetails.is_banned && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBanDialogOpen(true)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Ban User
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">User not found</p>
            )}
          </CardContent>
        </Card>
      )}

      <UserBanDialog
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        userId={selectedUserId}
        onSuccess={() => {
          setSelectedUserId(null);
        }}
      />
    </div>
  );
}
