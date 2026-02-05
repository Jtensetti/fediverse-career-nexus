 import { useQuery } from "@tanstack/react-query";
 import { X, AlertTriangle, CheckCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { cn } from "@/lib/utils";
 import { useState, useEffect } from "react";
 
 interface SiteAlert {
   id: string;
   message: string;
   type: "error" | "success";
   is_active: boolean;
   created_at: string;
 }
 
 export function AlertBanner() {
   const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
 
   // Load dismissed alerts from sessionStorage
   useEffect(() => {
     const stored = sessionStorage.getItem("dismissedAlerts");
     if (stored) {
       setDismissedAlerts(new Set(JSON.parse(stored)));
     }
   }, []);
 
   const { data: alerts = [] } = useQuery({
     queryKey: ["siteAlerts"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("site_alerts" as any)
         .select("*")
         .eq("is_active", true)
         .order("created_at", { ascending: false });
       if (error) throw error;
       return (data || []) as unknown as SiteAlert[];
     },
     refetchInterval: 60000, // Refresh every minute
   });
 
   const handleDismiss = (alertId: string) => {
     const newDismissed = new Set(dismissedAlerts);
     newDismissed.add(alertId);
     setDismissedAlerts(newDismissed);
     sessionStorage.setItem("dismissedAlerts", JSON.stringify([...newDismissed]));
   };
 
   const visibleAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));
 
   if (visibleAlerts.length === 0) return null;
 
   return (
     <div className="w-full">
       {visibleAlerts.map((alert) => (
         <div
           key={alert.id}
           className={cn(
             "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
             alert.type === "error"
               ? "bg-destructive text-destructive-foreground"
               : "bg-accent text-accent-foreground"
           )}
         >
           {alert.type === "error" ? (
             <AlertTriangle className="h-4 w-4 shrink-0" />
           ) : (
             <CheckCircle className="h-4 w-4 shrink-0" />
           )}
           <span className="text-center">{alert.message}</span>
           <button
             onClick={() => handleDismiss(alert.id)}
             className="ml-2 rounded-full p-1 hover:bg-foreground/10 transition-colors"
             aria-label="Dismiss alert"
           >
             <X className="h-4 w-4" />
           </button>
         </div>
       ))}
     </div>
   );
 }