import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { sv } from "date-fns/locale";
import { Ban, Undo2, Clock, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveBans, getAllBans, revokeBan, UserBan } from "@/services/moderation/moderationService";

export function BannedUsersList() {
  const queryClient = useQueryClient();

  const { data: activeBans, isLoading: loadingActive } = useQuery({
    queryKey: ["active-bans"], queryFn: getActiveBans,
  });

  const { data: allBans, isLoading: loadingAll } = useQuery({
    queryKey: ["all-bans"], queryFn: getAllBans,
  });

  const revokeMutation = useMutation({
    mutationFn: revokeBan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-bans"] });
      queryClient.invalidateQueries({ queryKey: ["all-bans"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-stats"] });
    },
  });

  const renderBanCard = (ban: UserBan, showActions: boolean = true) => {
    const isExpired = ban.expires_at && new Date(ban.expires_at) < new Date();
    const isRevoked = !!ban.revoked_at;
    const isPermanent = !ban.expires_at;

    return (
      <Card key={ban.id} className={isExpired || isRevoked ? "opacity-60" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={ban.user?.avatar_url || undefined} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">@{ban.user?.username || "Okänd användare"}</CardTitle>
                <CardDescription className="text-xs">{ban.user?.fullname}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPermanent && !isRevoked && <Badge variant="destructive">Permanent</Badge>}
              {isRevoked && <Badge variant="outline" className="text-green-500 border-green-500">Upphävd</Badge>}
              {isExpired && !isRevoked && <Badge variant="outline" className="text-muted-foreground">Utgången</Badge>}
              {!isPermanent && !isRevoked && !isExpired && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(ban.expires_at!), { addSuffix: false, locale: sv })} kvar
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">{ban.reason}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Blockerad {formatDistanceToNow(new Date(ban.created_at), { addSuffix: true, locale: sv })}</span>
            {ban.expires_at && !isPermanent && (
              <span>{isExpired ? "Utgick" : "Utgår"} {format(new Date(ban.expires_at), "d MMM yyyy", { locale: sv })}</span>
            )}
          </div>

          {showActions && !isRevoked && !isExpired && (
            <div className="pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline"><Undo2 className="h-4 w-4 mr-1" />Upphäv blockering</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Upphäv denna blockering?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Detta återställer omedelbart användarens åtkomst till plattformen. Är du säker?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revokeMutation.mutate(ban.id)} disabled={revokeMutation.isPending}>
                      Upphäv blockering
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loadingActive) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardHeader><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16 mt-1" /></div></div></CardHeader><CardContent><Skeleton className="h-12 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Ban className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Blockeringar</h3>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Aktiva ({activeBans?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">Historik ({allBans?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {!activeBans || activeBans.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Ban className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Inga aktiva blockeringar</p></CardContent></Card>
          ) : (
            activeBans.map((ban) => renderBanCard(ban, true))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {loadingAll ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => (<Card key={i}><CardContent className="py-6"><Skeleton className="h-20 w-full" /></CardContent></Card>))}</div>
          ) : !allBans || allBans.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground"><Ban className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Ingen blockeringshistorik</p></CardContent></Card>
          ) : (
            allBans.map((ban) => renderBanCard(ban, false))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}