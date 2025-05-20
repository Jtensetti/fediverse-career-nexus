
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import ModerationLog from "@/components/ModerationLog";
import ModerationHeader from "@/components/ModerationHeader";
import CodeOfConduct from "@/components/CodeOfConduct";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Moderation = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [acceptedCoC, setAcceptedCoC] = useState(true);
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
        } else {
          setIsAdmin(adminData || false);
        }
        
        // Check if user is a moderator
        const { data: modData, error: modError } = await supabase.rpc('is_moderator', {
          user_id: userId
        });
        
        if (modError) {
          console.error('Error checking moderator status:', modError);
        } else {
          setIsModerator(modData || false);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking user role:', error);
        setLoading(false);
      }
    };
    
    checkUserRole();
  }, []);

  if (loading) {
    return <div className="container mx-auto py-10 px-4 sm:px-6 text-center">
      {t('moderation.loading')}
    </div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <ModerationHeader isAdmin={isAdmin} isModerator={isModerator} />
      
      <Tabs defaultValue="log" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="log">{t('moderation.log')}</TabsTrigger>
          <TabsTrigger value="coc">{t('moderation.codeOfConduct')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="log" className="space-y-4">
          <ModerationLog isAdmin={isAdmin || isModerator} />
        </TabsContent>
        
        <TabsContent value="coc">
          <div className="flex justify-center">
            <CodeOfConduct onAccept={setAcceptedCoC} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Moderation;
