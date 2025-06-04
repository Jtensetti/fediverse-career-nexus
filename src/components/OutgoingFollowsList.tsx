
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, UserCheck, UserX, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOutgoingFollows, subscribeToOutgoingFollows, type OutgoingFollow } from "@/services/outgoingFollowsService";
import { formatDistanceToNow } from "date-fns";

interface OutgoingFollowsListProps {
  actorId: string;
}

export default function OutgoingFollowsList({ actorId }: OutgoingFollowsListProps) {
  const [follows, setFollows] = useState<OutgoingFollow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchFollows = async () => {
      try {
        setLoading(true);
        const data = await getOutgoingFollows(actorId);
        setFollows(data);
      } catch (error) {
        console.error("Error fetching outgoing follows:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollows();

    // Subscribe to real-time updates
    const subscription = subscribeToOutgoingFollows(actorId, setFollows);

    return () => {
      subscription.unsubscribe();
    };
  }, [actorId]);

  const getStatusBadge = (status: OutgoingFollow['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock size={12} />
            Pending
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
            <UserCheck size={12} />
            Accepted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <UserX size={12} />
            Rejected
          </Badge>
        );
    }
  };

  const extractDomainFromUri = (uri: string) => {
    try {
      const url = new URL(uri);
      return url.hostname;
    } catch {
      return uri;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outgoing Follow Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (follows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outgoing Follow Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No follow requests sent yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outgoing Follow Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {follows.map((follow) => (
          <div key={follow.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {extractDomainFromUri(follow.remote_actor_uri)}
                </code>
                {getStatusBadge(follow.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Sent {formatDistanceToNow(new Date(follow.created_at), { addSuffix: true })}
                {follow.status !== 'pending' && follow.updated_at !== follow.created_at && (
                  <span>
                    {' • '}
                    {follow.status} {formatDistanceToNow(new Date(follow.updated_at), { addSuffix: true })}
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(follow.remote_actor_uri, '_blank')}
            >
              <ExternalLink size={14} />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
