
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ModerationLog from "@/components/ModerationLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import CodeOfConduct from "@/components/CodeOfConduct";
import { useForm } from "react-hook-form";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";

const Moderation = () => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [acceptedCoC, setAcceptedCoC] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm({
    defaultValues: {
      type: 'warn',
      targetUser: '',
      reason: '',
      isPublic: true
    }
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

  const handleNewAction = async (values: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: t('common.error', 'Error'),
          description: 'You must be logged in to perform this action',
          variant: 'destructive',
        });
        return;
      }
      
      // Create the moderation action
      const { data, error } = await supabase
        .from('moderation_actions')
        .insert({
          type: values.type,
          target_user_id: values.targetUser,
          reason: values.reason,
          moderator_id: session.user.id,
          is_public: values.isPublic
        })
        .select();
      
      if (error) {
        throw error;
      }
      
      // Success, close the dialog and reset the form
      setIsDialogOpen(false);
      form.reset({
        type: 'warn',
        targetUser: '',
        reason: '',
        isPublic: true
      });
      
      toast({
        title: t('moderation.success', 'Success'),
        description: t('moderation.actionCreated', 'Moderation action created successfully'),
      });
    } catch (error: any) {
      console.error('Error creating moderation action:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message || 'Failed to create moderation action',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto py-10 px-4 sm:px-6 text-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('moderation.title', 'Community Moderation')}
        </h1>
        
        {(isAdmin || isModerator) && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default">
                {t('moderation.newAction', 'New Moderation Action')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('moderation.newActionTitle', 'New Moderation Action')}</DialogTitle>
                <DialogDescription>
                  {t('moderation.newActionDesc', 'Take moderation action against a user who has violated community guidelines')}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleNewAction)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('moderation.actionType', 'Action Type')}</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="warn">{t('moderation.warn', 'Warning')}</option>
                            <option value="silence">{t('moderation.silence', 'Silence')}</option>
                            <option value="block">{t('moderation.block', 'Block')}</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="targetUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('moderation.targetUser', 'Target User')}</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="username or user ID"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('moderation.reasonLabel', 'Public Reason')}</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder={t('moderation.reasonPlaceholder', 'Please provide a clear reason for this action')}
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>{t('moderation.public', 'Make this action visible in the public log')}</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter className="pt-4">
                    <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button type="submit">
                      {t('moderation.takeAction', 'Take Action')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <Tabs defaultValue="log" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="log">{t('moderation.log', 'Moderation Log')}</TabsTrigger>
          <TabsTrigger value="coc">{t('moderation.codeOfConduct', 'Code of Conduct')}</TabsTrigger>
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
