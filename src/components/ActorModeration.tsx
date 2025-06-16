import { useState, useEffect } from "react";
import {
  getActorModeration,
  updateActorModeration,
  deleteActorModeration
} from "@/services/federationService";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCw, Check, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ActorEntry {
  actor_url: string;
  reason: string;
  status: 'normal' | 'probation' | 'blocked';
  created_at: string;
  updated_at: string;
}

export default function ActorModeration() {
  const [actors, setActors] = useState<ActorEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [actorUrl, setActorUrl] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<'normal' | 'probation' | 'blocked'>('blocked');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentActor, setCurrentActor] = useState<ActorEntry | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editStatus, setEditStatus] = useState<'normal' | 'probation' | 'blocked'>('blocked');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actorToDelete, setActorToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchActors();
  }, []);

  const fetchActors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActorModeration();
      // Type cast the status field to match our interface
      const actorEntries: ActorEntry[] = Array.isArray(data) ? data
        .filter(item => 
          item && 
          typeof item === 'object' && 
          'actor_url' in item && 
          'reason' in item && 
          'status' in item &&
          'created_at' in item &&
          'updated_at' in item
        )
        .map(item => ({
          ...item,
          status: item.status as 'normal' | 'probation' | 'blocked'
        })) : [];
      setActors(actorEntries);
    } catch (err) {
      setError("Failed to load actor moderation data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActor = async () => {
    setError(null);
    setSuccess(null);
    if (!actorUrl) {
      setError("Actor URL is required");
      return;
    }
    if (!reason) {
      setError("Reason is required");
      return;
    }
    try {
      const result = await updateActorModeration(actorUrl, status, reason);
      if (result.success) {
        setSuccess(`${actorUrl} has been blocked`);
        setActorUrl("");
        setReason("");
        fetchActors();
        toast({ title: "Actor Blocked", description: `${actorUrl} has been added` });
      } else {
        setError("Failed to block actor");
      }
    } catch (err) {
      setError("An error occurred while blocking the actor");
      console.error(err);
    }
  };

  const handleEditActor = async () => {
    if (!currentActor) return;
    try {
      const result = await updateActorModeration(currentActor.actor_url, editStatus, editReason);
      if (result.success) {
        setIsEditDialogOpen(false);
        fetchActors();
        toast({ title: "Actor Updated", description: `${currentActor.actor_url} updated` });
      } else {
        toast({ title: "Update Failed", description: "Failed to update actor", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Update Failed", description: "An error occurred", variant: "destructive" });
    }
  };

  const handleDeleteActor = async () => {
    if (!actorToDelete) return;
    try {
      const result = await deleteActorModeration(actorToDelete);
      if (result.success) {
        setIsDeleteDialogOpen(false);
        fetchActors();
        toast({ title: "Actor Removed", description: `${actorToDelete} removed` });
      } else {
        toast({ title: "Deletion Failed", description: "Failed to remove actor", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Deletion Failed", description: "An error occurred", variant: "destructive" });
    } finally {
      setActorToDelete(null);
    }
  };

  const openEditDialog = (actor: ActorEntry) => {
    setCurrentActor(actor);
    setEditReason(actor.reason);
    setEditStatus(actor.status);
    setIsEditDialogOpen(true);
  };

  const confirmDelete = (url: string) => {
    setActorToDelete(url);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'blocked':
        return <Badge variant="destructive">Blocked</Badge>;
      case 'probation':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Probation</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Actor Block</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="actor" className="block text-sm font-medium mb-1">Actor URL</label>
                <Input id="actor" placeholder="https://example.social/users/alice" value={actorUrl} onChange={(e) => setActorUrl(e.target.value)} />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-1">Reason</label>
              <Textarea id="reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mt-4 bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900">
              <Check className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={fetchActors} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddActor} disabled={loading || !actorUrl || !reason}>Add Actor</Button>
        </CardFooter>
      </Card>
      <div>
        <h3 className="text-lg font-medium mb-4">Blocked Actors</h3>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : actors.length > 0 ? (
          <Table>
            <TableCaption>List of blocked actors</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actors.map((actor) => (
                <TableRow key={actor.actor_url}>
                  <TableCell className="font-medium">{actor.actor_url}</TableCell>
                  <TableCell>{getStatusBadge(actor.status)}</TableCell>
                  <TableCell className="truncate max-w-xs">{actor.reason}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(actor)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(actor.actor_url)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center p-8 border border-dashed rounded-md">
            <p className="text-muted-foreground">No actor blocks found</p>
          </div>
        )}
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Actor Block</DialogTitle>
            <DialogDescription>Update moderation settings for {currentActor?.actor_url}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-status">Status</label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as any)}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-reason">Reason</label>
              <Textarea id="edit-reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditActor}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {actorToDelete} from moderation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteActor}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
