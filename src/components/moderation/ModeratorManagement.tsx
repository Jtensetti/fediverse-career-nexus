import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, UserPlus, Search, Trash2, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getModerators, addModerator, removeModerator, searchUsers, Moderator } from "@/services/moderationService";

interface ModeratorManagementProps {
  isAdmin: boolean;
}

export function ModeratorManagement({ isAdmin }: ModeratorManagementProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    id: string;
    username: string;
    fullname: string | null;
    avatar_url: string | null;
    is_banned: boolean;
  }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: moderators, isLoading } = useQuery({
    queryKey: ["moderators"],
    queryFn: getModerators,
  });

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchUsers(searchQuery);
      // Filter out existing moderators
      const moderatorIds = new Set(moderators?.map((m) => m.user_id) || []);
      const filteredResults = results.filter((r) => !moderatorIds.has(r.id));
      setSearchResults(filteredResults);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, moderators]);

  const addMutation = useMutation({
    mutationFn: addModerator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderators"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
      setAddDialogOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeModerator,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderators"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
    },
  });

  const getRoleIcon = (role: string) => {
    if (role === "admin") return <Crown className="h-4 w-4 text-yellow-500" />;
    return <Shield className="h-4 w-4 text-blue-500" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">Admin</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Moderator</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Moderation Team</h3>
        </div>
        {isAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Moderator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Moderator</DialogTitle>
                <DialogDescription>
                  Search for a user to grant them moderator privileges.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {isSearching && (
                  <p className="text-sm text-muted-foreground">Searching...</p>
                )}

                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">@{user.username}</p>
                            {user.fullname && (
                              <p className="text-xs text-muted-foreground">{user.fullname}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addMutation.mutate(user.id)}
                          disabled={addMutation.isPending}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No users found or all matching users are already moderators
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!moderators || moderators.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No moderators found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {moderators.map((mod) => (
            <Card key={mod.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={mod.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        {getRoleIcon(mod.role)}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">@{mod.user?.username || "Unknown"}</p>
                      {mod.user?.fullname && (
                        <p className="text-sm text-muted-foreground">{mod.user.fullname}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getRoleBadge(mod.role)}
                    
                    {isAdmin && mod.role === "moderator" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove moderator?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revoke moderator privileges from @{mod.user?.username}. They will no longer be able to access moderation tools.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMutation.mutate(mod.user_id)}
                              disabled={removeMutation.isPending}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
