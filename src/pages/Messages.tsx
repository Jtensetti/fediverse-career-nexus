import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { Conversation, getConversations, getOtherParticipant } from '@/services/messageService';
import { getUserConnections } from '@/services/connectionsService';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, MessageSquare } from 'lucide-react';

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id || null;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to view your messages",
        variant: "destructive"
      });
      navigate('/auth/login');
    }
  }, [authLoading, user, navigate, toast]);

  // Fetch conversations
  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    enabled: !!currentUserId
  });

  // Fetch connections to check if user has any
  const { data: connections } = useQuery({
    queryKey: ['connections', currentUserId],
    queryFn: getUserConnections,
    enabled: !!currentUserId
  });

  const hasConnections = (connections?.length ?? 0) > 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
          <div className="text-center">
            <p>Please sign in to view your messages</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow container max-w-4xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          <Button asChild>
            <Link to="/connections">New Message</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">Error loading conversations</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <ConversationItem 
                key={conversation.id} 
                conversation={conversation} 
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : !hasConnections ? (
          <div className="text-center py-16 border rounded-lg bg-card">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">Build your network first</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Connect with other professionals before you can message them. This helps maintain a professional environment.
            </p>
            <Button asChild>
              <Link to="/connections">Find Connections</Link>
            </Button>
          </div>
        ) : (
          <div className="text-center py-16 border rounded-lg bg-card">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Start messaging your connections to collaborate and network.
            </p>
            <Button asChild>
              <Link to="/connections">Message a Connection</Link>
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

type ConversationItemProps = {
  conversation: Conversation;
  currentUserId: string;
};

function ConversationItem({ conversation, currentUserId }: ConversationItemProps) {
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getOtherParticipant(conversation, currentUserId);
        setOtherUser(user);
      } catch (error) {
        console.error('Error loading participant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [conversation, currentUserId]);

  // Get the last message time
  const lastMessageTime = conversation.last_message_at 
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
    : 'No messages yet';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link to={`/messages/${conversation.id}`}>
      <Card className="hover:bg-accent/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser?.avatar_url} />
              <AvatarFallback>
                {otherUser?.username?.substring(0, 2).toUpperCase() || 'UN'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="font-medium truncate">
                  {otherUser?.username || otherUser?.fullname || 'Unknown User'}
                </p>
                <span className="text-xs text-muted-foreground">{lastMessageTime}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
