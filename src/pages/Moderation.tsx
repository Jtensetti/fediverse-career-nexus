
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ModerationLog from "@/components/ModerationLog";
import ModerationHeader from "@/components/ModerationHeader";
import CodeOfConduct from "@/components/CodeOfConduct";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Moderation = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [acceptedCoC, setAcceptedCoC] = useState(false);
  const [loading, setLoading] = useState(true);

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
          user_id: userId
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
          user_id: userId
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
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // If user is not a moderator or admin, show access denied message
  if (!isAdmin && !isModerator) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 text-center">
        <h1 className="text-3xl font-bold mb-4">{t('moderation.accessDenied')}</h1>
        <p>{t('moderation.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <ModerationHeader isAdmin={isAdmin} isModerator={isModerator} />
      
      <Tabs defaultValue={acceptedCoC ? "log" : "coc"} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="log">{t('moderation.log')}</TabsTrigger>
          <TabsTrigger value="coc">{t('moderation.codeOfConduct')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="log" className="space-y-4">
          {acceptedCoC ? (
            <ModerationLog isAdmin={isAdmin || isModerator} />
          ) : (
            <div className="text-center py-8">
              <p>{t('moderation.pleaseAcceptCoC')}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="coc">
          <div className="flex justify-center">
            <CodeOfConduct onAccept={handleAcceptCoC} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Moderation;
