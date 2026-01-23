import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Ban, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { banUser, searchUsers } from "@/services/moderationService";

interface UserBanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string | null;
  onSuccess?: () => void;
}

export function UserBanDialog({ open, onOpenChange, userId, onSuccess }: UserBanDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    id: string;
    username: string;
    fullname: string | null;
    avatar_url: string | null;
    is_banned: boolean;
  }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    fullname: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("7");
  const [isSearching, setIsSearching] = useState(false);

  // If userId is provided, pre-select that user
  useEffect(() => {
    if (userId && open) {
      // Fetch user details
      searchUsers(userId.substring(0, 8)).then((results) => {
        const user = results.find((u) => u.id === userId);
        if (user) {
          setSelectedUser(user);
        }
      });
    }
  }, [userId, open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUser(null);
      setReason("");
      setDuration("7");
    }
  }, [open]);

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

  const banMutation = useMutation({
    mutationFn: () => {
      if (!selectedUser) throw new Error("No user selected");
      const days = duration === "permanent" ? undefined : parseInt(duration);
      return banUser(selectedUser.id, reason, days);
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSelectUser = (user: typeof searchResults[0]) => {
    setSelectedUser(user);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Ban User
          </DialogTitle>
          <DialogDescription>
            Ban a user from accessing the platform. They will be unable to log in during the ban period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User selection */}
          {!selectedUser ? (
            <div className="space-y-2">
              <Label>Search for user</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      onClick={() => handleSelectUser(user)}
                      disabled={user.is_banned}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          @{user.username}
                        </p>
                        {user.fullname && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.fullname}
                          </p>
                        )}
                      </div>
                      {user.is_banned && (
                        <span className="text-xs text-destructive">Already banned</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {isSearching && (
                <p className="text-sm text-muted-foreground">Searching...</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Selected User</Label>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">@{selectedUser.username}</p>
                  {selectedUser.fullname && (
                    <p className="text-sm text-muted-foreground">{selectedUser.fullname}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  Change
                </Button>
              </div>
            </div>
          )}

          {/* Ban duration */}
          <div className="space-y-2">
            <Label>Ban Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="90">3 months</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for ban</Label>
            <Textarea
              placeholder="Describe why this user is being banned..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged and may be shown to the user.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => banMutation.mutate()}
            disabled={!selectedUser || !reason.trim() || banMutation.isPending}
          >
            {banMutation.isPending ? "Banning..." : "Ban User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
