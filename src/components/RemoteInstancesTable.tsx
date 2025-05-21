
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Ban, Check, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRateLimitedHosts, updateDomainModeration, getDomainModeration } from "@/services/federationService";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

const RemoteInstancesTable = () => {
  const queryClient = useQueryClient();
  const [requestThreshold, setRequestThreshold] = useState(25);
  const [timeWindow, setTimeWindow] = useState(10);
  const [blockReason, setBlockReason] = useState("");
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<InstanceStatus | null>(null);

  // Fetch rate limited hosts
  const { 
    data: rateLimitedData, 
    isLoading: loadingRateLimited,
    error: rateLimitedError 
  } = useQuery({
    queryKey: ['rateLimitedHosts', requestThreshold, timeWindow],
    queryFn: () => getRateLimitedHosts(requestThreshold, timeWindow)
  });

  // Fetch domain moderation data
  const {
    data: domainData,
    isLoading: loadingDomains,
    error: domainsError
  } = useQuery({
    queryKey: ['domainModeration'],
    queryFn: () => getDomainModeration()
  });

  // Update domain moderation status mutation
  const updateDomainMutation = useMutation({
    mutationFn: (data: InstanceModerationFormData) => 
      updateDomainModeration(data.host, data.status, data.reason),
    onSuccess: () => {
      toast({
        title: "Domain status updated",
        description: `${selectedInstance} has been set to ${selectedAction}`,
      });
      queryClient.invalidateQueries({ queryKey: ['domainModeration'] });
      setSelectedInstance(null);
      setSelectedAction(null);
      setBlockReason("");
    },
    onError: (error) => {
      toast({
        title: "Failed to update domain status",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating domain moderation:", error);
    }
  });

  // Handle form submission
  const handleUpdateDomain = () => {
    if (!selectedInstance || !selectedAction) return;
    
    updateDomainMutation.mutate({
      host: selectedInstance,
      status: selectedAction,
      reason: blockReason || `Automatically ${selectedAction} due to rate limiting`
    });
  };

  // Combine rate limit data with domain moderation data
  const mergedData = (): RemoteInstance[] => {
    if (!rateLimitedData?.success || !domainData) {
      return [];
    }

    return rateLimitedData.hosts.map(host => {
      const domainInfo = domainData.find(d => d.host === host.remote_host);
      return {
        ...host,
        status: domainInfo?.status as InstanceStatus || 'normal',
        reason: domainInfo?.reason
      };
    });
  };

  // Handle error states
  if (rateLimitedError || domainsError) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md">
        <h3 className="font-medium text-red-800 dark:text-red-300">Error loading data</h3>
        <p className="text-sm text-red-700 dark:text-red-400">{(rateLimitedError || domainsError)?.toString()}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <Label htmlFor="requestThreshold">Request threshold</Label>
            <Input 
              id="requestThreshold"
              type="number" 
              value={requestThreshold} 
              onChange={(e) => setRequestThreshold(parseInt(e.target.value) || 25)} 
              className="w-32"
            />
          </div>
          <div>
            <Label htmlFor="timeWindow">Time window (minutes)</Label>
            <Input 
              id="timeWindow"
              type="number" 
              value={timeWindow} 
              onChange={(e) => setTimeWindow(parseInt(e.target.value) || 10)} 
              className="w-32"
            />
          </div>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['rateLimitedHosts', 'domainModeration'] })}
          disabled={loadingRateLimited || loadingDomains}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${(loadingRateLimited || loadingDomains) ? 'animate-spin' : ''}`} />
          Refresh
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
                    <TableHead>Instance</TableHead>
                    <TableHead className="text-right">Request Count</TableHead>
                    <TableHead>Latest Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedData().map((instance) => (
                    <TableRow key={instance.remote_host}>
                      <TableCell className="font-medium">{instance.remote_host}</TableCell>
                      <TableCell className="text-right">{instance.request_count}</TableCell>
                      <TableCell>{new Date(instance.latest_request).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            instance.status === 'blocked' ? 'destructive' :
                            instance.status === 'probation' ? 'secondary' : 'outline'
                          }
                        >
                          {instance.status || 'normal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {instance.status !== 'normal' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInstance(instance.remote_host);
                                    setSelectedAction('normal');
                                    setBlockReason("");
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Allow
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Allow instance?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove all restrictions for {instance.remote_host}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleUpdateDomain}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {instance.status !== 'probation' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInstance(instance.remote_host);
                                    setSelectedAction('probation');
                                    setBlockReason(instance.reason || "");
                                  }}
                                >
                                  Restrict
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restrict instance?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will put {instance.remote_host} on probation with limited functionality.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mb-4">
                                  <Label htmlFor="reasonInput">Reason</Label>
                                  <Input
                                    id="reasonInput"
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder="Provide a reason for restriction"
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleUpdateDomain}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {instance.status !== 'blocked' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedInstance(instance.remote_host);
                                    setSelectedAction('blocked');
                                    setBlockReason(instance.reason || "");
                                  }}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Block
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Block instance?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will block all traffic from {instance.remote_host}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="mb-4">
                                  <Label htmlFor="reasonInput">Reason</Label>
                                  <Input
                                    id="reasonInput"
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder="Provide a reason for blocking"
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleUpdateDomain}>Confirm</AlertDialogAction>
                                </AlertDialogFooter>
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
              <p className="text-muted-foreground">
                No instances found exceeding the request threshold.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RemoteInstancesTable;
