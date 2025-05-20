
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";

interface ModerationActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ModerationActionDialog = ({ isOpen, onOpenChange }: ModerationActionDialogProps) => {
  const { t } = useTranslation();
  
  const form = useForm({
    defaultValues: {
      type: 'warn',
      targetUser: '',
      reason: '',
      isPublic: true
    }
  });

  const handleNewAction = async (values: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast({
          title: t('common.error'),
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
      onOpenChange(false);
      form.reset({
        type: 'warn',
        targetUser: '',
        reason: '',
        isPublic: true
      });
      
      toast({
        title: t('moderation.success'),
        description: t('moderation.actionCreated'),
      });
    } catch (error: any) {
      console.error('Error creating moderation action:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to create moderation action',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('moderation.newActionTitle')}</DialogTitle>
          <DialogDescription>
            {t('moderation.newActionDesc')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleNewAction)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('moderation.actionType')}</FormLabel>
                  <FormControl>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="warn">{t('moderation.warn')}</option>
                      <option value="silence">{t('moderation.silence')}</option>
                      <option value="block">{t('moderation.block')}</option>
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
                  <FormLabel>{t('moderation.targetUser')}</FormLabel>
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
                  <FormLabel>{t('moderation.reasonLabel')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('moderation.reasonPlaceholder')}
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
                    <FormLabel>{t('moderation.public')}</FormLabel>
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
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('moderation.takeAction')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ModerationActionDialog;
