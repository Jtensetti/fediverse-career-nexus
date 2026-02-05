import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ModerationLog from "@/components/ModerationLog";
import ModerationHeader from "@/components/ModerationHeader";
import DomainModeration from "@/components/DomainModeration";
import ActorModeration from "@/components/ActorModeration";
import CodeOfConduct from "@/components/CodeOfConduct";
 import { AlertManager } from "@/components/AlertManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/common/SEOHead";
import {
  FlaggedContentList,
  BannedUsersList,
  ModeratorManagement,
  UserLookup,
  ModerationStatsCards,
} from "@/components/moderation";
import { getPendingReportsCount } from "@/services/reportService";
import { getModerationStats } from "@/services/moderationService";

const Moderation = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [acceptedCoC, setAcceptedCoC] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch pending reports count for badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-reports-count"],
    queryFn: getPendingReportsCount,
    enabled: isModerator || isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch moderation stats
  const { data: stats } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: getModerationStats,
    enabled: isModerator || isAdmin,
  });

  // Check if the current user is an admin or moderator
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setLoading(false);
          return;
        }
        
        const userId = session.user.id;
        
        // Check if user is an admin
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin', {
          _user_id: userId
        });
        
        if (adminError) {
          console.error('Error checking admin status:', adminError);
          toast({
            title: t('common.error'),
            description: 'Failed to verify admin permissions',
            variant: 'destructive',
          });
        } else {
          setIsAdmin(adminData || false);
        }
        
        // Check if user is a moderator
        const { data: modData, error: modError } = await supabase.rpc('is_moderator', {
          _user_id: userId
        });
        
        if (modError) {
          console.error('Error checking moderator status:', modError);
          toast({
            title: t('common.error'),
            description: 'Failed to verify moderator permissions',
            variant: 'destructive',
          });
        } else {
          setIsModerator(modData || false);
        }
        
        // Load from localStorage whether user has accepted the Code of Conduct
        const hasAcceptedCoC = localStorage.getItem('accepted_moderation_coc') === 'true';
        setAcceptedCoC(hasAcceptedCoC);
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking user role:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to check user permissions',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };
    
    checkUserRole();
  }, [t]);

  const handleAcceptCoC = (accepted: boolean) => {
    setAcceptedCoC(accepted);
    if (accepted) {
      localStorage.setItem('accepted_moderation_coc', 'true');
      toast({
        title: t('moderation.cocAccepted'),
        description: t('moderation.cocAcceptedDesc'),
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 text-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded w-full"></div>
        </div>
      </div>
    );
  }

  // If user is not a moderator or admin, show access denied message
  if (!isAdmin && !isModerator) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 text-center">
        <h1 className="text-3xl font-bold mb-4">{t('moderation.accessDenied')}</h1>
        <p className="text-muted-foreground">{t('moderation.noPermission')}</p>
      </div>
    );
  }

  // If CoC not accepted, show only CoC tab
  if (!acceptedCoC) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6">
        <SEOHead title={t('moderation.title')} description="Community moderation tools for administrators and moderators." />
        <ModerationHeader isAdmin={isAdmin} isModerator={isModerator} />
        <div className="mt-6 space-y-6">
          <CodeOfConduct />
          <div className="flex justify-center">
            <button 
              onClick={() => handleAcceptCoC(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              I Accept the Code of Conduct
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <SEOHead title={t('moderation.title')} description="Community moderation tools for administrators and moderators." />
      <ModerationHeader isAdmin={isAdmin} isModerator={isModerator} />
      
      {/* Stats Overview */}
      <div className="my-6">
        <ModerationStatsCards />
      </div>
      
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="reports" className="relative">
            Reports
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bans">User Bans</TabsTrigger>
          <TabsTrigger value="lookup">User Lookup</TabsTrigger>
          <TabsTrigger value="log">{t('moderation.log')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="team">Team</TabsTrigger>}
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="actors">Actors</TabsTrigger>
          <TabsTrigger value="coc">{t('moderation.codeOfConduct')}</TabsTrigger>
        </TabsList>
        
        {/* Reports Tab - Primary moderation view */}
        <TabsContent value="reports" className="space-y-4">
          <FlaggedContentList />
        </TabsContent>
        
        {/* User Bans Tab */}
        <TabsContent value="bans" className="space-y-4">
          <BannedUsersList />
        </TabsContent>
        
        {/* User Lookup Tab */}
        <TabsContent value="lookup" className="space-y-4">
          <UserLookup />
        </TabsContent>
        
        {/* Action Log Tab */}
        <TabsContent value="log" className="space-y-4">
          <ModerationLog isAdmin={isAdmin || isModerator} />
        </TabsContent>
        
        {/* Team Management Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="team" className="space-y-4">
            <ModeratorManagement isAdmin={isAdmin} />
          </TabsContent>
        )}
        
         {/* Site Alerts Tab */}
         <TabsContent value="alerts" className="space-y-4">
           <AlertManager />
         </TabsContent>
         
        {/* Domain Blocks Tab */}
        <TabsContent value="domains" className="space-y-4">
          <DomainModeration />
        </TabsContent>

        {/* Actor Blocks Tab */}
        <TabsContent value="actors" className="space-y-4">
          <ActorModeration />
        </TabsContent>
        
        {/* Code of Conduct Tab */}
        <TabsContent value="coc">
          <div className="flex justify-center">
            <CodeOfConduct />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Moderation;
