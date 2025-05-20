
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ModerationLog, { ModerationAction } from "@/components/ModerationLog";
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

// Mock data for demonstration
const mockModerationActions: ModerationAction[] = [
  {
    id: '1',
    type: 'block',
    targetUser: 'user123',
    reason: 'Repeated harassment of multiple members',
    moderator: 'admin01',
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
    isPublic: true,
  },
  {
    id: '2',
    type: 'silence',
    targetUser: 'spammer99',
    reason: 'Posting inappropriate content in public channels',
    moderator: 'moderator02',
    timestamp: new Date(Date.now() - 172800000), // 2 days ago
    isPublic: true,
  },
  {
    id: '3',
    type: 'warn',
    targetUser: 'newuser44',
    reason: 'First-time violation of community guidelines',
    moderator: 'moderator03',
    timestamp: new Date(Date.now() - 259200000), // 3 days ago
    isPublic: false,
  }
];

const Moderation = () => {
  const { t } = useTranslation();
  const [moderationActions, setModerationActions] = useState<ModerationAction[]>(mockModerationActions);
  const [isAdmin, setIsAdmin] = useState(true); // In a real app, this would be determined by auth
  const [acceptedCoC, setAcceptedCoC] = useState(true);
  const [newAction, setNewAction] = useState({
    type: 'warn',
    targetUser: '',
    reason: '',
    isPublic: true
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleNewAction = () => {
    if (!newAction.targetUser || !newAction.reason) {
      toast({
        title: t('moderation.error', 'Error'),
        description: t('moderation.fillFields', 'Please fill all required fields'),
        variant: 'destructive',
      });
      return;
    }

    const action: ModerationAction = {
      id: Date.now().toString(),
      type: newAction.type as 'block' | 'silence' | 'warn',
      targetUser: newAction.targetUser,
      reason: newAction.reason,
      moderator: 'currentAdmin', // In a real app, this would be the current user
      timestamp: new Date(),
      isPublic: newAction.isPublic
    };

    setModerationActions([action, ...moderationActions]);
    setNewAction({
      type: 'warn',
      targetUser: '',
      reason: '',
      isPublic: true
    });
    setIsDialogOpen(false);
    
    toast({
      title: t('moderation.success', 'Success'),
      description: t('moderation.actionCreated', 'Moderation action created successfully'),
    });
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('moderation.title', 'Community Moderation')}
        </h1>
        
        {isAdmin && (
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
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="action-type">{t('moderation.actionType', 'Action Type')}</Label>
                  <select 
                    id="action-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newAction.type}
                    onChange={(e) => setNewAction({...newAction, type: e.target.value})}
                  >
                    <option value="warn">{t('moderation.warn', 'Warning')}</option>
                    <option value="silence">{t('moderation.silence', 'Silence')}</option>
                    <option value="block">{t('moderation.block', 'Block')}</option>
                  </select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="target-user">{t('moderation.targetUser', 'Target User')}</Label>
                  <Input 
                    id="target-user"
                    value={newAction.targetUser}
                    onChange={(e) => setNewAction({...newAction, targetUser: e.target.value})}
                    placeholder="username"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="reason">{t('moderation.reasonLabel', 'Public Reason')}</Label>
                  <Textarea 
                    id="reason"
                    value={newAction.reason}
                    onChange={(e) => setNewAction({...newAction, reason: e.target.value})}
                    placeholder={t('moderation.reasonPlaceholder', 'Please provide a clear reason for this action')}
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="public"
                    checked={newAction.isPublic}
                    onCheckedChange={(checked) => setNewAction({...newAction, isPublic: checked})}
                  />
                  <Label htmlFor="public">{t('moderation.public', 'Make this action visible in the public log')}</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleNewAction}>
                  {t('moderation.takeAction', 'Take Action')}
                </Button>
              </DialogFooter>
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
          <ModerationLog actions={moderationActions} isAdmin={isAdmin} />
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
