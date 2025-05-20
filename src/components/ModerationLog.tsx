
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface ModerationAction {
  id: string;
  type: 'block' | 'silence' | 'warn';
  target_user_id: string;
  reason: string;
  moderator_id: string;
  timestamp: Date;
  isPublic: boolean;
}

interface ModerationLogProps {
  isAdmin?: boolean;
}

const ModerationLog = ({ isAdmin = false }: ModerationLogProps) => {
  const { t } = useTranslation();
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchModerationActions = async () => {
      try {
        setLoading(true);
        
        // Build the query based on user role
        let query = supabase
          .from('moderation_actions')
          .select(`
            id,
            type,
            target_user_id,
            reason,
            moderator_id,
            created_at,
            is_public
          `)
          .order('created_at', { ascending: false });
        
        // If not admin, only show public actions
        if (!isAdmin) {
          query = query.eq('is_public', true);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Transform the data to match our component's expected format
          const formattedActions = data.map(action => ({
            id: action.id,
            type: action.type as 'block' | 'silence' | 'warn',
            target_user_id: action.target_user_id,
            reason: action.reason,
            moderator_id: action.moderator_id,
            timestamp: new Date(action.created_at),
            isPublic: action.is_public
          }));
          
          setActions(formattedActions);
        }
      } catch (err) {
        console.error('Error fetching moderation actions:', err);
        setError('Failed to load moderation actions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchModerationActions();
  }, [isAdmin]);
  
  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'block':
        return 'bg-destructive text-destructive-foreground';
      case 'silence':
        return 'bg-warning text-warning-foreground';
      case 'warn':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading moderation actions...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">{t('moderation.log', 'Moderation Log')}</h2>
      
      {actions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('moderation.action', 'Action')}</TableHead>
              <TableHead>{t('moderation.user', 'User')}</TableHead>
              <TableHead>{t('moderation.reason', 'Reason')}</TableHead>
              <TableHead>{t('moderation.moderator', 'Moderator')}</TableHead>
              <TableHead>{t('moderation.time', 'Time')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell>
                  <Badge className={getActionTypeColor(action.type)}>
                    {t(`moderation.${action.type}`, action.type)}
                  </Badge>
                </TableCell>
                <TableCell>{action.target_user_id}</TableCell>
                <TableCell>{action.reason}</TableCell>
                <TableCell>{action.moderator_id}</TableCell>
                <TableCell>{formatDistanceToNow(action.timestamp, { addSuffix: true })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          {t('moderation.noActions', 'No moderation actions to display')}
        </p>
      )}
    </div>
  );
};

export default ModerationLog;
