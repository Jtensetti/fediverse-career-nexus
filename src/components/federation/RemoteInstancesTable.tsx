
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Ban, Check, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRateLimitedHosts, updateDomainModeration, getDomainModeration } from "@/services/federation/federationService";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InstanceStatus = 'normal' | 'probation' | 'blocked';

interface RemoteInstance {
  remote_host: string;
  request_count: number;
  latest_request: string;
  status?: InstanceStatus;
  reason?: string;
}

interface InstanceModerationFormData {
  host: string;
  status: InstanceStatus;
  reason: string;
}

const statusLabels: Record<string, string> = {
  normal: 'normal', probation: 'begränsad', blocked: 'blockerad',
};

const RemoteInstancesTable = () => {
  const queryClient = useQueryClient();
  const [requestThreshold, setRequestThreshold] = useState(25);
  const [timeWindow, setTimeWindow] = useState(10);
  const [blockReason, setBlockReason] = useState("");
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<InstanceStatus | null>(null);

  const { data: rateLimitedData, isLoading: loadingRateLimited, error: rateLimitedError } = useQuery({
    queryKey: ['rateLimitedHosts', requestThreshold, timeWindow],
    queryFn: () => getRateLimitedHosts(requestThreshold, timeWindow)
  });

  const { data: domainData, isLoading: loadingDomains, error: domainsError } = useQuery({
    queryKey: ['domainModeration'],
    queryFn: () => getDomainModeration()
  });

  const updateDomainMutation = useMutation({
    mutationFn: (data: InstanceModerationFormData) => updateDomainModeration(data.host, data.status, data.reason),
    onSuccess: () => {
      toast({ title: "Domänstatus uppdaterad", description: `${selectedInstance} har ställts in som ${statusLabels[selectedAction || 'normal']}` });
      queryClient.invalidateQueries({ queryKey: ['domainModeration'] });
      setSelectedInstance(null); setSelectedAction(null); setBlockReason("");
    },
    onError: (error) => {
      toast({ title: "Kunde inte uppdatera domänstatus", description: "Ett fel inträffade. Försök igen.", variant: "destructive" });
      console.error("Error updating domain moderation:", error);
    }
  });

  const handleUpdateDomain = () => {
    if (!selectedInstance || !selectedAction) return;
    updateDomainMutation.mutate({ host: selectedInstance, status: selectedAction, reason: blockReason || `Automatiskt ${statusLabels[selectedAction]} p.g.a. frekvensbegränsning` });
  };

  const mergedData = (): RemoteInstance[] => {
    if (!rateLimitedData?.success || !domainData) return [];
    return rateLimitedData.hosts.map(host => {
      const domainInfo = domainData.find(d => d.host === host.remote_host);
      return { ...host, status: domainInfo?.status as InstanceStatus || 'normal', reason: domainInfo?.reason };
    });
  };

  if (rateLimitedError || domainsError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md">
        <h3 className="font-medium text-red-800 dark:text-red-300">Kunde inte ladda data</h3>
        <p className="text-sm text-red-700 dark:text-red-400">{(rateLimitedError || domainsError)?.toString()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <Label htmlFor="requestThreshold">Tröskelvärde för förfrågningar</Label>
            <Input id="requestThreshold" type="number" value={requestThreshold} onChange={(e) => setRequestThreshold(parseInt(e.target.value) || 25)} className="w-32" />
          </div>
          <div>
            <Label htmlFor="timeWindow">Tidsfönster (minuter)</Label>
            <Input id="timeWindow" type="number" value={timeWindow} onChange={(e) => setTimeWindow(parseInt(e.target.value) || 10)} className="w-32" />
          </div>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['rateLimitedHosts', 'domainModeration'] })} disabled={loadingRateLimited || loadingDomains}>
          <RefreshCw className={`mr-2 h-4 w-4 ${(loadingRateLimited || loadingDomains) ? 'animate-spin' : ''}`} />Uppdatera
        </Button>
      </div>

      {(loadingRateLimited || loadingDomains) ? (
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ) : (
        <>
          {mergedData().length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instans</TableHead>
                    <TableHead className="text-right">Antal förfrågningar</TableHead>
                    <TableHead>Senaste förfrågan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedData().map((instance) => (
                    <TableRow key={instance.remote_host}>
                      <TableCell className="font-medium">{instance.remote_host}</TableCell>
                      <TableCell className="text-right">{instance.request_count}</TableCell>
                      <TableCell>{new Date(instance.latest_request).toLocaleString('sv-SE')}</TableCell>
                      <TableCell>
                        <Badge variant={instance.status === 'blocked' ? 'destructive' : instance.status === 'probation' ? 'secondary' : 'outline'}>
                          {statusLabels[instance.status || 'normal']}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {instance.status !== 'normal' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedInstance(instance.remote_host); setSelectedAction('normal'); setBlockReason(""); }}>
                                  <Check className="h-4 w-4 mr-1" />Tillåt
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Tillåt instans?</AlertDialogTitle>
                                  <AlertDialogDescription>Detta tar bort alla restriktioner för {instance.remote_host}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Avbryt</AlertDialogCancel><AlertDialogAction onClick={handleUpdateDomain}>Bekräfta</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {instance.status !== 'probation' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="secondary" size="sm" onClick={() => { setSelectedInstance(instance.remote_host); setSelectedAction('probation'); setBlockReason(instance.reason || ""); }}>Begränsa</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Begränsa instans?</AlertDialogTitle>
                                  <AlertDialogDescription>Detta sätter {instance.remote_host} under begränsning med reducerad funktionalitet.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mb-4"><Label htmlFor="reasonInput">Anledning</Label><Input id="reasonInput" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ange en anledning för begränsningen" /></div>
                                <AlertDialogFooter><AlertDialogCancel>Avbryt</AlertDialogCancel><AlertDialogAction onClick={handleUpdateDomain}>Bekräfta</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {instance.status !== 'blocked' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" onClick={() => { setSelectedInstance(instance.remote_host); setSelectedAction('blocked'); setBlockReason(instance.reason || ""); }}>
                                  <Ban className="h-4 w-4 mr-1" />Blockera
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Blockera instans?</AlertDialogTitle>
                                  <AlertDialogDescription>Detta blockerar all trafik från {instance.remote_host}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mb-4"><Label htmlFor="reasonInput">Anledning</Label><Input id="reasonInput" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ange en anledning för blockeringen" /></div>
                                <AlertDialogFooter><AlertDialogCancel>Avbryt</AlertDialogCancel><AlertDialogAction onClick={handleUpdateDomain}>Bekräfta</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground">Inga instanser hittades som överskrider tröskelvärdet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RemoteInstancesTable;