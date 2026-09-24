
import { useState, useEffect } from "react";
import {
  getDomainModeration,
  updateDomainModeration,
  deleteDomainModeration
} from "@/services/federation/federationService";
import { toast } from "sonner";
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
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { tx } from "@/i18n/tx";
interface DomainEntry {
  host: string;
  reason: string;
  status: 'normal' | 'probation' | 'blocked';
  created_at: string;
  updated_at: string;
}

export default function DomainModeration() {
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
        
        toast(tx("ui.domainModeration.domanTillagd"), { description: `${host} har lagts till i ${status}-listan` });
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
        
        toast(tx("ui.domainModeration.domanUppdaterad"), { description: `${currentDomain.host} har uppdaterats till ${editStatus}` });
      } else {
        toast.error(tx("ui.domainModeration.uppdateringMisslyckades"), { description: tx("ui.domainModeration.kundeInteUppdateraDomanstatus") });
      }
    } catch (err) {
      console.error(err);
      toast.error(tx("ui.domainModeration.uppdateringMisslyckades"), { description: tx("ui.domainModeration.ettFelUppstodVid") });
    }
  };

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return;
    
    try {
      const result = await deleteDomainModeration(domainToDelete);
      
      if (result.success) {
        setIsDeleteDialogOpen(false);
        fetchDomains();
        
        toast(tx("ui.domainModeration.domanBorttagen"), { description: `${domainToDelete} har tagits bort från moderering` });
      } else {
        toast.error(tx("ui.domainModeration.borttagningMisslyckades"), { description: tx("ui.domainModeration.kundeInteTaBort") });
      }
    } catch (err) {
      console.error(err);
      toast.error(tx("ui.domainModeration.borttagningMisslyckades"), { description: tx("ui.domainModeration.ettFelUppstodVid2") });
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
        return <Badge variant="destructive">{tx("ui.domainModeration.blockerad")}</Badge>;
      case 'probation':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">{tx("ui.domainModeration.provotid")}</Badge>;
      default:
        return <Badge variant="secondary">{tx("ui.domainModeration.normal")}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tx("ui.domainModeration.laggTillDomanmoderering")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="host" className="block text-sm font-medium mb-1">
                  {tx("ui.domainModeration.domanvard")}
                </label>
                <Input
                  id="host"
                  placeholder={tx("ui.domainModeration.exempelSocial")}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  {tx("ui.domainModeration.status")}
                </label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder={tx("ui.domainModeration.valjStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">{tx("ui.domainModeration.normal")}</SelectItem>
                    <SelectItem value="probation">{tx("ui.domainModeration.provotid")}</SelectItem>
                    <SelectItem value="blocked">{tx("ui.domainModeration.blockerad")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-1">
                {tx("ui.domainModeration.reason")}
              </label>
              <Textarea
                id="reason"
                placeholder={tx("ui.domainModeration.anledningTillModerering")}
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
            {tx("ui.domainModeration.refresh")}
          </Button>
          <Button onClick={handleAddDomain} disabled={loading || !host || !reason}>
            {tx("ui.domainModeration.addDomain")}
          </Button>
        </CardFooter>
      </Card>
      
      <div>
        <h3 className="text-lg font-medium mb-4">{tx("ui.domainModeration.domanmoderationslista")}</h3>
        
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ) : domains.length > 0 ? (
          <Table>
            <TableCaption>{tx("ui.domainModeration.listaOverDomanerMed")}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{tx("ui.domainModeration.doman")}</TableHead>
                <TableHead>{tx("ui.domainModeration.status")}</TableHead>
                <TableHead>{tx("ui.domainModeration.anledning")}</TableHead>
                <TableHead className="w-[180px]">{tx("ui.domainModeration.atgarder")}</TableHead>
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
                        {tx("ui.domainModeration.edit")}
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
            <p className="text-muted-foreground">{tx("ui.domainModeration.ingaDomanmodereringsposternaHittades")}</p>
          </div>
        )}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx("ui.domainModeration.redigeraDomanmoderering")}</DialogTitle>
            <DialogDescription>
              {tx("ui.domainModeration.uppdateraModereringsinstallningarFor")}{' '}{currentDomain?.host}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-status">{tx("ui.domainModeration.status")}</label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as any)}>
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder={tx("ui.domainModeration.valjStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{tx("ui.domainModeration.normal")}</SelectItem>
                  <SelectItem value="probation">{tx("ui.domainModeration.provotid")}</SelectItem>
                  <SelectItem value="blocked">{tx("ui.domainModeration.blockerad")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="edit-reason">{tx("ui.domainModeration.anledning")}</label>
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
              {tx("ui.domainModeration.cancel")}
            </Button>
            <Button onClick={handleEditDomain}>
              {tx("ui.domainModeration.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx("ui.domainModeration.bekraftaBorttagning")}</DialogTitle>
            <DialogDescription>
              {tx("ui.domainModeration.arDuSakerPa")}{' '}{domainToDelete}{' '}{tx("ui.domainModeration.franModerering")}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {tx("ui.domainModeration.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteDomain}>
              {tx("ui.domainModeration.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
