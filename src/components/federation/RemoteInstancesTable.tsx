import { intlLocale } from "@/lib/locale";

import { useState } from "react";
import { toast } from "sonner";
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

import { tx } from "@/i18n/tx";
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

const statusLabel = (status: string) => tx(status === 'blocked' ? 'ui.domainModeration.blockerad' : status === 'probation' ? 'ui.domainModeration.provotid' : 'ui.domainModeration.normal');

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
      toast(tx("ui.remoteInstancesTable.domanstatusUppdaterad"), { description: tx("moderation.statusUpdatedDetails", { target: selectedInstance, status: statusLabel(selectedAction || "normal") }) });
      queryClient.invalidateQueries({ queryKey: ['domainModeration'] });
      setSelectedInstance(null); setSelectedAction(null); setBlockReason("");
    },
    onError: (error) => {
      toast.error(tx("ui.remoteInstancesTable.kundeInteUppdateraDomanstatus"), { description: tx("ui.remoteInstancesTable.ettFelIntraffadeForsok") });
      console.error("Error updating domain moderation:", error);
    }
  });

  const handleUpdateDomain = () => {
    if (!selectedInstance || !selectedAction) return;
    updateDomainMutation.mutate({ host: selectedInstance, status: selectedAction, reason: blockReason || tx("ui.remoteInstancesTable.rateLimitReason") });
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
        <h3 className="font-medium text-red-800 dark:text-red-300">{tx("ui.remoteInstancesTable.kundeInteLaddaData")}</h3>
        <p className="text-sm text-red-700 dark:text-red-400">{(rateLimitedError || domainsError)?.toString()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <Label htmlFor="requestThreshold">{tx("ui.remoteInstancesTable.troskelvardeForForfragningar")}</Label>
            <Input id="requestThreshold" type="number" value={requestThreshold} onChange={(e) => setRequestThreshold(parseInt(e.target.value) || 25)} className="w-32" />
          </div>
          <div>
            <Label htmlFor="timeWindow">{tx("ui.remoteInstancesTable.tidsfonsterMinuter")}</Label>
            <Input id="timeWindow" type="number" value={timeWindow} onChange={(e) => setTimeWindow(parseInt(e.target.value) || 10)} className="w-32" />
          </div>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['rateLimitedHosts', 'domainModeration'] })} disabled={loadingRateLimited || loadingDomains}>
          <RefreshCw className={`mr-2 h-4 w-4 ${(loadingRateLimited || loadingDomains) ? 'animate-spin' : ''}`} />{tx("ui.remoteInstancesTable.uppdatera")}
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
                    <TableHead>{tx("ui.remoteInstancesTable.instans")}</TableHead>
                    <TableHead className="text-right">{tx("ui.remoteInstancesTable.antalForfragningar")}</TableHead>
                    <TableHead>{tx("ui.remoteInstancesTable.senasteForfragan")}</TableHead>
                    <TableHead>{tx("ui.remoteInstancesTable.status")}</TableHead>
                    <TableHead className="text-right">{tx("ui.remoteInstancesTable.atgarder")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedData().map((instance) => (
                    <TableRow key={instance.remote_host}>
                      <TableCell className="font-medium">{instance.remote_host}</TableCell>
                      <TableCell className="text-right">{instance.request_count}</TableCell>
                      <TableCell>{new Date(instance.latest_request).toLocaleString(intlLocale())}</TableCell>
                      <TableCell>
                        <Badge variant={instance.status === 'blocked' ? 'destructive' : instance.status === 'probation' ? 'secondary' : 'outline'}>
                          {statusLabel(instance.status || 'normal')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {instance.status !== 'normal' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedInstance(instance.remote_host); setSelectedAction('normal'); setBlockReason(""); }}>
                                  <Check className="h-4 w-4 mr-1" />{tx("ui.remoteInstancesTable.tillat")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tx("ui.remoteInstancesTable.tillatInstans")}</AlertDialogTitle>
                                  <AlertDialogDescription>{tx("ui.remoteInstancesTable.allowDescription", { server: instance.remote_host })}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>{tx("ui.remoteInstancesTable.avbryt")}</AlertDialogCancel><AlertDialogAction onClick={handleUpdateDomain}>{tx("ui.remoteInstancesTable.bekrafta")}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {instance.status !== 'probation' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="secondary" size="sm" onClick={() => { setSelectedInstance(instance.remote_host); setSelectedAction('probation'); setBlockReason(instance.reason || ""); }}>{tx("ui.remoteInstancesTable.begransa")}</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tx("ui.remoteInstancesTable.begransaInstans")}</AlertDialogTitle>
                                  <AlertDialogDescription>{tx("ui.remoteInstancesTable.restrictDescription", { server: instance.remote_host })}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mb-4"><Label htmlFor="reasonInput">{tx("ui.remoteInstancesTable.anledning")}</Label><Input id="reasonInput" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder={tx("ui.remoteInstancesTable.angeEnAnledningFor")} /></div>
                                <AlertDialogFooter><AlertDialogCancel>{tx("ui.remoteInstancesTable.avbryt")}</AlertDialogCancel><AlertDialogAction onClick={handleUpdateDomain}>{tx("ui.remoteInstancesTable.bekrafta")}</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {instance.status !== 'blocked' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" onClick={() => { setSelectedInstance(instance.remote_host); setSelectedAction('blocked'); setBlockReason(instance.reason || ""); }}>
                                  <Ban className="h-4 w-4 mr-1" />{tx("ui.remoteInstancesTable.blockera")}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tx("ui.remoteInstancesTable.blockeraInstans")}</AlertDialogTitle>
                                  <AlertDialogDescription>{tx("ui.remoteInstancesTable.blockDescription", { server: instance.remote_host })}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mb-4"><Label htmlFor="reasonInput">{tx("ui.remoteInstancesTable.anledning")}</Label><Input id="reasonInput" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder={tx("ui.remoteInstancesTable.angeEnAnledningFor2")} /></div>
                                <AlertDialogFooter><AlertDialogCancel>{tx("ui.remoteInstancesTable.avbryt")}</AlertDialogCancel><AlertDialogAction onClick={handleUpdateDomain}>{tx("ui.remoteInstancesTable.bekrafta")}</AlertDialogAction></AlertDialogFooter>
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
              <p className="text-muted-foreground">{tx("ui.remoteInstancesTable.ingaInstanserHittadesSom")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RemoteInstancesTable;