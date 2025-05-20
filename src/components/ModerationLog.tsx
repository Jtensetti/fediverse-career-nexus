
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
import { useState } from 'react';

export interface ModerationAction {
  id: string;
  type: 'block' | 'silence' | 'warn';
  targetUser: string;
  reason: string;
  moderator: string;
  timestamp: Date;
  isPublic: boolean;
}

interface ModerationLogProps {
  actions: ModerationAction[];
  isAdmin?: boolean;
}

const ModerationLog = ({ actions, isAdmin = false }: ModerationLogProps) => {
  const { t } = useTranslation();
  const [visibleActions, setVisibleActions] = useState<ModerationAction[]>(() => {
    // If admin, show all actions; otherwise, only show public ones
    return isAdmin ? actions : actions.filter(action => action.isPublic);
  });
  
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

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">{t('moderation.log', 'Moderation Log')}</h2>
      
      {visibleActions.length > 0 ? (
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
            {visibleActions.map((action) => (
              <TableRow key={action.id}>
                <TableCell>
                  <Badge className={getActionTypeColor(action.type)}>
                    {t(`moderation.${action.type}`, action.type)}
                  </Badge>
                </TableCell>
                <TableCell>{action.targetUser}</TableCell>
                <TableCell>{action.reason}</TableCell>
                <TableCell>{action.moderator}</TableCell>
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
