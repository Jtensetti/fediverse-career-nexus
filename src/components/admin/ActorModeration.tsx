import { useState, useEffect } from "react";
import {
  getActorModeration,
  updateActorModeration,
  deleteActorModeration
} from "@/services/federation/federationService";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCw, Check, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

  useEffect(() => { fetchActors(); }, []);

  const fetchActors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActorModeration();
      const actorEntries: ActorEntry[] = Array.isArray(data) ? data
        .filter(item => item && typeof item === 'object' && 'actor_url' in item && 'reason' in item && 'status' in item && 'created_at' in item && 'updated_at' in item)
        .map(item => ({ ...item, status: item.status as 'normal' | 'probation' | 'blocked' })) : [];
      setActors(actorEntries);
    } catch (err) {
      setError("Kunde inte ladda aktörmoderationsdata");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActor = async () => {
    setError(null);
    setSuccess(null);
    if (!actorUrl) { setError("Aktör-URL krävs"); return; }
    if (!reason) { setError("Anledning krävs"); return; }
    try {
      const result = await updateActorModeration(actorUrl, status, reason);
      if (result.success) {
        setSuccess(`${actorUrl} har blockerats`);
        setActorUrl("");
        setReason("");
        fetchActors();
        toast({ title: "Aktör blockerad", description: `${actorUrl} har lagts till` });
      } else {
        setError("Kunde inte blockera aktör");
      }
    } catch (err) {
      setError("Ett fel inträffade vid blockering av aktör");
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
        toast({ title: "Aktör uppdaterad", description: `${currentActor.actor_url} uppdaterad` });
      } else {
        toast({ title: "Uppdatering misslyckades", description: "Kunde inte uppdatera aktör", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Uppdatering misslyckades", description: "Ett fel inträffade", variant: "destructive" });
    }
  };

  const handleDeleteActor = async () => {
    if (!actorToDelete) return;
    try {
      const result = await deleteActorModeration(actorToDelete);
      if (result.success) {
        setIsDeleteDialogOpen(false);
        fetchActors();
        toast({ title: "Aktör borttagen", description: `${actorToDelete} borttagen` });
      } else {
        toast({ title: "Borttagning misslyckades", description: "Kunde inte ta bort aktör", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Borttagning misslyckades", description: "Ett fel inträffade", variant: "destructive" });
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
        return <Badge variant="destructive">Blockerad</Badge>;
      case 'probation':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Prövotid</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lägg till aktörblockering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="actor" className="block text-sm font-medium mb-1">Aktör-URL</label>
                <Input id="actor" placeholder="https://example.social/users/alice" value={actorUrl} onChange={(e) => setActorUrl(e.target.value)} />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="probation">Prövotid</SelectItem>
                    <SelectItem value="blocked">Blockerad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-1">Anledning</label>
              <Textarea id="reason" placeholder="Anledning" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
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
            Uppdatera
          </Button>
          <Button onClick={handleAddActor} disabled={loading || !actorUrl || !reason}>Lägg till aktör</Button>
        </CardFooter>
      </Card>
      <div>
        <h3 className="text-lg font-medium mb-4">Blockerade aktörer</h3>
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : actors.length > 0 ? (
          <Table>
            <TableCaption>Lista över blockerade aktörer</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Aktör</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anledning</TableHead>
                <TableHead className="w-[180px]">Åtgärder</TableHead>
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
                        Redigera
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
            <p className="text-muted-foreground">Inga aktörblockeringar hittades</p>
          </div>
        )}
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera aktörblockering</DialogTitle>
            <DialogDescription>Uppdatera modereringsinställningar för {currentActor?.actor_url}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-status">Status</label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as any)}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Välj status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="probation">Prövotid</SelectItem>
                  <SelectItem value="blocked">Blockerad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-reason">Anledning</label>
              <Textarea id="edit-reason" value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleEditActor}>Spara ändringar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekräfta borttagning</DialogTitle>
            <DialogDescription>Är du säker på att du vill ta bort {actorToDelete} från modereringen?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Avbryt</Button>
            <Button variant="destructive" onClick={handleDeleteActor}>Ta bort</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
