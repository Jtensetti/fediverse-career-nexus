import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, UserPlus, ThumbsUp, MessageSquare, Briefcase, AtSign, Heart, Repeat, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationService, Notification, NotificationType } from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(20),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    };

    loadNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    // Navigate based on notification type - with null safety
    if (notification.object_type) {
      switch (notification.object_type) {
        case 'profile':
          if (notification.object_id) {
            navigate(`/profile/${notification.object_id}`);
          }
          break;
        case 'job':
          if (notification.object_id) {
            navigate(`/jobs/${notification.object_id}`);
          }
          break;
        case 'article':
          if (notification.object_id) {
            navigate(`/articles/${notification.object_id}`);
          }
          break;
        case 'event':
          if (notification.object_id) {
            navigate(`/events/${notification.object_id}`);
          }
          break;
        case 'message':
          if (notification.actor_id) {
            navigate(`/messages/${notification.actor_id}`);
          }
          break;
        case 'skill':
          if (notification.actor_id) {
            navigate(`/profile/${notification.actor_id}`);
          }
          break;
        case 'post':
        case 'reply':
          // Navigate to post if object_id exists, otherwise fall back to actor profile
          if (notification.object_id) {
            navigate(`/post/${notification.object_id}`);
          } else if (notification.actor_id) {
            navigate(`/profile/${notification.actor_id}`);
          }
          break;
        default:
          if (notification.actor_id) {
            navigate(`/profile/${notification.actor_id}`);
          }
      }
    } else if (notification.actor_id) {
      navigate(`/profile/${notification.actor_id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await notificationService.deleteNotification(notificationId);
    const wasUnread = notifications.find((n) => n.id === notificationId)?.read === false;
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
      case 'follow':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'endorsement':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'job_application':
        return <Briefcase className="h-4 w-4 text-orange-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-purple-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'boost':
        return <Repeat className="h-4 w-4 text-green-500" />;
      case 'reply':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'recommendation_request':
      case 'recommendation_received':
        return <FileText className="h-4 w-4 text-amber-500" />;
      case 'article_published':
        return <FileText className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor?.fullname || notification.actor?.username || 'Someone';
    
    switch (notification.type) {
      case 'connection_request':
        return `${actorName} sent you a connection request`;
      case 'connection_accepted':
        return `${actorName} accepted your connection request`;
      case 'endorsement':
        return `${actorName} ${notification.content || 'endorsed your skill'}`;
      case 'message':
        return `${actorName} sent you a message`;
      case 'follow':
        return `${actorName} started following you`;
      case 'like':
        return `${actorName} liked your post`;
      case 'boost':
        return `${actorName} boosted your post`;
      case 'reply':
        return `${actorName} replied to your post`;
      case 'mention':
        return `${actorName} mentioned you`;
      case 'recommendation_request':
        return `${actorName} requested a recommendation`;
      case 'recommendation_received':
        return `${actorName} wrote you a recommendation`;
      case 'article_published':
        return `${actorName} ${notification.content || 'published a new article'}`;
      default:
        return notification.content || 'New notification';
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-20" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 hover:bg-accent transition-colors text-left border-b last:border-0",
                    !notification.read && "bg-accent/50"
                  )}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={notification.actor?.avatar_url || ''} />
                    <AvatarFallback>
                      {getIcon(notification.type)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => handleDelete(e, notification.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              navigate('/notifications');
              setIsOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
