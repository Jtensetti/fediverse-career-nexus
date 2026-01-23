import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Flag, Check, X, Trash2, AlertTriangle, Ban, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFlaggedContent,
  updateReportStatus,
  deleteFlaggedContent,
  FlaggedContent,
} from "@/services/moderationService";
import { UserBanDialog } from "./UserBanDialog";

export function FlaggedContentList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed" | "resolved" | "dismissed" | "all">("pending");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["flagged-content", statusFilter],
    queryFn: () => getFlaggedContent(statusFilter),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: "pending" | "reviewed" | "resolved" | "dismissed" }) =>
      updateReportStatus(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flagged-content"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: ({ contentType, contentId, reportId }: { contentType: string; contentId: string; reportId: string }) =>
      deleteFlaggedContent(contentType, contentId).then(() => 
        updateReportStatus(reportId, "resolved", "delete")
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flagged-content"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
    },
  });

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case "post": return "bg-blue-500/10 text-blue-500";
      case "article": return "bg-green-500/10 text-green-500";
      case "user": return "bg-purple-500/10 text-purple-500";
      case "job": return "bg-orange-500/10 text-orange-500";
      case "event": return "bg-pink-500/10 text-pink-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-500";
      case "reviewed": return "bg-blue-500/10 text-blue-500";
      case "resolved": return "bg-green-500/10 text-green-500";
      case "dismissed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleBanUser = (report: FlaggedContent) => {
    if (report.content_type === "user") {
      setSelectedUserId(report.content_id);
    } else {
      // For non-user content, we need to find the author
      // This would require additional lookup
      setSelectedUserId(null);
    }
    setBanDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Flagged Content
        </h3>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="all">All Reports</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!reports || reports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {statusFilter !== "all" ? statusFilter : ""} reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={report.reporter?.avatar_url || undefined} />
                      <AvatarFallback>
                        {report.reporter?.username?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">
                        Reported by @{report.reporter?.username || "unknown"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getContentTypeColor(report.content_type)}>
                      {report.content_type}
                    </Badge>
                    <Badge className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{report.reason}</p>
                      {report.details && (
                        <p className="text-sm text-muted-foreground mt-1">{report.details}</p>
                      )}
                    </div>
                  </div>
                </div>

                {report.content_preview && (
                  <div className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Content Preview</p>
                    <p className="text-sm">{report.content_preview}</p>
                  </div>
                )}

                {report.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "dismissed" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "reviewed" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Reviewed
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete Content
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this {report.content_type}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the reported content. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteContentMutation.mutate({
                              contentType: report.content_type,
                              contentId: report.content_id,
                              reportId: report.id,
                            })}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleBanUser(report)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Ban User
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserBanDialog
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        userId={selectedUserId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["active-bans"] });
          queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
        }}
      />
    </div>
  );
}
