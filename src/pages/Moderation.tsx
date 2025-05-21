import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ModerationLog from "@/components/ModerationLog";
import ModerationHeader from "@/components/ModerationHeader";
import DomainModeration from "@/components/DomainModeration";
import CodeOfConduct from "@/components/CodeOfConduct";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  
  // Object management
  const [objects, setObjects] = useState<any[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [objectError, setObjectError] = useState<string | null>(null);
  const [objectSuccess, setObjectSuccess] = useState<string | null>(null);
  
  // Form schema for AP objects
  const formSchema = z.object({
    type: z.string().min(1, "Object type is required"),
    content: z.string().min(1, "Content is required"),
    actorId: z.string().uuid("Valid actor is required"),
  });
  
  // Form for creating AP objects
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "Note",
      content: "",
      actorId: "",
    },
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
  
  // Load AP objects when actors are loaded
  useEffect(() => {
    if (actors.length > 0 && (isAdmin || isModerator) && acceptedCoC) {
      fetchObjects();
    }
  }, [actors, isAdmin, isModerator, acceptedCoC]);

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
        // Update form with first actor if available
        if (data && data.length > 0 && !form.getValues().actorId) {
          form.setValue('actorId', data[0].id);
          setSelectedActor(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching actors:', error);
    } finally {
      setLoadingActors(false);
    }
  };

  const fetchObjects = async () => {
    try {
      setLoadingObjects(true);
      const { data, error } = await supabase
        .from('ap_objects')
        .select('*, actors!inner(*)')
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Error fetching objects:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to fetch ActivityPub objects',
          variant: 'destructive',
        });
      } else {
        setObjects(data || []);
      }
    } catch (error) {
      console.error('Error fetching objects:', error);
    } finally {
      setLoadingObjects(false);
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
  
  const createObject = async (values: z.infer<typeof formSchema>) => {
    try {
      setObjectError(null);
      setObjectSuccess(null);
      
      // Create content object based on type
      let contentObj: Record<string, any> = {
        content: values.content
      };
      
      // Add additional properties based on type
      if (values.type === "Note") {
        contentObj.name = values.content.substring(0, 50);
      } else if (values.type === "Article") {
        contentObj.name = values.content.substring(0, 100);
        contentObj.summary = values.content.substring(0, 200);
      }
      
      const { data, error } = await supabase
        .from('ap_objects')
        .insert([
          {
            type: values.type,
            attributed_to: values.actorId,
            content: contentObj
          }
        ])
        .select();
      
      if (error) {
        console.error('Error creating object:', error);
        setObjectError(error.message);
      } else {
        setObjectSuccess(`${values.type} created successfully`);
        form.reset();
        if (selectedActor) {
          form.setValue('actorId', selectedActor);
        }
        fetchObjects();
      }
    } catch (error: any) {
      console.error('Error creating object:', error);
      setObjectError(error.message);
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
          <TabsTrigger value="domains">Domain Blocks</TabsTrigger>
          <TabsTrigger value="federation">Fediverse</TabsTrigger>
          <TabsTrigger value="objects">AP Objects</TabsTrigger>
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
        
        <TabsContent value="domains" className="space-y-4">
          {acceptedCoC ? (
            <DomainModeration />
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
        
        <TabsContent value="objects" className="space-y-4">
          {acceptedCoC ? (
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <h2 className="text-2xl font-bold">ActivityPub Objects</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Create and manage ActivityPub objects like Notes and Articles.
                </p>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Create Object</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(createObject)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Object Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select object type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Note">Note</SelectItem>
                                <SelectItem value="Article">Article</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The type of ActivityPub object to create
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="actorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Actor</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedActor(value);
                              }} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select actor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {actors.map(actor => (
                                  <SelectItem key={actor.id} value={actor.id}>
                                    @{actor.preferred_username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The actor who created this object
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter content" 
                                className="min-h-[150px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              The content of your {form.watch("type")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {objectError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{objectError}</AlertDescription>
                        </Alert>
                      )}
                      
                      {objectSuccess && (
                        <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900">
                          <Check className="h-4 w-4" />
                          <AlertDescription>{objectSuccess}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="flex justify-end">
                        <Button type="submit">
                          Create {form.watch("type")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Existing Objects</h3>
                  <Button variant="outline" onClick={fetchObjects} disabled={loadingObjects}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingObjects ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {loadingObjects ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ) : objects.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {objects.map((obj) => (
                      <Card key={obj.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">{obj.type}</CardTitle>
                            <span className="text-xs text-gray-500">@{obj.actors.preferred_username}</span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm line-clamp-3">{obj.content.content}</p>
                        </CardContent>
                        <CardFooter className="text-xs text-gray-500">
                          Published: {new Date(obj.published_at).toLocaleString()}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">No objects found. Create one using the form above.</p>
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
