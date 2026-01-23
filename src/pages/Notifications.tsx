import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Trash2, UserPlus, ThumbsUp, MessageSquare, Briefcase, AtSign, Heart, Repeat, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationService, Notification, NotificationType } from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { SEOHead } from "@/components/common/SEOHead";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = notificationService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev]);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const loadNotifications = async () => {
    setIsLoading(true);
    const notifs = await notificationService.getNotifications(50);
    setNotifications(notifs);
    setIsLoading(false);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }

    // Always prefer username over actor_id for profile links
    const actorUsername = notification.actor?.username;
    const profilePath = actorUsername ? `/profile/${actorUsername}` : `/profile/${notification.actor_id}`;

    // Navigate based on notification type
    if (notification.object_type && notification.object_id) {
      switch (notification.object_type) {
        case 'profile':
          if (actorUsername || notification.actor_id) {
            navigate(profilePath);
          }
          break;
        case 'job':
          navigate(`/jobs/${notification.object_id}`);
          break;
        case 'article':
          navigate(`/articles/${notification.object_id}`);
          break;
        case 'event':
          navigate(`/events/${notification.object_id}`);
          break;
        case 'message':
          navigate(`/messages/${notification.actor_id}`);
          break;
        case 'skill':
          if (actorUsername || notification.actor_id) {
            navigate(profilePath);
          }
          break;
        case 'post':
        case 'reply':
          navigate(`/post/${notification.object_id}`);
          break;
        default:
          if (actorUsername || notification.actor_id) {
            navigate(profilePath);
          }
      }
    } else if (actorUsername || notification.actor_id) {
      navigate(profilePath);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await notificationService.deleteNotification(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
      case 'follow':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'endorsement':
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'job_application':
        return <Briefcase className="h-5 w-5 text-orange-500" />;
      case 'mention':
        return <AtSign className="h-5 w-5 text-purple-500" />;
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'boost':
        return <Repeat className="h-5 w-5 text-green-500" />;
      case 'reply':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'recommendation_request':
      case 'recommendation_received':
        return <FileText className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5" />;
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
      default:
        return notification.content || 'New notification';
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout disableSEO>
      <SEOHead title="Notifications" description="Your notifications on Nolto." />
      <div className="container max-w-3xl mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({unreadCount} unread)
                </span>
              )}
            </CardTitle>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all as read
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {unreadCount > 0 && (
                    <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filter}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-lg">
                      {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                    <p className="text-sm">
                      {filter === 'unread' 
                        ? "You're all caught up!" 
                        : "When you get notifications, they'll show up here"
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "w-full flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors text-left group",
                          !notification.read && "bg-accent/50 border-primary/20"
                        )}
                      >
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={notification.actor?.avatar_url || ''} />
                          <AvatarFallback>
                            {getIcon(notification.type)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">
                            {getNotificationText(notification)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => handleDelete(e, notification.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
