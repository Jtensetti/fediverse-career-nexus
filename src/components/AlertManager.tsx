 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Switch } from "@/components/ui/switch";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { toast } from "sonner";
 import { cn } from "@/lib/utils";
 
 interface SiteAlert {
   id: string;
   message: string;
   type: "error" | "success";
   is_active: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export function AlertManager() {
   const queryClient = useQueryClient();
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [editingAlert, setEditingAlert] = useState<SiteAlert | null>(null);
   const [message, setMessage] = useState("");
   const [type, setType] = useState<"error" | "success">("success");
 
   const { data: alerts = [], isLoading } = useQuery({
     queryKey: ["allSiteAlerts"],
     queryFn: async () => {
        const { data, error } = await supabase
          .from("site_alerts")
         .select("*")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return (data || []) as unknown as SiteAlert[];
     },
   });
 
   const createMutation = useMutation({
     mutationFn: async (newAlert: { message: string; type: "error" | "success" }) => {
        const { error } = await supabase.from("site_alerts").insert(newAlert);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["allSiteAlerts"] });
       queryClient.invalidateQueries({ queryKey: ["siteAlerts"] });
       toast.success("Avisering skapad");
       closeDialog();
     },
     onError: () => toast.error("Kunde inte skapa avisering"),
   });
 
   const updateMutation = useMutation({
     mutationFn: async (update: { id: string; message?: string; type?: string; is_active?: boolean }) => {
       const { id, ...fields } = update;
        const { error } = await supabase.from("site_alerts").update(fields).eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["allSiteAlerts"] });
       queryClient.invalidateQueries({ queryKey: ["siteAlerts"] });
       toast.success("Avisering uppdaterad");
       closeDialog();
     },
     onError: () => toast.error("Kunde inte uppdatera avisering"),
   });
 
   const deleteMutation = useMutation({
     mutationFn: async (id: string) => {
        const { error } = await supabase.from("site_alerts").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["allSiteAlerts"] });
       queryClient.invalidateQueries({ queryKey: ["siteAlerts"] });
       toast.success("Avisering borttagen");
     },
     onError: () => toast.error("Kunde inte ta bort avisering"),
   });
 
   const openCreate = () => {
     setEditingAlert(null);
     setMessage("");
     setType("success");
     setIsDialogOpen(true);
   };
 
   const openEdit = (alert: SiteAlert) => {
     setEditingAlert(alert);
     setMessage(alert.message);
     setType(alert.type);
     setIsDialogOpen(true);
   };
 
   const closeDialog = () => {
     setIsDialogOpen(false);
     setEditingAlert(null);
     setMessage("");
   };
 
   const handleSubmit = () => {
     if (!message.trim()) {
       toast.error("Meddelande krävs");
       return;
     }
     if (editingAlert) {
       updateMutation.mutate({ id: editingAlert.id, message, type });
     } else {
       createMutation.mutate({ message, type });
     }
   };
 
   const toggleActive = (alert: SiteAlert) => {
     updateMutation.mutate({ id: alert.id, is_active: !alert.is_active });
   };
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <CardTitle>Webbplatsaviseringar</CardTitle>
         <Button onClick={openCreate} size="sm">
           <Plus className="h-4 w-4 mr-2" />
           Ny avisering
         </Button>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <p className="text-muted-foreground">Laddar...</p>
         ) : alerts.length === 0 ? (
           <p className="text-muted-foreground">Inga aviseringar konfigurerade</p>
         ) : (
           <div className="space-y-3">
             {alerts.map((alert) => (
               <div
                 key={alert.id}
                 className={cn(
                   "flex items-center justify-between gap-4 p-3 rounded-lg border",
                   alert.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60"
                 )}
               >
                 <div className="flex items-center gap-3 flex-1 min-w-0">
                   {alert.type === "error" ? (
                     <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                   ) : (
                     <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                   )}
                   <span className="truncate">{alert.message}</span>
                   <Badge variant={alert.type === "error" ? "destructive" : "secondary"}>
                     {alert.type === "error" ? "Fel" : "Info"}
                   </Badge>
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                   <Switch
                     checked={alert.is_active}
                     onCheckedChange={() => toggleActive(alert)}
                     aria-label="Växla aktiv"
                   />
                   <Button variant="ghost" size="icon" onClick={() => openEdit(alert)}>
                     <Pencil className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => deleteMutation.mutate(alert.id)}
                     className="text-destructive hover:text-destructive"
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
             ))}
           </div>
         )}
 
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>{editingAlert ? "Redigera avisering" : "Skapa avisering"}</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label htmlFor="message">Meddelande</Label>
                 <Input
                   id="message"
                   value={message}
                   onChange={(e) => setMessage(e.target.value)}
                   placeholder="Ange aviseringsmeddelande..."
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="type">Typ</Label>
                 <Select value={type} onValueChange={(v) => setType(v as "error" | "success")}>
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="success">
                       <span className="flex items-center gap-2">
                         <CheckCircle className="h-4 w-4 text-primary" />
                         Info (Grön)
                       </span>
                     </SelectItem>
                     <SelectItem value="error">
                       <span className="flex items-center gap-2">
                         <AlertTriangle className="h-4 w-4 text-destructive" />
                         Fel (Röd)
                       </span>
                     </SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={closeDialog}>
                 Avbryt
               </Button>
               <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                 {editingAlert ? "Spara" : "Skapa"}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </CardContent>
     </Card>
   );
 }
