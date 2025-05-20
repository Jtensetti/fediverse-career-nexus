
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ModerationLog from "@/components/ModerationLog";
import ModerationHeader from "@/components/ModerationHeader";
import CodeOfConduct from "@/components/CodeOfConduct";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Moderation = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [acceptedCoC, setAcceptedCoC] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Actor management
  const [actors, setActors] = useState<any[]>([]);
  const [actorUsername, setActorUsername] = useState('');
  const [loadingActors, setLoadingActors] = useState(false);
  const [creatingActor, setCreatingActor] = useState(false);
  const [actorError, setActorError] = useState<string | null>(null);
  const [actorSuccess, setActorSuccess] = useState<string | null>(null);

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

  // Load actors
  useEffect(() => {
    if ((isAdmin || isModerator) && acceptedCoC) {
      fetchActors();
    }
  }, [isAdmin, isModerator, acceptedCoC]);

  const fetchActors = async () => {
    try {
      setLoadingActors(true);
      const { data, error } = await supabase
        .from('actors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching actors:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to fetch federated actors',
          variant: 'destructive',
        });
      } else {
        setActors(data || []);
      }
    } catch (error) {
      console.error('Error fetching actors:', error);
    } finally {
      setLoadingActors(false);
    }
  };

  const createActor = async () => {
    try {
      setCreatingActor(true);
      setActorError(null);
      setActorSuccess(null);

      if (!actorUsername) {
        setActorError('Username is required');
        return;
      }

      // Check if the session exists first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setActorError('You must be logged in to create an actor');
        return;
      }

      // Generate keys for the actor (in a real app, this would be more sophisticated)
      // In this simplified version, we're leaving them empty for now
      
      const { data, error } = await supabase
        .from('actors')
        .insert([
          { 
            preferred_username: actorUsername,
            type: 'Person',
            user_id: sessionData.session.user.id,
          }
        ])
        .select();

      if (error) {
        console.error('Error creating actor:', error);
        setActorError(error.message);
      } else {
        setActorSuccess(`Actor @${actorUsername} created successfully`);
        setActorUsername('');
        fetchActors();
      }
    } catch (error: any) {
      console.error('Error creating actor:', error);
      setActorError(error.message);
    } finally {
      setCreatingActor(false);
    }
  };

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
          <TabsTrigger value="federation">Fediverse</TabsTrigger>
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
        
        <TabsContent value="federation" className="space-y-4">
          {acceptedCoC ? (
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <h2 className="text-2xl font-bold">Fediverse Integration</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Manage ActivityPub actors that represent users on the Fediverse.
                </p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Create Actor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Input
                        placeholder="Preferred username"
                        value={actorUsername}
                        onChange={(e) => setActorUsername(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {actorError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{actorError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {actorSuccess && (
                    <Alert className="mt-4 bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900">
                      <Check className="h-4 w-4" />
                      <AlertDescription>{actorSuccess}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={fetchActors} disabled={loadingActors}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingActors ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={createActor} disabled={creatingActor || !actorUsername}>
                    {creatingActor ? 'Creating...' : 'Create Actor'}
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Existing Actors</h3>
                
                {loadingActors ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ) : actors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Username
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Created At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {actors.map((actor) => (
                          <tr key={actor.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              @{actor.preferred_username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {actor.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(actor.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">No actors found. Create one to get started with Fediverse integration.</p>
                  </div>
                )}
              </div>
            </div>
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
