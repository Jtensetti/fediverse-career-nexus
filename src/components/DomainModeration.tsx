
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  getDomainModeration, 
  updateDomainModeration, 
  deleteDomainModeration 
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface DomainEntry {
  host: string;
  reason: string;
  status: 'normal' | 'probation' | 'blocked';
  created_at: string;
  updated_at: string;
}

export default function DomainModeration() {
  const { t } = useTranslation();
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // New domain form
  const [host, setHost] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<'normal' | 'probation' | 'blocked'>('probation');
  
  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<DomainEntry | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editStatus, setEditStatus] = useState<'normal' | 'probation' | 'blocked'>('probation');
  
  // Delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<string | null>(null);

  // Load domains on component mount
  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDomainModeration();
      // Type cast the status field to match our interface
      const domainEntries: DomainEntry[] = Array.isArray(data) ? data.map(item => ({
        ...item,
        status: item.status as 'normal' | 'probation' | 'blocked'
      })) : [];
      setDomains(domainEntries);
    } catch (err) {
      setError("Kunde inte ladda domänmoderationsdata");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = async () => {
    setError(null);
    setSuccess(null);
    
    if (!host) {
      setError("Domänvärd krävs");
      return;
    }
    
    if (!reason) {
      setError("Anledning krävs");
      return;
    }
    
    try {
      const result = await updateDomainModeration(host, status, reason);
      
      if (result.success) {
        setSuccess(`Domän ${host} har lagts till i ${status}-listan`);
        setHost("");
        setReason("");
        fetchDomains();
        
        toast({
          title: "Domän tillagd",
          description: `${host} har lagts till i ${status}-listan`,
        });
      } else {
        setError("Kunde inte lägga till domän");
      }
    } catch (err) {
      setError("Ett fel uppstod vid tillägg av domän");
      console.error(err);
    }
  };

  const handleEditDomain = async () => {
    if (!currentDomain) return;
    
    try {
      const result = await updateDomainModeration(
        currentDomain.host, 
        editStatus, 
        editReason
      );
      
      if (result.success) {
        setIsEditDialogOpen(false);
        fetchDomains();
        
        toast({
          title: "Domän uppdaterad",
          description: `${currentDomain.host} har uppdaterats till ${editStatus}`,
        });
      } else {
        toast({
          title: "Uppdatering misslyckades",
          description: "Kunde inte uppdatera domänstatus",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Uppdatering misslyckades",
        description: "Ett fel uppstod vid uppdatering",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;
    
    try {
      const result = await deleteDomainModeration(domainToDelete);
      
      if (result.success) {
        setIsDeleteDialogOpen(false);
        fetchDomains();
        
        toast({
          title: "Domän borttagen",
          description: `${domainToDelete} har tagits bort från moderering`,
        });
      } else {
        toast({
          title: "Borttagning misslyckades",
          description: "Kunde inte ta bort domän",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Borttagning misslyckades",
        description: "Ett fel uppstod vid borttagning",
        variant: "destructive",
      });
    } finally {
      setDomainToDelete(null);
    }
  };

  const openEditDialog = (domain: DomainEntry) => {
    setCurrentDomain(domain);
    setEditReason(domain.reason);
    setEditStatus(domain.status);
    setIsEditDialogOpen(true);
  };

  const confirmDelete = (host: string) => {
    setDomainToDelete(host);
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
          <CardTitle>Lägg till domänmoderering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="host" className="block text-sm font-medium mb-1">
                  Domänvärd
                </label>
                <Input
                  id="host"
                  placeholder="exempel.social"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  Status
                </label>
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
              <label htmlFor="reason" className="block text-sm font-medium mb-1">
                Reason
              </label>
              <Textarea
                id="reason"
                placeholder="Anledning till moderering"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
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
          <Button variant="outline" onClick={fetchDomains} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddDomain} disabled={loading || !host || !reason}>
            Add Domain
          </Button>
        </CardFooter>
      </Card>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Domänmoderationslista</h3>
        
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : domains.length > 0 ? (
          <Table>
            <TableCaption>Lista över domäner med modereringsstatus</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Domän</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Anledning</TableHead>
                <TableHead className="w-[180px]">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.host}>
                  <TableCell className="font-medium">{domain.host}</TableCell>
                  <TableCell>{getStatusBadge(domain.status)}</TableCell>
                  <TableCell className="truncate max-w-xs">{domain.reason}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(domain)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(domain.host)}>
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
            <p className="text-muted-foreground">Inga domänmodereringsposterna hittades</p>
          </div>
        )}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera domänmoderering</DialogTitle>
            <DialogDescription>
              Uppdatera modereringsinställningar för {currentDomain?.host}
            </DialogDescription>
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
              <Textarea
                id="edit-reason"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDomain}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekräfta borttagning</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill ta bort {domainToDelete} från moderering?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDomain}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
